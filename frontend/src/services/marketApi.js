/**
 * Market data client.
 *
 * Replaces services/indianApi.js, which called stock.indianapi.in directly
 * from the browser with a hardcoded `sk-live-...` key, and fell back to
 * hardcoded mock data whenever a call failed — silently, via console.warn.
 * Users saw invented prices (mock TCS ₹3,850 against a real ₹2,297) with
 * no indication anything was wrong.
 *
 * Two rules this module exists to enforce:
 *   1. Every request goes to our own backend at VITE_API_URL (default
 *      "/api"). No third-party key ever reaches the browser.
 *   2. A failed request throws. It never substitutes plausible-looking
 *      numbers. Callers render an error state; the UI is allowed to show
 *      nothing, but never something false.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const DEFAULT_TIMEOUT_MS = 15_000;

/** Error carrying HTTP status and the backend's machine-readable code. */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', url } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.url = url;
    /** True when the symbol simply does not exist — callers show "not found". */
    this.isNotFound = status === 404 || code === 'SYMBOL_NOT_FOUND';
  }
}

/**
 * Fetch JSON from the backend.
 * @returns {Promise<{data:any, asOf?:string, isStale?:boolean, warnings?:any[]}>}
 */
async function request(path, { signal, timeout = DEFAULT_TIMEOUT_MS, ...init } = {}) {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();

  // Distinguishes "our timer fired" from "the caller cancelled". Both
  // surface as AbortError from fetch, but they mean different things: a
  // timeout is a real failure to show the user, while a cancellation is
  // routine (React StrictMode's double-mount, or navigating away) and must
  // propagate as an AbortError so callers can ignore it. Conflating them
  // made every page render "Request timed out" from the discarded first
  // mount, even though the second request had succeeded.
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);

  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  let res;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      if (timedOut) throw new ApiError('Request timed out', { code: 'TIMEOUT', url });
      // Caller-initiated: rethrow as a plain AbortError.
      const abortErr = new Error('Aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw new ApiError('Could not reach the server', { code: 'NETWORK', url });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onExternalAbort);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(`Malformed response from ${path}`, { status: res.status, url });
  }

  if (!res.ok || body?.success === false) {
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, {
      status: res.status,
      code: body?.code ?? 'REQUEST_FAILED',
      url,
    });
  }

  return body;
}

/** Unwrap to just the payload when the envelope metadata isn't needed. */
const data = (p, opts) => request(p, opts).then((b) => b.data);

const qs = (params) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== ''),
  ).toString();
  return s ? `?${s}` : '';
};

// ─── Market ──────────────────────────────────────────────────────────────

/** Live NSE session state. Holiday-accurate when exchange data is available. */
export const getMarketStatus = (opts) => data('/market/status', opts);

/** NIFTY 50, BANK NIFTY, NIFTY IT, SENSEX, INDIA VIX. */
export const getIndices = (opts) => data('/market/indices', opts);

// ─── Quotes ──────────────────────────────────────────────────────────────

/**
 * One quote. `detailed` adds fundamentals (market cap, P/E, About).
 * @throws {ApiError} with isNotFound=true for unknown symbols.
 */
export const getQuote = (symbol, { detailed = true, ...opts } = {}) =>
  data(`/quote/${encodeURIComponent(symbol)}${qs({ detailed })}`, opts);

/**
 * Many quotes in one request — replaces the old pattern of firing 15+
 * parallel requests from HomePage on every keystroke.
 * @returns {Promise<{quotes:object[], warnings:object[]}>}
 */
export async function getQuotes(symbols, opts) {
  const body = await request(`/quotes${qs({ symbols: symbols.join(',') })}`, opts);
  return { quotes: body.data ?? [], warnings: body.warnings ?? [] };
}

// ─── History & indicators ────────────────────────────────────────────────

/**
 * Full OHLCV candles for charting.
 * @param {string} range 1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max
 * @returns {Promise<{candles:{t,date,o,h,l,c,v}[]}>}
 */
export const getHistory = (symbol, { range = '1y', interval = '1d', ...opts } = {}) =>
  data(`/history/${encodeURIComponent(symbol)}${qs({ range, interval })}`, opts);

/** RSI, MACD, ATR, SMA/EMA, Bollinger. `series:true` returns full arrays. */
export const getIndicators = (symbol, { series = false, range = '2y', ...opts } = {}) =>
  data(`/indicators/${encodeURIComponent(symbol)}${qs({ series, range })}`, opts);

// ─── Predictions ─────────────────────────────────────────────────────────

/**
 * Model forecast for a symbol.
 *
 * ALWAYS check `isModelBacked` before rendering a number. When it is
 * false, `unavailableReason` explains why and every price field is null —
 * the UI must show that reason, not a placeholder value. This is the
 * contract that prevents a repeat of the old build, where a character-code
 * hash of the ticker was presented as an AI prediction.
 */
export const getPrediction = (symbol, opts) =>
  data(`/predict/${encodeURIComponent(symbol)}`, opts);

/** Every symbol that currently has a usable model. */
export const getPredictions = (opts) => data('/predictions', opts);

// ─── Movers ──────────────────────────────────────────────────────────────

/** @returns {Promise<{gainers:object[], losers:object[]}>} */
export const getTrending = (opts) => data('/trending', opts);
export const getMostActive = (exchange = 'NSE', opts) =>
  data(`/most-active${qs({ exchange })}`, opts);
export const getPriceShockers = (opts) => data('/price-shockers', opts);

// ─── Content ─────────────────────────────────────────────────────────────

/** @returns {Promise<{title,summary,url,imageUrl,publishedAt,source}[]>} */
export const getNews = (symbol, opts) => data(`/news${qs({ symbol })}`, opts);

/** @returns {Promise<{upcoming:[],active:[],listed:[],closed:[]}>} */
export const getIpos = (opts) => data('/ipo', opts);

/** @returns {Promise<{funds:object[], categories:string[]}>} */
export const getMutualFunds = (opts) => data('/mutual-funds', opts);

export const getCommodities = (opts) => data('/commodities', opts);
export const getAnnouncements = (symbol, opts) =>
  data(`/announcements/${encodeURIComponent(symbol)}`, opts);
export const getCorporateActions = (symbol, opts) =>
  data(`/corporate-actions/${encodeURIComponent(symbol)}`, opts);
export const getFundamentals = (symbol, opts) =>
  data(`/fundamentals/${encodeURIComponent(symbol)}`, opts);

export const getHealth = () => data('/health');

export default {
  getMarketStatus, getIndices, getQuote, getQuotes, getHistory, getIndicators,
  getPrediction, getPredictions, getTrending, getMostActive, getPriceShockers,
  getNews, getIpos, getMutualFunds, getCommodities, getAnnouncements,
  getCorporateActions, getFundamentals, getHealth, ApiError,
};
