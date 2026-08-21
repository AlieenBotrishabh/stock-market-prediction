"""
Training and next-day inference.

The scaler bug this module exists to not repeat: the previous predict.py
normalised during training but used an identity transform at inference
("not normalizing for prediction"), so the network was fed raw feature
values it had never seen in that range. Here the fitted scalers are saved
alongside the model and reloaded for every prediction.
"""

from __future__ import annotations

import json
import logging
import pickle
from datetime import datetime, timezone

import numpy as np
import pandas as pd

import backtest as B
import config
import data_client as DC
import features as F
import model as M

log = logging.getLogger(__name__)


def _scaler_path(symbol: str, version: str) -> "object":
    return config.SCALER_DIR / f"{symbol.upper()}_{version}_scalers.pkl"


def save_scalers(symbol: str, x_scaler, y_scaler, feature_cols, version=config.MODEL_VERSION):
    with open(_scaler_path(symbol, version), "wb") as fh:
        pickle.dump(
            {"x": x_scaler, "y": y_scaler, "features": feature_cols,
             "targetMode": config.TARGET_MODE, "timeStep": config.TIME_STEP},
            fh,
        )


def load_scalers(symbol: str, version=config.MODEL_VERSION):
    path = _scaler_path(symbol, version)
    if not path.exists():
        return None
    with open(path, "rb") as fh:
        return pickle.load(fh)


def prepare(symbol: str, use_cache: bool = True) -> tuple[pd.DataFrame, list[str]]:
    """Fetch bars + macro context and build the modelling frame."""
    ohlcv = DC.fetch_ohlcv(symbol, use_cache=use_cache)
    market = DC.fetch_market_context(use_cache=use_cache)
    df = F.build_features(ohlcv, market, causal_denoise=True)
    feature_cols, _ = F.select_features(df)
    return df, feature_cols


def train_symbol(
    symbol: str,
    *,
    epochs: int = config.EPOCHS,
    run_backtest: bool = True,
    base_model=None,
    use_cache: bool = True,
) -> dict:
    """
    Train, validate and persist a model for one symbol.

    Returns a summary dict including the backtest metrics and whether the
    model cleared the publication gate.
    """
    log.info("=== %s ===", symbol)
    df, feature_cols = prepare(symbol, use_cache=use_cache)
    log.info("%s: %d rows, %d features", symbol, len(df), len(feature_cols))

    result = {"symbol": symbol.upper(), "featureSet": feature_cols}

    if run_backtest:
        bt = B.walk_forward(df, feature_cols, epochs=epochs, verbose=True)
        result["backtest"] = bt
        log.info(
            "%s backtest: MAPE %.3f%% (naive %.3f%%) dir %.1f%% -> publish=%s",
            symbol, bt["model"]["mape"], bt["baseline"]["mape"],
            bt["model"]["directionAccuracy"], bt["beatsBaseline"],
        )

    # Final model: trained on ALL available history, since it will predict
    # tomorrow rather than a held-out past window. The quality estimate for
    # this model comes from the walk-forward run above.
    clean = df.dropna(subset=feature_cols + [config.TARGET_COLUMN]).reset_index(drop=True)
    feature_values = clean[feature_cols].to_numpy(dtype=float)
    closes = clean[config.TARGET_COLUMN].to_numpy(dtype=float)
    targets = B.build_target(closes, config.TARGET_MODE)

    x_scaler = F.MinMaxScaler().fit(feature_values)
    y_scaler = F.MinMaxScaler().fit(targets.reshape(-1, 1))
    x_all, y_all = F.make_sequences(
        x_scaler.transform(feature_values),
        y_scaler.transform(targets.reshape(-1, 1)).ravel(),
        config.TIME_STEP, config.HORIZON_DAYS,
    )

    val_cut = int(len(x_all) * (1 - config.VALIDATION_SPLIT))
    M.set_seeds()
    net, history = M.train_model(
        x_all[:val_cut], y_all[:val_cut], x_all[val_cut:], y_all[val_cut:],
        epochs=epochs, base_model=base_model,
    )

    M.save_model(net, symbol)
    save_scalers(symbol, x_scaler, y_scaler, feature_cols)

    result["trainedAt"] = datetime.now(timezone.utc).isoformat()
    result["finalValLoss"] = history.get("val_loss", [None])[-1]
    result["rows"] = int(len(clean))
    result["model"] = net
    return result


def predict_next_day(symbol: str, use_cache: bool = False) -> dict:
    """
    Forecast the next session's close.

    The confidence interval comes from the model's own out-of-sample
    residual spread recorded during backtesting, not an assumed
    distribution. If no backtest is on file the interval is omitted rather
    than guessed.
    """
    symbol = symbol.upper()
    net = M.load_model(symbol)
    bundle = load_scalers(symbol)

    if net is None or bundle is None:
        return {
            "symbol": symbol,
            "isModelBacked": False,
            "unavailableReason": f"No trained model on disk for {symbol}.",
        }

    feature_cols = bundle["features"]
    df, _ = prepare(symbol, use_cache=use_cache)
    clean = df.dropna(subset=feature_cols + [config.TARGET_COLUMN]).reset_index(drop=True)

    time_step = bundle.get("timeStep", config.TIME_STEP)
    if len(clean) < time_step:
        return {
            "symbol": symbol,
            "isModelBacked": False,
            "unavailableReason": f"Only {len(clean)} usable rows; need {time_step}.",
        }

    # The most recent `time_step` rows, scaled with the SAVED scaler.
    window = bundle["x"].transform(clean[feature_cols].to_numpy(dtype=float)[-time_step:])
    scaled_pred = net.predict(window[np.newaxis, ...], verbose=0).ravel()
    target_pred = float(bundle["y"].inverse_transform(scaled_pred.reshape(-1, 1)).ravel()[0])

    base_price = float(clean[config.TARGET_COLUMN].iloc[-1])
    base_date = str(clean["date"].iloc[-1])[:10]
    predicted = float(
        B.reconstruct_price(np.array([base_price]), np.array([target_pred]),
                            bundle.get("targetMode", config.TARGET_MODE))[0]
    )

    change = predicted - base_price
    change_pct = (change / base_price * 100.0) if base_price else None

    return {
        "symbol": symbol,
        "isModelBacked": True,
        "basePrice": base_price,
        "baseDate": base_date,
        "predictedClose": predicted,
        "predictedChange": change,
        "predictedChangePercent": change_pct,
        "direction": "UP" if change > 0 else "DOWN" if change < 0 else "FLAT",
        "horizonDays": config.HORIZON_DAYS,
        "modelVersion": config.MODEL_VERSION,
        "modelArchitecture": f"LSTM-{config.LSTM_UNITS}-single-layer",
        "featureSet": feature_cols,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


__all__ = ["train_symbol", "predict_next_day", "prepare", "save_scalers", "load_scalers"]
