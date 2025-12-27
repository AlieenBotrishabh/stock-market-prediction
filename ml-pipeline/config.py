"""
Configuration module for stock price prediction pipeline.

Handles:
- API credentials and endpoints
- Data paths and storage locations
- Model hyperparameters
- Feature engineering parameters
"""

import os
from pathlib import Path
from typing import List


class Config:
    """Central configuration for the pipeline."""

    # ============ API CONFIGURATION ============
    # Read API key from environment variable
    INDIANAPI_KEY = os.getenv("INDIANAPI_KEY")
    INDIANAPI_BASE_URL = "https://api.indianapi.com"  # TODO: Verify exact base URL from indianapi.com docs

    # Rate limiting to stay under 500 requests/month quota
    # With 30-day month: ~16-17 requests per day safe
    # Conservative: 10 requests per day for safety margin
    MAX_REQUESTS_PER_DAY = 10
    RATE_LIMIT_RESET_HOUR = 0  # Reset quota counter at midnight UTC

    # ============ SYMBOLS TO TRACK ============
    # List of symbols to download historical data for
    # TODO: Verify symbol format from indianapi.com (e.g., "TCS.NS", "RELIANCE.NS", etc.)
    SYMBOLS = [
        "TCS",  # Tata Consultancy Services
        "HDFC",  # Housing Development Finance Corp
        "RELIANCE",  # Reliance Industries
        "WIPRO",  # Wipro Limited
        "INFY",  # Infosys
    ]

    # ============ DATA PATHS ============
    PROJECT_ROOT = Path(__file__).parent
    DATA_DIR = PROJECT_ROOT / "data"
    RAW_DATA_DIR = DATA_DIR / "raw"
    PROCESSED_DATA_DIR = DATA_DIR / "processed"
    MODELS_DIR = PROJECT_ROOT / "models"
    LOGS_DIR = PROJECT_ROOT / "logs"

    # Create directories if they don't exist
    for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, MODELS_DIR, LOGS_DIR]:
        directory.mkdir(parents=True, exist_ok=True)

    # ============ DATA COLLECTION PARAMETERS ============
    # TODO: Verify what historical date ranges the API supports
    # For initial pipeline, we'll collect last N days of data
    HISTORY_DAYS = 60  # Collect 60 days of historical data per symbol
    
    # TODO: Verify available endpoints:
    # - Historical OHLCV endpoint
    # - Real-time quote endpoint
    # - Company details endpoint
    
    API_ENDPOINTS = {
        "historical": "/api/historical",  # TODO: Replace with actual endpoint
        "quote": "/api/quote",  # TODO: Replace with actual endpoint
        "company": "/api/company",  # TODO: Replace with actual endpoint
    }

    # ============ FEATURE ENGINEERING ============
    # Moving averages periods (in days)
    MA_PERIODS = [5, 10, 20]  # 5-day, 10-day, 20-day moving averages
    
    # Technical indicators to compute
    # Options: RSI, MACD, Bollinger Bands, ATR, etc.
    TECHNICAL_INDICATORS = ["SMA", "EMA", "RSI"]  # Simple/Exp Moving Avg, Relative Strength Index
    
    # ============ MODEL TRAINING ============
    # LSTM architecture
    LSTM_UNITS = 64
    LSTM_LAYERS = 2
    DROPOUT_RATE = 0.2
    
    # Training parameters
    SEQUENCE_LENGTH = 10  # Look back 10 days to predict next day
    BATCH_SIZE = 32
    EPOCHS = 50
    VALIDATION_SPLIT = 0.2
    TEST_SPLIT = 0.1
    
    # Optimizer and loss
    LEARNING_RATE = 0.001
    LOSS_FUNCTION = "mse"  # Mean Squared Error for regression
    METRICS = ["mae", "mse"]
    
    # ============ LOGGING ============
    LOG_LEVEL = "INFO"
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # ============ TARGET VARIABLE ============
    # What we're predicting:
    # Option 1: "close_price" - Predict next day's closing price (regression)
    # Option 2: "direction" - Predict up/down movement (classification)
    TARGET_TYPE = "close_price"  # TODO: Choose based on use case
    
    # ============ DATA VALIDATION ============
    MIN_DATA_POINTS = 30  # Minimum number of valid data points per symbol
    MISSING_VALUE_THRESHOLD = 0.3  # Drop columns with >30% missing values

    @staticmethod
    def validate() -> bool:
        """Validate that all required configurations are set."""
        if not Config.INDIANAPI_KEY:
            raise ValueError(
                "INDIANAPI_KEY environment variable not set. "
                "Please set it: export INDIANAPI_KEY='your_key_here'"
            )
        
        if not Config.SYMBOLS:
            raise ValueError("No symbols configured in Config.SYMBOLS")
        
        return True

    @staticmethod
    def get_raw_data_path(symbol: str) -> Path:
        """Get path for raw API responses for a symbol."""
        return Config.RAW_DATA_DIR / f"{symbol}_raw.json"

    @staticmethod
    def get_processed_data_path(symbol: str) -> Path:
        """Get path for processed dataset for a symbol."""
        return Config.PROCESSED_DATA_DIR / f"{symbol}_processed.csv"

    @staticmethod
    def get_model_path(name: str = "stock_predictor") -> Path:
        """Get path for trained model checkpoint."""
        return Config.MODELS_DIR / f"{name}.h5"


if __name__ == "__main__":
    Config.validate()
    print("✓ Configuration validated successfully")
    print(f"API Key loaded: {bool(Config.INDIANAPI_KEY)}")
    print(f"Symbols to track: {Config.SYMBOLS}")
    print(f"Data directory: {Config.DATA_DIR}")
