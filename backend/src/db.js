/**
 * MongoDB connection, safe for serverless.
 *
 * Vercel reuses a warm Node instance across invocations, so a naive
 * `mongoose.connect()` per request opens a new pool every time and
 * exhausts Atlas connection limits. The promise is cached on globalThis so
 * it survives module re-evaluation within the same instance.
 *
 * Mongo is optional: the app serves live market data without it, losing
 * only the shared cache and stored predictions. Nothing here throws on a
 * missing URI.
 */

import mongoose from 'mongoose';

const globalCache = globalThis.__mongooseCache ?? { conn: null, promise: null };
globalThis.__mongooseCache = globalCache;

export function isConfigured() {
  return Boolean(process.env.MONGODB_URI || process.env.MONGO_URI);
}

export function isConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Connect, reusing any live connection.
 * @returns {Promise<typeof mongoose|null>} null when unconfigured or failing
 */
export async function connectDb() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) return null;
  if (globalCache.conn && isConnected()) return globalCache.conn;

  if (!globalCache.promise) {
    globalCache.promise = mongoose
      .connect(uri, {
        // Fail fast rather than hanging a serverless request for 30s.
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 20_000,
        maxPoolSize: 10,
      })
      .then((m) => {
        globalCache.conn = m;
        return m;
      })
      .catch((err) => {
        // Reset so a later request can retry instead of reusing a rejection.
        globalCache.promise = null;
        console.warn('[db] connection failed:', err.message);
        return null;
      });
  }

  return globalCache.promise;
}

export default { connectDb, isConnected, isConfigured };
