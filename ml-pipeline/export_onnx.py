"""
Export a trained model as a self-contained ONNX bundle.

Why ONNX: the Node API runs on Vercel, where TensorFlow (~600 MB) cannot
fit inside the 250 MB function limit. An exported ONNX graph is ~400 KB and
runs under onnxruntime-node in single-digit milliseconds, which is what
makes on-demand inference possible at request time instead of a nightly
batch job.

Why a *bundle* rather than just the weights: the existing HF repo contains
only `keras_model.keras`. A bare network is not usable by anyone -- you
also need to know which features it expects, in what order, and the exact
min/max ranges its scaler was fitted with. Without those the inputs are
meaningless and so is the output. Everything needed to reproduce a
prediction goes in the bundle:

    model.onnx      the graph
    scaler.json     fitted feature and target ranges
    config.json     feature names/order, time step, target mode
    metrics.json    walk-forward backtest results and the publication gate
    README.md       model card

Usage:
    python export_onnx.py --symbol RELIANCE
    python export_onnx.py --all
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

import config
import predict as P

log = logging.getLogger(__name__)

BUNDLE_DIR = config.BASE_DIR / "export"


def export_symbol(symbol: str, out_root=BUNDLE_DIR) -> dict:
    """
    Write the ONNX bundle for one symbol.

    Returns a summary dict, and raises if the Keras model or its scalers
    are missing (a bundle without its scaler would be worse than useless).
    """
    import keras

    symbol = symbol.upper()
    model_path = config.MODEL_DIR / f"{symbol}_{config.MODEL_VERSION}.keras"
    if not model_path.exists():
        raise FileNotFoundError(f"No trained model: {model_path}")

    bundle = P.load_scalers(symbol)
    if bundle is None:
        raise FileNotFoundError(
            f"No saved scalers for {symbol}. The model cannot be exported "
            "without them -- inference would feed unscaled inputs."
        )

    out_dir = out_root / symbol
    out_dir.mkdir(parents=True, exist_ok=True)

    model = keras.models.load_model(model_path, compile=False)
    time_step, n_features = model.input_shape[1], model.input_shape[2]

    # Keras 3 refuses to export a model that has never been called, and we
    # want a reference output to verify the converted graph against.
    probe = np.random.default_rng(0).random((1, time_step, n_features)).astype("float32")
    keras_out = float(model.predict(probe, verbose=0)[0][0])

    onnx_path = out_dir / "model.onnx"
    model.export(str(onnx_path), format="onnx")

    # Verify the exported graph reproduces Keras. A silent conversion
    # error here would ship a model that quietly predicts something else.
    import onnxruntime as ort

    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    onnx_out = float(session.run(None, {input_name: probe})[0][0][0])
    parity = abs(keras_out - onnx_out)
    if parity > 1e-4:
        raise RuntimeError(
            f"ONNX output diverges from Keras by {parity:.3e} -- refusing to export."
        )

    x_scaler = bundle["x"]
    y_scaler = bundle["y"]

    scaler = {
        "features": {
            "min": np.asarray(x_scaler.min_).tolist(),
            "range": np.asarray(x_scaler.range_).tolist(),
        },
        "target": {
            "min": np.asarray(y_scaler.min_).tolist(),
            "range": np.asarray(y_scaler.range_).tolist(),
        },
        "note": (
            "Min-max scaling: scaled = (raw - min) / range. Fitted on the "
            "training slice only. Apply to features before inference and "
            "invert on the output."
        ),
    }
    (out_dir / "scaler.json").write_text(json.dumps(scaler, indent=1))

    cfg = {
        "symbol": symbol,
        "modelVersion": config.MODEL_VERSION,
        "architecture": f"LSTM-{config.LSTM_UNITS}x{config.LSTM_LAYERS}-ts{config.TIME_STEP}",
        "inputName": input_name,
        "outputName": session.get_outputs()[0].name,
        "timeStep": int(time_step),
        "nFeatures": int(n_features),
        "features": bundle["features"],
        "targetMode": bundle.get("targetMode", config.TARGET_MODE),
        "horizonDays": config.HORIZON_DAYS,
        # The history depth the features were BUILT over, not just the
        # model's input window. RSI/ATR use Wilder smoothing and the Haar
        # denoiser is causal-recursive, so both carry memory all the way
        # back to the start of the series. Computing them over a shorter
        # prefix at inference yields materially different values -- measured
        # at 2.4 RSI points and 3.7 on the denoised return. Inference must
        # therefore fetch exactly this range.
        "historyRange": config.HISTORY_RANGE,
        "denoiseLevel": config.WAVELET_LEVEL,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "parityVsKeras": parity,
        "inference": {
            "steps": [
                "Build the feature matrix in exactly the `features` order.",
                "Take the last `timeStep` rows.",
                "Scale: (raw - scaler.features.min) / scaler.features.range",
                "Run the ONNX graph -> one scaled value.",
                "Invert: raw = scaled * scaler.target.range + scaler.target.min",
                "targetMode 'return' means that value is a LOG RETURN: "
                "predictedClose = lastClose * exp(value). "
                "targetMode 'price' means it is the close itself.",
            ]
        },
    }
    (out_dir / "config.json").write_text(json.dumps(cfg, indent=1))

    # Backtest metrics, if a report exists.
    report_path = config.REPORT_DIR / f"{symbol}_backtest.json"
    metrics = {}
    if report_path.exists():
        raw = json.loads(report_path.read_text())
        metrics = {
            "model": raw.get("model"),
            "baseline": raw.get("baseline"),
            "baselineLinear": raw.get("baselineLinear"),
            "beatsBaseline": raw.get("beatsBaseline"),
            "gate": raw.get("gate"),
            "walkForwardWindows": raw.get("walkForwardWindows"),
            "replicates": raw.get("replicates"),
            "residualStd": raw.get("residualStd"),
            "confidenceHalfWidth": raw.get("confidenceHalfWidth"),
            # Predicted-vs-actual pairs drive the overlay chart in the UI.
            # Trimmed to the most recent 120 so the bundle stays small.
            "sample": (raw.get("sample") or [])[-120:],
        }
        (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=1, default=str))

    (out_dir / "README.md").write_text(_model_card(cfg, metrics))

    log.info("exported %s -> %s (parity %.2e)", symbol, out_dir, parity)
    return {
        "symbol": symbol,
        "dir": str(out_dir),
        "parity": parity,
        "sizeBytes": onnx_path.stat().st_size,
        "features": bundle["features"],
        "timeStep": int(time_step),
    }


def _model_card(cfg: dict, metrics: dict) -> str:
    m = (metrics or {}).get("model") or {}
    b = (metrics or {}).get("baseline") or {}

    perf = "Not yet backtested."
    if m:
        perf = (
            f"| metric | model | naive baseline |\n"
            f"|---|---|---|\n"
            f"| MAPE | {m.get('mape', float('nan')):.3f}% | {b.get('mape', float('nan')):.3f}% |\n"
            f"| RMSE | {m.get('rmse', float('nan')):.2f} | {b.get('rmse', float('nan')):.2f} |\n"
            f"| Direction accuracy | {m.get('directionAccuracy', float('nan')):.1f}% | "
            f"{b.get('directionAccuracy', float('nan')):.1f}% |\n"
        )

    return f"""---
library_name: keras
tags:
- stock-prediction
- lstm
- onnx
- time-series
- nse
---

# Stock price prediction — {cfg['symbol']}

Single-layer LSTM predicting the next-day closing price of {cfg['symbol']}
on the NSE. Exported to ONNX so it can run at request time inside a
serverless Node function.

## Performance

{perf}

Read this honestly: next-day closes are close to a random walk, so
"tomorrow equals today" already scores about 1% MAPE and is hard to beat on
error alone. Direction accuracy is where real skill shows — 50% is chance.
The model is only published if its error stays within 2% of the naive
baseline **and** it calls direction at least 51% of the time.

## Input contract

- **Shape:** `({cfg['timeStep']}, {cfg['nFeatures']})` — the last
  {cfg['timeStep']} sessions.
- **Features, in this exact order:**
  {', '.join(f'`{f}`' for f in cfg['features'])}
- **Scaling:** min-max, fitted on the training slice only. Values in
  `scaler.json`.
- **Target mode:** `{cfg['targetMode']}`.

## Files

| File | Purpose |
|---|---|
| `model.onnx` | The graph (verified against Keras to {cfg['parityVsKeras']:.1e}) |
| `scaler.json` | Fitted min/range for features and target |
| `config.json` | Feature order, time step, target mode |
| `metrics.json` | Walk-forward backtest results |

## Inference

{chr(10).join('1. ' + s for s in cfg['inference']['steps'])}

## Caveat

For research and education. A model that barely beats a random walk is not
a trading strategy, and this is not investment advice.
"""


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Export trained models to ONNX bundles")
    parser.add_argument("--symbol", help="single symbol")
    parser.add_argument("--symbols", nargs="+")
    parser.add_argument("--all", action="store_true", help="every trained model on disk")
    parser.add_argument("--clean", action="store_true", help="wipe export/ first")
    args = parser.parse_args()

    if args.clean and BUNDLE_DIR.exists():
        shutil.rmtree(BUNDLE_DIR)

    if args.all:
        symbols = sorted({
            p.stem.split("_")[0] for p in config.MODEL_DIR.glob("*.keras")
        })
    else:
        symbols = args.symbols or ([args.symbol] if args.symbol else config.SYMBOLS)

    if not symbols:
        print("No trained models found. Run: python main.py --train")
        return

    results = []
    for symbol in symbols:
        try:
            results.append(export_symbol(symbol))
        except Exception as exc:  # noqa: BLE001
            log.error("%s: %s", symbol, exc)

    if results:
        print(f"\nExported {len(results)} bundle(s) to {BUNDLE_DIR}:")
        for r in results:
            print(f"  {r['symbol']:<12} {r['sizeBytes']:>8,} bytes  "
                  f"parity {r['parity']:.1e}  ts={r['timeStep']} "
                  f"features={len(r['features'])}")


if __name__ == "__main__":
    main()
