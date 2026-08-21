"""
Pipeline CLI.

Typical use:

    python main.py --train --symbols RELIANCE TCS   # train + backtest
    python main.py --predict --publish              # daily inference
    python main.py --full                           # everything
    python main.py --backtest --symbol RELIANCE     # validation only
    python main.py --leak-check --symbol RELIANCE   # leakage canary
    python main.py --status                         # what exists on disk

The scheduled GitHub Action runs `--predict --publish` on weekdays after
the NSE close, and `--full` weekly to retrain.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
import warnings
from datetime import datetime, timezone

warnings.filterwarnings("ignore")

import config

logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(config.BASE_DIR / "logs" / "pipeline.log", encoding="utf-8"),
    ],
)
log = logging.getLogger("pipeline")


def cmd_status() -> None:
    models = sorted(config.MODEL_DIR.glob("*.keras"))
    scalers = sorted(config.SCALER_DIR.glob("*.pkl"))
    raw = sorted(config.RAW_DIR.glob("*.csv"))
    reports = sorted(config.REPORT_DIR.glob("*.json"))

    print(f"\nModel version : {config.MODEL_VERSION}")
    print(f"Architecture  : LSTM({config.LSTM_UNITS}) x {config.LSTM_LAYERS}, "
          f"time step {config.TIME_STEP}, target '{config.TARGET_MODE}'")
    print(f"Mongo         : {'configured' if config.MONGODB_URI else 'NOT configured'}")
    print(f"\nTrained models ({len(models)}):")
    for m in models:
        print(f"  {m.stem}")
    print(f"Scalers: {len(scalers)}   Cached series: {len(raw)}   Reports: {len(reports)}")

    for r in reports:
        try:
            data = json.loads(r.read_text())
            m = data.get("model", {})
            b = data.get("baseline", {})
            print(f"\n  {r.stem}: MAPE {m.get('mape', float('nan')):.3f}% "
                  f"(naive {b.get('mape', float('nan')):.3f}%), "
                  f"direction {m.get('directionAccuracy', float('nan')):.1f}%, "
                  f"publish={data.get('beats', data.get('beatsBaseline'))}")
        except Exception:  # noqa: BLE001
            pass
    print()


def cmd_backtest(symbols: list[str], epochs: int) -> None:
    import features as F
    import backtest as B
    import predict as P

    for symbol in symbols:
        df, feature_cols = P.prepare(symbol)
        result = B.walk_forward(df, feature_cols, epochs=epochs, verbose=True)
        m, b, l = result["model"], result["baseline"], result["baselineLinear"]

        print(f"\n=== {symbol} ===")
        print(f"{'metric':<20}{'LSTM':>12}{'naive':>12}{'linear':>12}")
        for k in ("mape", "rmse", "mae", "r", "directionAccuracy"):
            print(f"{k:<20}{m[k]:>12.4f}{b[k]:>12.4f}{l[k]:>12.4f}")
        print(f"\npasses publication gate: {result['beatsBaseline']}  {result['gate']}")

        out = config.REPORT_DIR / f"{symbol.upper()}_backtest.json"
        out.write_text(json.dumps(
            {k: v for k, v in result.items() if k != "sample"} | {"sample": result["sample"][-40:]},
            indent=1, default=str,
        ))
        log.info("report -> %s", out)


def cmd_leak_check(symbols: list[str], epochs: int) -> None:
    """Shuffled-target canary: performance must collapse to baseline."""
    import backtest as B
    import predict as P

    for symbol in symbols:
        df, feature_cols = P.prepare(symbol)
        real = B.walk_forward(df, feature_cols, epochs=epochs)
        fake = B.shuffled_target_check(df, feature_cols, epochs=epochs)

        print(f"\n=== leakage check: {symbol} ===")
        print(f"  real target    : MAPE {real['model']['mape']:.3f}%  "
              f"direction {real['model']['directionAccuracy']:.1f}%")
        print(f"  shuffled target: MAPE {fake['shuffledMape']:.3f}%  "
              f"direction {fake['shuffledDirectionAccuracy']:.1f}%")
        # With no leakage the shuffled run should be far worse and its
        # direction accuracy should sit at chance.
        suspicious = fake["shuffledDirectionAccuracy"] > 55 or fake["shuffledMape"] < real["model"]["mape"] * 2
        print(f"  verdict: {'SUSPICIOUS - investigate leakage' if suspicious else 'OK - no leakage detected'}")


def cmd_train(symbols: list[str], epochs: int, publish: bool, no_backtest: bool) -> None:
    import predict as P
    import model as M

    db = None
    if publish:
        import publish as PUB
        client = PUB.get_client()
        if client is not None:
            db = client[config.MONGODB_DB]
            PUB.ensure_indexes(db)

    # Train the shared base first, then warm-start the rest from it
    # (Hiransha et al. showed NSE models transfer across stocks).
    base_model = None
    ordered = sorted(symbols, key=lambda s: s.upper() != config.BASE_MODEL_SYMBOL)

    for i, symbol in enumerate(ordered):
        started = time.time()
        try:
            result = P.train_symbol(
                symbol, epochs=epochs, run_backtest=not no_backtest,
                base_model=base_model if i > 0 else None,
            )
            if i == 0:
                base_model = result.get("model")

            log.info("%s trained in %.0fs", symbol, time.time() - started)

            if db is not None:
                import publish as PUB
                prediction = P.predict_next_day(symbol, use_cache=True)
                prediction["trainedAt"] = result.get("trainedAt")
                PUB.publish_symbol(db, prediction, result.get("backtest"))
                df, _ = P.prepare(symbol, use_cache=True)
                PUB.publish_ohlcv(db, symbol, df)
        except Exception as exc:  # noqa: BLE001
            # One bad symbol must not abort the nightly run.
            log.error("%s failed: %s", symbol, exc)


def cmd_predict(symbols: list[str], publish: bool) -> None:
    import predict as P

    db = None
    if publish:
        import publish as PUB
        client = PUB.get_client()
        if client is not None:
            db = client[config.MONGODB_DB]
            PUB.ensure_indexes(db)

    for symbol in symbols:
        try:
            prediction = P.predict_next_day(symbol)
            if not prediction.get("isModelBacked"):
                log.warning("%s: %s", symbol, prediction.get("unavailableReason"))
            else:
                log.info(
                    "%s: %.2f -> %.2f (%+.2f%%)",
                    symbol, prediction["basePrice"], prediction["predictedClose"],
                    prediction["predictedChangePercent"],
                )

            if db is not None:
                import publish as PUB
                report = config.REPORT_DIR / f"{symbol.upper()}_backtest.json"
                bt = json.loads(report.read_text()) if report.exists() else None
                PUB.publish_symbol(db, prediction, bt)
        except Exception as exc:  # noqa: BLE001
            log.error("%s failed: %s", symbol, exc)


def main() -> None:
    parser = argparse.ArgumentParser(description="Stock prediction pipeline")
    parser.add_argument("--train", action="store_true", help="train models")
    parser.add_argument("--predict", action="store_true", help="run inference")
    parser.add_argument("--backtest", action="store_true", help="walk-forward validation only")
    parser.add_argument("--leak-check", action="store_true", help="shuffled-target canary")
    parser.add_argument("--full", action="store_true", help="train + predict + publish")
    parser.add_argument("--status", action="store_true", help="show what exists on disk")
    parser.add_argument("--publish", action="store_true", help="write results to MongoDB")
    parser.add_argument("--no-backtest", action="store_true", help="skip validation when training")
    parser.add_argument("--symbols", nargs="+", help="symbols (default: config.SYMBOLS)")
    parser.add_argument("--symbol", help="a single symbol")
    parser.add_argument("--epochs", type=int, default=config.EPOCHS)
    args = parser.parse_args()

    symbols = args.symbols or ([args.symbol] if args.symbol else config.SYMBOLS)

    if args.status or not any(
        (args.train, args.predict, args.backtest, args.leak_check, args.full)
    ):
        cmd_status()
        return

    started = datetime.now(timezone.utc)
    log.info("pipeline start: %s | symbols=%s", started.isoformat(timespec="seconds"), symbols)

    if args.leak_check:
        cmd_leak_check(symbols, args.epochs)
    elif args.backtest:
        cmd_backtest(symbols, args.epochs)
    elif args.full:
        cmd_train(symbols, args.epochs, publish=True, no_backtest=args.no_backtest)
    else:
        if args.train:
            cmd_train(symbols, args.epochs, publish=args.publish, no_backtest=args.no_backtest)
        if args.predict:
            cmd_predict(symbols, publish=args.publish)

    log.info("done in %.0fs", (datetime.now(timezone.utc) - started).total_seconds())


if __name__ == "__main__":
    main()
