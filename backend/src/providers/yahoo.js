/**
 * Yahoo Finance provider.
 *
 * Primary data source. Uses the public v8 chart endpoint, which needs no
 * API key and serves Indian equities via the `.NS` (NSE) / `.BO` (BSE)
 * suffixes, plus indices (^NSEI, ^NSEBANK, ^CNXIT, ^INDIAVIX) and FX
 * (USDINR=X).
 *
 * Caveats this module deliberately handles:
 *  - The endpoint is unofficial and rate-limits with HTTP 429 under load,
 *    so every call goes through retryWithBackoff().
 *  - `meta.marketState` does NOT exist on this endpoint (it lives on the
 *    v7 quote endpoint, which now requires a crumb+cookie). Market status
 *    is derived from `meta.currentTradingPeriod` instead — see
 *    services/marketStatus.js.
 */

import axios from 'axios';

const CHART_HOST = 'https://query1.finance.yahoo.com/v8/finance/chart';
const FALLBACK_HOST = 'https://query2.finance.yahoo.com/v8/finance/chart';

// Yahoo blocks requests without a browser-like UA.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT_MS = 10_000;

/** Ranges Yahoo accepts on this endpoint (from meta.validRanges). */
export const VALID_RANGES = [
  '1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max',
];

/**
 * Symbols that are already fully qualified — indices (^), FX (=X), and
 * anything the caller has explicitly suffixed. Everything else is treated
 * as a bare NSE ticker and gets `.NS` appended.
 */
export function toYahooSymbol(symbol) {
  const s = String(symbol).trim().toUpperCase();
  if (s.startsWith('^') || s.includes('=') || s.includes('.')) return s;
  return `${s}.NS`;
}

/** Strip the exchange suffix for display purposes. */
export function toDisplaySymbol(symbol) {
  return String(symbol).trim().toUpperCase().replace(/\.(NS|BO)$/, '');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry on 429/5xx/network errors with exponential backoff + jitter.
 * 4xx other than 429 are permanent (bad symbol) and fail fast.
 */
async function retryWithBackoff(fn, { retries = 3, baseDelayMs = 400 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable || attempt === retries) break;
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 200;
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Raw chart fetch. Tries query1, then query2 (they rate-limit independently).
 * @returns {Promise<object>} chart.result[0]
 */
async function fetchChart(yahooSymbol, { range = '1d', interval = '1d' } = {}) {
  const params = { interval, range };
  const config = {
    params,
    timeout: REQUEST_TIMEOUT_MS,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    validateStatus: (s) => s === 200,
  };

  const attempt = async (host) => {
    const { data } = await axios.get(`${host}/${encodeURIComponent(yahooSymbol)}`, config);
    const result = data?.chart?.result?.[0];
    if (!result) {
      const msg = data?.chart?.error?.description || 'empty chart result';
      throw new Error(`Yahoo returned no data for ${yahooSymbol}: ${msg}`);
    }
    return result;
  };

  try {
    return await retryWithBackoff(() => attempt(CHART_HOST));
  } catch (err) {
    // query1 exhausted; try the sibling host once before giving up.
    return retryWithBackoff(() => attempt(FALLBACK_HOST), { retries: 1 });
  }
}

/**
 * Normalise a Yahoo chart result into our canonical quote shape.
 * Every provider in this app returns this exact shape.
 */
function normaliseQuote(result, requestedSymbol) {
  const meta = result.meta ?? {};
  const quote = result.indicators?.quote?.[0] ?? {};

  // The last non-null index across the OHLC arrays. Yahoo pads the current
  // day with nulls before the first tick, so we cannot just take [length-1].
  const closes = quote.close ?? [];
  let last = -1;
  for (let i = closes.length - 1; i >= 0; i -= 1) {
    if (closes[i] != null) { last = i; break; }
  }

  const pick = (arr) => (last >= 0 && arr?.[last] != null ? arr[last] : null);

  const price = meta.regularMarketPrice ?? pick(closes);
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;

  // Note: `?? ` not `|| ` throughout — a legitimate 0 must not fall through.
  const change = price != null && previousClose != null ? price - previousClose : null;
  const changePercent =
    change != null && previousClose ? (change / previousClose) * 100 : null;

  return {
    symbol: toDisplaySymbol(requestedSymbol),
    yahooSymbol: meta.symbol ?? toYahooSymbol(requestedSymbol),
    name: meta.longName ?? meta.shortName ?? null,
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? null,
    currency: meta.currency ?? 'INR',

    price,
    change,
    changePercent,

    open: pick(quote.open),
    high: meta.regularMarketDayHigh ?? pick(quote.high),
    low: meta.regularMarketDayLow ?? pick(quote.low),
    close: pick(closes),
    previousClose,
    volume: meta.regularMarketVolume ?? pick(quote.volume),

    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,

    // Yahoo's chart endpoint carries no fundamentals; IndianAPI fills these.
    marketCap: null,
    peRatio: null,
    sector: null,
    industry: null,
    about: null,

    timezone: meta.exchangeTimezoneName ?? 'Asia/Kolkata',
    gmtOffset: meta.gmtoffset ?? 19800,
    tradingPeriod: meta.currentTradingPeriod ?? null,
    marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,

    asOf: new Date().toISOString(),
    source: 'yahoo',
    isStale: false,
  };
}

/** Fetch a single normalised quote. */
export async function getQuote(symbol) {
  const result = await fetchChart(toYahooSymbol(symbol), { range: '1d', interval: '1d' });
  return normaliseQuote(result, symbol);
}

/**
 * Fetch several quotes concurrently. Individual failures are isolated so a
 * single bad symbol never fails the batch.
 * @returns {Promise<{quotes: object[], errors: {symbol,message}[]}>}
 */
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
 * Full OHLCV candles. The old implementation discarded open/high/low and
 * returned close only, which made candlesticks and the ML feature vector
 * impossible — this returns everything.
 *
 * @returns {Promise<{symbol,range,interval,currency,candles,meta,asOf,source}>}
 */
export async function getHistory(symbol, { range = '1y', interval = '1d' } = {}) {
  if (!VALID_RANGES.includes(range)) {
    throw new Error(`Invalid range "${range}". Valid: ${VALID_RANGES.join(', ')}`);
  }

  const yahooSymbol = toYahooSymbol(symbol);
  const result = await fetchChart(yahooSymbol, { range, interval });

  const timestamps = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const adj = result.indicators?.adjclose?.[0]?.adjclose ?? null;

  const candles = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    // Yahoo emits null rows for halted/holiday sessions — drop them rather
    // than forward-filling, which would invent price action.
    if (q.close?.[i] == null) continue;
    candles.push({
      t: timestamps[i] * 1000,
      date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      o: q.open?.[i] ?? null,
      h: q.high?.[i] ?? null,
      l: q.low?.[i] ?? null,
      c: q.close[i],
      v: q.volume?.[i] ?? null,
      ...(adj ? { adjClose: adj[i] ?? null } : {}),
    });
  }

  return {
    symbol: toDisplaySymbol(symbol),
    yahooSymbol,
    range,
    interval,
    currency: result.meta?.currency ?? 'INR',
    candles,
    meta: {
      fiftyTwoWeekHigh: result.meta?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: result.meta?.fiftyTwoWeekLow ?? null,
      timezone: result.meta?.exchangeTimezoneName ?? 'Asia/Kolkata',
      tradingPeriod: result.meta?.currentTradingPeriod ?? null,
    },
    asOf: new Date().toISOString(),
    source: 'yahoo',
  };
}

export default { getQuote, getQuotes, getHistory, toYahooSymbol, toDisplaySymbol, VALID_RANGES };
