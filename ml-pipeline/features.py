"""
Feature engineering.

Implements Bhandari et al. (2022) section 4: fundamental + macroeconomic +
technical features, Haar wavelet denoising, correlation-based feature
selection, and min-max scaling.

The three look-ahead traps this module is written to avoid -- each one is
enough on its own to manufacture an impressive-looking MAPE that would
evaporate in live trading:

  1. Scaler leakage. The MinMaxScaler is fit on the TRAINING slice only.
     Fitting on the full series leaks the future min/max into training.
  2. Denoising leakage. The Haar transform is not causal: a global pass
     smears future information backwards into past samples. Denoising is
     therefore applied causally (expanding window) -- each point is
     denoised using only data at or before it.
  3. Indicator leakage. Every indicator here uses trailing windows only.

The old data_processor.py had `column_mapping = {}` (empty, so it failed
its required-columns check on any real payload) and its inference path
skipped normalisation entirely while training normalised -- a mismatch that
by itself would have made every prediction meaningless.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

import config
import indicators as ind

log = logging.getLogger(__name__)


# ─── Haar wavelet denoising ───────────────────────────────────────────────
# Implemented directly rather than via PyWavelets to keep the CI runner
# dependency-light and the transform fully deterministic.

def _haar_forward(x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """One Haar decomposition level. Returns (approximation, detail)."""
    n = len(x) - (len(x) % 2)
    pairs = x[:n].reshape(-1, 2)
    approx = (pairs[:, 0] + pairs[:, 1]) / np.sqrt(2.0)
    detail = (pairs[:, 0] - pairs[:, 1]) / np.sqrt(2.0)
    return approx, detail


def _haar_inverse(approx: np.ndarray, detail: np.ndarray) -> np.ndarray:
    """Inverse of one Haar level."""
    even = (approx + detail) / np.sqrt(2.0)
    odd = (approx - detail) / np.sqrt(2.0)
    out = np.empty(len(approx) * 2)
    out[0::2] = even
    out[1::2] = odd
    return out


def _soft_threshold(d: np.ndarray, thresh: float) -> np.ndarray:
    return np.sign(d) * np.maximum(np.abs(d) - thresh, 0.0)


def haar_denoise(series: np.ndarray, level: int = 2) -> np.ndarray:
    """
    Soft-threshold Haar denoising with a universal (VisuShrink) threshold.

    Operates on the whole array passed in, so callers must slice causally --
    see denoise_causal below.
    """
    x = np.asarray(series, dtype=float)
    if len(x) < 2 ** level + 2:
        return x.copy()

    original_len = len(x)
    coeffs: list[np.ndarray] = []
    current = x.copy()
    odd_tails: list[float | None] = []

    for _ in range(level):
        if len(current) < 2:
            break
        tail = current[-1] if len(current) % 2 else None
        odd_tails.append(tail)
        approx, detail = _haar_forward(current)
        coeffs.append(detail)
        current = approx

    if not coeffs:
        return x.copy()

    # Universal threshold from the finest detail level's robust noise
    # estimate (median absolute deviation / 0.6745).
    finest = coeffs[0]
    sigma = np.median(np.abs(finest)) / 0.6745 if len(finest) else 0.0
    thresh = sigma * np.sqrt(2.0 * np.log(max(len(x), 2)))

    for i in range(len(coeffs) - 1, -1, -1):
        detail = _soft_threshold(coeffs[i], thresh) if config.WAVELET_MODE == "soft" else coeffs[i]
        n = min(len(current), len(detail))
        current = _haar_inverse(current[:n], detail[:n])
        tail = odd_tails[i]
        if tail is not None:
            current = np.append(current, tail)

    if len(current) < original_len:
        current = np.append(current, x[len(current):])
    return current[:original_len]


def denoise_causal(series: np.ndarray, level: int = 2, min_history: int = 64) -> np.ndarray:
    """
    Causal denoising: point i is denoised using only x[0..i].

    A single global haar_denoise() call over the whole series would let
    future values influence past ones -- the classic silent leak in papers
    that report suspiciously low error. This costs O(n^2) but n is ~2,500,
    which is a few seconds.
    """
    x = np.asarray(series, dtype=float)
    out = np.empty(len(x))
    out[:min_history] = x[:min_history]
    for i in range(min_history, len(x)):
        out[i] = haar_denoise(x[: i + 1], level)[-1]
    return out


# ─── Feature assembly ─────────────────────────────────────────────────────

def build_features(
    ohlcv: pd.DataFrame,
    market: pd.DataFrame | None = None,
    causal_denoise: bool = True,
) -> pd.DataFrame:
    """
    Assemble the modelling frame from raw bars plus macro context.

    Args:
        ohlcv: date/open/high/low/close/volume, oldest first.
        market: output of data_client.fetch_market_context().
        causal_denoise: keep True for anything you will trust. False is
            faster and only appropriate for exploratory plots.
    """
    df = ohlcv.copy().sort_values("date").reset_index(drop=True)
    df = ind.compute_all(df)

    close = df["close"].to_numpy(dtype=float)
    df["close_denoised"] = (
        denoise_causal(close, config.WAVELET_LEVEL) if causal_denoise
        else haar_denoise(close, config.WAVELET_LEVEL)
    )

    # Macro block, forward-filled onto trading days (an index may not print
    # on a day the stock does). ffill only ever uses past values.
    if market is not None and not market.empty:
        df = df.merge(market, on="date", how="left")
        for col in config.MARKET_CONTEXT:
            if col in df.columns:
                df[col] = df[col].ffill()

    # Returns rather than levels for the market series: levels are strongly
    # trending and would dominate the min-max scale.
    if "nifty" in df.columns:
        df["nifty_return"] = df["nifty"].pct_change() * 100.0
    if "usdinr" in df.columns:
        df["usdinr_return"] = df["usdinr"].pct_change() * 100.0

    # ── Stationary variants ────────────────────────────────────────────
    # When the target is a log return, feeding raw price LEVELS as inputs
    # reintroduces exactly the problem return-targeting was meant to solve:
    # a level feature min-max scaled on the training slice lands outside
    # [0,1] on test data, so the network sees inputs it was never trained
    # on. Every feature below is scale-free, so its distribution is stable
    # across folds.
    close = df["close"].to_numpy(dtype=float)
    denoised = df["close_denoised"].to_numpy(dtype=float)

    # Denoised daily log return -- the stationary counterpart of
    # close_denoised, and the direct analogue of the target.
    log_ret = np.zeros(len(df))
    log_ret[1:] = np.log(np.maximum(denoised[1:], 1e-9) / np.maximum(denoised[:-1], 1e-9))
    df["return_denoised"] = log_ret * 100.0

    df["return_1d"] = df["close"].pct_change() * 100.0
    df["return_5d"] = df["close"].pct_change(5) * 100.0

    # Volume relative to its own 20-day average: "is today busy?" rather
    # than an absolute share count that grows over the years.
    vol = df["volume"].replace(0, np.nan)
    df["volume_ratio"] = vol / vol.rolling(20, min_periods=5).mean()

    # Indicators expressed as a fraction of price, so a stock at 200 and
    # one at 3,000 produce comparable values.
    with np.errstate(divide="ignore", invalid="ignore"):
        safe_close = np.where(close != 0, close, np.nan)
        df["macd_rel"] = df["macd"].to_numpy(dtype=float) / safe_close * 100.0
        df["atr_rel"] = df["atr14"].to_numpy(dtype=float) / safe_close * 100.0
        df["bb_position"] = df["bb_percent_b"] / 100.0
        # Distance from the 20-day mean, in percent.
        df["sma20_gap"] = (close - df["sma20"].to_numpy(dtype=float)) / safe_close * 100.0

    return df


def select_features(df: pd.DataFrame, candidates: list[str] | None = None) -> tuple[list[str], pd.DataFrame]:
    """
    Correlation-based feature selection (Bhandari section 4.4).

    Drops one of any pair correlating above the threshold. The paper found
    `open` duplicated `close` on the S&P 500; rather than assume that
    carries to Indian equities, this recomputes it on the actual data.

    Returns (kept_feature_names, correlation_matrix).
    """
    candidates = [c for c in (candidates or config.FEATURE_COLUMNS) if c in df.columns]
    missing = [c for c in (candidates or config.FEATURE_COLUMNS) if c not in df.columns]
    if missing:
        log.warning("features unavailable, skipping: %s", missing)

    sub = df[candidates].dropna()
    corr = sub.corr().abs()

    kept: list[str] = []
    for col in candidates:
        redundant = any(
            corr.loc[col, k] > config.CORRELATION_DROP_THRESHOLD for k in kept
        )
        if redundant:
            partner = next(k for k in kept if corr.loc[col, k] > config.CORRELATION_DROP_THRESHOLD)
            log.info("dropping %s (|r|=%.2f with %s)", col, corr.loc[col, partner], partner)
            continue
        kept.append(col)

    return kept, corr


def make_sequences(
    values: np.ndarray, target: np.ndarray, time_step: int, horizon: int = 1
) -> tuple[np.ndarray, np.ndarray]:
    """
    Sliding windows for the LSTM.

    X[i] = values[i : i+time_step]          (shape: time_step x n_features)
    y[i] = target[i + time_step + horizon - 1]

    The target is strictly AFTER the end of its input window, so no sample
    can see its own answer.
    """
    xs, ys = [], []
    last = len(values) - time_step - horizon + 1
    for i in range(max(0, last)):
        xs.append(values[i: i + time_step])
        ys.append(target[i + time_step + horizon - 1])
    return np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)


class MinMaxScaler:
    """
    Min-max scaler (Bhandari eq. for feature scaling).

    Deliberately hand-rolled and picklable so the exact fitted ranges are
    persisted alongside the model. The previous pipeline normalised during
    training but used an identity transform at inference -- the single bug
    most guaranteed to produce garbage predictions.
    """

    def __init__(self) -> None:
        self.min_: np.ndarray | None = None
        self.range_: np.ndarray | None = None

    def fit(self, x: np.ndarray) -> "MinMaxScaler":
        x = np.asarray(x, dtype=float)
        self.min_ = np.nanmin(x, axis=0)
        span = np.nanmax(x, axis=0) - self.min_
        # A constant column would divide by zero; map it to 0 instead.
        self.range_ = np.where(span == 0, 1.0, span)
        return self

    def transform(self, x: np.ndarray) -> np.ndarray:
        if self.min_ is None:
            raise RuntimeError("scaler used before fit()")
        return (np.asarray(x, dtype=float) - self.min_) / self.range_

    def fit_transform(self, x: np.ndarray) -> np.ndarray:
        return self.fit(x).transform(x)

    def inverse_transform(self, x: np.ndarray) -> np.ndarray:
        if self.min_ is None:
            raise RuntimeError("scaler used before fit()")
        return np.asarray(x, dtype=float) * self.range_ + self.min_


__all__ = [
    "build_features", "select_features", "make_sequences", "MinMaxScaler",
    "haar_denoise", "denoise_causal",
]
