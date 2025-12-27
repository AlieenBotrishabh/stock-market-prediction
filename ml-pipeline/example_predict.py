"""
Example: Making predictions with trained models.

This script demonstrates how to:
1. Load trained models
2. Prepare data for prediction
3. Make predictions
4. Interpret results
"""

import numpy as np
import pandas as pd
from pathlib import Path
import logging

from config import Config
from data_processor import DataProcessor
from model import StockPricePredictor
from predict import StockPredictor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def example_1_predict_single_symbol():
    """Example 1: Predict for a single symbol."""
    logger.info("\n" + "="*60)
    logger.info("EXAMPLE 1: Predict for a single symbol")
    logger.info("="*60)
    
    predictor = StockPredictor()
    result = predictor.predict_next_day("TCS")
    
    if result:
        print(f"\nPrediction for {result['symbol']}:")
        print(f"  Current price: ₹{result['current_price']:.2f}")
        print(f"  Predicted price: ₹{result['predicted_price']:.2f}")
        print(f"  Expected change: ₹{result['price_change']:+.2f} ({result['percent_change']:+.2f}%)")
        print(f"  Direction: {result['direction']}")
        print(f"  Confidence: {result['confidence']:.1f}%")
    else:
        print("Prediction failed - ensure models are trained first")


def example_2_predict_all_symbols():
    """Example 2: Predict for all configured symbols."""
    logger.info("\n" + "="*60)
    logger.info("EXAMPLE 2: Predict for all symbols")
    logger.info("="*60)
    
    predictor = StockPredictor()
    predictions = predictor.predict_all_symbols()
    
    if predictions:
        predictor.print_predictions(predictions)
    else:
        print("No predictions available - ensure models are trained first")


def example_3_compare_with_current_prices():
    """Example 3: Compare predictions with current prices."""
    logger.info("\n" + "="*60)
    logger.info("EXAMPLE 3: Compare predictions with current prices")
    logger.info("="*60)
    
    processor = DataProcessor()
    predictor = StockPredictor()
    
    print("\n" + "-"*80)
    print(f"{'Symbol':<10} {'Current':<12} {'Predicted':<12} {'Diff':<12} {'% Change':<12}")
    print("-"*80)
    
    for symbol in Config.SYMBOLS:
        result = predictor.predict_next_day(symbol)
        if result:
            current = result['current_price']
            predicted = result['predicted_price']
            diff = predicted - current
            pct = (diff / current) * 100 if current != 0 else 0
            
            arrow = "↑" if diff > 0 else "↓"
            print(f"{symbol:<10} ₹{current:<11.2f} ₹{predicted:<11.2f} ₹{diff:>11.2f} {pct:>11.2f}% {arrow}")
    
    print("-"*80)


def example_4_confidence_analysis():
    """Example 4: Analyze prediction confidence."""
    logger.info("\n" + "="*60)
    logger.info("EXAMPLE 4: Analyze prediction confidence")
    logger.info("="*60)
    
    predictor = StockPredictor()
    predictions = predictor.predict_all_symbols()
    
    if predictions:
        confidences = [p['confidence'] for p in predictions]
        
        print(f"\nConfidence Analysis:")
        print(f"  Average: {np.mean(confidences):.1f}%")
        print(f"  Min: {np.min(confidences):.1f}%")
        print(f"  Max: {np.max(confidences):.1f}%")
        print(f"  Std Dev: {np.std(confidences):.1f}%")
        
        high_conf = len([c for c in confidences if c >= 80])
        med_conf = len([c for c in confidences if 60 <= c < 80])
        low_conf = len([c for c in confidences if c < 60])
        
        print(f"\nConfidence Distribution:")
        print(f"  High (≥80%): {high_conf} symbols")
        print(f"  Medium (60-80%): {med_conf} symbols")
        print(f"  Low (<60%): {low_conf} symbols")
    else:
        print("No predictions available")


def example_5_direction_summary():
    """Example 5: Summary of predicted directions."""
    logger.info("\n" + "="*60)
    logger.info("EXAMPLE 5: Direction summary")
    logger.info("="*60)
    
    predictor = StockPredictor()
    predictions = predictor.predict_all_symbols()
    
    if predictions:
        up_predictions = [p for p in predictions if p['direction'] == 'UP']
        down_predictions = [p for p in predictions if p['direction'] == 'DOWN']
        
        print(f"\nPredicted Direction Summary:")
        print(f"  Total symbols: {len(predictions)}")
        print(f"  Predicted UP: {len(up_predictions)} ({len(up_predictions)/len(predictions)*100:.1f}%)")
        print(f"  Predicted DOWN: {len(down_predictions)} ({len(down_predictions)/len(predictions)*100:.1f}%)")
        
        if up_predictions:
            print(f"\nSymbols predicted UP:")
            for p in sorted(up_predictions, key=lambda x: x['percent_change'], reverse=True):
                print(f"  {p['symbol']:<10} +{p['percent_change']:.2f}% (₹{p['price_change']:+.2f})")
        
        if down_predictions:
            print(f"\nSymbols predicted DOWN:")
            for p in sorted(down_predictions, key=lambda x: x['percent_change']):
                print(f"  {p['symbol']:<10} {p['percent_change']:.2f}% (₹{p['price_change']:+.2f})")
    else:
        print("No predictions available")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("STOCK PRICE PREDICTION EXAMPLES")
    print("="*60)
    
    # Run examples
    example_1_predict_single_symbol()
    example_2_predict_all_symbols()
    example_3_compare_with_current_prices()
    example_4_confidence_analysis()
    example_5_direction_summary()
    
    print("\n" + "="*60)
    print("Examples completed!")
    print("="*60)
