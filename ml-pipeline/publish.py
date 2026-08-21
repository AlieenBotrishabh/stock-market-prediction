"""
Publish predictions and backtest metrics to MongoDB.

This is the handoff between the offline pipeline and the web API: Python
writes, the Vercel function only reads. TensorFlow never has to exist in
the serverless bundle (it is ~600 MB against a 250 MB limit).

The honesty gate is enforced here as well as in backtest.py: a prediction
whose model failed validation is still written, but with
`isModelBacked: false` and a reason, so the API can explain the absence
instead of silently having no row.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import config

log = logging.getLogger(__name__)


def get_client():
    """Mongo client, or None when MONGODB_URI is unset."""
    if not config.MONGODB_URI:
        log.warning("MONGODB_URI not set - results will not be published")
        return None
    from pymongo import MongoClient  # imported lazily so the dep is optional

    return MongoClient(config.MONGODB_URI, serverSelectionTimeoutMS=10_000)


def _confidence_bounds(predicted: float, backtest: dict | None):
    """
    Interval from the model's own out-of-sample residual spread.

    Returns (low, high, level) or (None, None, None) when no backtest is
    available -- an interval is never invented.
    """
    if not backtest:
        return None, None, None
    half = backtest.get("confidenceHalfWidth")
    if half is None:
        return None, None, None
    return predicted - half, predicted + half, config.CONFIDENCE_LEVEL


def publish_symbol(db, prediction: dict, backtest_result: dict | None) -> None:
    """Write one symbol's prediction and backtest documents."""
    symbol = prediction["symbol"]
    now = datetime.now(timezone.utc)

    bt = backtest_result or {}
    metrics = bt.get("model", {})
    baseline = bt.get("baseline", {})
    passed = bool(bt.get("beatsBaseline", False))

    # A model that failed validation must not have its number rendered.
    is_backed = bool(prediction.get("isModelBacked")) and passed
    reason = None
    if not prediction.get("isModelBacked"):
        reason = prediction.get("unavailableReason", "No trained model.")
    elif not passed:
        gate = bt.get("gate", {})
        failed = []
        if not gate.get("mapeOk", True):
            failed.append(
                f"error {metrics.get('mape', float('nan')):.2f}% exceeds the "
                f"{baseline.get('mape', float('nan')):.2f}% naive baseline"
            )
        if not gate.get("directionOk", True):
            failed.append(
                f"direction accuracy {metrics.get('directionAccuracy', float('nan')):.1f}% "
                "is not meaningfully better than chance"
            )
        reason = (
            f"The model for {symbol} did not pass validation: "
            + " and ".join(failed or ["it did not beat the baseline"])
            + "."
        )

    low, high, level = _confidence_bounds(prediction.get("predictedClose"), bt)

    doc = {
        "symbol": symbol,
        "generatedAt": now,
        "horizonDays": prediction.get("horizonDays", config.HORIZON_DAYS),
        "basePrice": prediction.get("basePrice"),
        "predictedClose": prediction.get("predictedClose") if is_backed else None,
        "predictedChange": prediction.get("predictedChange") if is_backed else None,
        "predictedChangePercent": prediction.get("predictedChangePercent") if is_backed else None,
        "direction": prediction.get("direction") if is_backed else None,
        "confidenceLow": low if is_backed else None,
        "confidenceHigh": high if is_backed else None,
        "confidenceLevel": level,
        "modelVersion": prediction.get("modelVersion", config.MODEL_VERSION),
        "modelArchitecture": prediction.get("modelArchitecture"),
        "trainedAt": prediction.get("trainedAt"),
        "featureSet": prediction.get("featureSet", []),
        "isModelBacked": is_backed,
        "unavailableReason": reason,
        "updatedAt": now,
    }

    db.predictions.update_one(
        {"symbol": symbol, "horizonDays": doc["horizonDays"]},
        {"$set": doc},
        upsert=True,
    )

    if bt:
        db.backtests.update_one(
            {"symbol": symbol, "modelVersion": doc["modelVersion"]},
            {"$set": {
                "symbol": symbol,
                "modelVersion": doc["modelVersion"],
                "evaluatedAt": now,
                "mape": metrics.get("mape"),
                "rmse": metrics.get("rmse"),
                "mae": metrics.get("mae"),
                "r": metrics.get("r"),
                "directionAccuracy": metrics.get("directionAccuracy"),
                "baselineMape": baseline.get("mape"),
                "baselineRmse": baseline.get("rmse"),
                "baselineName": config.BASELINE_NAME,
                "beatsBaseline": passed,
                "walkForwardWindows": bt.get("walkForwardWindows"),
                "residualStd": bt.get("residualStd"),
                "sample": bt.get("sample", [])[-120:],
                "updatedAt": now,
            }},
            upsert=True,
        )

    log.info("published %s (isModelBacked=%s)", symbol, is_backed)


def publish_ohlcv(db, symbol: str, df, limit: int = 500) -> int:
    """
    Store recent bars plus their indicators so the API can serve chart and
    indicator data without hitting Yahoo, and so both languages read the
    same indicator values.
    """
    from pymongo import UpdateOne

    indicator_cols = [
        c for c in ("sma20", "sma50", "sma200", "ema20", "rsi14", "atr14",
                    "macd", "macd_signal", "macd_histogram",
                    "bb_upper", "bb_middle", "bb_lower", "bb_percent_b")
        if c in df.columns
    ]

    ops = []
    for _, row in df.tail(limit).iterrows():
        date = str(row["date"])[:10]
        indicators = {
            c: (None if row[c] != row[c] else float(row[c]))  # NaN -> None
            for c in indicator_cols
        }
        ops.append(UpdateOne(
            {"symbol": symbol.upper(), "date": date},
            {"$set": {
                "symbol": symbol.upper(),
                "date": date,
                "o": float(row["open"]) if row["open"] == row["open"] else None,
                "h": float(row["high"]) if row["high"] == row["high"] else None,
                "l": float(row["low"]) if row["low"] == row["low"] else None,
                "c": float(row["close"]),
                "v": float(row["volume"]) if row["volume"] == row["volume"] else None,
                "indicators": indicators,
            }},
            upsert=True,
        ))

    if not ops:
        return 0
    result = db.ohlcv.bulk_write(ops, ordered=False)
    return (result.upserted_count or 0) + (result.modified_count or 0)


def ensure_indexes(db) -> None:
    db.predictions.create_index([("symbol", 1), ("generatedAt", -1)])
    db.backtests.create_index([("symbol", 1), ("modelVersion", 1)], unique=True)
    db.ohlcv.create_index([("symbol", 1), ("date", 1)], unique=True)


__all__ = ["get_client", "publish_symbol", "publish_ohlcv", "ensure_indexes"]
