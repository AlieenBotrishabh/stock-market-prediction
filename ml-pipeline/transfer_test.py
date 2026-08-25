"""
Cross-stock transfer evaluation.

Answers: does a model trained on ONE company work on the others?

Hiransha M et al. (2018) found it does on the NSE -- they trained on TATA
MOTORS and tested on MARUTI, HCL and AXIS BANK (and even on NYSE names),
concluding "there exists an underlying dynamics common to both the stock
markets". This script reproduces that experiment against our own bundle.

There is a specific reason it might work here: every feature is
**scale-free** -- log returns, ratios and bounded oscillators, never a
price level. RELIANCE at ~1,300 and TCS at ~2,300 produce feature values
on the same scale, so a model fitted on one is not being fed out-of-range
inputs by the other. That was not true of the original level-based feature
set, and is the property that makes transfer plausible at all.

What is still borrowed and imperfect: the min-max scaler is fitted on the
SOURCE symbol's feature distribution. A target whose volatility differs
materially will land slightly off-centre in scaled space.

Usage:
    python transfer_test.py                       # RELIANCE -> all others
    python transfer_test.py --source RELIANCE --targets TCS INFY
    python transfer_test.py --days 250            # evaluation window
"""

from __future__ import annotations

import argparse
import json
import os
import warnings

warnings.filterwarnings("ignore")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import numpy as np

import backtest as B
import config
import predict as P
from export_onnx import BUNDLE_DIR


def load_bundle(symbol: str):
    """Load the exported ONNX bundle -- the exact artifact the API serves."""
    import onnxruntime as ort

    d = BUNDLE_DIR / symbol.upper()
    if not (d / "model.onnx").exists():
        raise FileNotFoundError(
            f"No exported bundle for {symbol}. Run: python export_onnx.py --symbol {symbol}"
        )
    cfg = json.loads((d / "config.json").read_text())
    scaler = json.loads((d / "scaler.json").read_text())
    session = ort.InferenceSession(str(d / "model.onnx"), providers=["CPUExecutionProvider"])
    return session, cfg, scaler


def evaluate_on(symbol: str, session, cfg, scaler, days: int) -> dict | None:
    """
    Run the source model over the target's most recent `days` sessions.

    Returns metrics in price space alongside the naive baseline, so the two
    are directly comparable.
    """
    df, _ = P.prepare(symbol, use_cache=True)
    features = cfg["features"]

    missing = [f for f in features if f not in df.columns]
    if missing:
        return {"symbol": symbol, "error": f"missing features {missing}"}

    data = df.dropna(subset=features + [config.TARGET_COLUMN]).reset_index(drop=True)
    time_step = cfg["timeStep"]
    if len(data) < time_step + days + 5:
        return {"symbol": symbol, "error": f"only {len(data)} usable rows"}

    values = data[features].to_numpy(dtype=float)
    closes = data[config.TARGET_COLUMN].to_numpy(dtype=float)

    f_min = np.asarray(scaler["features"]["min"])
    f_range = np.asarray(scaler["features"]["range"])
    scaled = (values - f_min) / f_range

    # Windows ending at each of the last `days` sessions.
    starts = range(len(data) - days - time_step, len(data) - time_step)
    batch = np.stack([scaled[s: s + time_step] for s in starts]).astype("float32")

    out = session.run(None, {cfg["inputName"]: batch})[0].ravel()
    target = out * scaler["target"]["range"][0] + scaler["target"]["min"][0]

    # Index of the close the window ends on, and the day being predicted.
    prev_idx = np.array([s + time_step - 1 for s in starts])
    prev = closes[prev_idx]
    actual = closes[prev_idx + 1]

    predicted = (
        prev * np.exp(target) if cfg["targetMode"] == "return" else target
    )

    model_metrics = B.evaluate(prev, actual, predicted)
    baseline = B.evaluate(prev, actual, B.naive_drift(prev))

    return {
        "symbol": symbol,
        "n": int(days),
        "mape": model_metrics["mape"],
        "baselineMape": baseline["mape"],
        "direction": model_metrics["directionAccuracy"],
        "baselineDirection": baseline["directionAccuracy"],
        "rmse": model_metrics["rmse"],
        "baselineRmse": baseline["rmse"],
        # Same two bars the publication gate uses.
        "mapeOk": model_metrics["mape"] <= baseline["mape"] * B.MAPE_TOLERANCE,
        "directionOk": model_metrics["directionAccuracy"] >= B.MIN_DIRECTION_ACCURACY,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Cross-stock transfer evaluation")
    parser.add_argument("--source", default=config.BASE_MODEL_SYMBOL)
    parser.add_argument("--targets", nargs="+")
    parser.add_argument("--days", type=int, default=250,
                        help="most recent sessions to evaluate on")
    args = parser.parse_args()

    source = args.source.upper()
    targets = [t.upper() for t in (args.targets or config.SYMBOLS)]

    session, cfg, scaler = load_bundle(source)

    print(f"\nSource model : {source}  ({cfg['architecture']}, "
          f"{cfg['timeStep']}x{cfg['nFeatures']}, target='{cfg['targetMode']}')")
    print(f"Evaluated on : most recent {args.days} sessions of each target")
    print(f"Gate         : MAPE <= baseline x {B.MAPE_TOLERANCE}  AND  "
          f"direction >= {B.MIN_DIRECTION_ACCURACY}%\n")

    header = f"{'SYMBOL':<12}{'MAPE':>8}{'naive':>8}{'DIR%':>8}{'naive':>8}   {'VERDICT'}"
    print(header)
    print("-" * len(header))

    results = []
    for t in targets:
        try:
            r = evaluate_on(t, session, cfg, scaler, args.days)
        except Exception as exc:  # noqa: BLE001
            r = {"symbol": t, "error": str(exc)[:60]}

        if r.get("error"):
            print(f"{t:<12}{'-':>8}{'-':>8}{'-':>8}{'-':>8}   {r['error']}")
            continue

        passes = r["mapeOk"] and r["directionOk"]
        verdict = "PASS" if passes else (
            "fails: error" if not r["mapeOk"] else "fails: direction"
        )
        marker = " *" if t == source else ""
        print(f"{t:<12}{r['mape']:>8.3f}{r['baselineMape']:>8.3f}"
              f"{r['direction']:>8.2f}{r['baselineDirection']:>8.2f}   {verdict}{marker}")
        results.append(r)

    ok = [r for r in results if r["mapeOk"] and r["directionOk"]]
    print()
    print(f"{len(ok)} of {len(results)} symbols clear the gate using the "
          f"{source} model alone.")
    if results:
        print(f"Mean direction accuracy: {np.mean([r['direction'] for r in results]):.2f}% "
              f"(baseline {np.mean([r['baselineDirection'] for r in results]):.2f}%)")
    print("\n* = the source symbol itself (in-sample-ish; not a transfer result)")

    out = config.REPORT_DIR / f"transfer_from_{source}.json"
    out.write_text(json.dumps(results, indent=1, default=str))
    print(f"\nreport -> {out}")


if __name__ == "__main__":
    main()
