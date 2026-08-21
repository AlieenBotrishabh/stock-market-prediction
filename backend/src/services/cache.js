/**
 * Two-tier response cache.
 *
 * The previous build had no caching at all — every page view re-hit Yahoo,
 * which is how the repo ended up with a captured "Edge: Too Many Requests"
 * response sitting in the frontend directory.
 *
 * Tier 1: in-process Map. Free, but per-serverless-instance and lost on
 *         cold start.
 * Tier 2: MongoDB with a TTL index. Shared across instances and survives
 *         cold starts. Skipped entirely when MONGODB_URI is unset, so the
 *         app still runs (just with less cache) on a bare checkout.
 *
 * Also implements stale-while-revalidate: if the upstream fetch fails but
 * we hold an expired entry, we serve it flagged `isStale: true` with its
 * original `asOf`. That is the honest degradation path — the old code
 * substituted invented numbers instead.
 */

import mongoose from 'mongoose';
import { isMarketOpen } from './marketStatus.js';

const memory = new Map();
const MEMORY_MAX_ENTRIES = 500;

let cacheModel = null;

function getModel() {
  if (cacheModel) return cacheModel;
  if (mongoose.connection.readyState !== 1) return null;

  const schema = new mongoose.Schema(
    {
      key: { type: String, required: true, unique: true, index: true },
      payload: { type: mongoose.Schema.Types.Mixed, required: true },
      storedAt: { type: Date, default: Date.now },
      // Mongo's TTL monitor removes documents once this passes. Entries are
      // given a grace period beyond their logical TTL so they remain
      // available as stale-while-revalidate fallbacks.
      purgeAt: { type: Date, required: true, index: { expires: 0 } },
      expiresAt: { type: Date, required: true },
    },
    { collection: 'response_cache', versionKey: false },
  );

  cacheModel = mongoose.models.ResponseCache || mongoose.model('ResponseCache', schema);
  return cacheModel;
}

/**
 * TTLs in seconds, by data class. Market-hours aware: quotes go stale in a
 * minute while the session is live, but there is no point re-fetching every
 * minute overnight when the number cannot change.
 */
const TTL = {
  quote: { open: 60, closed: 900 },
  intraday: { open: 300, closed: 3600 },
  history: { open: 21_600, closed: 86_400 },
  fundamentals: { open: 86_400, closed: 86_400 },
  news: { open: 1800, closed: 1800 },
  listing: { open: 1800, closed: 1800 },
  marketStatus: { open: 30, closed: 300 },
};

/** Seconds a `kind` should stay fresh, given current market state. */
export function ttlFor(kind, marketHints = {}) {
  const band = TTL[kind] ?? TTL.listing;
  return isMarketOpen(marketHints) ? band.open : band.closed;
}

/** How long an expired entry is retained for stale-fallback purposes. */
const STALE_GRACE_SECONDS = 86_400;

function memGet(key) {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.purgeAt < Date.now()) { memory.delete(key); return null; }
  return hit;
}

function memSet(key, entry) {
  // Cheap bound: evict oldest insertion when over capacity.
  if (memory.size >= MEMORY_MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, entry);
}

async function readEntry(key) {
  const local = memGet(key);
  if (local) return local;

  const Model = getModel();
  if (!Model) return null;
  try {
    const doc = await Model.findOne({ key }).lean();
    if (!doc) return null;
    const entry = {
      payload: doc.payload,
      storedAt: new Date(doc.storedAt).getTime(),
      expiresAt: new Date(doc.expiresAt).getTime(),
      purgeAt: new Date(doc.purgeAt).getTime(),
    };
    memSet(key, entry);
    return entry;
  } catch {
    return null; // cache failures must never break a request
  }
}

async function writeEntry(key, payload, ttlSeconds) {
  const now = Date.now();
  const entry = {
    payload,
    storedAt: now,
    expiresAt: now + ttlSeconds * 1000,
    purgeAt: now + (ttlSeconds + STALE_GRACE_SECONDS) * 1000,
  };
  memSet(key, entry);

  const Model = getModel();
  if (!Model) return;
  try {
    await Model.updateOne(
      { key },
      {
        key,
        payload,
        storedAt: new Date(entry.storedAt),
        expiresAt: new Date(entry.expiresAt),
        purgeAt: new Date(entry.purgeAt),
      },
      { upsert: true },
    );
  } catch {
    /* cache write failures are non-fatal */
  }
}

/**
 * Fetch through the cache.
 *
 * @param {string} key       cache key
 * @param {string} kind      TTL class (see TTL above)
 * @param {() => Promise<any>} fetcher upstream call
 * @param {{marketHints?:object, forceRefresh?:boolean}} [opts]
 * @returns {Promise<{data:any, cached:boolean, isStale:boolean, asOf:string, ageSeconds:number}>}
 */
export async function withCache(key, kind, fetcher, opts = {}) {
  const { marketHints = {}, forceRefresh = false } = opts;
  const entry = forceRefresh ? null : await readEntry(key);
  const now = Date.now();

  if (entry && entry.expiresAt > now) {
    return {
      data: entry.payload,
      cached: true,
      isStale: false,
      asOf: new Date(entry.storedAt).toISOString(),
      ageSeconds: Math.round((now - entry.storedAt) / 1000),
    };
  }

  try {
    const fresh = await fetcher();
    await writeEntry(key, fresh, ttlFor(kind, marketHints));
    return {
      data: fresh,
      cached: false,
      isStale: false,
      asOf: new Date().toISOString(),
      ageSeconds: 0,
    };
  } catch (err) {
    // Upstream failed. Serve the expired copy if we have one, clearly
    // flagged — never fabricate a replacement.
    const stale = entry ?? (await readEntry(key));
    if (stale) {
      return {
        data: stale.payload,
        cached: true,
        isStale: true,
        asOf: new Date(stale.storedAt).toISOString(),
        ageSeconds: Math.round((now - stale.storedAt) / 1000),
        error: err.message,
      };
    }
    throw err;
  }
}

/** Set Cache-Control so Vercel's edge absorbs repeat traffic. */
export function setCacheHeaders(res, kind, marketHints = {}) {
  const ttl = ttlFor(kind, marketHints);
  res.set(
    'Cache-Control',
    `public, s-maxage=${ttl}, stale-while-revalidate=${STALE_GRACE_SECONDS}`,
  );
}

export function clearMemoryCache() {
  memory.clear();
}

export default { withCache, ttlFor, setCacheHeaders, clearMemoryCache };
