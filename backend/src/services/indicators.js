/**
 * Technical indicators.
 *
 * These serve two masters: the UI indicators panel, and (via the Python
 * pipeline) the LSTM's feature vector. The two MUST agree numerically or
 * the site will contradict its own model, so the parameters below are
 * fixed and mirrored exactly in ml-pipeline/indicators.py. A shared
 * fixture (tests/fixtures/indicators.json) is asserted by both sides.
 *
 * Conventions, chosen to match the papers and standard charting platforms:
 *  - RSI-14 and ATR-14 use **Wilder** smoothing (alpha = 1/n), not a
 *    simple mean. This is the single most common source of mismatch
 *    between naive implementations and TradingView.
 *  - MACD is EMA(12) - EMA(26), signal EMA(9) of the MACD line.
 *  - EMA seeds from the SMA of the first `period` values.
 *  - Output arrays are the same length as the input, left-padded with
 *    `null` where the indicator is not yet defined. Never 0 — a zero would
 *    be read as a real value by both the chart and the model.
 */

/** Simple moving average. */
export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** Exponential moving average, seeded with the SMA of the first `period`. */
export function ema(values, period) {
  const out = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i += 1) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i += 1) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's smoothing (RMA): alpha = 1/period, seeded with the SMA. */
export function wilderSmooth(values, period) {
  const out = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let seed = 0;
  for (let i = 0; i < period; i += 1) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i += 1) {
    prev = (prev * (period - 1) + values[i]) / period;
    out[i] = prev;
  }
  return out;
}

/** Relative Strength Index, Wilder-smoothed. Range 0-100. */
export function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  const gains = new Array(closes.length - 1);
  const losses = new Array(closes.length - 1);
  for (let i = 1; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    gains[i - 1] = diff > 0 ? diff : 0;
    losses[i - 1] = diff < 0 ? -diff : 0;
  }

  const avgGain = wilderSmooth(gains, period);
  const avgLoss = wilderSmooth(losses, period);

  for (let i = 0; i < gains.length; i += 1) {
    if (avgGain[i] == null || avgLoss[i] == null) continue;
    if (avgLoss[i] === 0) {
      // No losses at all. A window with gains is genuinely maxed out at
      // 100, but a completely FLAT window has no gains either — that is
      // neutral, not overbought. Without this an illiquid stock that has
      // not moved for 14 sessions would be badged "Overbought".
      out[i + 1] = avgGain[i] === 0 ? 50 : 100;
      continue;
    }
    out[i + 1] = 100 - 100 / (1 + avgGain[i] / avgLoss[i]);
  }
  return out;
}

/** MACD(12, 26, 9). Returns the line, its signal, and the histogram. */
export function macd(closes, fast = 12, slow = 26, signalPeriod = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  const line = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null,
  );

  // The signal EMA runs over the defined portion of the MACD line only.
  const firstDefined = line.findIndex((v) => v != null);
  const signal = new Array(closes.length).fill(null);
  const histogram = new Array(closes.length).fill(null);

  if (firstDefined !== -1) {
    const dense = line.slice(firstDefined);
    const denseSignal = ema(dense, signalPeriod);
    for (let i = 0; i < dense.length; i += 1) {
      const idx = firstDefined + i;
      signal[idx] = denseSignal[i];
      if (denseSignal[i] != null) histogram[idx] = line[idx] - denseSignal[i];
    }
  }

  return { macd: line, signal, histogram };
}

/** True Range series. TR[0] is high-low (no prior close available). */
export function trueRange(highs, lows, closes) {
  const out = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i += 1) {
    if (highs[i] == null || lows[i] == null) continue;
    if (i === 0) { out[i] = highs[i] - lows[i]; continue; }
    const pc = closes[i - 1];
    out[i] = Math.max(highs[i] - lows[i], Math.abs(highs[i] - pc), Math.abs(lows[i] - pc));
  }
  return out;
}

/** Average True Range, Wilder-smoothed. */
export function atr(highs, lows, closes, period = 14) {
  const tr = trueRange(highs, lows, closes);
  const dense = tr.filter((v) => v != null);
  if (dense.length < period) return new Array(closes.length).fill(null);
  const smoothed = wilderSmooth(dense, period);
  // Re-align onto the original index space.
  const out = new Array(closes.length).fill(null);
  let j = 0;
  for (let i = 0; i < tr.length; i += 1) {
    if (tr[i] == null) continue;
    out[i] = smoothed[j];
    j += 1;
  }
  return out;
}

/** Bollinger Bands(20, 2). Uses the population standard deviation. */
export function bollinger(closes, period = 20, mult = 2) {
  const middle = sma(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  const width = new Array(closes.length).fill(null);
  const percentB = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i += 1) {
    const mean = middle[i];
    if (mean == null) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j += 1) variance += (closes[j] - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
    width[i] = mean ? ((upper[i] - lower[i]) / mean) * 100 : null;
    const span = upper[i] - lower[i];
    percentB[i] = span ? ((closes[i] - lower[i]) / span) * 100 : null;
  }
  return { middle, upper, lower, width, percentB };
}

/** Rate of change over `period` bars, as a percentage. */
export function roc(closes, period = 10) {
  const out = new Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i += 1) {
    if (closes[i - period]) out[i] = ((closes[i] - closes[i - period]) / closes[i - period]) * 100;
  }
  return out;
}

/**
 * Compute the full indicator set from OHLCV candles.
 * @param {{o,h,l,c,v}[]} candles chronological, oldest first
 * @returns {{series:object, latest:object}} full series plus the last value
 *          of each, which is what the UI panel renders.
 */
export function computeAll(candles) {
  const closes = candles.map((d) => d.c);
  const highs = candles.map((d) => d.h ?? d.c);
  const lows = candles.map((d) => d.l ?? d.c);

  const macdOut = macd(closes);
  const bb = bollinger(closes);

  const series = {
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    rsi14: rsi(closes, 14),
    atr14: atr(highs, lows, closes, 14),
    macd: macdOut.macd,
    macdSignal: macdOut.signal,
    macdHistogram: macdOut.histogram,
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    bbLower: bb.lower,
    bbPercentB: bb.percentB,
    roc10: roc(closes, 10),
  };

  const last = (arr) => (arr.length ? arr[arr.length - 1] : null);
  const latest = Object.fromEntries(Object.entries(series).map(([k, v]) => [k, last(v)]));

  // Interpretations the UI shows as badges. Thresholds are the textbook ones.
  const price = last(closes);
  latest.price = price;
  latest.rsiSignal =
    latest.rsi14 == null ? null
      : latest.rsi14 >= 70 ? 'overbought'
      : latest.rsi14 <= 30 ? 'oversold'
      : 'neutral';
  latest.macdSignalDirection =
    latest.macd == null || latest.macdSignal == null ? null
      : latest.macd > latest.macdSignal ? 'bullish' : 'bearish';
  latest.trend =
    price == null || latest.sma50 == null || latest.sma200 == null ? null
      : price > latest.sma50 && latest.sma50 > latest.sma200 ? 'uptrend'
      : price < latest.sma50 && latest.sma50 < latest.sma200 ? 'downtrend'
      : 'sideways';

  return { series, latest };
}

export default {
  sma, ema, wilderSmooth, rsi, macd, atr, trueRange, bollinger, roc, computeAll,
};
