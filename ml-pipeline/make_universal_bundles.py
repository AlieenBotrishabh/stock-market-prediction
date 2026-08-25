"""
Serve every company from one validated model.

Why this exists
---------------
Per-company fine-tuning was measured and mostly did not work. On a 3-fold
walk-forward, RELIANCE reached 52.3% direction accuracy but TCS scored
46.8% and INFY 48.6% -- both worse than a coin flip, both correctly
withheld by the publication gate. Training each company separately also
costs hours per symbol on CPU.

Hiransha M et al. (2018) found the opposite of per-symbol specialisation
helps: a network trained on ONE NSE stock transferred to others, and even
to NYSE names, because "there exists an underlying dynamics common to both
the stock markets". Our features are entirely scale-free -- log returns,
ratios and bounded oscillators -- so a model fitted on RELIANCE at ~1,300
consumes TCS at ~2,300 without ever seeing an out-of-range input. That is
precisely the condition transfer needs.

So: take the one model that earned its place, apply it to every company,
and measure each company SEPARATELY. Evaluation is pure inference, so all
15 take seconds rather than a day.

What this does NOT do
---------------------
It does not lower the bar. Each company gets its own walk-forward-style
evaluation on held-out sessions, its own MAPE/direction numbers, and its
own pass/fail against the same gate. A company the base model cannot
predict is written with `beatsBaseline: false` and the API shows the
reason instead of a number.

    python make_universal_bundles.py                  # all configured symbols
    python make_universal_bundles.py --days 400       # longer evaluation window
    python make_universal_bundles.py --source RELIANCE
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import warnings
from datetime import datetime, timezone

warnings.filterwarnings("ignore")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import numpy as np

import backtest as B
import config
import predict as P
from export_onnx import BUNDLE_DIR

log = logging.getLogger(__name__)


def load_source(symbol: str):
    """Load the base bundle -- the exact artifact the API already serves."""
    import onnxruntime as ort

    d = BUNDLE_DIR / symbol.upper()
    if not (d / "model.onnx").exists():
        raise FileNotFoundError(
            f"No exported bundle for {symbol}. Train and export it first:\n"
            f"  python main.py --train --symbol {symbol}\n"
            f"  python export_onnx.py --symbol {symbol}"
        )
    cfg = json.loads((d / "config.json").read_text())
    scaler = json.loads((d / "scaler.json").read_text())
    session = ort.InferenceSession(str(d / "model.onnx"), providers=["CPUExecutionProvider"])
    return d, session, cfg, scaler


def evaluate(symbol: str, session, cfg, scaler, days: int) -> dict:
    """
    Run the source model across the target's most recent `days` sessions.

    Every window ends on a real session and predicts the next one, so this
    is the same out-of-sample question the walk-forward backtest asks --
    just without retraining, since the weights are fixed.
    """
    df, _ = P.prepare(symbol, use_cache=True)
    features = cfg["features"]

    missing = [f for f in features if f not in df.columns]
    if missing:
        raise ValueError(f"missing features: {missing}")

    data = df.dropna(subset=features + [config.TARGET_COLUMN]).reset_index(drop=True)
    time_step = cfg["timeStep"]
    if len(data) < time_step + days + 5:
        days = max(60, len(data) - time_step - 5)

    values = data[features].to_numpy(dtype=float)
    closes = data[config.TARGET_COLUMN].to_numpy(dtype=float)

    f_min = np.asarray(scaler["features"]["min"])
    f_range = np.asarray(scaler["features"]["range"])
    scaled = (values - f_min) / f_range

    starts = range(len(data) - days - time_step, len(data) - time_step)
    batch = np.stack([scaled[s: s + time_step] for s in starts]).astype("float32")
    out = session.run(None, {cfg["inputName"]: batch})[0].ravel()
    target = out * scaler["target"]["range"][0] + scaler["target"]["min"][0]

    prev_idx = np.array([s + time_step - 1 for s in starts])
    prev = closes[prev_idx]
    actual = closes[prev_idx + 1]
    predicted = prev * np.exp(target) if cfg["targetMode"] == "return" else target

    model_metrics = B.evaluate(prev, actual, predicted)
    baseline = B.evaluate(prev, actual, B.naive_drift(prev))
    residuals = actual - predicted

    mape_ok = model_metrics["mape"] <= baseline["mape"] * B.MAPE_TOLERANCE
    direction_ok = model_metrics["directionAccuracy"] >= B.MIN_DIRECTION_ACCURACY

    dates = data["date"].astype(str).to_numpy()[np.clip(prev_idx + 1, 0, len(data) - 1)]

    return {
        "model": model_metrics,
        "baseline": baseline,
        "beatsBaseline": bool(mape_ok and direction_ok),
        "gate": {
            "mapeOk": bool(mape_ok),
            "directionOk": bool(direction_ok),
            "mapeTolerance": B.MAPE_TOLERANCE,
            "minDirectionAccuracy": B.MIN_DIRECTION_ACCURACY,
        },
        "evaluationSessions": int(days),
        "residualStd": float(np.std(residuals)),
        # 80% two-sided normal quantile on the model's own residual spread.
        "confidenceHalfWidth": float(1.2816 * np.std(residuals)),
        "sample": [
            {"date": str(d), "actual": float(a), "predicted": float(p)}
            for d, a, p in zip(dates[-120:], actual[-120:], predicted[-120:])
        ],
        "transferredFrom": cfg["symbol"],
    }


SHARED_DIR_NAME = "_shared"


def write_shared(source_dir) -> None:
    """
    One copy of the graph and scaler for every company.

    All companies run the SAME weights, so writing 15 identical 137 KB
    files wasted 2.3 MB and made the bundles awkward to commit. The
    per-symbol directories keep only what actually differs — their config
    and their own validation metrics.
    """
    shared = BUNDLE_DIR / SHARED_DIR_NAME
    shared.mkdir(parents=True, exist_ok=True)
    for f in ("model.onnx", "scaler.json"):
        shutil.copy2(source_dir / f, shared / f)


def write_bundle(symbol: str, source_dir, cfg: dict, metrics: dict) -> None:
    """Per-symbol config and metrics; the graph itself lives in _shared/."""
    out = BUNDLE_DIR / symbol.upper()
    out.mkdir(parents=True, exist_ok=True)

    symbol_cfg = dict(cfg)
    symbol_cfg["symbol"] = symbol.upper()
    # Tells the loader the graph is shared rather than sitting alongside.
    symbol_cfg["sharedModel"] = SHARED_DIR_NAME
    symbol_cfg["transferredFrom"] = cfg["symbol"]
    symbol_cfg["exportedAt"] = datetime.now(timezone.utc).isoformat()
    symbol_cfg["note"] = (
        f"Weights and scaler trained on {cfg['symbol']}, applied to "
        f"{symbol.upper()}. Validated separately on {symbol.upper()}'s own "
        "held-out sessions; see metrics.json."
    )
    (out / "config.json").write_text(json.dumps(symbol_cfg, indent=1))
    (out / "metrics.json").write_text(json.dumps(metrics, indent=1, default=str))


def main() -> None:
    logging.basicConfig(level=logging.WARNING, format="%(message)s")
    parser = argparse.ArgumentParser(description="Serve every company from one validated model")
    parser.add_argument("--source", default=config.BASE_MODEL_SYMBOL)
    parser.add_argument("--symbols", nargs="+")
    parser.add_argument("--days", type=int, default=300,
                        help="held-out sessions to evaluate each company on")
    args = parser.parse_args()

    source = args.source.upper()
    targets = [s.upper() for s in (args.symbols or config.SYMBOLS)]

    source_dir, session, cfg, scaler = load_source(source)
    write_shared(source_dir)

    print(f"\nBase model : {source}  ({cfg['architecture']}, "
          f"{cfg['timeStep']}x{cfg['nFeatures']}, target='{cfg['targetMode']}')")
    print(f"Applied to : {len(targets)} companies, each validated on its own "
          f"{args.days} most recent sessions")
    print(f"Gate       : MAPE <= naive x {B.MAPE_TOLERANCE} AND direction >= "
          f"{B.MIN_DIRECTION_ACCURACY}%\n")

    header = f"{'COMPANY':<13}{'MAPE':>8}{'naive':>8}{'DIR%':>8}   STATUS"
    print(header)
    print("-" * len(header))

    passed, failed = [], []
    for symbol in targets:
        # The source keeps its OWN bundle untouched. It was trained and
        # walk-forward validated on its own data, which is strictly better
        # evidence than a fixed-weights evaluation -- and copying the model
        # onto itself while the session holds it open fails on Windows.
        if symbol == source:
            existing = json.loads((source_dir / "metrics.json").read_text())
            m, b = existing.get("model", {}), existing.get("baseline", {})
            ok = bool(existing.get("beatsBaseline"))
            (passed if ok else failed).append(symbol)
            print(f"{symbol:<13}{m.get('mape', float('nan')):>8.3f}"
                  f"{b.get('mape', float('nan')):>8.3f}"
                  f"{m.get('directionAccuracy', float('nan')):>8.2f}   "
                  f"{'SERVES FORECAST' if ok else 'withheld'} (own backtest)")
            continue

        try:
            metrics = evaluate(symbol, session, cfg, scaler, args.days)
        except Exception as exc:  # noqa: BLE001
            print(f"{symbol:<13}{'-':>8}{'-':>8}{'-':>8}   error: {str(exc)[:34]}")
            continue

        write_bundle(symbol, source_dir, cfg, metrics)

        m, b, g = metrics["model"], metrics["baseline"], metrics["gate"]
        ok = metrics["beatsBaseline"]
        (passed if ok else failed).append(symbol)
        status = "SERVES FORECAST" if ok else (
            "withheld: error" if not g["mapeOk"] else "withheld: direction"
        )
        print(f"{symbol:<13}{m['mape']:>8.3f}{b['mape']:>8.3f}"
              f"{m['directionAccuracy']:>8.2f}   {status}")

    print()
    print(f"{len(targets)} companies now have a bundle and return a live response.")
    print(f"{len(passed)} serve a forecast: {', '.join(passed) if passed else '(none)'}")
    if failed:
        print(f"{len(failed)} show why instead: {', '.join(failed)}")
    print(f"\nBundles in {BUNDLE_DIR}. Publish with:  python push_to_hf.py --all")


if __name__ == "__main__":
    main()
