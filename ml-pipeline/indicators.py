"""
Technical indicators -- the Python side of a two-language pair.

This is a deliberate mirror of backend/src/services/indicators.js. The UI
panel renders the Node values while the model trains on these; if they
drift, the site contradicts its own model. tests/test_indicators.py checks
both against a shared fixture so drift fails CI rather than reaching users.

Conventions (identical to the JS):
  * RSI-14 and ATR-14 use Wilder smoothing (alpha = 1/n), seeded with the
    SMA of the first n values -- NOT a rolling mean. This is the usual
    source of mismatch with charting platforms.
  * MACD = EMA(12) - EMA(26); signal = EMA(9) of the MACD line, computed
    over the defined portion only.
  * EMA is seeded with the SMA of the first `period` values.
  * Outputs are float arrays the same length as the input, padded with NaN
    where undefined -- never 0, which a model would read as a real value.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def _as_array(values) -> np.ndarray:
    return np.asarray(values, dtype=float)


def sma(values, period: int) -> np.ndarray:
    v = _as_array(values)
    out = np.full(len(v), np.nan)
    if period <= 0 or len(v) < period:
        return out
    cumsum = np.cumsum(np.insert(v, 0, 0.0))
    out[period - 1:] = (cumsum[period:] - cumsum[:-period]) / period
    return out


def ema(values, period: int) -> np.ndarray:
    """EMA seeded with the SMA of the first `period` values."""
    v = _as_array(values)
    out = np.full(len(v), np.nan)
    if period <= 0 or len(v) < period:
        return out
    k = 2.0 / (period + 1.0)
    prev = v[:period].mean()
    out[period - 1] = prev
    for i in range(period, len(v)):
        prev = v[i] * k + prev * (1.0 - k)
        out[i] = prev
    return out


def wilder_smooth(values, period: int) -> np.ndarray:
    """Wilder's RMA: alpha = 1/period, seeded with the SMA."""
    v = _as_array(values)
    out = np.full(len(v), np.nan)
    if period <= 0 or len(v) < period:
        return out
    prev = v[:period].mean()
    out[period - 1] = prev
    for i in range(period, len(v)):
        prev = (prev * (period - 1) + v[i]) / period
        out[i] = prev
    return out


def rsi(closes, period: int = 14) -> np.ndarray:
    c = _as_array(closes)
    out = np.full(len(c), np.nan)
    if len(c) <= period:
        return out

    diff = np.diff(c)
    gains = np.where(diff > 0, diff, 0.0)
    losses = np.where(diff < 0, -diff, 0.0)

    avg_gain = wilder_smooth(gains, period)
    avg_loss = wilder_smooth(losses, period)

    for i in range(len(gains)):
        if np.isnan(avg_gain[i]) or np.isnan(avg_loss[i]):
            continue
        if avg_loss[i] == 0:
            # No losses. A window with gains is genuinely maxed at 100, but
            # a completely FLAT window has no gains either -- that is
            # neutral. Mirrors the JS implementation.
            out[i + 1] = 50.0 if avg_gain[i] == 0 else 100.0
            continue
        out[i + 1] = 100.0 - 100.0 / (1.0 + avg_gain[i] / avg_loss[i])
    return out


def macd(closes, fast: int = 12, slow: int = 26, signal_period: int = 9):
    c = _as_array(closes)
    ema_fast = ema(c, fast)
    ema_slow = ema(c, slow)
    line = ema_fast - ema_slow  # NaN propagates where either is undefined

    signal = np.full(len(c), np.nan)
    histogram = np.full(len(c), np.nan)

    defined = np.where(~np.isnan(line))[0]
    if len(defined):
        start = defined[0]
        dense_signal = ema(line[start:], signal_period)
        signal[start:] = dense_signal
        histogram = line - signal
    return line, signal, histogram


def true_range(highs, lows, closes) -> np.ndarray:
    h, l, c = _as_array(highs), _as_array(lows), _as_array(closes)
    out = np.full(len(c), np.nan)
    if len(c) == 0:
        return out
    out[0] = h[0] - l[0]
    prev_close = c[:-1]
    out[1:] = np.maximum.reduce([
        h[1:] - l[1:],
        np.abs(h[1:] - prev_close),
        np.abs(l[1:] - prev_close),
    ])
    return out


def atr(highs, lows, closes, period: int = 14) -> np.ndarray:
    """
    Average True Range, Wilder-smoothed.

    Undefined true-range bars (a halted session with no high/low) are
    skipped rather than propagated. Feeding them straight into
    wilder_smooth would make a single gap poison every subsequent value --
    one missing bar turned the entire column NaN, which downstream would
    silently drop every training row. This also keeps the result identical
    to the Node implementation, which filters the same way.
    """
    tr = true_range(highs, lows, closes)
    defined = ~np.isnan(tr)
    if defined.sum() < period:
        return np.full(len(tr), np.nan)

    smoothed = wilder_smooth(tr[defined], period)
    out = np.full(len(tr), np.nan)
    out[defined] = smoothed
    return out


def bollinger(closes, period: int = 20, mult: float = 2.0):
    c = _as_array(closes)
    middle = sma(c, period)
    upper = np.full(len(c), np.nan)
    lower = np.full(len(c), np.nan)
    percent_b = np.full(len(c), np.nan)

    for i in range(period - 1, len(c)):
        window = c[i - period + 1: i + 1]
        # Population std (ddof=0), matching the JS implementation.
        sd = window.std(ddof=0)
        upper[i] = middle[i] + mult * sd
        lower[i] = middle[i] - mult * sd
        span = upper[i] - lower[i]
        if span:
            percent_b[i] = (c[i] - lower[i]) / span * 100.0
    return middle, upper, lower, percent_b


def roc(closes, period: int = 10) -> np.ndarray:
    c = _as_array(closes)
    out = np.full(len(c), np.nan)
    if len(c) > period:
        prior = c[:-period]
        with np.errstate(divide="ignore", invalid="ignore"):
            out[period:] = np.where(prior != 0, (c[period:] - prior) / prior * 100.0, np.nan)
    return out


def compute_all(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add every indicator column to an OHLCV frame.

    Args:
        df: columns open/high/low/close/volume, chronological, oldest first.
    Returns:
        A copy with indicator columns appended.
    """
    out = df.copy()
    close = out["close"].to_numpy(dtype=float)
    high = out["high"].fillna(out["close"]).to_numpy(dtype=float)
    low = out["low"].fillna(out["close"]).to_numpy(dtype=float)

    out["sma20"] = sma(close, 20)
    out["sma50"] = sma(close, 50)
    out["sma200"] = sma(close, 200)
    out["ema20"] = ema(close, 20)
    out["ema50"] = ema(close, 50)
    out["ema200"] = ema(close, 200)
    out["rsi14"] = rsi(close, 14)
    out["atr14"] = atr(high, low, close, 14)

    macd_line, macd_signal, macd_hist = macd(close)
    out["macd"] = macd_line
    out["macd_signal"] = macd_signal
    out["macd_histogram"] = macd_hist

    bb_mid, bb_up, bb_low, bb_pct = bollinger(close)
    out["bb_middle"] = bb_mid
    out["bb_upper"] = bb_up
    out["bb_lower"] = bb_low
    out["bb_percent_b"] = bb_pct

    out["roc10"] = roc(close, 10)
    return out


__all__ = [
    "sma", "ema", "wilder_smooth", "rsi", "macd", "atr", "true_range",
    "bollinger", "roc", "compute_all",
]
