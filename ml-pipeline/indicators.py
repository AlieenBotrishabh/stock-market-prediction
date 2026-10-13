"""Load daily prices and add technical indicators (SMA, EMA, RSI, ROC)."""

from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).parent / "data" / "raw"

FEATURES = ["close", "sma_10", "sma_20", "ema_10", "ema_20", "rsi_14", "roc_10"]


def load_prices(symbol: str) -> pd.DataFrame:
    """Read data/raw/{SYMBOL}.NS_10y.csv (columns: date, open, high, low, close, volume)."""
    path = DATA_DIR / f"{symbol.upper()}.NS_10y.csv"
    if not path.exists():
        raise FileNotFoundError(f"No price data for {symbol} at {path}")
    df = pd.read_csv(path, parse_dates=["date"])
    return df.sort_values("date").reset_index(drop=True)


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = -delta.clip(upper=0).rolling(period).mean()
    return 100 - 100 / (1 + gain / loss)


def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["sma_10"] = df["close"].rolling(10).mean()
    df["sma_20"] = df["close"].rolling(20).mean()
    df["ema_10"] = df["close"].ewm(span=10, adjust=False).mean()
    df["ema_20"] = df["close"].ewm(span=20, adjust=False).mean()
    df["rsi_14"] = rsi(df["close"], 14)
    df["roc_10"] = df["close"].pct_change(10) * 100
    return df.dropna().reset_index(drop=True)
