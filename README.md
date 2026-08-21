# StockPulse

Real-time NSE market data and LSTM-based next-day price forecasts.

React + Vite frontend, a single Express API deployed as one Vercel
serverless function, MongoDB for caching and model output, and an offline
Python/TensorFlow pipeline that produces the forecasts.

```
Yahoo Finance ─┐
IndianAPI ─────┴──> Express API ──> React SPA
                         │
GitHub Action (16:00 IST) │
   └─ ml-pipeline ──> MongoDB ──┘
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
| `MONGODB_URI` | for caching + predictions | optional; live quotes work without it |
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
- **A real model** — see [`ml-pipeline/README.md`](ml-pipeline/README.md).
  It publishes a number only after clearing a walk-forward baseline test,
  and the API reports `isModelBacked: false` with a reason otherwise.
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
  models/             one canonical Mongoose schema set
api/index.mjs         Vercel entry (re-exports createApp)
backend/server.js     local entry

frontend/src/
  services/marketApi.js   the only network layer; throws, never fabricates
  components/ui/          RangeBar, AnimatedNumber, States (skeleton/error)
  components/             StockChart (candles), IndicatorsPanel, PredictionCard
  pages/

ml-pipeline/          Python: data, features, LSTM, backtest, publish
tests/                cross-language indicator contract test
```

## Verification

```bash
# API — 22 checks across quotes, history, indicators, content, error paths
curl -s localhost:5000/api/health

# Indicators must agree between Node and Python, or the UI would
# contradict the model it displays
python tests/test_indicators.py

# Model validation (~11 min) and the leakage canary
cd ml-pipeline
python main.py --backtest --symbol RELIANCE
python main.py --leak-check --symbol RELIANCE
```

After deploying, confirm on the live site that TCS shows its real price and
that `sk-live` does not appear in the served JS bundle.

## Disclaimer

Forecasts are model output for research and education. Next-day equity
prices are close to a random walk; a low error figure does not imply a
profitable strategy. Nothing here is investment advice.
