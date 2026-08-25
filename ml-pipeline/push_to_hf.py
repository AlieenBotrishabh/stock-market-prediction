"""
Publish ONNX bundles to the Hugging Face Hub.

Run this yourself — it needs your HF write token, which should never be
pasted into a chat or committed. Either:

    huggingface-cli login          # stores a token locally
    python push_to_hf.py --all

or:

    set HF_TOKEN=hf_xxx            # PowerShell: $env:HF_TOKEN="hf_xxx"
    python push_to_hf.py --all

What gets uploaded, per symbol, under `<SYMBOL>/`:

    model.onnx      the graph
    scaler.json     fitted feature/target ranges
    config.json     feature order, time step, target mode
    metrics.json    walk-forward backtest results
    README.md       model card

The existing repo holds a single `keras_model.keras` with no scaler and no
feature list. A bare network cannot be used by anyone: without knowing the
14 inputs it expects, in order, and the exact ranges it was scaled with,
any prediction it produces is meaningless. This layout is self-contained,
so the backend can download a symbol and run it correctly with no other
knowledge.

The old file is left in place unless --replace is passed.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import config
from export_onnx import BUNDLE_DIR

DEFAULT_REPO = os.getenv("HF_MODEL_REPO", "Ace6868/stock-price-prediction-lstm")


def _repo_readme(symbols: list[str], repo_id: str) -> str:
    rows = []
    for s in symbols:
        cfg_path = BUNDLE_DIR / s / "config.json"
        met_path = BUNDLE_DIR / s / "metrics.json"
        if not cfg_path.exists():
            continue
        cfg = json.loads(cfg_path.read_text())
        mape = direction = "—"
        if met_path.exists():
            m = json.loads(met_path.read_text()).get("model") or {}
            if m.get("mape") is not None:
                mape = f"{m['mape']:.3f}%"
            if m.get("directionAccuracy") is not None:
                direction = f"{m['directionAccuracy']:.1f}%"
        rows.append(f"| `{s}` | {cfg['timeStep']} × {cfg['nFeatures']} | {mape} | {direction} |")

    table = "\n".join(rows) or "| — | — | — | — |"

    return f"""---
library_name: onnx
pipeline_tag: time-series-forecasting
tags:
- stock-prediction
- lstm
- onnx
- nse
- india
---

# Stock Price Prediction — LSTM (ONNX)

Next-day closing-price models for NSE equities. Each symbol is a
self-contained bundle that can be downloaded and run without any other
context.

## Models

| Symbol | Input shape | Walk-forward MAPE | Direction accuracy |
|---|---|---|---|
{table}

Naive "tomorrow equals today" scores about 1% MAPE on daily closes, so read
MAPE against that, not in isolation. Direction accuracy is the metric with
real information content — 50% is a coin flip.

## Layout

```
<SYMBOL>/
  model.onnx      LSTM graph, verified against Keras to ~1e-7
  scaler.json     min-max ranges fitted on the training slice only
  config.json     feature names in order, time step, target mode
  metrics.json    walk-forward backtest + publication gate
  README.md       per-model card
```

## Inference

```python
import json, numpy as np, onnxruntime as ort
from huggingface_hub import hf_hub_download

SYMBOL = "{symbols[0] if symbols else 'RELIANCE'}"
cfg    = json.load(open(hf_hub_download("{repo_id}", f"{{SYMBOL}}/config.json")))
scaler = json.load(open(hf_hub_download("{repo_id}", f"{{SYMBOL}}/scaler.json")))
sess   = ort.InferenceSession(hf_hub_download("{repo_id}", f"{{SYMBOL}}/model.onnx"))

# features: (timeStep, nFeatures) in cfg["features"] order
x = (features - np.array(scaler["features"]["min"])) / np.array(scaler["features"]["range"])
y = sess.run(None, {{cfg["inputName"]: x[None].astype("float32")}})[0][0][0]
y = y * scaler["target"]["range"][0] + scaler["target"]["min"][0]

# targetMode "return" -> y is a LOG RETURN
predicted_close = last_close * np.exp(y) if cfg["targetMode"] == "return" else y
```

## How these were trained

Single-layer LSTM (Bhandari et al. 2022 found one layer beat every
multilayer variant), on 10 years of daily NSE bars. Features are entirely
scale-free — denoised log returns, RSI-14, MACD, ATR, volume ratio, plus
NIFTY 50 and USD/INR context — because price *levels* min-max scaled on a
training slice fall outside [0,1] on later data and the network cannot
extrapolate there.

Validation is walk-forward with expanding windows, never a single split.
The scaler is re-fit per fold on training rows only, and Haar denoising is
applied causally, so no future information reaches the past. A shuffled-
target canary confirms this: permuting the target collapses MAPE from ~1%
to ~72%.

## Caveat

Research and education only. A model that barely beats a random walk is not
a trading strategy, and this is not investment advice.
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload ONNX bundles to Hugging Face")
    parser.add_argument("--repo", default=DEFAULT_REPO, help=f"default: {DEFAULT_REPO}")
    parser.add_argument("--symbol")
    parser.add_argument("--symbols", nargs="+")
    parser.add_argument("--all", action="store_true", help="every bundle in export/")
    parser.add_argument("--replace", action="store_true",
                        help="delete the legacy keras_model.keras from the repo")
    parser.add_argument("--dry-run", action="store_true",
                        help="show what would be uploaded and exit")
    args = parser.parse_args()

    if args.all:
        symbols = sorted(p.name for p in BUNDLE_DIR.iterdir()
                         if p.is_dir() and (p / "model.onnx").exists())
    else:
        symbols = args.symbols or ([args.symbol] if args.symbol else [])

    if not symbols:
        print(f"No bundles found in {BUNDLE_DIR}.")
        print("Export them first:  python export_onnx.py --all")
        sys.exit(1)

    print(f"Repo    : {args.repo}")
    print(f"Bundles : {', '.join(symbols)}")
    for s in symbols:
        files = sorted(p.name for p in (BUNDLE_DIR / s).iterdir() if p.is_file())
        print(f"  {s}/  {', '.join(files)}")

    if args.dry_run:
        print("\n--dry-run: nothing uploaded.")
        return

    try:
        from huggingface_hub import HfApi
    except ImportError:
        print("\nhuggingface_hub is not installed:  pip install huggingface_hub")
        sys.exit(1)

    token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")
    api = HfApi(token=token) if token else HfApi()

    try:
        api.whoami()
    except Exception:
        print("\nNot authenticated. Run `huggingface-cli login`, or set HF_TOKEN.")
        sys.exit(1)

    api.create_repo(repo_id=args.repo, repo_type="model", exist_ok=True)

    for symbol in symbols:
        print(f"\nUploading {symbol}…")
        api.upload_folder(
            folder_path=str(BUNDLE_DIR / symbol),
            path_in_repo=symbol,
            repo_id=args.repo,
            repo_type="model",
            commit_message=f"Add ONNX bundle for {symbol} ({config.MODEL_VERSION})",
        )
        print(f"  https://huggingface.co/{args.repo}/tree/main/{symbol}")

    readme = BUNDLE_DIR / "README.md"
    readme.write_text(_repo_readme(symbols, args.repo), encoding="utf-8")
    api.upload_file(
        path_or_fileobj=str(readme),
        path_in_repo="README.md",
        repo_id=args.repo,
        repo_type="model",
        commit_message="Update model card",
    )
    print("\nRepo README updated.")

    if args.replace:
        try:
            api.delete_file("keras_model.keras", repo_id=args.repo, repo_type="model",
                            commit_message="Remove legacy model (no scaler or feature spec)")
            print("Removed legacy keras_model.keras.")
        except Exception as exc:  # noqa: BLE001
            print(f"Could not remove legacy file: {exc}")

    print(f"\nDone: https://huggingface.co/{args.repo}")
    print("The backend picks these up automatically via HF_MODEL_REPO.")


if __name__ == "__main__":
    main()
