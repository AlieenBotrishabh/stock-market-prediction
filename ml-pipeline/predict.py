"""
Prediction module for stock price forecasting.

Handles:
- Loading trained models
- Making predictions on new data
- Interpreting prediction results
- Confidence scoring
"""

import logging
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from pathlib import Path

from config import Config
from data_processor import DataProcessor
from model import StockPricePredictor

# Configure logging
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format=Config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(Config.LOGS_DIR / "prediction.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class StockPredictor:
    """
    End-to-end prediction pipeline for stock prices.
    
    Workflow:
    1. Load trained model for symbol
    2. Load historical data for feature extraction
    3. Prepare latest data as input
    4. Make prediction for next day's price
    5. Return prediction with confidence interval
    """

    def __init__(self):
        """Initialize predictor."""
        self.processor = DataProcessor()
        self.models = {}  # Cache for loaded models
        self.scaler_params = {}  # Cache for normalization params

    def predict_next_day(self, symbol: str) -> Optional[Dict]:
        """
        Predict next day's closing price for a symbol.
        
        Args:
            symbol: Stock symbol (e.g., "TCS")
            
        Returns:
            Dict with prediction, confidence, and metadata or None if failed
        """
        logger.info(f"Preparing prediction for {symbol}...")
        
        try:
            # Load model
            model = self._load_model(symbol)
            if model is None:
                logger.error(f"Model not found for {symbol}")
                return None
            
            # Load processed data
            df = self.processor.load_processed_data(symbol)
            if df is None:
                logger.error(f"Processed data not found for {symbol}")
                return None
            
            # Get latest sequence
            X_latest = self._prepare_input(df, symbol)
            if X_latest is None:
                logger.error(f"Could not prepare input for {symbol}")
                return None
            
            # Make prediction
            prediction = model.predict(X_latest)[0][0]
            
            # Get current price for reference
            current_price = df['close'].iloc[-1]
            price_change = prediction - current_price
            percent_change = (price_change / current_price) * 100
            
            # Create confidence interval
            confidence = self._estimate_confidence(model, X_latest)
            
            result = {
                "symbol": symbol,
                "current_price": float(current_price),
                "predicted_price": float(prediction),
                "price_change": float(price_change),
                "percent_change": float(percent_change),
                "confidence": float(confidence),
                "direction": "UP" if price_change > 0 else "DOWN",
                "data_points": len(df),
            }
            
            logger.info(f"✓ Prediction for {symbol}: {prediction:.2f} ({percent_change:+.2f}%)")
            return result
            
        except Exception as e:
            logger.error(f"Prediction failed for {symbol}: {e}")
            return None

    def predict_all_symbols(self) -> List[Dict]:
        """
        Predict next day's prices for all configured symbols.
        
        Returns:
            List of prediction dicts
        """
        logger.info("=" * 60)
        logger.info("PREDICTING NEXT-DAY PRICES FOR ALL SYMBOLS")
        logger.info("=" * 60)
        
        predictions = []
        
        for symbol in Config.SYMBOLS:
            result = self.predict_next_day(symbol)
            if result:
                predictions.append(result)
        
        logger.info(f"\n✓ Completed predictions for {len(predictions)}/{len(Config.SYMBOLS)} symbols")
        return predictions

    def _load_model(self, symbol: str) -> Optional[StockPricePredictor]:
        """Load cached or new model."""
        if symbol in self.models:
            return self.models[symbol]
        
        model = StockPricePredictor.load(symbol)
        if model:
            self.models[symbol] = model
        
        return model

    def _prepare_input(self, df: pd.DataFrame, symbol: str) -> Optional[np.ndarray]:
        """
        Prepare latest data as input for model.
        
        Args:
            df: DataFrame with all features
            symbol: Stock symbol
            
        Returns:
            Input array (1, sequence_length, num_features) or None
        """
        # Get last sequence_length days
        if len(df) < Config.SEQUENCE_LENGTH:
            logger.warning(f"Insufficient data for {symbol}: {len(df)} < {Config.SEQUENCE_LENGTH}")
            return None
        
        latest_data = df.tail(Config.SEQUENCE_LENGTH)
        
        # Select feature columns (exclude timestamp)
        feature_cols = [c for c in df.columns if c != "timestamp"]
        X = latest_data[feature_cols].values.astype(np.float32)
        
        # Normalize using same parameters as training
        # For now, use identity (not normalizing for prediction)
        # In production, load scaler from saved model metadata
        
        # Reshape to (1, sequence_length, num_features)
        X = X.reshape(1, Config.SEQUENCE_LENGTH, -1)
        
        return X

    @staticmethod
    def _estimate_confidence(model: StockPricePredictor, X: np.ndarray) -> float:
        """
        Estimate confidence level for prediction.
        
        Args:
            model: Trained model
            X: Input data
            
        Returns:
            Confidence score 0-100
        """
        # Basic confidence: based on training loss
        # Higher training loss → lower confidence
        if hasattr(model, 'metadata') and 'final_val_mae' in model.metadata:
            mae = model.metadata['final_val_mae']
            # Convert MAE to confidence (lower error = higher confidence)
            confidence = max(0, min(100, 100 - (mae * 100)))
        else:
            confidence = 75.0  # Default confidence
        
        return confidence

    def print_predictions(self, predictions: List[Dict]) -> None:
        """Print predictions in formatted table."""
        if not predictions:
            logger.warning("No predictions to display")
            return
        
        print("\n" + "=" * 100)
        print("NEXT-DAY PRICE PREDICTIONS")
        print("=" * 100)
        print(f"{'Symbol':<10} {'Current':<12} {'Predicted':<12} {'Change':<12} {'%Change':<10} {'Direction':<8} {'Confidence':<12}")
        print("-" * 100)
        
        for pred in predictions:
            symbol = pred['symbol']
            current = pred['current_price']
            predicted = pred['predicted_price']
            change = pred['price_change']
            pct = pred['percent_change']
            direction = pred['direction']
            conf = pred['confidence']
            
            # Color coding (would be actual colors in terminal)
            direction_symbol = "↑" if direction == "UP" else "↓"
            
            print(f"{symbol:<10} ₹{current:<11.2f} ₹{predicted:<11.2f} "
                  f"₹{change:<11.2f} {pct:>8.2f}% {direction_symbol} {direction:<6} {conf:>10.1f}%")
        
        print("=" * 100)
        
        # Summary statistics
        avg_confidence = np.mean([p['confidence'] for p in predictions])
        up_count = len([p for p in predictions if p['direction'] == 'UP'])
        down_count = len([p for p in predictions if p['direction'] == 'DOWN'])
        
        print(f"\nSummary:")
        print(f"  Total symbols: {len(predictions)}")
        print(f"  Predicted UP: {up_count}")
        print(f"  Predicted DOWN: {down_count}")
        print(f"  Average confidence: {avg_confidence:.1f}%")
        print("=" * 100 + "\n")


if __name__ == "__main__":
    predictor = StockPredictor()
    predictions = predictor.predict_all_symbols()
    predictor.print_predictions(predictions)
