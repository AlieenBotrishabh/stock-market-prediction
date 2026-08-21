"""
Yahoo Finance data client.

Replaces the old api_client.py, which read INDIANAPI_KEY and then never
attached it to a request, pointed at a non-existent host, and used
placeholder endpoint paths marked TODO.

No API key is required here. Responses are cached on disk as CSV so
repeated training runs do not re-hit Yahoo (which rate-limits with 429).
"""

from __future__ import annotations

import logging
import random
import time
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import requests

import config

log = logging.getLogger(__name__)


def to_yahoo_symbol(symbol: str) -> str:
    """Bare NSE tickers get `.NS`; indices (^) and FX (=X) pass through."""
    s = symbol.strip().upper()
    if s.startswith("^") or "=" in s or "." in s:
        return s
    return f"{s}.NS"


def _get_with_retry(url: str, params: dict, retries: int = 3) -> dict:
    """Exponential backoff with jitter on 429/5xx/network errors."""
    headers = {"User-Agent": config.USER_AGENT, "Accept": "application/json"}
    last_exc: Exception | None = None

    for attempt in range(retries + 1):
        try:
            resp = requests.get(
                url, params=params, headers=headers, timeout=config.REQUEST_TIMEOUT
            )
            if resp.status_code == 200:
                return resp.json()
            # 4xx other than 429 means a bad symbol -- retrying will not help.
            if resp.status_code != 429 and resp.status_code < 500:
                raise RuntimeError(f"HTTP {resp.status_code} for {url}")
            last_exc = RuntimeError(f"HTTP {resp.status_code}")
        except requests.RequestException as exc:
            last_exc = exc

        if attempt < retries:
            delay = 0.5 * (2 ** attempt) + random.random() * 0.3
            log.debug("retry %d for %s in %.2fs", attempt + 1, url, delay)
            time.sleep(delay)

    raise RuntimeError(f"Failed to fetch {url}: {last_exc}")


def fetch_ohlcv(symbol: str, range_: str | None = None, use_cache: bool = True) -> pd.DataFrame:
    """
    Daily OHLCV for one symbol.

    Returns a DataFrame indexed by date (datetime64) with columns
    open/high/low/close/volume, oldest first, with null bars dropped
    rather than forward-filled -- filling would invent price action the
    market never printed.
    """
    range_ = range_ or config.HISTORY_RANGE
    yahoo_symbol = to_yahoo_symbol(symbol)
    safe = yahoo_symbol.replace("^", "_").replace("=", "_")
    # CSV rather than parquet: no pyarrow/fastparquet dependency, which
    # keeps the GitHub Actions runner lean, and the cache stays readable.
    cache_path = config.RAW_DIR / f"{safe}_{range_}.csv"

    if use_cache and cache_path.exists():
        age_hours = (time.time() - cache_path.stat().st_mtime) / 3600
        if age_hours < 12:
            log.info("cache hit %s (%.1fh old)", yahoo_symbol, age_hours)
            return pd.read_csv(cache_path, parse_dates=["date"])

    payload = None
    last_exc = None
    for host in config.YAHOO_CHART_HOSTS:
        try:
            payload = _get_with_retry(
                f"{host}/{yahoo_symbol}", {"interval": "1d", "range": range_}
            )
            break
        except Exception as exc:  # noqa: BLE001 - try the sibling host
            last_exc = exc
    if payload is None:
        raise RuntimeError(f"Could not fetch {yahoo_symbol}: {last_exc}")

    result = (payload.get("chart") or {}).get("result")
    if not result:
        err = (payload.get("chart") or {}).get("error") or {}
        raise RuntimeError(f"No data for {yahoo_symbol}: {err.get('description', 'empty result')}")

    node = result[0]
    quote = node["indicators"]["quote"][0]
    timestamps = node.get("timestamp") or []

    df = pd.DataFrame(
        {
            "date": pd.to_datetime(timestamps, unit="s", utc=True).tz_convert("Asia/Kolkata").normalize().tz_localize(None),
            "open": quote.get("open"),
            "high": quote.get("high"),
            "low": quote.get("low"),
            "close": quote.get("close"),
            "volume": quote.get("volume"),
        }
    )

    df = df.dropna(subset=["close"]).drop_duplicates(subset=["date"], keep="last")
    df = df.sort_values("date").reset_index(drop=True)
    df["volume"] = df["volume"].fillna(0.0)

    if df.empty:
        raise RuntimeError(f"{yahoo_symbol} returned no usable bars")

    df.to_csv(cache_path, index=False)
    log.info("fetched %s: %d bars (%s -> %s)", yahoo_symbol, len(df),
             df["date"].iloc[0].date(), df["date"].iloc[-1].date())
    return df


def fetch_market_context(range_: str | None = None, use_cache: bool = True) -> pd.DataFrame:
    """
    The macro block: India VIX, NIFTY 50 and USD/INR.

    Bhandari et al. used VIX / EFFR / UNRATE / UMCSENT / USDX. These are
    the Indian analogues that exist as free daily series. Returned as a
    date-indexed frame ready to join onto a stock's bars.
    """
    frames = []
    for name, ticker in config.MARKET_CONTEXT.items():
        try:
            ctx = fetch_ohlcv(ticker, range_, use_cache)[["date", "close"]]
            frames.append(ctx.rename(columns={"close": name}))
        except Exception as exc:  # noqa: BLE001
            # A missing macro series must not abort training; features.py
            # detects the absent column and drops it from the feature set.
            log.warning("market context %s (%s) unavailable: %s", name, ticker, exc)

    if not frames:
        return pd.DataFrame(columns=["date"])

    out = frames[0]
    for f in frames[1:]:
        out = out.merge(f, on="date", how="outer")
    return out.sort_values("date").reset_index(drop=True)


def latest_close(symbol: str) -> tuple[float, datetime]:
    """Most recent close and its date, used as the prediction base price."""
    df = fetch_ohlcv(symbol, range_="1mo", use_cache=False)
    return float(df["close"].iloc[-1]), df["date"].iloc[-1].to_pydatetime()


__all__ = ["fetch_ohlcv", "fetch_market_context", "to_yahoo_symbol", "latest_close"]
