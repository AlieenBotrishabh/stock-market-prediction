# ML Pipeline

Next-day closing-price forecasts for NSE equities, built from three papers
and adapted where the Indian data disagreed with them.

Runs **offline** — on your machine or a scheduled GitHub Action — and writes
results into MongoDB. The Vercel API only ever reads. TensorFlow is ~600 MB
against a 250 MB serverless limit, so it can never live in the web function.

```
Yahoo Finance ──> features ──> LSTM ──> walk-forward validation ──┐
                                                                   ▼
                                              MongoDB ──> Vercel API ──> UI
```

## Quick start

```bash
cd ml-pipeline
pip install -r requirements.txt

python main.py --status                          # what exists on disk
python main.py --backtest --symbol RELIANCE      # validate (~11 min)
python main.py --train --symbol RELIANCE         # train + validate + save
python main.py --predict --publish               # daily inference -> Mongo
python main.py --full                            # everything, all symbols
python main.py --leak-check --symbol RELIANCE    # leakage canary
```

`MONGODB_URI` is optional; without it everything runs and reports locally,
it just does not publish.

## What the papers prescribe, and where this departs

**Bhandari et al. (2022)**, *Predicting stock market index using LSTM* —
the primary blueprint. A **single** LSTM layer of 150 units beat every
multilayer variant they tested (test MAPE 0.80%, R 0.9976). Features are
grouped into fundamental / macroeconomic / technical, selected by dropping
one of any pair correlating above 0.80, denoised with a Haar wavelet, and
min–max scaled.

**Hiransha M et al. (2018)**, *NSE Stock Market Prediction Using
Deep-Learning Models* — NSE-specific evidence. ARIMA scored 19.6–24.7%
MAPE against 3.85–11.6% for deep networks, and a model trained on one NSE
stock transferred to others (and to NYSE), which is why `BASE_MODEL_SYMBOL`
is trained first and the rest warm-start from it.

**Moghar & Hamiche (2020)** — documents that an LSTM loses tracking when
the volatility regime shifts. That is the argument for walk-forward
validation instead of a single split.

### Two deliberate departures, both driven by measurements on this data

**1. The target is a log return, not a price level.**

Bhandari normalise the full series *before* splitting (their §4.5), which
leaks the future min/max into training. Doing it correctly — fitting the
scaler on the training slice only — exposes the problem: on RELIANCE,
**90–100% of test closes fall outside the training min–max range**, so the
network is asked to emit scaled values above 1, which it structurally
cannot do. Measured walk-forward MAPE was **6.85%** against a 1.03% naive
baseline.

Switching the target to `log(close_t / close_t-1)` — stationary, std 0.0194
in the first half vs 0.0141 in the second — cut that to **1.13%**.

**2. Every feature is scale-free.**

Feeding price *levels* alongside a return target reintroduces the same
extrapolation problem on the input side. Replacing them with returns,
ratios and bounded oscillators improved direction accuracy from ~49% to
**52%**.

## Results (RELIANCE, 4 walk-forward windows, 2,474 daily bars)

| metric | LSTM | naive-drift | linear-drift |
|---|---|---|---|
| MAPE | 1.052% | **1.034%** | 1.164% |
| RMSE | 18.30 | **18.03** | 19.89 |
| R | 0.9917 | 0.9919 | 0.9903 |
| **Direction accuracy** | **52.05%** | 49.02% | 49.84% |

Read this honestly: the model does **not** beat "tomorrow equals today" on
error, and it never will by much — daily closes are close to a random walk,
which is exactly why a 1% MAPE is much less impressive than it sounds. Where
it does show real skill is **direction**, 3 points above the baseline and
above chance.

That is why the publication gate has two criteria (`backtest.py`):

```
MAPE     <= baseline MAPE x 1.02     # not materially worse on error
direction >= 51%                     # genuine directional skill
```

A model failing either is stored with `isModelBacked: false` and a reason,
and the UI renders that reason instead of a number.

## Avoiding look-ahead bias

Three specific traps, each enough on its own to manufacture an impressive
result that would evaporate live:

1. **Scaler leakage** — `MinMaxScaler` is fit on the training slice only,
   re-fit per walk-forward fold.
2. **Denoising leakage** — the Haar transform is not causal. A single global
   pass smears future information backwards; measured, it moved past values
   by up to 1.83 at non-dyadic cut points. `denoise_causal()` denoises each
   point using only data at or before it (verified: appending future data
   changes earlier outputs by exactly 0).
3. **Sequence leakage** — `make_sequences` places the target strictly after
   the end of its input window.

Verify with `--leak-check`: it reruns the backtest against a randomly
permuted target. Performance must collapse to chance. If a shuffled target
still predicts well, something is leaking and every other number is void.

## Files

| File | Role |
|---|---|
| `config.py` | Hyperparameters, symbol universe, feature list, thresholds |
| `data_client.py` | Yahoo fetch with retry/backoff and a CSV cache |
| `indicators.py` | RSI/MACD/ATR/SMA/EMA/Bollinger — mirrors the Node version |
| `features.py` | Haar denoising, feature engineering, selection, scaling |
| `model.py` | Single-layer LSTM(150), training, transfer learning |
| `backtest.py` | Walk-forward validation, baselines, publication gate |
| `predict.py` | Train a symbol; next-day inference |
| `publish.py` | Write predictions, backtests and OHLCV to MongoDB |
| `main.py` | CLI |

`indicators.py` and `backend/src/services/indicators.js` must agree
numerically — the UI would otherwise contradict the model.
`tests/test_indicators.py` asserts this against a shared fixture and
currently passes to floating-point precision.

## Indian adaptation of the macro block

Bhandari's macro features are US series (VIX, EFFR, UNRATE, UMCSENT, USDX).
The free daily Indian equivalents:

| Bhandari | Here | Ticker |
|---|---|---|
| VIX | India VIX | `^INDIAVIX` |
| USDX | USD/INR | `USDINR=X` |
| — | NIFTY 50 | `^NSEI` |
| EFFR / UNRATE / UMCSENT | *omitted* | no free daily feed; a forward-filled monthly series adds little at a one-day horizon |

India VIX is fetched but usually **dropped by feature selection** —
it correlates 0.87 with the stock's own relative ATR, so it is a duplicate
feature by Bhandari's own 0.80 rule.

## Caveats

- Yahoo Finance is unofficial, has no SLA, and rate-limits with HTTP 429.
  Retry/backoff and a 12-hour CSV cache mitigate it.
- These forecasts are for research and education. A next-day price
  prediction that barely beats a random walk is not a trading strategy, and
  nothing here is investment advice.
