"""
Stock Price Prediction Pipeline Package

Modules:
- config: Central configuration management
- api_client: IndianAPI integration with rate limiting
- data_processor: Data processing and feature engineering
- model: LSTM model training and evaluation
- main: Orchestration script

Usage:
    python main.py --help
    python main.py --collect  # Collect data
    python main.py --train    # Train models
    python main.py --full     # Full pipeline
"""

__version__ = "1.0.0"
__author__ = "Stock Prediction Team"

from .config import Config
from .api_client import IndianAPIClient, RateLimiter
from .data_processor import DataProcessor
from .model import StockPricePredictor

__all__ = [
    "Config",
    "IndianAPIClient",
    "RateLimiter",
    "DataProcessor",
    "StockPricePredictor",
]
