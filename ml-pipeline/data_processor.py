"""
Data processing and feature engineering module.

Handles:
- Converting raw API JSON to tabular format (pandas DataFrame)
- Computing technical indicators (SMA, EMA, RSI)
- Creating training sequences for time-series models
- Train/test splitting
- Normalization and scaling
"""

import logging
from typing import Tuple, List, Optional
import numpy as np
import pandas as pd
from pathlib import Path

from config import Config

# Configure logging
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format=Config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(Config.LOGS_DIR / "data_processor.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class DataProcessor:
    """
    Convert raw API data to ML-ready dataset with technical features.
    
    Process:
    1. Parse raw JSON response into DataFrame
    2. Validate data (handle missing values, outliers)
    3. Compute technical indicators (moving averages, RSI, etc.)
    4. Create sequences for time-series modeling
    5. Split into train/validation/test sets
    """

    def __init__(self):
        """Initialize processor."""
        self.scaler_mean = None
        self.scaler_std = None

    def process_raw_data(
        self,
        raw_data: dict,
        symbol: str,
    ) -> Optional[pd.DataFrame]:
        """
        Convert raw API JSON response to clean DataFrame.
        
        Args:
            raw_data: Raw JSON from API
            symbol: Stock symbol (for logging)
            
        Returns:
            DataFrame with columns: timestamp, open, high, low, close, volume
            
        Note:
            TODO: Verify actual JSON structure from indianapi.com:
            Example structures:
            1. {"data": [{"date": "2024-01-01", "open": 123.45, ...}]}
            2. {"candles": [[1704067200, 123.45, 124.0, 123.0, 123.50, 1000000]]}
            3. {"OHLC": [{"timestamp": "2024-01-01T09:15:00", "o": 123.45, ...}]}
        """
        try:
            # TODO: Parse based on actual API response structure
            # Placeholder: assumes {"data": [{"timestamp": ..., "open": ..., etc}]}
            
            if not raw_data or "data" not in raw_data:
                logger.error(f"Invalid raw data structure for {symbol}")
                return None
            
            records = raw_data["data"]
            if not records:
                logger.error(f"No data records for {symbol}")
                return None
            
            df = pd.DataFrame(records)
            
            # TODO: Map actual field names to standard columns
            # Replace these with actual column names from API response
            column_mapping = {
                # "timestamp": "timestamp",  # Or "date", "Date", "time", etc.
                # "open": "open",  # Or "o", "Open", etc.
                # "high": "high",  # Or "h", "High", etc.
                # "low": "low",  # Or "l", "Low", etc.
                # "close": "close",  # Or "c", "Close", etc.
                # "volume": "volume",  # Or "v", "Volume", etc.
            }
            df = df.rename(columns=column_mapping)
            
            # Ensure required columns exist
            required_cols = ["timestamp", "open", "high", "low", "close", "volume"]
            if not all(col in df.columns for col in required_cols):
                missing = [c for c in required_cols if c not in df.columns]
                logger.error(f"Missing required columns for {symbol}: {missing}")
                return None
            
            # Sort by timestamp (oldest first)
            df = df.sort_values("timestamp").reset_index(drop=True)
            
            # Convert types
            df["open"] = pd.to_numeric(df["open"], errors="coerce")
            df["high"] = pd.to_numeric(df["high"], errors="coerce")
            df["low"] = pd.to_numeric(df["low"], errors="coerce")
            df["close"] = pd.to_numeric(df["close"], errors="coerce")
            df["volume"] = pd.to_numeric(df["volume"], errors="coerce")
            
            # Handle missing values
            initial_len = len(df)
            df = df.dropna(subset=["close", "volume"])
            
            if len(df) < Config.MIN_DATA_POINTS:
                logger.error(
                    f"Insufficient data for {symbol}: {len(df)} points < "
                    f"minimum {Config.MIN_DATA_POINTS}"
                )
                return None
            
            dropped = initial_len - len(df)
            if dropped > 0:
                logger.warning(f"Dropped {dropped} rows with missing values for {symbol}")
            
            logger.info(f"✓ Processed {len(df)} valid data points for {symbol}")
            return df
            
        except Exception as e:
            logger.error(f"Error processing raw data for {symbol}: {e}")
            return None

    def compute_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add technical indicator columns to DataFrame.
        
        Indicators:
        - SMA (Simple Moving Average)
        - EMA (Exponential Moving Average)
        - RSI (Relative Strength Index)
        
        Args:
            df: DataFrame with OHLCV data
            
        Returns:
            DataFrame with additional indicator columns
        """
        df = df.copy()
        
        # Simple Moving Averages
        for period in Config.MA_PERIODS:
            df[f"sma_{period}"] = df["close"].rolling(window=period).mean()
            logger.debug(f"Computed SMA-{period}")
        
        # Exponential Moving Averages
        for period in Config.MA_PERIODS:
            df[f"ema_{period}"] = df["close"].ewm(span=period, adjust=False).mean()
            logger.debug(f"Computed EMA-{period}")
        
        # Relative Strength Index (14-period standard)
        df = self._compute_rsi(df, period=14)
        
        # Price rate of change
        df["roc"] = df["close"].pct_change() * 100
        
        # Volatility (rolling standard deviation of returns)
        df["volatility"] = df["close"].pct_change().rolling(window=10).std()
        
        # Daily return
        df["return"] = df["close"].pct_change()
        
        indicator_cols = [c for c in df.columns if c not in ['timestamp', 'open', 'high', 'low', 'close', 'volume']]
        logger.info(f"✓ Computed {len(indicator_cols)} technical indicators")
        return df

    @staticmethod
    def _compute_rsi(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
        """
        Compute Relative Strength Index (RSI).
        
        RSI = 100 - (100 / (1 + RS))
        where RS = Average Gain / Average Loss
        
        Args:
            df: DataFrame with 'close' column
            period: RSI period (default: 14)
            
        Returns:
            DataFrame with added 'rsi' column
        """
        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        df[f"rsi_{period}"] = rsi
        return df

    def create_sequences(
        self,
        df: pd.DataFrame,
        sequence_length: int = Config.SEQUENCE_LENGTH,
        target_col: str = "close",
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create sequences for time-series model.
        
        Each sample: [X, y]
        - X: sequence_length days of features (e.g., last 10 days)
        - y: target value (e.g., next day's close price)
        
        Args:
            df: DataFrame with features and target
            sequence_length: Number of time steps to look back
            target_col: Column to predict
            
        Returns:
            Tuple of (X, y) numpy arrays
            - X shape: (num_sequences, sequence_length, num_features)
            - y shape: (num_sequences,)
        """
        # Select feature columns (exclude timestamp, target)
        feature_cols = [c for c in df.columns if c != "timestamp"]
        X_data = df[feature_cols].values
        y_data = df[target_col].values
        
        sequences_X = []
        sequences_y = []
        
        # Create sequences
        for i in range(len(df) - sequence_length):
            X_seq = X_data[i:i + sequence_length]
            y_seq = y_data[i + sequence_length]
            
            sequences_X.append(X_seq)
            sequences_y.append(y_seq)
        
        X = np.array(sequences_X, dtype=np.float32)
        y = np.array(sequences_y, dtype=np.float32)
        
        logger.info(f"✓ Created {len(sequences_X)} sequences (length={sequence_length})")
        logger.info(f"  X shape: {X.shape}, y shape: {y.shape}")
        
        return X, y

    def normalize_data(
        self,
        X: np.ndarray,
        fit: bool = True,
    ) -> np.ndarray:
        """
        Normalize features to zero mean and unit variance.
        
        Args:
            X: Feature array (num_samples, sequence_length, num_features)
            fit: If True, fit and store scaler params; if False, use stored
            
        Returns:
            Normalized X array
        """
        # Reshape for fitting: (num_samples * sequence_length, num_features)
        original_shape = X.shape
        X_reshaped = X.reshape(-1, original_shape[-1])
        
        if fit:
            self.scaler_mean = X_reshaped.mean(axis=0)
            self.scaler_std = X_reshaped.std(axis=0)
            # Avoid division by zero
            self.scaler_std[self.scaler_std == 0] = 1.0
            logger.info("✓ Fitted normalization parameters")
        
        X_normalized = (X_reshaped - self.scaler_mean) / self.scaler_std
        X_normalized = X_normalized.reshape(original_shape)
        
        logger.info(f"✓ Normalized data (mean={self.scaler_mean.mean():.4f}, std={self.scaler_std.mean():.4f})")
        return X_normalized

    def split_dataset(
        self,
        X: np.ndarray,
        y: np.ndarray,
        test_size: float = Config.TEST_SPLIT,
        validation_size: float = Config.VALIDATION_SPLIT,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Split dataset into train, validation, and test sets.
        
        Splits in chronological order to prevent data leakage:
        [Train] [Validation] [Test]
        
        Args:
            X: Feature array
            y: Target array
            test_size: Fraction for test set (e.g., 0.1 = 10%)
            validation_size: Fraction for validation set from training data
            
        Returns:
            (X_train, X_val, X_test, y_train, y_val, y_test)
        """
        n = len(X)
        
        # Split point for test
        test_split = int(n * (1 - test_size))
        
        # From remaining training data, split for validation
        train_split = int(test_split * (1 - validation_size))
        
        X_train = X[:train_split]
        X_val = X[train_split:test_split]
        X_test = X[test_split:]
        
        y_train = y[:train_split]
        y_val = y[train_split:test_split]
        y_test = y[test_split:]
        
        logger.info(f"✓ Dataset split:")
        logger.info(f"  Train: {len(X_train)} samples ({len(X_train)/n*100:.1f}%)")
        logger.info(f"  Validation: {len(X_val)} samples ({len(X_val)/n*100:.1f}%)")
        logger.info(f"  Test: {len(X_test)} samples ({len(X_test)/n*100:.1f}%)")
        
        return X_train, X_val, X_test, y_train, y_val, y_test

    def save_processed_data(self, df: pd.DataFrame, symbol: str) -> None:
        """
        Save processed DataFrame to CSV.
        
        Args:
            df: Processed DataFrame
            symbol: Stock symbol
        """
        filepath = Config.get_processed_data_path(symbol)
        try:
            df.to_csv(filepath, index=False)
            logger.info(f"✓ Saved processed data to {filepath}")
        except IOError as e:
            logger.error(f"Failed to save processed data: {e}")

    def load_processed_data(self, symbol: str) -> Optional[pd.DataFrame]:
        """
        Load previously processed data from CSV.
        
        Args:
            symbol: Stock symbol
            
        Returns:
            DataFrame or None if file doesn't exist
        """
        filepath = Config.get_processed_data_path(symbol)
        
        if not filepath.exists():
            logger.warning(f"No processed data file found for {symbol}")
            return None
        
        try:
            df = pd.read_csv(filepath)
            logger.info(f"✓ Loaded processed data for {symbol}: {len(df)} rows")
            return df
        except IOError as e:
            logger.error(f"Failed to load processed data: {e}")
            return None


if __name__ == "__main__":
    print("Data processor module loaded. Use with api_client and model modules.")
