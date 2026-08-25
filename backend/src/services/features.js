/**
 * Feature engineering for live inference.
 *
 * A direct port of ml-pipeline/features.py. The model was trained on
 * features built by the Python code; if this produces even slightly
 * different numbers, the network sees inputs it was never trained on and
 * the prediction is silently wrong. tests/test_features_parity.py asserts
 * the two agree against a shared fixture.
 *
 * The feature set is deliberately scale-free (returns, ratios, bounded
 * oscillators). Price levels cannot be used: the scaler is fitted on the
 * training slice, and a trending level lands outside [0,1] on new data.
 */

import indicators from './indicators.js';

// ─── Haar wavelet denoising ──────────────────────────────────────────────
// Mirrors features.py exactly, including the odd-tail handling and the
// MAD-based universal threshold.

const SQRT2 = Math.SQRT2;

function haarForward(x) {
  const n = x.length - (x.length % 2);
  const approx = new Float64Array(n / 2);
  const detail = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i += 1) {
    const a = x[2 * i];
    const b = x[2 * i + 1];
    approx[i] = (a + b) / SQRT2;
    detail[i] = (a - b) / SQRT2;
  }
  return { approx, detail };
}

function haarInverse(approx, detail) {
  const out = new Float64Array(approx.length * 2);
  for (let i = 0; i < approx.length; i += 1) {
    out[2 * i] = (approx[i] + detail[i]) / SQRT2;
    out[2 * i + 1] = (approx[i] - detail[i]) / SQRT2;
  }
  return out;
}

function median(values) {
  const sorted = Array.from(values).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function softThreshold(detail, thresh) {
  const out = new Float64Array(detail.length);
  for (let i = 0; i < detail.length; i += 1) {
    const mag = Math.abs(detail[i]) - thresh;
    out[i] = Math.sign(detail[i]) * (mag > 0 ? mag : 0);
  }
  return out;
}

/**
 * Soft-threshold Haar denoising with a VisuShrink universal threshold.
 * Operates on the whole array given, so callers must slice causally.
 */
export function haarDenoise(series, level = 2) {
  const x = Float64Array.from(series);
  const originalLen = x.length;
  if (originalLen < 2 ** level + 2) return Array.from(x);

  const coeffs = [];
  const oddTails = [];
  let current = x;

  for (let i = 0; i < level; i += 1) {
    if (current.length < 2) break;
    oddTails.push(current.length % 2 ? current[current.length - 1] : null);
    const { approx, detail } = haarForward(current);
    coeffs.push(detail);
    current = approx;
  }
  if (!coeffs.length) return Array.from(x);

  // Robust noise estimate from the finest detail level.
  const finest = coeffs[0];
  const sigma = finest.length ? median(Array.from(finest, Math.abs)) / 0.6745 : 0;
  const thresh = sigma * Math.sqrt(2 * Math.log(Math.max(originalLen, 2)));

  for (let i = coeffs.length - 1; i >= 0; i -= 1) {
    const detail = softThreshold(coeffs[i], thresh);
    const n = Math.min(current.length, detail.length);
    current = haarInverse(current.subarray(0, n), detail.subarray(0, n));
    const tail = oddTails[i];
    if (tail !== null) {
      const grown = new Float64Array(current.length + 1);
      grown.set(current);
      grown[current.length] = tail;
      current = grown;
    }
  }

  const out = Array.from(current.subarray(0, originalLen));
  // Pad from the original if the reconstruction came up short.
  while (out.length < originalLen) out.push(x[out.length]);
  return out;
}

/**
 * Causal denoising of the LAST `count` points.
 *
 * Point i is denoised using only x[0..i], so future values never leak
 * backwards — the Haar transform is not causal and a single global pass
 * shifts past values by a measurable amount.
 *
 * Only the tail is computed because inference needs `timeStep` values, not
 * the whole history. That turns an O(n^2) pass over ~2,500 bars into
 * `count` transforms over the prefix, which is a few milliseconds.
 */
export function denoiseCausalTail(series, level = 2, count = 60, minHistory = 64) {
  const n = series.length;
  const out = new Array(n).fill(null);
  const start = Math.max(minHistory, n - count);
  for (let i = start; i < n; i += 1) {
    const denoised = haarDenoise(series.slice(0, i + 1), level);
    out[i] = denoised[denoised.length - 1];
  }
  // Below minHistory the raw value is used, matching features.py.
  for (let i = 0; i < Math.min(start, n); i += 1) out[i] = series[i];
  return out;
}

// ─── Derived features ────────────────────────────────────────────────────

const pctChange = (arr, period = 1) => {
  const out = new Array(arr.length).fill(null);
  for (let i = period; i < arr.length; i += 1) {
    const prior = arr[i - period];
    if (prior != null && prior !== 0 && arr[i] != null) {
      out[i] = ((arr[i] - prior) / prior) * 100;
    }
  }
  return out;
};

/** Rolling mean ignoring nulls, with a minimum sample count. */
function rollingMean(arr, window, minPeriods = 1) {
  const out = new Array(arr.length).fill(null);
  for (let i = 0; i < arr.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - window + 1); j <= i; j += 1) {
      if (arr[j] != null && Number.isFinite(arr[j])) { sum += arr[j]; count += 1; }
    }
    if (count >= minPeriods) out[i] = sum / count;
  }
  return out;
}

/**
 * Build the full feature matrix.
 *
 * @param {{date,o,h,l,c,v}[]} candles chronological, oldest first
 * @param {{nifty?: Map<string,number>, usdinr?: Map<string,number>}} context
 *        date -> close maps for the macro series
 * @param {number} tailCount how many trailing rows need denoised values
 * @returns {{rows: Object[], dates: string[]}}
 */
export function buildFeatures(candles, context = {}, tailCount = 80) {
  const closes = candles.map((c) => c.c);
  const highs = candles.map((c) => c.h ?? c.c);
  const lows = candles.map((c) => c.l ?? c.c);
  const volumes = candles.map((c) => c.v ?? 0);
  const dates = candles.map((c) => c.date);

  const rsi14 = indicators.rsi(closes, 14);
  const atr14 = indicators.atr(highs, lows, closes, 14);
  const { macd: macdLine } = indicators.macd(closes);
  const sma20 = indicators.sma(closes, 20);

  const denoised = denoiseCausalTail(closes, 2, tailCount);

  // Denoised daily log return — the stationary counterpart of the close.
  const returnDenoised = new Array(closes.length).fill(null);
  for (let i = 1; i < closes.length; i += 1) {
    const prev = denoised[i - 1];
    const cur = denoised[i];
    if (prev != null && cur != null && prev > 0 && cur > 0) {
      returnDenoised[i] = Math.log(cur / prev) * 100;
    }
  }

  const return1d = pctChange(closes, 1);
  const return5d = pctChange(closes, 5);

  // Volume relative to its own 20-day average. Zero volume is treated as
  // missing (a non-trading artefact), matching the Python `replace(0, nan)`.
  const volNullable = volumes.map((v) => (v === 0 ? null : v));
  const volAvg = rollingMean(volNullable, 20, 5);
  const volumeRatio = volNullable.map((v, i) =>
    v != null && volAvg[i] != null && volAvg[i] !== 0 ? v / volAvg[i] : null,
  );

  // Indicators as a fraction of price, so stocks at very different price
  // levels produce comparable values.
  const macdRel = closes.map((c, i) =>
    c !== 0 && macdLine[i] != null ? (macdLine[i] / c) * 100 : null,
  );
  const atrRel = closes.map((c, i) =>
    c !== 0 && atr14[i] != null ? (atr14[i] / c) * 100 : null,
  );
  const sma20Gap = closes.map((c, i) =>
    c !== 0 && sma20[i] != null ? ((c - sma20[i]) / c) * 100 : null,
  );

  // Macro block, forward-filled onto this stock's trading days.
  const macroReturn = (map) => {
    if (!map || map.size === 0) return new Array(closes.length).fill(null);
    const levels = new Array(closes.length).fill(null);
    let last = null;
    for (let i = 0; i < dates.length; i += 1) {
      const v = map.get(dates[i]);
      if (v != null) last = v;
      levels[i] = last;
    }
    return pctChange(levels, 1);
  };

  const niftyReturn = macroReturn(context.nifty);
  const usdinrReturn = macroReturn(context.usdinr);

  const rows = candles.map((_, i) => ({
    return_denoised: returnDenoised[i],
    return_1d: return1d[i],
    return_5d: return5d[i],
    volume_ratio: volumeRatio[i],
    macd_rel: macdRel[i],
    rsi14: rsi14[i],
    atr_rel: atrRel[i],
    sma20_gap: sma20Gap[i],
    nifty_return: niftyReturn[i],
    usdinr_return: usdinrReturn[i],
  }));

  return { rows, dates, closes };
}

export default { buildFeatures, haarDenoise, denoiseCausalTail };
