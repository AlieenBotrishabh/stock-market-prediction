/**
 * Local development entry point.
 *
 * All application logic lives in src/app.js, shared with the Vercel
 * serverless entry at api/index.mjs. This file only loads env vars, opens
 * the DB connection and listens.
 */

import 'dotenv/config';
import { createApp } from './src/app.js';
import { connectDb, isConfigured } from './src/db.js';

const PORT = process.env.PORT || 5000;

const app = createApp();

if (isConfigured()) {
  const conn = await connectDb();
  console.log(conn ? '[db] connected' : '[db] unavailable — running without persistence');
} else {
  console.log('[db] MONGODB_URI not set — running without persistence');
}

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`   health: http://localhost:${PORT}/api/health`);
});
