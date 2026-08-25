# StockPulse

Real-time NSE market data and LSTM-based next-day price forecasts.

React + Vite frontend, a single Express API deployed as one Vercel
serverless function, and a Python/TensorFlow pipeline that trains the
models.

**Forecasts are produced live.** The trained LSTM is exported to ONNX and
executed inside the API on each request — 3.7 ms per inference — rather
than read from a precomputed batch.

```
Yahoo Finance ─┐
IndianAPI ─────┴──> Express API ──> React SPA
                         │
                    ONNX runtime  ← bundles from Hugging Face
                         ▲
   ml-pipeline (weekly GitHub Action): train → validate → export → publish
```

## Quick start

```bash
npm run install-all

cp backend/.env.example backend/.env     # then fill in the values
npm run dev                              # API :5000 + frontend :3000
```

`backend/.env`:

| Variable | Required | Notes |
|---|---|---|
| `INDIAN_API_KEY` | for news/IPO/funds/fundamentals | **server-side only** — never prefix with `VITE_` |
| `MONGODB_URI` | no | optional response cache; live quotes work without it |
| `HF_MODEL_REPO` | no | defaults to `Ace6868/stock-price-prediction-lstm` |
| `HF_TOKEN` | only for a private model repo | read token |
| `PORT` | no | defaults to 5000 |
| `FRONTEND_URL` | production | comma-separated CORS allow-list |

The frontend only needs `VITE_API_URL` (`/api` in production). Every
`VITE_*` value is inlined into the public bundle, so **no secret may ever
go in a frontend env file**.

## What was wrong, and what changed

The deployed app showed prices that were wrong by up to 117% and
predictions that were not predictions. Three root causes:

**1. Production called `localhost`.** `frontend/.env.production` omitted
`VITE_API_URL`, so the deployed bundle requested
`http://localhost:5000/api` from each visitor's own machine. Every request
failed and the app silently served hardcoded mock data — mock TCS ₹3,850
against a real ₹2,297, mock RELIANCE ₹2,846 against a real ₹1,312.

**2. "AI predictions" were a hash of the ticker string.**

```js
const hash = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
const variation = ((hash % 100) / 100) * 4 - 2;  // -2% to +2%
```

The same symbol returned the same number forever. `dataPoints: 100` was a
literal and "confidence" was derived from the size of that hash. The
backend's `/api/predict` used `Math.random()`. Neither was ever called.

**3. The ML pipeline had never run** — and could not. It read the API key
without ever sending it, pointed at a non-existent host, and had an empty
column mapping that failed on any real payload.

### Now

- **Real data, cached.** Yahoo Finance primary, IndianAPI fallback and for
  everything Yahoo lacks. Market-hours-aware TTLs, retry with backoff, and
  stale-while-revalidate.
- **Nothing is ever fabricated.** Every mock fallback is deleted. Failures
  render an explicit error state; cached data is labelled with its age.
  Unknown symbols return 404 rather than a plausible-looking empty object.
- **A real model, running live** — see
  [`ml-pipeline/README.md`](ml-pipeline/README.md). Trained offline,
  exported to ONNX, and executed in the API on every request. It publishes
  a number only after clearing a walk-forward gate; otherwise the API
  returns `isModelBacked: false` with the specific reason, and the UI shows
  that reason instead of a figure.
- **One backend.** `server.js` and `vercel-app.js` were two divergent apps
  with copy-pasted handlers and two incompatible Mongoose schemas over the
  same collections. Now one `createApp()` with two thin entry points.
- **Full OHLC + ranges + market status**, which is what was missing from
  the UI: the historical endpoint used to discard open/high/low.

## Security note

A live `sk-live-…` IndianAPI key was hardcoded in the frontend source,
committed in tracked env files, and shipped in the public JS bundle. It has
been removed from the working tree, `.gitignore` now covers every `.env`
variant, and all IndianAPI calls are proxied through the backend.

**The key is still in git history and must be treated as compromised —
rotate it at indianapi.in.** Removing a file does not remove it from
history.

## Layout

```
backend/src/
  app.js              createApp() — the single Express app
  providers/          yahoo.js, indian.js, index.js (failover + cache)
  services/           marketStatus.js, indicators.js, cache.js
                      features.js   port of the Python feature pipeline
                      predictor.js  live ONNX inference
api/index.mjs         Vercel entry (re-exports createApp)
backend/server.js     local entry

frontend/src/
  services/marketApi.js   the only network layer; throws, never fabricates
  components/ui/          RangeBar, AnimatedNumber, States, Scroll (reveal/parallax)
  components/             StockChart (candles), IndicatorsPanel, PredictionCard
  pages/

ml-pipeline/          Python: data, features, LSTM, backtest,
                      export_onnx.py, push_to_hf.py
tests/                cross-language indicator contract test
```

## Verification

```bash
# API — 22 checks across quotes, history, indicators, content, error paths
curl -s localhost:5000/api/health

# Indicators must agree between Node and Python, or the UI would
# contradict the model it displays
python tests/test_indicators.py

# Model validation and the leakage canary
cd ml-pipeline
python main.py --backtest --symbol RELIANCE --replicates 3
python main.py --leak-check --symbol RELIANCE

# Live inference end to end
curl localhost:5000/api/predict/RELIANCE
```

## Publishing a model

The API loads model bundles from the Hugging Face Hub. After training:

```bash
cd ml-pipeline
python export_onnx.py --all     # model.onnx + scaler.json + config.json
python push_to_hf.py --all      # needs your own HF write token
```

Each bundle is self-contained — graph, fitted scaler, feature order and
backtest metrics — so it can be downloaded and run correctly with no other
context. A bare `.keras` file without its scaler and feature list cannot:
the inputs are meaningless and so is the output.

After deploying, confirm on the live site that TCS shows its real price and
that `sk-live` does not appear in the served JS bundle.

## Disclaimer

Forecasts are model output for research and education. Next-day equity
prices are close to a random walk; a low error figure does not imply a
profitable strategy. Nothing here is investment advice.
