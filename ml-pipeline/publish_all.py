"""
Export every trained model and report which ones are servable.

Run after `main.py --train`. For each symbol it exports the ONNX bundle,
then reports whether the model cleared the publication gate — because a
bundle existing is not the same as a forecast being publishable. A model
that failed validation is still exported (so its metrics are inspectable)
but the API withholds its number and shows the reason instead.

    python publish_all.py                # export + report
    python publish_all.py --push         # also upload to Hugging Face
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import subprocess
import sys
import warnings

warnings.filterwarnings("ignore")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import config
from export_onnx import BUNDLE_DIR, export_symbol

log = logging.getLogger(__name__)


def trained_symbols() -> list[str]:
    """Symbols with both a saved model and its scaler — both are required."""
    out = []
    for p in sorted(config.MODEL_DIR.glob(f"*_{config.MODEL_VERSION}.keras")):
        symbol = p.stem.replace(f"_{config.MODEL_VERSION}", "")
        if (config.SCALER_DIR / f"{symbol}_{config.MODEL_VERSION}_scalers.pkl").exists():
            out.append(symbol)
    return out


def main() -> None:
    logging.basicConfig(level=logging.WARNING, format="%(message)s")
    parser = argparse.ArgumentParser(description="Export and report all trained models")
    parser.add_argument("--push", action="store_true", help="upload to Hugging Face after export")
    args = parser.parse_args()

    symbols = trained_symbols()
    if not symbols:
        print("No trained models found. Run:  python main.py --train")
        sys.exit(1)

    print(f"Exporting {len(symbols)} model(s)…\n")

    header = f"{'SYMBOL':<13}{'MAPE':>8}{'naive':>8}{'DIR%':>8}{'SIZE':>10}   STATUS"
    print(header)
    print("-" * len(header))

    servable, exported = [], []
    for symbol in symbols:
        try:
            info = export_symbol(symbol)
        except Exception as exc:  # noqa: BLE001
            print(f"{symbol:<13}{'-':>8}{'-':>8}{'-':>8}{'-':>10}   export failed: {str(exc)[:40]}")
            continue

        exported.append(symbol)
        metrics_path = BUNDLE_DIR / symbol / "metrics.json"
        if not metrics_path.exists():
            print(f"{symbol:<13}{'-':>8}{'-':>8}{'-':>8}"
                  f"{info['sizeBytes'] // 1024:>9}K   no backtest -> withheld")
            continue

        m = json.loads(metrics_path.read_text())
        model = m.get("model") or {}
        base = m.get("baseline") or {}
        passed = bool(m.get("beatsBaseline"))
        if passed:
            servable.append(symbol)

        gate = m.get("gate") or {}
        status = "SERVABLE" if passed else (
            "withheld: error" if not gate.get("mapeOk", True) else "withheld: direction"
        )
        print(f"{symbol:<13}{model.get('mape', float('nan')):>8.3f}"
              f"{base.get('mape', float('nan')):>8.3f}"
              f"{model.get('directionAccuracy', float('nan')):>8.2f}"
              f"{info['sizeBytes'] // 1024:>9}K   {status}")

    print()
    print(f"{len(exported)} bundle(s) exported to {BUNDLE_DIR}")
    print(f"{len(servable)} of {len(exported)} cleared the gate and will serve a forecast: "
          f"{', '.join(servable) if servable else '(none)'}")
    if len(servable) < len(exported):
        withheld = [s for s in exported if s not in servable]
        print(f"{len(withheld)} withheld — the API returns the reason instead of a number: "
              f"{', '.join(withheld)}")

    if args.push:
        print("\nUploading to Hugging Face…")
        subprocess.run([sys.executable, "push_to_hf.py", "--all"], check=False)


if __name__ == "__main__":
    main()
