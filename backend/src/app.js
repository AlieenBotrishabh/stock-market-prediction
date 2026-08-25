/**
 * The Express app.
 *
 * ONE app, two thin entry points: backend/server.js (local `node server.js`)
 * and api/index.mjs (Vercel serverless). Previously server.js and
 * vercel-app.js were separate divergent apps with copy-pasted route
 * handlers and conflicting schemas.
 *
 * Design rules enforced here:
 *  - No handler ever invents data. Upstream failure yields a 4xx/5xx with
 *    an explanatory message, or cached data explicitly flagged isStale.
 *  - Predictions run LIVE: /predict executes an exported ONNX graph at
 *    request time. If no validated model exists for a symbol, the response
 *    says so via isModelBacked:false rather than returning a plausible
 *    number.
 */

import express from 'express';
import cors from 'cors';
import { connectDb, isConnected, isConfigured } from './db.js';
import providers from './providers/index.js';
import { indian } from './providers/index.js';
import indicators from './services/indicators.js';
import predictor from './services/predictor.js';
import { setCacheHeaders } from './services/cache.js';
import { Watchlist } from './models/index.js';

/** Wrap an async handler so rejections reach the error middleware. */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Consistent success envelope. */
const ok = (res, data, extra = {}) => res.json({ success: true, data, ...extra });

/** Validate a ticker before it reaches an upstream URL. */
function cleanSymbol(raw) {
  const s = String(raw ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9^&.=-]{1,20}$/.test(s)) {
    const err = new Error(`Invalid symbol: ${raw}`);
    err.status = 400;
    throw err;
  }
  return s;
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  const allowed = (process.env.FRONTEND_URL ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin: allowed.length ? allowed : true,
      credentials: false,
    }),
  );

  // Open the DB connection opportunistically; never block the request.
  app.use((req, _res, next) => {
    if (isConfigured() && !isConnected()) connectDb().catch(() => {});
    next();
  });

  const api = express.Router();

  // ─── Health ────────────────────────────────────────────────────────────
  api.get('/health', ah(async (_req, res) => {
    ok(res, {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      mongo: isConfigured() ? (isConnected() ? 'connected' : 'configured-but-down') : 'not-configured',
      indianApi: indian.hasApiKey() ? 'configured' : 'not-configured',
      node: process.version,
      time: new Date().toISOString(),
    });
  }));

  // ─── Market status ─────────────────────────────────────────────────────
  api.get('/market/status', ah(async (_req, res) => {
    const status = await providers.getMarketState();
    setCacheHeaders(res, 'marketStatus', providers.getMarketHints());
    ok(res, status);
  }));

  api.get('/market/indices', ah(async (_req, res) => {
    const { indices, errors } = await providers.getIndices();
    setCacheHeaders(res, 'quote', providers.getMarketHints());
    ok(res, indices, errors.length ? { warnings: errors } : {});
  }));

  // ─── Quotes ────────────────────────────────────────────────────────────
  api.get('/quote/:symbol', ah(async (req, res) => {
    const symbol = cleanSymbol(req.params.symbol);
    const detailed = req.query.detailed !== 'false';
    const quote = detailed
      ? await providers.getQuoteDetailed(symbol)
      : await providers.getQuote(symbol);
    setCacheHeaders(res, 'quote', providers.getMarketHints());
    ok(res, quote);
  }));

  /** Batch quotes: /api/quotes?symbols=TCS,INFY,RELIANCE */
  api.get('/quotes', ah(async (req, res) => {
    const list = String(req.query.symbols ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30);
    if (!list.length) {
      return res.status(400).json({ success: false, error: 'symbols query parameter is required' });
    }
    const { quotes, errors } = await providers.getQuotes(list.map(cleanSymbol));
    setCacheHeaders(res, 'quote', providers.getMarketHints());
    ok(res, quotes, errors.length ? { warnings: errors } : {});
  }));

  // ─── History (full OHLCV) ──────────────────────────────────────────────
  api.get('/history/:symbol', ah(async (req, res) => {
    const symbol = cleanSymbol(req.params.symbol);
    const range = String(req.query.range ?? '1y');
    const interval = String(req.query.interval ?? '1d');
    const history = await providers.getHistory(symbol, { range, interval });
    setCacheHeaders(res, interval === '1d' ? 'history' : 'intraday', providers.getMarketHints());
    ok(res, history);
  }));

  // ─── Technical indicators ──────────────────────────────────────────────
  api.get('/indicators/:symbol', ah(async (req, res) => {
    const symbol = cleanSymbol(req.params.symbol);
    // 1y of daily bars is the minimum for a meaningful SMA-200.
    const range = String(req.query.range ?? '2y');
    const history = await providers.getHistory(symbol, { range, interval: '1d' });

    if (history.candles.length < 30) {
      return res.status(422).json({
        success: false,
        error: `Only ${history.candles.length} bars available for ${symbol}; need at least 30.`,
      });
    }

    const { series, latest } = indicators.computeAll(history.candles);
    const includeSeries = req.query.series === 'true';

    setCacheHeaders(res, 'history', providers.getMarketHints());
    ok(res, {
      symbol,
      latest,
      dates: includeSeries ? history.candles.map((c) => c.date) : undefined,
      series: includeSeries ? series : undefined,
      barsUsed: history.candles.length,
      asOf: history.asOf,
      isStale: history.isStale,
    });
  }));

  // ─── Predictions (live ONNX inference at request time) ─────────────────
  api.get('/predict/:symbol', ah(async (req, res) => {
    const symbol = cleanSymbol(req.params.symbol);

    // Inference runs here and now: the exported ONNX graph is executed
    // against the latest available bars. There is no nightly batch to go
    // stale, so `generatedAt` is always the moment of the request.
    const prediction = await predictor.predict(symbol);

    if (prediction.isModelBacked) {
      // Show the live price alongside the forecast so a forecast made from
      // yesterday's close is obvious while today's session is running.
      try {
        prediction.currentPrice = (await providers.getQuote(symbol)).price;
      } catch { /* the forecast still stands without it */ }
    }

    // Deliberately NOT the shared stale-while-revalidate policy used for
    // quotes. Inference is 4 ms and the history behind it is already cached
    // server-side, so there is nothing to gain — while a long SWR window
    // actively harms correctness: after a model is retrained and starts
    // passing its gate, clients kept serving the cached "no forecast
    // available" text for up to a day. Short and revalidating.
    res.set('Cache-Control', 'public, max-age=30, s-maxage=60, must-revalidate');
    ok(res, prediction);
  }));

  /**
   * Live forecast for every company that has a bundle.
   *
   * Returns withheld companies too, with their reason — the page needs to
   * show that a company was evaluated and did not qualify, which is
   * different from it not existing.
   */
  api.get('/predictions', ah(async (_req, res) => {
    const symbols = await predictor.listLocalModels();
    if (!symbols.length) return ok(res, { served: [], withheld: [], total: 0 });

    const settled = await Promise.allSettled(symbols.map((s) => predictor.predict(s)));
    const served = [];
    const withheld = [];

    for (const r of settled) {
      if (r.status !== 'fulfilled') continue;
      const p = r.value;
      if (p.isModelBacked) {
        served.push({
          symbol: p.symbol,
          basePrice: p.basePrice,
          predictedClose: p.predictedClose,
          predictedChange: p.predictedChange,
          predictedChangePercent: p.predictedChangePercent,
          direction: p.direction,
          confidenceLow: p.confidenceLow,
          confidenceHigh: p.confidenceHigh,
          directionAccuracy: p.backtest?.directionAccuracy ?? null,
          mape: p.backtest?.mape ?? null,
          baselineMape: p.backtest?.baselineMape ?? null,
          generatedAt: p.generatedAt,
        });
      } else {
        withheld.push({ symbol: p.symbol, reason: p.unavailableReason });
      }
    }

    served.sort((a, b) =>
      Math.abs(b.predictedChangePercent ?? 0) - Math.abs(a.predictedChangePercent ?? 0));

    setCacheHeaders(res, 'quote', providers.getMarketHints());
    ok(res, { served, withheld, total: symbols.length });
  }));

  // ─── Market movers ─────────────────────────────────────────────────────
  api.get('/trending', ah(async (_req, res) => {
    const r = await providers.getTrending();
    setCacheHeaders(res, 'quote', providers.getMarketHints());
    ok(res, r.data, { asOf: r.asOf, isStale: r.isStale });
  }));

  api.get('/most-active', ah(async (req, res) => {
    const exchange = String(req.query.exchange ?? 'NSE').toUpperCase() === 'BSE' ? 'BSE' : 'NSE';
    const r = await providers.getMostActive(exchange);
    setCacheHeaders(res, 'quote', providers.getMarketHints());
    ok(res, r.data, { exchange, asOf: r.asOf, isStale: r.isStale });
  }));

  api.get('/price-shockers', ah(async (_req, res) => {
    const r = await providers.getPriceShockers();
    setCacheHeaders(res, 'quote', providers.getMarketHints());
    ok(res, r.data, { asOf: r.asOf, isStale: r.isStale });
  }));

  // ─── Content ───────────────────────────────────────────────────────────
  api.get('/news', ah(async (req, res) => {
    const symbol = req.query.symbol ? cleanSymbol(req.query.symbol) : undefined;
    const r = await providers.getNews(symbol);
    setCacheHeaders(res, 'news', providers.getMarketHints());
    ok(res, r.data, { asOf: r.asOf, isStale: r.isStale });
  }));

  api.get('/ipo', ah(async (_req, res) => {
    const r = await providers.getIpos();
    setCacheHeaders(res, 'listing', providers.getMarketHints());
    ok(res, r.data, { asOf: r.asOf, isStale: r.isStale });
  }));

  api.get('/mutual-funds', ah(async (_req, res) => {
    const r = await providers.getMutualFunds();
    setCacheHeaders(res, 'listing', providers.getMarketHints());
    ok(res, r.data, { asOf: r.asOf, isStale: r.isStale });
  }));

  api.get('/commodities', ah(async (_req, res) => {
    const r = await providers.getCommodities();
    setCacheHeaders(res, 'listing', providers.getMarketHints());
    ok(res, r.data, { asOf: r.asOf, isStale: r.isStale });
  }));

  api.get('/announcements/:symbol', ah(async (req, res) => {
    const symbol = cleanSymbol(req.params.symbol);
    const r = await providers.getAnnouncements(symbol);
    setCacheHeaders(res, 'news', providers.getMarketHints());
    ok(res, r.data, { asOf: r.asOf, isStale: r.isStale });
  }));

  api.get('/corporate-actions/:symbol', ah(async (req, res) => {
    const symbol = cleanSymbol(req.params.symbol);
    const r = await providers.getCorporateActions(symbol);
    setCacheHeaders(res, 'fundamentals', providers.getMarketHints());
    ok(res, r.data, { asOf: r.asOf, isStale: r.isStale });
  }));

  api.get('/fundamentals/:symbol', ah(async (req, res) => {
    const symbol = cleanSymbol(req.params.symbol);
    const r = await providers.getFundamentals(symbol);
    setCacheHeaders(res, 'fundamentals', providers.getMarketHints());
    ok(res, r.data, { asOf: r.asOf, isStale: r.isStale });
  }));

  // ─── Watchlist ─────────────────────────────────────────────────────────
  api.get('/watchlist/:userId', ah(async (req, res) => {
    if (!isConnected()) return ok(res, { userId: req.params.userId, symbols: [] });
    const doc = await Watchlist.findOne({ userId: req.params.userId }).lean();
    ok(res, { userId: req.params.userId, symbols: doc?.symbols ?? [] });
  }));

  api.put('/watchlist/:userId', ah(async (req, res) => {
    if (!isConnected()) {
      return res.status(503).json({ success: false, error: 'Watchlist storage is unavailable.' });
    }
    const symbols = Array.isArray(req.body?.symbols)
      ? req.body.symbols.map(cleanSymbol).slice(0, 100)
      : [];
    const doc = await Watchlist.findOneAndUpdate(
      { userId: req.params.userId },
      { userId: req.params.userId, symbols },
      { upsert: true, new: true },
    ).lean();
    ok(res, { userId: doc.userId, symbols: doc.symbols });
  }));

  // ─── Backwards-compatible aliases ──────────────────────────────────────
  // The deployed frontend calls these; keep them working through a deploy.
  api.get('/yahoo/details/:symbol', ah(async (req, res) => {
    const quote = await providers.getQuoteDetailed(cleanSymbol(req.params.symbol));
    ok(res, {
      ...quote,
      currentPrice: quote.price,
      dayHigh: quote.high,
      dayLow: quote.low,
      companyName: quote.name,
    });
  }));

  api.get('/yahoo/historical/:symbol', ah(async (req, res) => {
    const history = await providers.getHistory(cleanSymbol(req.params.symbol), {
      range: String(req.query.range ?? '1mo'),
    });
    // Legacy shape: [{date, price, volume}] — plus full OHLC alongside.
    ok(res, history.candles.map((c) => ({
      date: c.date, price: c.c, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v,
    })));
  }));

  app.use('/api', api);

  // ─── 404 ───────────────────────────────────────────────────────────────
  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      error: `No API route for ${req.method} ${req.originalUrl}`,
      endpoints: api.stack
        .filter((l) => l.route)
        .map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} /api${l.route.path}`),
    });
  });

  // ─── Errors ────────────────────────────────────────────────────────────
  app.use((err, _req, res, _next) => {
    const status = err.status ?? (err.code === 'NO_API_KEY' ? 503 : 502);
    if (status >= 500) console.error('[api]', err.message);
    res.status(status).json({
      success: false,
      error: err.message ?? 'Upstream request failed',
      // Explicitly tell the client this is a failure, not empty data, so it
      // renders an error state rather than a blank or fabricated one.
      code: err.code ?? 'UPSTREAM_ERROR',
    });
  });

  return app;
}

export default createApp;
