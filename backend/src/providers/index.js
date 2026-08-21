/**
 * Unified market-data facade.
 *
 * One place that decides where data comes from, so routes never talk to a
 * provider directly and the UI never has to guess which shape it got.
 *
 * Policy:
 *   quotes/history  Yahoo primary  -> IndianAPI fallback -> stale cache
 *   fundamentals    IndianAPI only (Yahoo's chart endpoint has none)
 *   news/IPO/MF/…   IndianAPI only
 *
 * Every path returns the canonical object documented in yahoo.js, with
 * `source` recording where it actually came from. Nothing here invents a
 * value: when all sources fail, the error propagates.
 */

import * as yahoo from './yahoo.js';
import * as indian from './indian.js';
import { withCache } from '../services/cache.js';
import { getMarketStatus } from '../services/marketStatus.js';

/**
 * Market hints (exchange trading period) used to size cache TTLs.
 * Kept in module scope and refreshed opportunistically from any quote we
 * fetch, so we rarely need a dedicated request for it.
 */
let marketHints = {};

function rememberHints(quote) {
  if (quote?.tradingPeriod) {
    marketHints = { tradingPeriod: quote.tradingPeriod, marketTimeMs: quote.marketTime };
  }
  return quote;
}

export function getMarketHints() {
  return marketHints;
}

/** Merge IndianAPI fundamentals onto a Yahoo quote without overwriting live prices. */
function mergeFundamentals(quote, fundamentals) {
  if (!fundamentals) return quote;
  return {
    ...quote,
    name: quote.name ?? fundamentals.name,
    marketCap: quote.marketCap ?? fundamentals.marketCap,
    peRatio: quote.peRatio ?? fundamentals.peRatio,
    sector: quote.sector ?? fundamentals.industry,
    industry: quote.industry ?? fundamentals.industry,
    about: quote.about ?? fundamentals.about,
    dividendYield: fundamentals.dividendYield ?? null,
    // Yahoo's 52-week figures are authoritative; fall back to IndianAPI's.
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? fundamentals.yearHigh,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? fundamentals.yearLow,
  };
}

/**
 * A quote with no price is not a quote. Providers can return HTTP 200 with
 * an empty body for an unknown ticker; without this guard that surfaces as
 * a successful response full of nulls, which is precisely the silent-empty
 * -data failure mode this rewrite exists to remove.
 */
function assertUsable(quote, symbol) {
  if (quote?.price == null || !Number.isFinite(quote.price)) {
    const err = new Error(`No market data found for symbol "${symbol}".`);
    err.status = 404;
    err.code = 'SYMBOL_NOT_FOUND';
    throw err;
  }
  return quote;
}

/**
 * A single quote, Yahoo first.
 * @returns {Promise<object>} canonical quote with `source` and `isStale`
 */
export async function getQuote(symbol, { forceRefresh = false } = {}) {
  const key = `quote:${String(symbol).toUpperCase()}`;

  const result = await withCache(
    key,
    'quote',
    async () => {
      try {
        return assertUsable(rememberHints(await yahoo.getQuote(symbol)), symbol);
      } catch (yahooErr) {
        if (!indian.hasApiKey()) throw yahooErr;
        try {
          return assertUsable(await indian.getQuote(symbol), symbol);
        } catch (indianErr) {
          // Surface "not found" over a transient network error: if both
          // providers agree the symbol has no data, that is the real answer.
          throw indianErr.code === 'SYMBOL_NOT_FOUND' ? indianErr : yahooErr;
        }
      }
    },
    { marketHints, forceRefresh },
  );

  return { ...result.data, asOf: result.asOf, isStale: result.isStale, cached: result.cached };
}

/** Several quotes at once; individual failures are isolated. */
export async function getQuotes(symbols) {
  const settled = await Promise.allSettled(symbols.map((s) => getQuote(s)));
  const quotes = [];
  const errors = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') quotes.push(r.value);
    else errors.push({ symbol: symbols[i], message: r.reason?.message ?? 'failed' });
  });
  return { quotes, errors };
}

/**
 * Wait for `promise`, but give up after `ms` and resolve null instead.
 * The underlying promise keeps running so its result still populates the
 * cache for the next caller.
 */
function withDeadline(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      () => { clearTimeout(timer); resolve(null); },
    );
  });
}

/** How long a quote request will wait on fundamentals before giving up. */
const FUNDAMENTALS_DEADLINE_MS = 3500;

/**
 * A quote enriched with IndianAPI fundamentals (market cap, P/E, About).
 *
 * The fundamentals lookup is bounded by a deadline: IndianAPI's /stock
 * response is ~780 KB and on a cold cache has been observed to take longer
 * than the client's whole timeout, which made the entire detail page fail
 * with "request timed out" even though the price was available instantly.
 * The price is what matters, so it is never held hostage to the extras —
 * and the slow call still warms the cache for the next request.
 */
export async function getQuoteDetailed(symbol) {
  const quote = await getQuote(symbol);
  if (!indian.hasApiKey()) return quote;

  const fundamentalsPromise = withCache(
    `fundamentals:${String(symbol).toUpperCase()}`,
    'fundamentals',
    () => indian.getFundamentals(symbol),
    { marketHints },
  ).then((r) => r.data);

  const fundamentals = await withDeadline(fundamentalsPromise, FUNDAMENTALS_DEADLINE_MS);
  return fundamentals ? mergeFundamentals(quote, fundamentals) : quote;
}

/** Full OHLCV candles. */
export async function getHistory(symbol, { range = '1y', interval = '1d', forceRefresh = false } = {}) {
  const kind = interval === '1d' ? 'history' : 'intraday';
  const key = `history:${String(symbol).toUpperCase()}:${range}:${interval}`;
  const result = await withCache(
    key,
    kind,
    () => yahoo.getHistory(symbol, { range, interval }),
    { marketHints, forceRefresh },
  );
  return { ...result.data, asOf: result.asOf, isStale: result.isStale, cached: result.cached };
}

/** Current NSE session state. */
export async function getMarketState() {
  try {
    // Refresh hints from the index rather than a single stock — the index
    // trades whenever the exchange is open.
    const nifty = await getQuote('^NSEI');
    void nifty;
  } catch {
    /* fall through to clock-based status */
  }
  return getMarketStatus(marketHints);
}

/** Benchmark indices for the header/banner. */
export const INDEX_SYMBOLS = [
  { symbol: '^NSEI', label: 'NIFTY 50' },
  { symbol: '^NSEBANK', label: 'BANK NIFTY' },
  { symbol: '^CNXIT', label: 'NIFTY IT' },
  { symbol: '^BSESN', label: 'SENSEX' },
  { symbol: '^INDIAVIX', label: 'INDIA VIX' },
];

export async function getIndices() {
  const { quotes, errors } = await getQuotes(INDEX_SYMBOLS.map((i) => i.symbol));
  const labelFor = (s) => INDEX_SYMBOLS.find((i) => i.symbol === s || i.symbol === `^${s}`)?.label;
  return {
    indices: quotes.map((q) => ({ ...q, label: labelFor(q.yahooSymbol ?? q.symbol) ?? q.name })),
    errors,
  };
}

// ─── IndianAPI-only passthroughs, each cached ────────────────────────────

const cachedIndian = (key, kind, fn) => async (...args) => {
  const result = await withCache(key(...args), kind, () => fn(...args), { marketHints });
  return { data: result.data, asOf: result.asOf, isStale: result.isStale, cached: result.cached };
};

export const getNews = cachedIndian(
  (symbol) => `news:${symbol ?? 'all'}`, 'news', (symbol) => indian.getNews(symbol),
);
export const getIpos = cachedIndian(() => 'ipo:all', 'listing', () => indian.getIpos());
export const getMutualFunds = cachedIndian(() => 'mf:all', 'listing', () => indian.getMutualFunds());
export const getCommodities = cachedIndian(() => 'commodities:all', 'listing', () => indian.getCommodities());
export const getTrending = cachedIndian(() => 'trending:all', 'quote', () => indian.getTrending());
export const getMostActive = cachedIndian(
  (ex = 'NSE') => `mostactive:${ex}`, 'quote', (ex) => indian.getMostActive(ex),
);
export const getPriceShockers = cachedIndian(() => 'shockers:all', 'quote', () => indian.getPriceShockers());
export const getAnnouncements = cachedIndian(
  (symbol) => `announcements:${symbol}`, 'news', (symbol) => indian.getRecentAnnouncements(symbol),
);
export const getCorporateActions = cachedIndian(
  (symbol) => `corpactions:${symbol}`, 'fundamentals', (symbol) => indian.getCorporateActions(symbol),
);
export const getFundamentals = cachedIndian(
  (symbol) => `fundamentals:${String(symbol).toUpperCase()}`,
  'fundamentals',
  (symbol) => indian.getFundamentals(symbol),
);

export { yahoo, indian };

export default {
  getQuote, getQuotes, getQuoteDetailed, getHistory, getMarketState,
  getIndices, getNews, getIpos, getMutualFunds, getCommodities,
  getTrending, getMostActive, getPriceShockers, getAnnouncements,
  getCorporateActions, getFundamentals, getMarketHints, INDEX_SYMBOLS,
};
