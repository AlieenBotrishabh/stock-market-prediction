"""
Train one LSTM per stock to predict the next day's closing price.

Usage:
    python train.py RELIANCE TCS     # train specific stocks
    python train.py                  # train every stock in data/raw
"""

import json
import sys
from pathlib import Path

import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow import keras

from indicators import DATA_DIR, FEATURES, add_indicators, load_prices

MODELS_DIR = Path(__file__).parent / "models"
LOOKBACK = 30       # days of history the model sees
TRAIN_SPLIT = 0.8   # first 80% for training, last 20% for testing


def make_sequences(features: np.ndarray, target: np.ndarray):
    """Turn rows into (LOOKBACK days -> next day's close) samples."""
    X, y = [], []
    for i in range(LOOKBACK, len(features)):
        X.append(features[i - LOOKBACK:i])
        y.append(target[i])
    return np.array(X), np.array(y)


def build_model(n_features: int) -> keras.Model:
    model = keras.Sequential([
        keras.Input(shape=(LOOKBACK, n_features)),
        keras.layers.LSTM(64, return_sequences=True),
        keras.layers.Dropout(0.2),
        keras.layers.LSTM(32),
        keras.layers.Dense(1),
    ])
    model.compile(optimizer="adam", loss="mse")
    return model


def train(symbol: str) -> None:
    symbol = symbol.upper()
    print(f"\n=== {symbol} ===")
    df = add_indicators(load_prices(symbol))

    # Fit scalers on the training portion only (no peeking at test data)
    split = int(len(df) * TRAIN_SPLIT)
    feature_scaler = MinMaxScaler().fit(df[FEATURES].iloc[:split])
    close_scaler = MinMaxScaler().fit(df[["close"]].iloc[:split])

    X, y = make_sequences(
        feature_scaler.transform(df[FEATURES]),
        close_scaler.transform(df[["close"]]).ravel(),
    )
    n_train = split - LOOKBACK
    X_train, X_test = X[:n_train], X[n_train:]
    y_train, y_test = y[:n_train], y[n_train:]

    model = build_model(len(FEATURES))
    model.fit(
        X_train, y_train,
        validation_split=0.1,
        epochs=30,
        batch_size=32,
        callbacks=[keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)],
        verbose=2,
    )

    # Evaluate in rupees
    pred = close_scaler.inverse_transform(model.predict(X_test, verbose=0)).ravel()
    actual = close_scaler.inverse_transform(y_test.reshape(-1, 1)).ravel()
    prev_close = df["close"].values[split - 1:-1]  # close of the day before each target

    rmse = float(np.sqrt(np.mean((pred - actual) ** 2)))
    mae = float(np.mean(np.abs(pred - actual)))
    direction_acc = float(np.mean(np.sign(pred - prev_close) == np.sign(actual - prev_close)))
    print(f"RMSE: {rmse:.2f}  MAE: {mae:.2f}  Direction accuracy: {direction_acc:.1%}")

    MODELS_DIR.mkdir(exist_ok=True)
    model.save(MODELS_DIR / f"{symbol}.keras")
    meta = {
        "symbol": symbol,
        "lookback": LOOKBACK,
        "features": FEATURES,
        "feature_min": feature_scaler.data_min_.tolist(),
        "feature_max": feature_scaler.data_max_.tolist(),
        "close_min": float(close_scaler.data_min_[0]),
        "close_max": float(close_scaler.data_max_[0]),
        "metrics": {"rmse": rmse, "mae": mae, "direction_accuracy": direction_acc},
    }
    (MODELS_DIR / f"{symbol}.json").write_text(json.dumps(meta, indent=2))
    print(f"Saved models/{symbol}.keras and models/{symbol}.json")


if __name__ == "__main__":
    symbols = sys.argv[1:] or [p.name.split(".NS")[0] for p in DATA_DIR.glob("*.NS_10y.csv")]
    for s in symbols:
        train(s)
