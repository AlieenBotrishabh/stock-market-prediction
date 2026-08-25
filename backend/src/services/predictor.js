/**
 * Real-time model inference.
 *
 * Runs the exported ONNX graph inside the API process, so a forecast is
 * produced when the request arrives rather than being read from a nightly
 * batch. Inference is single-digit milliseconds; the cost is fetching the
 * price history, which the provider layer already caches.
 *
 * Why ONNX rather than TensorFlow: TF is ~600 MB against Vercel's 250 MB
 * function limit. The exported graph is ~390 KB and onnxruntime-node loads
 * it in-process.
 *
 * Model bundles are resolved in this order:
 *   1. ml-pipeline/export/<SYMBOL>/   (local, used in development)
 *   2. Hugging Face Hub               (production; cached in /tmp)
 *
 * A bundle is model.onnx + scaler.json + config.json. All three are
 * required: running the graph without its fitted scaler would feed the
 * network unscaled inputs and produce confident nonsense. That exact bug
 * is why the previous pipeline's predictions were meaningless.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import providers from '../providers/index.js';
import { buildFeatures } from './features.js';
import { getMarketStatus, istParts } from './marketStatus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Where the committed model bundles live.
 *
 * Resolved against several candidates rather than one relative path.
 * Locally this file sits at backend/src/services/, so ../../../ reaches the
 * repo root — but inside a bundled Vercel function the layout differs and
 * `__dirname` is not where you would expect, so a single hardcoded hop
 * silently finds nothing and every company reports "no model published".
 * The first candidate that actually contains a bundle wins.
 */
const EXPORT_CANDIDATES = [
  process.env.MODEL_BUNDLE_DIR,
  path.resolve(__dirname, '../../../ml-pipeline/export'),
  path.resolve(process.cwd(), 'ml-pipeline/export'),
  path.resolve(process.cwd(), '../ml-pipeline/export'),
  // Vercel copies includeFiles under the task root.
  path.resolve('/var/task', 'ml-pipeline/export'),
].filter(Boolean);

let resolvedExportDir = null;

/** First candidate directory that actually holds bundles. */
async function getExportDir() {
  if (resolvedExportDir !== null) return resolvedExportDir;
  for (const dir of EXPORT_CANDIDATES) {
    try {
      const entries = await fs.readdir(dir);
      if (entries.length) {
        resolvedExportDir = dir;
        return dir;
      }
    } catch { /* try the next candidate */ }
  }
  // Cache the miss as a string so we do not re-stat on every request, but
  // keep it falsy-checkable.
  resolvedExportDir = '';
  return '';
}

/** Hugging Face repo holding the published bundles. */
const HF_REPO = process.env.HF_MODEL_REPO || 'Ace6868/stock-price-prediction-lstm';
const HF_BASE = `https://huggingface.co/${HF_REPO}/resolve/main`;

/** Downloaded bundles are cached here between warm invocations. */
const CACHE_DIR = path.join(os.tmpdir(), 'stockpulse-models');

/** Loaded sessions, keyed by symbol. Cleared only on cold start. */
const sessions = new Map();
/** In-flight loads, so concurrent requests share one download. */
const inflight = new Map();

let ort = null;

/**
 * onnxruntime-node is imported lazily so the whole API does not fail to
 * boot in an environment where the native binary is unavailable — the rest
 * of the app works fine without predictions.
 */
async function getRuntime() {
  if (ort) return ort;
  try {
    ort = await import('onnxruntime-node');
    return ort;
  } catch (err) {
    const e = new Error(
      'onnxruntime-node is unavailable, so live inference cannot run. ' +
      'Install it in backend/ (npm i onnxruntime-node).',
    );
    e.code = 'NO_RUNTIME';
    throw e;
  }
}

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

/** Fetch one bundle file from Hugging Face into the local cache. */
async function fetchFromHub(symbol, file, destDir) {
  const url = `${HF_BASE}/${symbol}/${file}`;
  const res = await fetch(url, {
    headers: process.env.HF_TOKEN
      ? { Authorization: `Bearer ${process.env.HF_TOKEN}` }
      : {},
  });
  if (!res.ok) {
    const e = new Error(`Model file not found on Hugging Face: ${symbol}/${file} (HTTP ${res.status})`);
    e.code = 'MODEL_NOT_FOUND';
    throw e;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(destDir, { recursive: true });
  await fs.writeFile(path.join(destDir, file), buf);
  return buf;
}

/**
 * Resolve a bundle to a local directory, downloading from the Hub if it is
 * not already present.
 */
async function resolveBundleDir(symbol) {
  const exportDir = await getExportDir();
  if (exportDir) {
    const local = path.join(exportDir, symbol);
    if (await exists(path.join(local, 'config.json'))) return local;
  }

  const cached = path.join(CACHE_DIR, symbol);
  if (await exists(path.join(cached, 'config.json'))) return cached;

  // Not present anywhere — pull it. config.json first, since a missing
  // config means the symbol has no published model at all.
  const cfgBuf = await fetchFromHub(symbol, 'config.json', cached);
  const cfg = JSON.parse(cfgBuf.toString('utf8'));

  await Promise.all([
    fetchFromHub(symbol, 'metrics.json', cached).catch(() => null), // optional
    // The graph lives under _shared/ unless this is a legacy bundle.
    (async () => {
      const from = cfg.sharedModel ?? symbol;
      const dest = cfg.sharedModel
        ? path.join(CACHE_DIR, cfg.sharedModel)
        : cached;
      if (await exists(path.join(dest, 'model.onnx'))) return;
      await Promise.all([
        fetchFromHub(from, 'model.onnx', dest),
        fetchFromHub(from, 'scaler.json', dest),
      ]);
    })(),
  ]);
  return cached;
}

/** Load (or reuse) an inference session for a symbol. */
async function loadModel(symbol) {
  const key = symbol.toUpperCase();
  if (sessions.has(key)) return sessions.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const task = (async () => {
    const runtime = await getRuntime();
    const dir = await resolveBundleDir(key);

    const config = await readJson(path.join(dir, 'config.json'));

    // Every company runs the same weights, so the graph and its scaler are
    // stored once in `_shared/` rather than duplicated 15 times. Older
    // bundles kept them alongside the config, so both layouts resolve.
    const sharedDir = config.sharedModel
      ? path.join(path.dirname(dir), config.sharedModel)
      : dir;
    const modelPath = (await exists(path.join(dir, 'model.onnx')))
      ? path.join(dir, 'model.onnx')
      : path.join(sharedDir, 'model.onnx');
    const scalerPath = (await exists(path.join(dir, 'scaler.json')))
      ? path.join(dir, 'scaler.json')
      : path.join(sharedDir, 'scaler.json');

    const scaler = await readJson(scalerPath);
    const metrics = await readJson(path.join(dir, 'metrics.json')).catch(() => null);

    const session = await runtime.InferenceSession.create(
      modelPath,
      { executionProviders: ['cpu'], graphOptimizationLevel: 'all' },
    );

    const bundle = { session, config, scaler, metrics, dir, loadedAt: new Date().toISOString() };
    sessions.set(key, bundle);
    inflight.delete(key);
    return bundle;
  })().catch((err) => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, task);
  return task;
}

/** Symbols with a usable bundle in the local export directory. */
async function listLocalBundles() {
  try {
    const exportDir = await getExportDir();
    if (!exportDir) return [];
    const entries = await fs.readdir(exportDir, { withFileTypes: true });
    const found = [];
    for (const e of entries) {
      // Skip the shared-weights directory; it is not a company.
      if (e.name.startsWith('_')) continue;
      if (e.isDirectory() && await exists(path.join(exportDir, e.name, 'config.json'))) {
        found.push(e.name.toUpperCase());
      }
    }
    return found;
  } catch {
    return [];
  }
}

/** Cached HF repo listing — the file tree changes only when we republish. */
let hubListing = { symbols: null, fetchedAt: 0 };
const HUB_LISTING_TTL_MS = 10 * 60 * 1000;

/**
 * Symbols published to the Hugging Face repo, derived from the file tree:
 * each bundle lives at `<SYMBOL>/model.onnx`.
 */
async function listHubBundles() {
  if (hubListing.symbols && Date.now() - hubListing.fetchedAt < HUB_LISTING_TTL_MS) {
    return hubListing.symbols;
  }
  try {
    const res = await fetch(`https://huggingface.co/api/models/${HF_REPO}`, {
      headers: process.env.HF_TOKEN
        ? { Authorization: `Bearer ${process.env.HF_TOKEN}` }
        : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const meta = await res.json();
    const symbols = (meta.siblings ?? [])
      .map((f) => /^([A-Z0-9&.-]+)\/config\.json$/i.exec(f.rfilename ?? ''))
      .filter(Boolean)
      .map((m) => m[1].toUpperCase())
      .filter((n) => !n.startsWith('_'));
    hubListing = { symbols, fetchedAt: Date.now() };
    return symbols;
  } catch {
    // A listing failure must not empty the page; fall back to whatever the
    // previous successful listing found.
    return hubListing.symbols ?? [];
  }
}

/**
 * Every symbol with a published model, local first then the Hub.
 *
 * Production has no local export directory — bundles are pulled from
 * Hugging Face — so listing only the local folder would leave the
 * forecasts page permanently empty once deployed.
 */
export async function listLocalModels() {
  const [local, hub] = await Promise.all([listLocalBundles(), listHubBundles()]);
  return [...new Set([...local, ...hub])].sort();
}

/** date -> close map for a macro series, used for nifty/usdinr returns. */
async function macroSeries(symbol, range) {
  try {
    const hist = await providers.getHistory(symbol, { range, interval: '1d' });
    return new Map(hist.candles.map((c) => [c.date, c.c]));
  } catch {
    return new Map();
  }
}

/**
 * Remove a trailing partial bar.
 *
 * Returns the candles unchanged once the session has closed, so after
 * 15:30 IST the day's finished bar is used normally.
 */
function dropInProgressSession(candles) {
  if (!candles.length) return candles;
  const status = getMarketStatus(providers.getMarketHints());
  if (!status.isOpen && status.phase !== 'pre') return candles;

  const nowIst = istParts();
  const todayIst = `${nowIst.year}-${String(nowIst.month).padStart(2, '0')}-${String(nowIst.day).padStart(2, '0')}`;
  const last = candles[candles.length - 1];
  return last.date === todayIst ? candles.slice(0, -1) : candles;
}

/**
 * The "no usable forecast" response.
 *
 * Every price field is present and explicitly null rather than omitted, so
 * a consumer reading `predictedClose` gets null instead of undefined and
 * the shape is identical whether or not a model exists. A partial object
 * is how a UI ends up rendering `undefined` where a price should be.
 */
function unavailable(symbol, reason) {
  return {
    symbol,
    isModelBacked: false,
    unavailableReason: reason,
    basePrice: null,
    predictedClose: null,
    predictedChange: null,
    predictedChangePercent: null,
    direction: null,
    confidenceLow: null,
    confidenceHigh: null,
    backtest: null,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Produce a next-day forecast for `symbol`, right now.
 *
 * @returns {Promise<object>} the prediction contract consumed by the UI.
 *   `isModelBacked: false` means no usable number exists and the caller
 *   must render the reason instead.
 */
export async function predict(symbol) {
  const key = symbol.toUpperCase();

  let bundle;
  try {
    bundle = await loadModel(key);
  } catch (err) {
    return unavailable(
      key,
      err.code === 'MODEL_NOT_FOUND'
        ? `No trained model has been published for ${key} yet.`
        : err.message,
    );
  }

  const { session, config, scaler, metrics } = bundle;

  // A model with no recorded validation must not emit a number either.
  // Otherwise a freshly trained bundle exported before its backtest ran
  // would serve forecasts indistinguishable from validated ones — the
  // whole point of the gate is that a number on screen has been earned.
  if (!metrics) {
    return unavailable(
      key,
      `The model for ${key} has not been validated yet. Forecasts are ` +
      'published only after walk-forward backtesting, so nothing is shown ' +
      'rather than an unverified number.',
    );
  }

  // A model that failed walk-forward validation must not emit a number.
  if (metrics.beatsBaseline === false) {
    return unavailable(
      key,
      `The model for ${key} did not pass validation (walk-forward error ` +
      `${metrics.model?.mape?.toFixed(2)}% vs a ${metrics.baseline?.mape?.toFixed(2)}% ` +
      `naive baseline, direction accuracy ${metrics.model?.directionAccuracy?.toFixed(1)}%), ` +
      'so its output is withheld.',
    );
  }

  const timeStep = config.timeStep;

  // Fetch the SAME history depth the features were trained over. RSI and
  // ATR are Wilder-smoothed and the Haar denoiser is causal-recursive, so
  // both depend on the whole prefix, not just a trailing window. Building
  // them over 2y when the model was trained on 10y shifted every feature
  // (RSI by 2.4 points, the denoised return by 3.7) and would have fed the
  // network inputs it never saw.
  const historyRange = config.historyRange || '10y';
  const history = await providers.getHistory(key, { range: historyRange, interval: '1d' });

  // Drop today's bar while the session is still running.
  //
  // The model was trained exclusively on COMPLETED daily bars. During
  // market hours Yahoo returns a partial bar for today whose "close" is
  // really the current price and whose volume is only the morning's —
  // which understates volume_ratio and mislabels the close. Feeding that
  // in is a train/serve mismatch. The forecast is therefore always made
  // from the last completed session, which is also exactly what a
  // "next-day close" forecast means.
  const candles = dropInProgressSession(history.candles);

  if (candles.length < timeStep + 60) {
    return unavailable(
      key,
      `Only ${candles.length} sessions of history are available for ${key}; ` +
      `${timeStep + 60} are needed to build the model's inputs.`,
    );
  }

  const needsMacro = config.features.some((f) => f === 'nifty_return' || f === 'usdinr_return');
  const [nifty, usdinr] = needsMacro
    ? await Promise.all([
        macroSeries('^NSEI', historyRange),
        macroSeries('USDINR=X', historyRange),
      ])
    : [new Map(), new Map()];

  // Build a generous tail so there is slack after incomplete rows are
  // dropped below.
  // Denoise a generous trailing margin, not just the window. Causal
  // denoising leaves everything before its start at the RAW close, and
  // return_denoised differences consecutive values — so the first denoised
  // index sits on a raw/denoised boundary and is not comparable to what
  // training produced. A fixed +60 keeps that boundary far outside the
  // window even at small time steps (the window is only the last
  // `timeStep` USABLE rows, and incomplete rows are dropped first).
  const denoiseTail = timeStep + 60;
  const { rows, closes } = buildFeatures(candles, { nifty, usdinr }, denoiseTail);

  // Training does `df.dropna(subset=feature_cols)` before windowing, so
  // rows with any missing feature never entered a training sequence.
  // Inference has to filter identically — otherwise a single zero-volume
  // session (which makes volume_ratio undefined) would either inject a
  // hole into the window or reject the whole request. Roughly 2 sessions
  // in any recent 70 are affected.
  const usable = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (config.features.every((f) => row[f] != null && Number.isFinite(row[f]))) {
      usable.push({ row, index: i });
    }
  }

  if (usable.length < timeStep) {
    return unavailable(
      key,
      `Only ${usable.length} complete feature rows are available for ${key}; ` +
      `${timeStep} are needed. This usually means a macro series ` +
      '(NIFTY 50 or USD/INR) could not be fetched.',
    );
  }

  const window = usable.slice(-timeStep);

  const { min: fMin, range: fRange } = scaler.features;
  const input = new Float32Array(timeStep * config.nFeatures);
  for (let t = 0; t < timeStep; t += 1) {
    for (let f = 0; f < config.features.length; f += 1) {
      const raw = window[t].row[config.features[f]];
      input[t * config.nFeatures + f] = (raw - fMin[f]) / fRange[f];
    }
  }

  const runtime = await getRuntime();
  const tensor = new runtime.Tensor('float32', input, [1, timeStep, config.nFeatures]);
  const output = await session.run({ [config.inputName]: tensor });
  const scaledOut = Number(Object.values(output)[0].data[0]);

  // Invert the target scaler.
  const predictedTarget =
    scaledOut * scaler.target.range[0] + scaler.target.min[0];

  // Anchor on the last row that actually entered the window, so the
  // reconstructed price is relative to the same session the model saw.
  const lastIndex = window[window.length - 1].index;
  const basePrice = closes[lastIndex];
  const baseDate = history.candles[lastIndex].date;

  // targetMode "return" means the network emitted a log return.
  const predictedClose =
    config.targetMode === 'return'
      ? basePrice * Math.exp(predictedTarget)
      : predictedTarget;

  const change = predictedClose - basePrice;
  const changePercent = basePrice ? (change / basePrice) * 100 : null;

  // Interval from the model's own out-of-sample residual spread.
  const half = metrics?.confidenceHalfWidth ?? null;

  return {
    symbol: key,
    isModelBacked: true,
    basePrice,
    baseDate,
    predictedClose,
    predictedChange: change,
    predictedChangePercent: changePercent,
    direction: change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'FLAT',
    confidenceLow: half == null ? null : predictedClose - half,
    confidenceHigh: half == null ? null : predictedClose + half,
    confidenceLevel: 0.8,
    horizonDays: config.horizonDays ?? 1,
    model: {
      version: config.modelVersion,
      architecture: config.architecture,
      trainedAt: config.exportedAt,
      features: config.features,
      timeStep,
      source: bundle.dir.startsWith(CACHE_DIR) ? `huggingface:${HF_REPO}` : 'bundled',
    },
    backtest: metrics
      ? {
          mape: metrics.model?.mape,
          rmse: metrics.model?.rmse,
          r: metrics.model?.r,
          directionAccuracy: metrics.model?.directionAccuracy,
          baselineMape: metrics.baseline?.mape,
          baselineName: 'naive-drift',
          beatsBaseline: metrics.beatsBaseline,
          walkForwardWindows: metrics.walkForwardWindows,
          sample: metrics.sample ?? [],
        }
      : null,
    // Inference just ran, so this is by definition current.
    generatedAt: new Date().toISOString(),
    isStale: false,
    dataAsOf: history.asOf,
    latestSession: baseDate,
  };
}

/** Drop cached sessions — used by tests and after publishing a new model. */
export function clearModelCache() {
  sessions.clear();
  inflight.clear();
}

export default { predict, listLocalModels, clearModelCache };
