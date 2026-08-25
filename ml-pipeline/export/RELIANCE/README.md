---
library_name: keras
tags:
- stock-prediction
- lstm
- onnx
- time-series
- nse
---

# Stock price prediction — RELIANCE

Single-layer LSTM predicting the next-day closing price of RELIANCE
on the NSE. Exported to ONNX so it can run at request time inside a
serverless Node function.

## Performance

| metric | model | naive baseline |
|---|---|---|
| MAPE | 1.038% | 1.033% |
| RMSE | 18.06 | 18.02 |
| Direction accuracy | 52.3% | 49.0% |


Read this honestly: next-day closes are close to a random walk, so
"tomorrow equals today" already scores about 1% MAPE and is hard to beat on
error alone. Direction accuracy is where real skill shows — 50% is chance.
The model is only published if its error stays within 2% of the naive
baseline **and** it calls direction at least 51% of the time.

## Input contract

- **Shape:** `(10, 8)` — the last
  10 sessions.
- **Features, in this exact order:**
  `return_denoised`, `return_5d`, `volume_ratio`, `macd_rel`, `rsi14`, `atr_rel`, `nifty_return`, `usdinr_return`
- **Scaling:** min-max, fitted on the training slice only. Values in
  `scaler.json`.
- **Target mode:** `return`.

## Files

| File | Purpose |
|---|---|
| `model.onnx` | The graph (verified against Keras to 6.0e-08) |
| `scaler.json` | Fitted min/range for features and target |
| `config.json` | Feature order, time step, target mode |
| `metrics.json` | Walk-forward backtest results |

## Inference

1. Build the feature matrix in exactly the `features` order.
1. Take the last `timeStep` rows.
1. Scale: (raw - scaler.features.min) / scaler.features.range
1. Run the ONNX graph -> one scaled value.
1. Invert: raw = scaled * scaler.target.range + scaler.target.min
1. targetMode 'return' means that value is a LOG RETURN: predictedClose = lastClose * exp(value). targetMode 'price' means it is the close itself.

## Caveat

For research and education. A model that barely beats a random walk is not
a trading strategy, and this is not investment advice.
