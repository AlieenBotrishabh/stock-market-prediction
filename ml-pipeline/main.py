"""
Main orchestration script for stock price prediction pipeline.

Usage:
    # Collect data for all symbols (respects rate limits)
    python main.py --collect
    
    # Process collected data and train models
    python main.py --train
    
    # Full pipeline: collect + process + train
    python main.py --full
    
    # Check rate limit status without making requests
    python main.py --status

Environment:
    INDIANAPI_KEY: Your API key from indianapi.com (required)
"""

import argparse
import logging
import sys
from typing import Optional

from config import Config
from api_client import IndianAPIClient
from data_processor import DataProcessor
from model import StockPricePredictor
from predict import StockPredictor

# Configure logging
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format=Config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(Config.LOGS_DIR / "pipeline.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def collect_data() -> bool:
    """
    Collect historical data from IndianAPI for all configured symbols.
    
    Process:
    1. Check rate limits before each request
    2. Fetch historical data for each symbol
    3. Save raw JSON locally
    4. Log all requests for quota tracking
    
    Returns:
        True if all symbols collected successfully, False otherwise
    """
    logger.info("=" * 60)
    logger.info("PHASE 1: DATA COLLECTION")
    logger.info("=" * 60)
    
    client = IndianAPIClient()
    
    # Check and display rate limit status
    stats = client.get_rate_limit_stats()
    logger.info("\nRate Limit Status:")
    logger.info(f"  Total requests this month: {stats['total_requests_this_month']}/500")
    logger.info(f"  Requests today: {stats['requests_today']}/{stats['daily_limit']}")
    logger.info(f"  Remaining today: {stats['remaining_today']}")
    logger.info(f"  Estimated remaining this month: {stats['estimated_remaining_month']}")
    
    if stats['remaining_today'] == 0:
        logger.error("Daily quota exhausted. Please try again tomorrow.")
        return False
    
    collected_count = 0
    failed_symbols = []
    
    # Collect data for each symbol
    for symbol in Config.SYMBOLS:
        logger.info(f"\nFetching historical data for {symbol}...")
        
        data = client.get_historical_data(symbol, days=Config.HISTORY_DAYS)
        
        if data:
            collected_count += 1
            logger.info(f"✓ Successfully collected data for {symbol}")
        else:
            failed_symbols.append(symbol)
            logger.error(f"✗ Failed to collect data for {symbol}")
        
        # Check if we still have quota
        remaining = client.get_rate_limit_stats()['remaining_today']
        if remaining == 0:
            logger.warning("Daily quota exhausted. Stopping collection.")
            break
    
    logger.info("\n" + "=" * 60)
    logger.info(f"Data collection complete: {collected_count}/{len(Config.SYMBOLS)} symbols")
    if failed_symbols:
        logger.warning(f"Failed symbols: {failed_symbols}")
    logger.info("=" * 60)
    
    return len(failed_symbols) == 0


def process_data() -> bool:
    """
    Process raw API data into ML-ready datasets.
    
    Process:
    1. Load raw JSON for each symbol
    2. Parse into DataFrame
    3. Compute technical indicators
    4. Save processed CSV
    
    Returns:
        True if all symbols processed successfully, False otherwise
    """
    logger.info("\n" + "=" * 60)
    logger.info("PHASE 2: DATA PROCESSING")
    logger.info("=" * 60)
    
    client = IndianAPIClient()
    processor = DataProcessor()
    
    processed_count = 0
    failed_symbols = []
    
    for symbol in Config.SYMBOLS:
        logger.info(f"\nProcessing {symbol}...")
        
        try:
            # Load raw data (from API or saved file)
            raw_data = client.load_raw_data(symbol)
            if not raw_data:
                logger.warning(f"No raw data found for {symbol}")
                failed_symbols.append(symbol)
                continue
            
            # Convert to DataFrame
            df = processor.process_raw_data(raw_data, symbol)
            if df is None:
                failed_symbols.append(symbol)
                continue
            
            # Compute indicators
            df = processor.compute_technical_indicators(df)
            
            # Save processed data
            processor.save_processed_data(df, symbol)
            
            processed_count += 1
            logger.info(f"✓ Successfully processed {symbol}")
            
        except Exception as e:
            logger.error(f"Error processing {symbol}: {e}")
            failed_symbols.append(symbol)
    
    logger.info("\n" + "=" * 60)
    logger.info(f"Data processing complete: {processed_count}/{len(Config.SYMBOLS)} symbols")
    if failed_symbols:
        logger.warning(f"Failed symbols: {failed_symbols}")
    logger.info("=" * 60)
    
    return len(failed_symbols) == 0


def train_models() -> bool:
    """
    Train LSTM models for each symbol.
    
    Process:
    1. Load processed data for each symbol
    2. Create sequences for time-series modeling
    3. Normalize features
    4. Split into train/val/test
    5. Train LSTM model
    6. Evaluate on test set
    7. Save trained model
    
    Returns:
        True if training successful, False otherwise
    """
    logger.info("\n" + "=" * 60)
    logger.info("PHASE 3: MODEL TRAINING")
    logger.info("=" * 60)
    
    processor = DataProcessor()
    
    trained_count = 0
    failed_symbols = []
    
    for symbol in Config.SYMBOLS:
        logger.info(f"\n{'='*60}")
        logger.info(f"Training model for {symbol}")
        logger.info(f"{'='*60}")
        
        try:
            # Load processed data
            df = processor.load_processed_data(symbol)
            if df is None:
                logger.warning(f"No processed data found for {symbol}")
                failed_symbols.append(symbol)
                continue
            
            # Create sequences
            X, y = processor.create_sequences(
                df,
                sequence_length=Config.SEQUENCE_LENGTH,
                target_col="close",
            )
            
            if len(X) < 100:
                logger.error(f"Insufficient sequences for {symbol} ({len(X)} < 100)")
                failed_symbols.append(symbol)
                continue
            
            # Normalize
            X = processor.normalize_data(X, fit=True)
            
            # Split
            X_train, X_val, X_test, y_train, y_val, y_test = processor.split_dataset(
                X, y,
                test_size=Config.TEST_SPLIT,
                validation_size=Config.VALIDATION_SPLIT,
            )
            
            # Build and train model
            input_shape = (Config.SEQUENCE_LENGTH, X.shape[-1])
            model = StockPricePredictor(input_shape)
            
            logger.info(f"\nTraining LSTM model for {symbol}...")
            train_results = model.train(
                X_train, y_train,
                X_val, y_val,
                symbol=symbol,
            )
            
            # Evaluate
            logger.info(f"\nEvaluating model for {symbol}...")
            test_results = model.evaluate(X_test, y_test)
            
            # Save
            model.save(name=symbol)
            
            # Log summary
            logger.info(f"\n✓ Model training complete for {symbol}")
            logger.info(f"  Train loss: {train_results['loss']:.6f}")
            logger.info(f"  Val loss: {train_results['val_loss']:.6f}")
            logger.info(f"  Test RMSE: {test_results['rmse']:.6f}")
            logger.info(f"  Test MAPE: {test_results['mape']:.2f}%")
            
            trained_count += 1
            
        except Exception as e:
            logger.error(f"Error training model for {symbol}: {e}", exc_info=True)
            failed_symbols.append(symbol)
    
    logger.info("\n" + "=" * 60)
    logger.info(f"Model training complete: {trained_count}/{len(Config.SYMBOLS)} symbols")
    if failed_symbols:
        logger.warning(f"Failed symbols: {failed_symbols}")
    logger.info("=" * 60)
    
    return len(failed_symbols) == 0


def make_predictions() -> bool:
    """
    Make predictions for all configured symbols.
    
    Returns:
        True if successful, False otherwise
    """
    logger.info("=" * 60)
    logger.info("MAKING PREDICTIONS")
    logger.info("=" * 60)
    
    try:
        predictor = StockPredictor()
        predictions = predictor.predict_all_symbols()
        predictor.print_predictions(predictions)
        return True
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        return False



    """Display current rate limit status without making requests."""
    logger.info("\n" + "=" * 60)
    logger.info("RATE LIMIT STATUS")
    logger.info("=" * 60)
    
    client = IndianAPIClient()
    stats = client.get_rate_limit_stats()
    
    print()
    print(f"Monthly quota (500 requests):")
    print(f"  Used: {stats['total_requests_this_month']}")
    print(f"  Remaining: {stats['estimated_remaining_month']}")
    print(f"  Percentage: {stats['total_requests_this_month']/5:.1f}%")
    print()
    print(f"Today's quota ({stats['daily_limit']} requests):")
    print(f"  Used: {stats['requests_today']}")
    print(f"  Remaining: {stats['remaining_today']}")
    print()
    print("=" * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Stock price prediction pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --collect       # Collect data from IndianAPI
  python main.py --train         # Train models on processed data
  python main.py --full          # Full pipeline: collect + process + train
  python main.py --status        # Check rate limit status
        """,
    )
    
    parser.add_argument(
        "--collect",
        action="store_true",
        help="Collect historical data from IndianAPI",
    )
    parser.add_argument(
        "--process",
        action="store_true",
        help="Process raw data into ML-ready datasets",
    )
    parser.add_argument(
        "--train",
        action="store_true",
        help="Train LSTM models on processed data",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Run full pipeline (collect + process + train)",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Check API rate limit status",
    )
    parser.add_argument(
        "--predict",
        action="store_true",
        help="Make price predictions for all symbols",
    )
    
    args = parser.parse_args()
    
    try:
        # Validate configuration
        Config.validate()
        logger.info(f"Configuration loaded successfully")
        logger.info(f"Symbols: {Config.SYMBOLS}")
        logger.info(f"History: {Config.HISTORY_DAYS} days")
        logger.info(f"Sequence length: {Config.SEQUENCE_LENGTH} days")
        
        # Full pipeline
        if args.full:
            collect_data()
            process_data()
            train_models()
        
        # Individual steps
        elif args.collect:
            collect_data()
        elif args.process:
            process_data()
        elif args.train:
            train_models()
        elif args.predict:
            make_predictions()
        elif args.status:
            show_status()
        else:
            parser.print_help()
    
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Pipeline interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
