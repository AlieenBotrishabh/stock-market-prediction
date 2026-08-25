/**
 * IndianAPI (stock.indianapi.in) provider.
 *
 * Server-side only. The key is read from process.env.INDIAN_API_KEY and
 * MUST NOT be exposed to the browser — the previous build shipped it in
 * the JS bundle via a VITE_ variable and a hardcoded literal.
 *
 * Role: fallback for quotes, and primary for everything Yahoo does not
 * carry — fundamentals (market cap, P/E, company description), news, IPOs,
 * mutual funds, commodities.
 *
 * Response shapes below were captured from the live API; they differ from
 * what the old frontend assumed, which is why those pages rendered blank
 * even when a call succeeded.
 */

import axios from 'axios';

const BASE_URL = process.env.INDIAN_API_BASE_URL || 'https://stock.indianapi.in';
const TIMEOUT_MS = 12_000;

export function hasApiKey() {
  return Boolean(process.env.INDIAN_API_KEY);
}

function client() {
  const key = process.env.INDIAN_API_KEY;
  if (!key) {
    const err = new Error(
      'INDIAN_API_KEY is not set. IndianAPI-backed data is unavailable.',
    );
    err.code = 'NO_API_KEY';
    throw err;
  }
  return axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT_MS,
    headers: { 'X-Api-Key': key, Accept: 'application/json' },
  });
}

/**
 * IndianAPI answers HTTP 200 with `{ error: "..." }` when one of its own
 * upstreams fails (it proxies screener.in, which goes down independently).
 * Treating that body as "no data" would render an empty section implying
 * the company genuinely has no filings. Raise instead, so the caller can
 * serve a cached copy or the UI can say the source is unavailable.
 */
function assertNotUpstreamError(data, what) {
  if (data && !Array.isArray(data) && typeof data === 'object' && typeof data.error === 'string') {
    const err = new Error(`IndianAPI could not fetch ${what}: ${data.error.slice(0, 160)}`);
    err.code = 'UPSTREAM_PROVIDER_ERROR';
    err.status = 502;
    throw err;
  }
  return data;
}

const num = (v) => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

/**
 * Full company payload for a symbol.
 * Shape: { companyName, industry, companyProfile:{companyDescription,...},
 *          currentPrice:{BSE,NSE} (strings!), percentChange, yearHigh,
 *          yearLow, stockDetailsReusableData:{...}, recentNews:[...] }
 */
export async function getStock(name) {
  const { data } = await client().get('/stock', { params: { name } });
  return data;
}

/**
 * Fundamentals Yahoo's chart endpoint does not carry. These are the fields
 * that made StockDetailsPage show "—" for Market Cap / P/E / About.
 */
export async function getFundamentals(name) {
  const d = await getStock(name);
  const r = d?.stockDetailsReusableData ?? {};
  const profile = d?.companyProfile ?? {};

  return {
    symbol: String(name).toUpperCase(),
    name: d?.companyName ?? null,
    industry: d?.industry ?? profile.mgIndustry ?? null,
    about: profile.companyDescription ?? null,

    marketCap: num(r.marketCap),
    peRatio: num(r.pPerEBasicExcludingExtraordinaryItemsTTM),
    dividendYield: num(r.currentDividendYieldCommonStockPrimaryIssueLTM),
    debtToEquity: num(r.totalDebtPerTotalEquityMostRecentQuarter),
    sectorPe: num(r.sectorPriceToEarningsValueRatio),

    yearHigh: num(d?.yearHigh) ?? num(r.yhigh),
    yearLow: num(d?.yearLow) ?? num(r.ylow),

    returnYtd: num(r.priceYTDPricePercentChange),
    return5Day: num(r.price5DayPercentChange),

    promoterHolding: num(r.promoterShareHolding),
    mutualFundHolding: num(r.mutualFundShareHolding),
    analystRating: r.averageRating ?? null,
    peers: Array.isArray(r.peerCompanyList)
      ? r.peerCompanyList.slice(0, 10).map((p) => ({
          name: p.companyName ?? p.company_name ?? null,
          price: num(p.price),
          changePercent: num(p.percentChange),
          marketCap: num(p.marketCap),
          peRatio: num(p.priceToEarningsValueRatio),
        }))
      : [],

    asOf: new Date().toISOString(),
    source: 'indian',
  };
}

/**
 * Quote fallback when Yahoo is unavailable. Note `currentPrice` is an
 * object of exchange->string, not a number.
 */
export async function getQuote(name) {
  const d = await getStock(name);
  const r = d?.stockDetailsReusableData ?? {};
  const price = num(d?.currentPrice?.NSE) ?? num(d?.currentPrice?.BSE) ?? num(r.price);
  const changePercent = num(d?.percentChange) ?? num(r.percentChange);
  const close = num(r.close);
  const change = price != null && close != null ? price - close : null;

  return {
    symbol: String(name).toUpperCase(),
    name: d?.companyName ?? null,
    exchange: 'NSE',
    currency: 'INR',
    price,
    change,
    changePercent,
    open: null,
    high: num(r.high),
    low: num(r.low),
    close: price,
    previousClose: close,
    volume: null,
    fiftyTwoWeekHigh: num(d?.yearHigh) ?? num(r.yhigh),
    fiftyTwoWeekLow: num(d?.yearLow) ?? num(r.ylow),
    marketCap: num(r.marketCap),
    peRatio: num(r.pPerEBasicExcludingExtraordinaryItemsTTM),
    sector: d?.industry ?? null,
    industry: d?.industry ?? null,
    about: d?.companyProfile?.companyDescription ?? null,
    asOf: new Date().toISOString(),
    source: 'indian',
    isStale: false,
  };
}

/**
 * IndianAPI's `ticker_id` is an internal identifier (e.g. "S0003045"), not
 * an exchange ticker, so it must never be shown as a symbol or used to
 * build a stock-detail link. Detected here and discarded.
 */
const isInternalId = (v) => /^S\d{6,}$/i.test(String(v ?? ''));

/** Trending. Shape: { trending_stocks: { top_gainers:[], top_losers:[] } } */
export async function getTrending() {
  const { data } = await client().get('/trending');
  const t = data?.trending_stocks ?? {};
  const map = (arr) =>
    (Array.isArray(arr) ? arr : []).map((s) => ({
      // Null rather than a fake symbol: the UI falls back to the company
      // name and skips the link instead of routing to a dead page.
      symbol: isInternalId(s.ticker_id) ? null : (s.ticker_id ?? null),
      name: s.company_name ?? null,
      price: num(s.price),
      change: num(s.net_change),
      changePercent: num(s.percent_change),
      high: num(s.high),
      low: num(s.low),
      open: num(s.open),
      volume: num(s.volume),
    }));
  return {
    gainers: map(t.top_gainers),
    losers: map(t.top_losers),
    asOf: new Date().toISOString(),
    source: 'indian',
  };
}

/**
 * News. Live shape is a flat array of
 * { title, summary, url, image_url, pub_date, source, topics[] }.
 * The old frontend looked for `headline`/`description`, so titles rendered
 * blank even on success.
 */
export async function getNews(symbol) {
  const params = symbol ? { stock_name: symbol } : {};
  const { data } = await client().get('/news', { params });
  assertNotUpstreamError(data, 'news');
  const arr = Array.isArray(data) ? data : data?.news ?? data?.data ?? [];
  return arr.map((n, i) => ({
    id: n.id ?? `${n.pub_date ?? ''}-${i}`,
    title: n.title ?? n.headline ?? null,
    summary: n.summary ?? n.description ?? null,
    url: n.url ?? null,
    imageUrl: n.image_url ?? n.listimage ?? n.thumbnailImage ?? null,
    publishedAt: n.pub_date ?? n.date ?? n.lastPublishedDate ?? null,
    source: n.source ?? null,
    topics: Array.isArray(n.topics) ? n.topics : [],
  }));
}

/** IPOs. Shape: { upcoming:[], listed:[], active?:[], closed?:[] } */
export async function getIpos() {
  const { data } = await client().get('/ipo');
  const map = (arr, status) =>
    (Array.isArray(arr) ? arr : []).map((i) => ({
      symbol: i.symbol ?? null,
      name: i.name ?? null,
      status: i.status ?? status,
      isSme: Boolean(i.is_sme),
      priceMin: num(i.min_price),
      priceMax: num(i.max_price),
      issuePrice: num(i.issue_price),
      listingPrice: num(i.listing_price),
      listingGains: num(i.listing_gains),
      biddingStart: i.bidding_start_date ?? null,
      biddingEnd: i.bidding_end_date ?? null,
      listingDate: i.listing_date ?? null,
      note: i.additional_text ?? null,
    }));
  return {
    upcoming: map(data?.upcoming, 'upcoming'),
    active: map(data?.active, 'active'),
    listed: map(data?.listed, 'listed'),
    closed: map(data?.closed, 'closed'),
    asOf: new Date().toISOString(),
    source: 'indian',
  };
}

/**
 * Mutual funds. Live shape is nested: category -> subCategory -> fund[].
 * Flattened here so the UI can filter without knowing the nesting.
 */
export async function getMutualFunds() {
  const { data } = await client().get('/mutual_funds');
  const funds = [];
  for (const [category, subs] of Object.entries(data ?? {})) {
    if (!subs || typeof subs !== 'object') continue;
    for (const [subCategory, list] of Object.entries(subs)) {
      if (!Array.isArray(list)) continue;
      for (const f of list) {
        funds.push({
          name: f.fund_name ?? null,
          category,
          subCategory,
          nav: num(f.latest_nav),
          changePercent: num(f.percentage_change),
          aum: num(f.asset_size),
          return1M: num(f['1_month_return']),
          return3M: num(f['3_month_return']),
          return6M: num(f['6_month_return']),
          return1Y: num(f['1_year_return']),
          return3Y: num(f['3_year_return']),
          return5Y: num(f['5_year_return']),
          rating: num(f.star_rating),
        });
      }
    }
  }
  const categories = [...new Set(funds.map((f) => f.category))].sort();
  return { funds, categories, asOf: new Date().toISOString(), source: 'indian' };
}

/** Commodity futures (MCX). */
export async function getCommodities() {
  const { data } = await client().get('/commodities');
  const arr = Array.isArray(data) ? data : [];
  return arr.map((c) => ({
    id: c.id ?? null,
    product: c.product ?? null,
    expiry: c.expiry ?? null,
    lastPrice: num(c.last_traded_price),
    averagePrice: num(c.average_traded_price),
    buyPrice: num(c.buy_price),
    sellPrice: num(c.sell_price),
    lastTradedTime: c.last_traded_time ?? null,
  }));
}

/**
 * Recent filings for a symbol.
 * Shape: [{ title, link, date }] — `date` is a prose blurb, not a
 * timestamp (e.g. "17 Aug - TCS launches ..."), so it is surfaced as
 * `dateLabel` rather than being parsed into something it isn't.
 */
export async function getRecentAnnouncements(symbol) {
  const { data } = await client().get('/recent_announcements', {
    params: { stock_name: symbol },
  });
  assertNotUpstreamError(data, `recent announcements for ${symbol}`);
  const arr = Array.isArray(data) ? data : data?.data ?? [];
  return arr.map((a, i) => ({
    id: `${symbol}-${i}`,
    symbol: String(symbol).toUpperCase(),
    title: a.title ?? null,
    url: a.link ?? null,
    dateLabel: a.date ?? null,
  }));
}

/**
 * Corporate actions (dividends, splits, bonus, rights, board meetings).
 * The API returns tables as `{title, header:[], data:[[]]}` — or a `msg`
 * with no data when a company has none. Converted to objects here.
 */
export async function getCorporateActions(symbol) {
  const { data } = await client().get('/corporate_actions', {
    params: { stock_name: symbol },
  });
  assertNotUpstreamError(data, `corporate actions for ${symbol}`);

  const toRows = (section) => {
    if (!section || !Array.isArray(section.header) || !Array.isArray(section.data)) return [];
    return section.data.map((row) =>
      Object.fromEntries(section.header.map((h, i) => [h, row[i] ?? null])),
    );
  };

  const out = {};
  for (const key of ['dividends', 'splits', 'bonus', 'rights', 'board_meetings']) {
    const section = data?.[key];
    out[key] = {
      title: section?.title ?? key,
      // `msg` is populated when there is nothing to report; keep it so the
      // UI can say "no splits announced" instead of rendering an empty box.
      message: section?.msg || null,
      rows: toRows(section),
    };
  }
  return { symbol: String(symbol).toUpperCase(), ...out, asOf: new Date().toISOString(), source: 'indian' };
}

const mapMover = (s) => ({
  symbol: (s.nseCode ?? s.ticker ?? s.ric ?? '').replace(/\.(NS|BO)$/, '') || null,
  name: s.company ?? s.companyName ?? null,
  price: num(s.price),
  change: num(s.net_change ?? s.netChange),
  changePercent: num(s.percent_change ?? s.percentChange),
  high: num(s.high),
  low: num(s.low),
  volume: num(s.volume),
});

/** Most actively traded stocks. `exchange` is 'NSE' or 'BSE'. */
export async function getMostActive(exchange = 'NSE') {
  const path = exchange.toUpperCase() === 'BSE' ? '/BSE_most_active' : '/NSE_most_active';
  const { data } = await client().get(path);
  return (Array.isArray(data) ? data : []).map(mapMover);
}

/** Unusual movers on both exchanges. */
export async function getPriceShockers() {
  const { data } = await client().get('/price_shockers');
  return {
    nse: (data?.NSE_PriceShocker ?? []).map(mapMover),
    bse: (data?.BSE_PriceShocker ?? []).map(mapMover),
    asOf: new Date().toISOString(),
    source: 'indian',
  };
}

/**
 * Historical financial statements.
 * @param {string} stats one of quarter_results, yoy_results, balancesheet,
 *                       cashflow, ratios, shareholding_pattern_quarterly
 */
export async function getHistoricalStats(symbol, stats = 'quarter_results') {
  const { data } = await client().get('/historical_stats', {
    params: { stock_name: symbol, stats },
  });
  return { symbol: String(symbol).toUpperCase(), stats, data, source: 'indian' };
}

export default {
  hasApiKey, getStock, getQuote, getFundamentals, getTrending,
  getNews, getIpos, getMutualFunds, getCommodities,
  getRecentAnnouncements, getCorporateActions,
  getMostActive, getPriceShockers, getHistoricalStats,
};
