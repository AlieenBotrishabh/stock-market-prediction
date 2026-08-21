/**
 * Vercel serverless entry point.
 *
 * Shares src/app.js with backend/server.js — there is no second app.
 * The DB connection is opened lazily inside the app so a cold start is not
 * blocked on Atlas.
 */

import 'dotenv/config';
import { createApp } from '../backend/src/app.js';

export default createApp();
