"""
Flask API that serves LSTM stock predictions.

Models are downloaded from the Hugging Face Hub (falls back to local models/).

    python app.py
    GET /health
    GET /predict/RELIANCE
"""

import json
import os
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from flask import Flask, jsonify
from huggingface_hub import hf_hub_download
from tensorflow import keras

from indicators import add_indicators, load_prices

load_dotenv()
HF_REPO_ID = os.getenv("HF_REPO_ID", "Ace6868/stock-price-prediction-lstm")
MODELS_DIR = Path(__file__).parent / "models"

app = Flask(__name__)
_cache = {}  # symbol -> (model, meta)


def get_file(filename: str) -> Path | None:
    """Download a file from the Hugging Face Hub, or use the local copy."""
    try:
        return Path(hf_hub_download(HF_REPO_ID, filename, token=os.getenv("HF_TOKEN") or None))
    except Exception:
        local = MODELS_DIR / filename
        return local if local.exists() else None


def load_model(symbol: str):
    if symbol not in _cache:
        model_path, meta_path = get_file(f"{symbol}.keras"), get_file(f"{symbol}.json")
        if model_path is None or meta_path is None:
            return None, None
        _cache[symbol] = (keras.models.load_model(model_path), json.loads(meta_path.read_text()))
    return _cache[symbol]


def confidence(direction_accuracy: float) -> str:
    if direction_accuracy >= 0.60:
        return "High"
    if direction_accuracy >= 0.52:
        return "Medium"
    return "Low"


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.get("/predict/<symbol>")
def predict(symbol: str):
    symbol = symbol.upper()
    model, meta = load_model(symbol)
    if model is None:
        return jsonify(success=False, message=f"No trained model for {symbol}. Run: python train.py {symbol}"), 404

    df = add_indicators(load_prices(symbol))
    window = df[meta["features"]].tail(meta["lookback"]).values

    # Scale with the min/max saved at training time, predict, then scale back to rupees
    f_min, f_max = np.array(meta["feature_min"]), np.array(meta["feature_max"])
    scaled = (window - f_min) / (f_max - f_min)
    pred_scaled = float(model.predict(scaled[np.newaxis], verbose=0)[0][0])
    predicted = pred_scaled * (meta["close_max"] - meta["close_min"]) + meta["close_min"]

    current = float(df["close"].iloc[-1])
    change = predicted - current
    return jsonify(
        success=True,
        symbol=symbol,
        currentPrice=round(current, 2),
        predictedPrice=round(predicted, 2),
        priceChange=round(change, 2),
        priceChangePercent=round(change / current * 100, 2),
        direction="UP" if change > 0 else "DOWN",
        confidence=confidence(meta["metrics"]["direction_accuracy"]),
        dataPoints=len(df),
        trained=True,
        message=f"LSTM prediction for next close (as of {df['date'].iloc[-1]:%Y-%m-%d})",
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
