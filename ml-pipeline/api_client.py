"""
API client module for IndianAPI integration.

Handles:
- HTTP requests to IndianAPI with authentication
- Rate limiting to stay under 500 requests/month quota
- Error handling and retry logic
- Local JSON storage of raw API responses
- Request logging to prevent quota burnout
"""

import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Any
import requests

from config import Config


# Configure logging
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format=Config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(Config.LOGS_DIR / "api_client.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Simple rate limiter to prevent exceeding 500 requests/month quota.
    
    Strategy:
    - Tracks requests in a file (request_log.json)
    - Resets daily counter at configured hour (default: midnight UTC)
    - Blocks requests if daily limit exceeded
    """

    def __init__(self, max_per_day: int = Config.MAX_REQUESTS_PER_DAY):
        self.max_per_day = max_per_day
        self.log_path = Config.LOGS_DIR / "request_log.json"
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def _load_log(self) -> Dict[str, Any]:
        """Load request log from file."""
        if self.log_path.exists():
            try:
                with open(self.log_path, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return self._init_log()
        return self._init_log()

    def _init_log(self) -> Dict[str, Any]:
        """Initialize empty request log."""
        return {
            "total_requests": 0,
            "daily_requests": {},  # Date -> count
            "last_reset": datetime.utcnow().isoformat(),
        }

    def _save_log(self, log: Dict[str, Any]) -> None:
        """Save request log to file."""
        with open(self.log_path, "w") as f:
            json.dump(log, f, indent=2)

    def _get_today_key(self) -> str:
        """Get today's date key (YYYY-MM-DD)."""
        return datetime.utcnow().strftime("%Y-%m-%d")

    def check_limit(self) -> bool:
        """
        Check if we can make another request today.
        
        Returns:
            True if request allowed, False if daily limit reached
        """
        log = self._load_log()
        today = self._get_today_key()
        today_count = log["daily_requests"].get(today, 0)

        if today_count >= self.max_per_day:
            logger.warning(
                f"Daily request limit reached ({self.max_per_day}). "
                f"Requests reset at {Config.RATE_LIMIT_RESET_HOUR}:00 UTC."
            )
            return False

        return True

    def record_request(self) -> None:
        """Record that a request was made."""
        log = self._load_log()
        today = self._get_today_key()
        
        log["total_requests"] = log.get("total_requests", 0) + 1
        log["daily_requests"][today] = log["daily_requests"].get(today, 0) + 1
        
        self._save_log(log)
        
        today_count = log["daily_requests"][today]
        remaining = max(0, self.max_per_day - today_count)
        logger.info(
            f"Request recorded. Daily: {today_count}/{self.max_per_day}, "
            f"Remaining: {remaining}, Total this month: {log['total_requests']}"
        )

    def get_stats(self) -> Dict[str, Any]:
        """Get current rate limiting statistics."""
        log = self._load_log()
        today = self._get_today_key()
        today_count = log["daily_requests"].get(today, 0)
        
        return {
            "total_requests_this_month": log["total_requests"],
            "requests_today": today_count,
            "daily_limit": self.max_per_day,
            "remaining_today": max(0, self.max_per_day - today_count),
            "monthly_quota": 500,
            "estimated_remaining_month": 500 - log["total_requests"],
        }


class IndianAPIClient:
    """
    Client for IndianAPI with rate limiting and error handling.
    
    Features:
    - Rate-limited requests (respects 500/month quota)
    - Automatic retry with exponential backoff
    - Local JSON storage of responses
    - Request/response logging
    """

    def __init__(self):
        """Initialize API client."""
        Config.validate()
        
        self.base_url = Config.INDIANAPI_BASE_URL
        self.api_key = Config.INDIANAPI_KEY
        self.rate_limiter = RateLimiter(Config.MAX_REQUESTS_PER_DAY)
        
        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "StockPredictionPipeline/1.0",
            # TODO: Verify authentication method from indianapi.com docs
            # Likely: "Authorization": f"Bearer {self.api_key}"
            # Or: Add api_key as query parameter
        })
        
        logger.info("IndianAPIClient initialized successfully")

    def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, str]] = None,
        max_retries: int = 3,
    ) -> Optional[Dict[str, Any]]:
        """
        Make HTTP request with retry logic and rate limiting.
        
        Args:
            endpoint: API endpoint (e.g., "/api/historical")
            params: Query parameters
            max_retries: Number of retries on failure
            
        Returns:
            Parsed JSON response or None if failed
        """
        # Check rate limit before making request
        if not self.rate_limiter.check_limit():
            logger.error("Rate limit exceeded for today")
            return None

        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(max_retries):
            try:
                logger.debug(f"Request attempt {attempt + 1}/{max_retries}: {url}")
                
                response = self.session.get(url, params=params, timeout=10)
                response.raise_for_status()
                
                # Record successful request
                self.rate_limiter.record_request()
                
                data = response.json()
                logger.info(f"✓ Request successful: {url}")
                return data
                
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout on attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    
            except requests.exceptions.HTTPError as e:
                logger.error(f"HTTP error {response.status_code}: {e}")
                if response.status_code == 429:  # Rate limited by server
                    logger.warning("Server rate limit hit. Backing off...")
                    if attempt < max_retries - 1:
                        time.sleep(5 * (2 ** attempt))
                return None
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                return None

        logger.error(f"Failed to get data from {url} after {max_retries} attempts")
        return None

    def get_historical_data(
        self,
        symbol: str,
        days: int = Config.HISTORY_DAYS,
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch historical OHLCV data for a symbol.
        
        Args:
            symbol: Stock symbol (e.g., "TCS", "RELIANCE")
            days: Number of days of history to fetch
            
        Returns:
            Raw API response with historical data or None if failed
            
        Note:
            TODO: Verify exact endpoint and parameters from indianapi.com:
            - Endpoint path (e.g., "/api/historical", "/quotes/historical")
            - Required parameters (symbol, interval, period)
            - Response structure (OHLCV fields, date format, etc.)
        """
        logger.info(f"Fetching historical data for {symbol} (last {days} days)")
        
        # TODO: Replace with actual API endpoint from indianapi.com docs
        endpoint = Config.API_ENDPOINTS["historical"]
        
        params = {
            "symbol": symbol,
            # TODO: Verify parameter names:
            # "interval": "1d",  # Daily candles
            # "period": f"{days}d",  # Last N days
        }
        
        data = self._make_request(endpoint, params)
        
        if data:
            self._save_raw_data(symbol, data)
            logger.info(f"✓ Saved raw data for {symbol}")
        
        return data

    def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetch real-time quote for a symbol.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Current price, volume, etc. or None if failed
            
        Note:
            TODO: Verify endpoint and response fields
        """
        logger.info(f"Fetching quote for {symbol}")
        
        endpoint = Config.API_ENDPOINTS["quote"]
        params = {"symbol": symbol}
        
        return self._make_request(endpoint, params)

    def get_company_info(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetch company details (market cap, sector, etc.).
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Company metadata or None if failed
            
        Note:
            TODO: Verify endpoint and response fields
        """
        logger.info(f"Fetching company info for {symbol}")
        
        endpoint = Config.API_ENDPOINTS["company"]
        params = {"symbol": symbol}
        
        return self._make_request(endpoint, params)

    def _save_raw_data(self, symbol: str, data: Dict[str, Any]) -> None:
        """
        Save raw API response to local JSON file.
        
        Args:
            symbol: Stock symbol
            data: API response data
        """
        filepath = Config.get_raw_data_path(symbol)
        
        try:
            with open(filepath, "w") as f:
                json.dump(data, f, indent=2)
            logger.debug(f"Saved raw data to {filepath}")
        except IOError as e:
            logger.error(f"Failed to save raw data: {e}")

    def load_raw_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Load previously saved raw API response from file.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Parsed JSON data or None if file doesn't exist
        """
        filepath = Config.get_raw_data_path(symbol)
        
        if not filepath.exists():
            logger.warning(f"No raw data file found for {symbol}")
            return None
        
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to load raw data for {symbol}: {e}")
            return None

    def get_rate_limit_stats(self) -> Dict[str, Any]:
        """Get current rate limiting statistics."""
        return self.rate_limiter.get_stats()


if __name__ == "__main__":
    # Example: Check rate limit without making requests
    client = IndianAPIClient()
    stats = client.get_rate_limit_stats()
    print("\n" + "=" * 50)
    print("RATE LIMIT STATISTICS")
    print("=" * 50)
    for key, value in stats.items():
        print(f"{key}: {value}")
    print("=" * 50)
