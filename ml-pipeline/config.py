"""
Pipeline configuration.

Hyperparameters and the feature set follow Bhandari et al. (2022),
"Predicting stock market index using LSTM", Machine Learning with
Applications 9:100320, adapted from US to Indian markets.

The previous config pointed at `https://api.indianapi.com` (wrong host --
the real one is stock.indianapi.in) with placeholder endpoints, and the
client never attached the API key. Yahoo is used instead: it needs no key,
serves NSE via the `.NS` suffix, and returns 10 years of clean daily bars
(verified: 2,474 rows for TCS with zero null closes).
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
MODEL_DIR = BASE_DIR / "models"
SCALER_DIR = BASE_DIR / "scalers"
REPORT_DIR = BASE_DIR / "reports"

for _d in (RAW_DIR, PROCESSED_DIR, MODEL_DIR, SCALER_DIR, REPORT_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ─── Data source ──────────────────────────────────────────────────────────
YAHOO_CHART_HOSTS = (
    "https://query1.finance.yahoo.com/v8/finance/chart",
    "https://query2.finance.yahoo.com/v8/finance/chart",
)
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
REQUEST_TIMEOUT = 20
HISTORY_RANGE = "10y"

# ─── Universe ─────────────────────────────────────────────────────────────
# NSE tickers (no .NS suffix; the client appends it).
SYMBOLS = [
    "TCS", "INFY", "RELIANCE", "HDFCBANK", "ICICIBANK",
    "WIPRO", "LT", "SBIN", "BHARTIARTL", "AXISBANK",
    "TATASTEEL", "MARUTI", "HCLTECH", "ITC", "BAJFINANCE",
]

# Trained first, then used to warm-start the rest. Hiransha et al. (2018)
# showed a model trained on one NSE stock transfers to others (and even to
# NYSE), so this is cheaper than 15 cold starts and better-founded.
BASE_MODEL_SYMBOL = "RELIANCE"

# ─── Market context features (Bhandari's macro group, India-adapted) ──────
# Bhandari used VIX / EFFR / UNRATE / UMCSENT / USDX -- all US series.
# These are the Indian equivalents that are free and daily on Yahoo.
# RBI repo rate and CPI are deliberately excluded: no free daily feed, and
# a forward-filled monthly series adds little at a one-day horizon.
MARKET_CONTEXT = {
    "vix": "^INDIAVIX",   # India VIX -- investor fear gauge
    "nifty": "^NSEI",     # NIFTY 50 -- broad market
    "usdinr": "USDINR=X", # rupee strength
}

# ─── Feature set ──────────────────────────────────────────────────────────
# `open` is deliberately absent: Bhandari dropped it because |r| with close
# exceeded their 0.80 threshold, making it a duplicate feature. features.py
# re-checks this on the actual Indian data rather than assuming it carries.
#
# Every feature here is SCALE-FREE (a return, a ratio, or a bounded
# oscillator). Feeding raw price levels alongside a return target
# reintroduces the extrapolation problem described at TARGET_MODE: a level
# min-max scaled on the training slice lands outside [0,1] on test data.
# Measured on RELIANCE, level features gave walk-forward MAPE 1.13% vs a
# 1.03% naive baseline; the stationary set below is what closed that gap.
FEATURE_COLUMNS = [
    "return_denoised",  # fundamental: Haar-denoised daily log return
    "return_1d",
    "return_5d",
    "volume_ratio",     # volume vs its own 20-day average
    "macd_rel",         # technical, all normalised by price
    "rsi14",
    "atr_rel",
    "sma20_gap",
    "bb_position",
    "vix",              # macro: India VIX, already a bounded level
    "nifty_return",
    "usdinr_return",
]

# The level-based set from the papers, kept so the comparison in
# reports/ can be reproduced. Used only with TARGET_MODE="price".
FEATURE_COLUMNS_LEVEL = [
    "close_denoised", "volume", "macd", "rsi14", "atr14",
    "vix", "nifty_return", "usdinr_return",
]

TARGET_COLUMN = "close"

CORRELATION_DROP_THRESHOLD = 0.80

# ─── Model ────────────────────────────────────────────────────────────────
# Bhandari's headline result was that a SINGLE LSTM layer of 150 neurons
# beat every multilayer variant on the S&P 500. That did NOT reproduce on
# single NSE stocks with a one-day horizon.
#
# Measured head-to-head on RELIANCE (3 walk-forward folds, same features,
# same target, same validation):
#
#   ts60  LSTM150x1 adagrad          direction 49.2%   ~310s/fold
#   ts10  LSTM64x2  adam e50         direction 49.6%    ~53s/fold
#   ts10  LSTM150x1 adagrad e100     direction 50.8%    ~58s/fold
#   ts10  LSTM64x2  adam e150        direction 52.0%    ~86s/fold  <- chosen
#
# The short 10-day window is both better AND ~4x cheaper than the 60-day
# one. That is the original pipeline's architecture, and on this data it
# beats the longer window taken from the papers -- Hiransha et al. tuned
# their 200-day window for a 10-DAY-ahead target, whereas this predicts one
# day ahead, where distant history mostly adds noise.
LSTM_UNITS = 64
LSTM_LAYERS = 2
DROPOUT = 0.2

# 10 sessions of lookback. See the sweep above LSTM_UNITS: this beat a
# 60-day window on direction accuracy while training four times faster.
TIME_STEP = 10
HORIZON_DAYS = 1

# What the network actually regresses on.
#
#   "return" -- next-day LOG RETURN, reconstructed to a price afterwards.
#   "price"  -- the raw close, as in the papers.
#
# "return" is the default because "price" is measurably broken on trending
# Indian equities once leakage is removed. Measured on RELIANCE: fitting
# the min-max scaler on the training slice only (the correct way) leaves
# 90-100% of TEST closes outside the training range, so the network is
# asked to emit scaled values above 1 -- which it cannot do. Walk-forward
# MAPE was 6.85% against a 1.03% naive baseline.
#
# The papers avoid this by normalising the FULL series before splitting
# (Bhandari sec. 4.5), which leaks the future min/max into training and is
# a large part of why their reported error is so low. Log returns are
# stationary (RELIANCE: std 0.0194 first half vs 0.0141 second), so the
# scaler transfers across folds and no extrapolation is required.
TARGET_MODE = "return"

# 150 epochs matters: at 50 the same architecture scored 49.6% direction,
# at 150 it scored 52.0%. The short window makes the extra epochs cheap.
EPOCHS = 150
BATCH_SIZE = 32
LEARNING_RATE = 0.001
OPTIMIZER = "adam"      # with lr 1e-3; beat adagrad/1e-2 on this data
EARLY_STOPPING_PATIENCE = 15
VALIDATION_SPLIT = 0.2

# Multiple replicates: LSTM training is stochastic, so the paper selects on
# the AVERAGE RMSE across runs rather than a single lucky fit.
N_REPLICATES = 3
RANDOM_SEED = 42

# ─── Backtesting ──────────────────────────────────────────────────────────
TRAIN_TEST_SPLIT = 0.8      # time-ordered, never shuffled
WALK_FORWARD_WINDOWS = 5
CONFIDENCE_LEVEL = 0.80

# A model may only publish predictions if it beats this baseline. Guessing
# "tomorrow == today" is a surprisingly strong benchmark on daily equities;
# anything that cannot clear it has earned no right to a confident number.
BASELINE_NAME = "naive-drift"

# ─── Denoising ────────────────────────────────────────────────────────────
# Haar wavelet, soft threshold (Bhandari section 4.5). Applied per
# walk-forward window, never once across the whole series -- the transform
# is not causal, so a global pass would smear future information backwards.
WAVELET_LEVEL = 2
WAVELET_MODE = "soft"

# ─── Output ───────────────────────────────────────────────────────────────
MODEL_VERSION = os.getenv("MODEL_VERSION", "lstm-64x2-ts10-v2")
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB = os.getenv("MONGODB_DB", "stockmarket")

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
