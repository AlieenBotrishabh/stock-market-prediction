---
title: StockPulse ML
emoji: 📈
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# ML Pipeline – LSTM Stock Prediction

Predicts the next day's closing price of NSE stocks with an LSTM. The model uses
technical indicators as features (SMA, EMA, RSI, ROC). It is served through a Flask API
and stored on the Hugging Face Hub.

```
data/raw/*.csv  ->  indicators.py  ->  train.py  ->  models/  ->  upload_to_hf.py  ->  Hugging Face Hub
                                                                                            |
                         Frontend  ->  Node/Express /api/predict  ->  Flask app.py  <-------+
```

| File              | What it does                                                   |
|-------------------|----------------------------------------------------------------|
| `indicators.py`   | Loads price CSVs and adds SMA, EMA, RSI and ROC                |
| `train.py`        | Builds 30-day sequences, trains the LSTM, prints RMSE/MAE/direction accuracy |
| `upload_to_hf.py` | Uploads `models/` to the Hugging Face Hub                      |
| `app.py`          | Flask API that downloads the model from the Hub and predicts   |

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env      # set HF_REPO_ID (and HF_TOKEN for uploads)
```

## 1. Train

```bash
python train.py RELIANCE TCS    # specific stocks
python train.py                 # every CSV in data/raw
```

Each stock produces `models/{SYMBOL}.keras` (the LSTM) and `models/{SYMBOL}.json`
(scaler min/max, feature list and test metrics).

## 2. Upload to Hugging Face

```bash
hf auth login                   # or set HF_TOKEN in .env
python upload_to_hf.py          # models  -> huggingface.co/Ace6868/stock-price-prediction-lstm
python deploy_space.py          # Flask API -> free Docker Space (https://ace6868-stockpulse-ml.hf.space)
```

## 3. Run the API

```bash
python app.py                   # http://localhost:8000
```

`app.py` downloads `{SYMBOL}.keras` and `{SYMBOL}.json` from the Hub. If the Hub can't be
reached, it uses the local `models/` folder instead.

```
GET /health
GET /predict/RELIANCE
```

```json
{
  "success": true,
  "symbol": "RELIANCE",
  "currentPrice": 1385.2,
  "predictedPrice": 1391.75,
  "priceChange": 6.55,
  "priceChangePercent": 0.47,
  "direction": "UP",
  "confidence": "Medium",
  "dataPoints": 2445,
  "trained": true
}
```

The Node backend calls this endpoint from `GET /api/predict/:symbol` and saves each
prediction to MongoDB (`GET /api/predict/history/:symbol`).

## Model

```
Input (30 days x 7 features) -> LSTM(64) -> Dropout(0.2) -> LSTM(32) -> Dense(1)
```

- **Features:** close, SMA-10, SMA-20, EMA-10, EMA-20, RSI-14, ROC-10
- **Scaling:** Min-Max, fitted on the training data only
- **Split:** chronological, 80% train and 20% test
- **Metrics:** RMSE, MAE and direction accuracy (how often the up/down call is right)

> This is an educational project, not financial advice.
