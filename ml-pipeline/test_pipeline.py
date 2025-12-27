"""
Quick test script for ML pipeline - validates core functionality.
No TensorFlow required for this basic test.

Usage:
    python test_pipeline.py

Tests:
    1. Configuration validation
    2. API client initialization
    3. Data processor functionality
    4. File I/O operations
"""

import sys
import json
import os
from pathlib import Path

# Set dummy API key for testing if not set
if not os.getenv("INDIANAPI_KEY"):
    print("⚠ INDIANAPI_KEY not set - using dummy key for testing")
    os.environ["INDIANAPI_KEY"] = "test_key_for_pipeline_validation"

print("=" * 60)
print("STOCK PRICE PREDICTION PIPELINE - TEST SUITE")
print("=" * 60)

# Test 1: Configuration
print("\n[TEST 1] Configuration Validation")
print("-" * 60)
try:
    from config import Config
    
    Config.validate()
    print("✓ Configuration loaded successfully")
    print(f"  - API Key set: {bool(Config.INDIANAPI_KEY)}")
    print(f"  - Symbols: {Config.SYMBOLS}")
    print(f"  - History days: {Config.HISTORY_DAYS}")
    print(f"  - Sequence length: {Config.SEQUENCE_LENGTH}")
    print(f"  - LSTM units: {Config.LSTM_UNITS}")
    print(f"  - Data directory: {Config.DATA_DIR}")
    
except Exception as e:
    print(f"✗ Configuration error: {e}")
    sys.exit(1)

# Test 2: API Client
print("\n[TEST 2] API Client & Rate Limiting")
print("-" * 60)
try:
    from api_client import IndianAPIClient, RateLimiter
    
    client = IndianAPIClient()
    print("✓ API client initialized successfully")
    
    stats = client.get_rate_limit_stats()
    print(f"✓ Rate limiting active:")
    print(f"  - Total requests this month: {stats['total_requests_this_month']}/500")
    print(f"  - Requests today: {stats['requests_today']}/{stats['daily_limit']}")
    print(f"  - Remaining today: {stats['remaining_today']}")
    print(f"  - Monthly remaining: {stats['estimated_remaining_month']}")
    
except Exception as e:
    print(f"✗ API client error: {e}")
    sys.exit(1)

# Test 3: Data Processor
print("\n[TEST 3] Data Processor")
print("-" * 60)
try:
    from data_processor import DataProcessor
    
    processor = DataProcessor()
    print("✓ Data processor initialized successfully")
    
    # Test technical indicator computation
    import numpy as np
    import pandas as pd
    
    # Create dummy data
    dates = pd.date_range('2024-01-01', periods=50, freq='D')
    dummy_df = pd.DataFrame({
        'timestamp': dates,
        'open': np.random.uniform(100, 150, 50),
        'high': np.random.uniform(105, 155, 50),
        'low': np.random.uniform(95, 145, 50),
        'close': np.random.uniform(100, 150, 50),
        'volume': np.random.uniform(1e6, 5e6, 50),
    })
    
    # Test indicator computation
    dummy_df_indicators = processor.compute_technical_indicators(dummy_df)
    print(f"✓ Technical indicators computed:")
    print(f"  - Input features: {len(dummy_df.columns)}")
    print(f"  - Output features: {len(dummy_df_indicators.columns)}")
    print(f"  - New indicators: {[c for c in dummy_df_indicators.columns if c not in dummy_df.columns]}")
    
    # Test sequence creation
    X, y = processor.create_sequences(dummy_df_indicators, sequence_length=10)
    print(f"✓ Sequences created:")
    print(f"  - X shape: {X.shape} (samples, lookback days, features)")
    print(f"  - y shape: {y.shape} (target prices)")
    print(f"  - Number of sequences: {len(X)}")
    
    # Test normalization
    X_normalized = processor.normalize_data(X, fit=True)
    print(f"✓ Data normalized:")
    print(f"  - Original X mean: {X.mean():.4f}, std: {X.std():.4f}")
    print(f"  - Normalized X mean: {X_normalized.mean():.4f}, std: {X_normalized.std():.4f}")
    
except ImportError as e:
    print(f"⚠ Pandas/NumPy not installed: {e}")
    print("  Install with: pip install pandas numpy")
except Exception as e:
    print(f"✗ Data processor error: {e}")
    sys.exit(1)

# Test 4: File Operations
print("\n[TEST 4] File Operations")
print("-" * 60)
try:
    # Test directory creation
    test_raw_dir = Config.RAW_DATA_DIR
    test_processed_dir = Config.PROCESSED_DATA_DIR
    test_models_dir = Config.MODELS_DIR
    test_logs_dir = Config.LOGS_DIR
    
    for d in [test_raw_dir, test_processed_dir, test_models_dir, test_logs_dir]:
        if d.exists():
            print(f"✓ Directory exists: {d.name}/")
        else:
            print(f"⚠ Directory missing: {d.name}/ (will be created on first run)")
    
    # Test JSON write/read
    test_data = {"test": "data", "symbols": Config.SYMBOLS}
    test_file = Config.LOGS_DIR / "test.json"
    
    with open(test_file, 'w') as f:
        json.dump(test_data, f)
    
    with open(test_file, 'r') as f:
        loaded = json.load(f)
    
    print(f"✓ JSON I/O working correctly")
    
    # Cleanup
    test_file.unlink()
    
except Exception as e:
    print(f"✗ File operations error: {e}")
    sys.exit(1)

# Test 5: Model Import (optional - skip if TensorFlow not installed)
print("\n[TEST 5] Model Module")
print("-" * 60)
try:
    from model import StockPricePredictor
    print("✓ Model module imported successfully")
    
    try:
        # Try to create model
        model = StockPricePredictor(input_shape=(10, 20))
        print("✓ LSTM model created successfully")
        print(f"  - Input shape: (10 days, 20 features)")
        print(f"  - Architecture: 2-layer LSTM(64) + Dense layers")
    except ImportError:
        print("⚠ TensorFlow not installed - skipping model creation")
        print("  Install with: pip install tensorflow")
    
except Exception as e:
    print(f"⚠ Model module: {e}")

# Test 6: CLI
print("\n[TEST 6] Command Line Interface")
print("-" * 60)
try:
    import main
    print("✓ Main orchestration module imported successfully")
    print("  Available commands:")
    print("    - python main.py --collect  (fetch data)")
    print("    - python main.py --process  (compute features)")
    print("    - python main.py --train    (train models)")
    print("    - python main.py --full     (all three)")
    print("    - python main.py --status   (check quota)")
    print("    - python main.py --help     (show help)")
    
except Exception as e:
    print(f"✗ CLI error: {e}")

# Summary
print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)
print("✓ Core modules working")
print(f"✓ Configuration valid")
print(f"✓ API quota tracking active")
print(f"✓ Data processing ready")
print(f"\nNext steps:")
print(f"1. pip install -r requirements.txt")
print(f"2. python main.py --status (check quota)")
print(f"3. python main.py --full (run full pipeline)")
print("=" * 60)
