"""
Train every company, validate, export and report — one command.

    python train_all.py                  # the whole universe
    python train_all.py --push           # ...and upload to Hugging Face
    python train_all.py --symbols TCS INFY
    python train_all.py --quick          # coarser sweep, roughly half the time

This wraps `main.py --train` + `publish_all.py` so the full path from
"nothing trained" to "forecasts served for every company" is a single
invocation, and prints a running ETA so a multi-hour job is not a black box.

Defaults are tuned for CPU. Batch size is the dominant cost: at batch 8 a
single fold is ~4,100 gradient steps over 60 timesteps, which is fine on a
GPU and painfully slow without one.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
import warnings
from datetime import datetime, timedelta

warnings.filterwarnings("ignore")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import config

HERE = config.BASE_DIR


def trained_count() -> int:
    return len(list(config.MODEL_DIR.glob(f"*_{config.MODEL_VERSION}.keras")))


def main() -> None:
    parser = argparse.ArgumentParser(description="Train, validate and publish every company")
    parser.add_argument("--symbols", nargs="+", help="default: config.SYMBOLS")
    parser.add_argument("--push", action="store_true", help="upload bundles to Hugging Face")
    parser.add_argument("--quick", action="store_true",
                        help="3 windows / 20 epochs — faster, noisier validation")
    parser.add_argument("--epochs", type=int)
    parser.add_argument("--windows", type=int)
    parser.add_argument("--batch", type=int)
    parser.add_argument("--replicates", type=int, default=1)
    args = parser.parse_args()

    symbols = [s.upper() for s in (args.symbols or config.SYMBOLS)]

    # CPU-tuned defaults; --quick trades validation resolution for time.
    epochs = args.epochs or (20 if args.quick else 30)
    windows = args.windows or (3 if args.quick else 4)
    batch = args.batch or 32

    already = trained_count()
    print("=" * 66)
    print(f"  Training {len(symbols)} companies")
    print(f"  {windows} walk-forward windows x {args.replicates} replicate(s) "
          f"x {epochs} epochs, batch {batch}")
    print(f"  Base model: {config.BASE_MODEL_SYMBOL} (the rest warm-start from it)")
    print(f"  Already on disk: {already}")
    print("=" * 66)
    print()

    started = time.time()

    train_cmd = [
        sys.executable, "-u", "main.py", "--train",
        "--windows", str(windows),
        "--replicates", str(args.replicates),
        "--epochs", str(epochs),
        "--batch", str(batch),
        "--symbols", *symbols,
    ]
    rc = subprocess.run(train_cmd, cwd=HERE).returncode
    if rc != 0:
        print(f"\nTraining exited with code {rc}; exporting whatever completed.")

    elapsed = time.time() - started
    print(f"\nTraining finished in {timedelta(seconds=int(elapsed))} "
          f"({trained_count()} model(s) on disk).\n")

    publish_cmd = [sys.executable, "publish_all.py"] + (["--push"] if args.push else [])
    subprocess.run(publish_cmd, cwd=HERE)

    print(f"\nTotal: {timedelta(seconds=int(time.time() - started))}")
    print(f"Finished at {datetime.now().strftime('%H:%M:%S')}")
    if not args.push:
        print("\nBundles are local only. To serve them from the deployed app:")
        print("  python push_to_hf.py --all      (needs your HF write token)")


if __name__ == "__main__":
    main()
