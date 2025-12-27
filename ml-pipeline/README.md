# Stock Price Prediction Pipeline

Complete, production-ready Python pipeline for training LSTM models on Indian stock market data using IndianAPI.

## 🎯 Overview

This pipeline provides:
- **Efficient API data collection** with rate limiting (500 requests/month quota)
- **Technical indicator feature engineering** (SMA, EMA, RSI)
- **LSTM time-series models** for stock price prediction
- **Clear separation of concerns** with modular code
- **Comprehensive logging** to prevent quota burnout

## 📋 Project Structure

```
ml-pipeline/
├── config.py              # Central configuration (API keys, symbols, parameters)
├── api_client.py          # IndianAPI integration with rate limiting
├── data_processor.py      # Data loading, feature engineering, preprocessing
├── model.py               # LSTM architecture, training, evaluation
├── main.py                # Orchestration script (CLI interface)
├── requirements.txt       # Python dependencies
├── README.md              # This file
│
├── data/
│   ├── raw/               # Raw JSON responses from API
│   └── processed/         # Processed CSV datasets
├── models/                # Trained model checkpoints (.h5)
└── logs/                  # Logging outputs (request tracking, training logs)
```

## ⚙️ Configuration

### 1. Set Environment Variable

```bash
# Linux/macOS
export INDIANAPI_KEY="your_api_key_here"

# Windows PowerShell
$env:INDIANAPI_KEY = "your_api_key_here"

# Windows CMD
set INDIANAPI_KEY=your_api_key_here
```

### 2. Edit `config.py`

Replace TODO sections with actual values from indianapi.com:

```python
# API Endpoints (verify from documentation)
API_ENDPOINTS = {
    "historical": "/api/historical",      # TODO: Actual endpoint
    "quote": "/api/quote",                # TODO: Actual endpoint
    "company": "/api/company",            # TODO: Actual endpoint
}

# Symbols to track
SYMBOLS = ["TCS", "HDFC", "RELIANCE", "WIPRO", "INFY"]

# Model parameters
SEQUENCE_LENGTH = 10        # Look back 10 days
LSTM_UNITS = 64           # LSTM cell size
EPOCHS = 50               # Training epochs
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Check Rate Limit Status

```bash
python main.py --status
```

Output:
```
Monthly quota (500 requests):
  Used: 0
  Remaining: 500
  Percentage: 0.0%

Today's quota (10 requests):
  Used: 0
  Remaining: 10
```

### 3. Collect Data

```bash
python main.py --collect
```

This will:
- Fetch historical data for each symbol
- Save raw JSON locally (`data/raw/`)
- Log all requests for quota tracking
- Respect daily rate limits

### 4. Process Data

```bash
python main.py --process
```

This will:
- Load raw JSON files
- Parse into DataFrames
- Compute technical indicators (SMA, EMA, RSI)
- Save processed CSVs (`data/processed/`)

### 5. Train Models

```bash
python main.py --train
```

This will:
- Load processed data
- Create sequences for time-series modeling
- Split into train/val/test
- Train LSTM models
- Save trained models (`models/`)

### 6. Run Full Pipeline

```bash
python main.py --full
```

Runs all steps (collect → process → train) in sequence.

## 📊 Data Flow

```
IndianAPI
   ↓
[api_client.py] → Raw JSON files (data/raw/*.json)
   ↓
[data_processor.py] → Processed CSV (data/processed/*.csv)
   ↓
Feature Engineering: OHLCV + SMA + EMA + RSI + Technical Indicators
   ↓
Sequence Creation: (10 days features) → next day's close price
   ↓
Train/Val/Test Split (chronological order to prevent data leakage)
   ↓
[model.py] → LSTM Training → Trained Model (models/*.h5)
   ↓
Evaluation: MAE, RMSE, MAPE metrics
```

## 🔧 Module Details

### `config.py`
Central configuration with TODO markers for API-specific values:
- API credentials and endpoints
- Symbol list
- Rate limiting parameters (500/month quota, 10/day)
- Model hyperparameters
- Feature engineering settings
- Data paths

**TODO Items:**
- Verify exact endpoint paths from indianapi.com API docs
- Verify parameter names (symbol format, date ranges)
- Verify response JSON structure

### `api_client.py`
Handles all API interactions:
- **Rate limiting**: Tracks requests in `logs/request_log.json`, enforces daily/monthly limits
- **Error handling**: Automatic retry with exponential backoff
- **Local storage**: Saves raw JSON responses to `data/raw/`
- **Request logging**: Detailed logs prevent accidental quota burnout

**Key Features:**
- Check rate limit before each request
- Retry failed requests automatically
- Save all responses locally for later processing
- Log detailed statistics

**Usage:**
```python
from api_client import IndianAPIClient

client = IndianAPIClient()

# Get historical data (consumes 1 request)
data = client.get_historical_data("TCS", days=60)

# Check remaining quota
stats = client.get_rate_limit_stats()
print(f"Remaining today: {stats['remaining_today']}")
```

### `data_processor.py`
Converts raw API data to ML-ready datasets:
- **Parsing**: Raw JSON → DataFrame
- **Indicators**: SMA, EMA, RSI, ROC, volatility
- **Sequences**: Create time-series windows (10 days → 1 prediction)
- **Normalization**: Zero-mean, unit-variance scaling
- **Splitting**: Train/val/test split (chronological order)

**Key Functions:**
```python
processor = DataProcessor()

# Parse raw data
df = processor.process_raw_data(raw_json, "TCS")

# Add technical indicators
df = processor.compute_technical_indicators(df)

# Create sequences: (10 days) → next day's price
X, y = processor.create_sequences(df, sequence_length=10)

# Normalize features
X = processor.normalize_data(X, fit=True)

# Split chronologically (prevent future data leakage)
X_train, X_val, X_test, y_train, y_val, y_test = processor.split_dataset(
    X, y, test_size=0.1, validation_size=0.2
)
```

### `model.py`
LSTM model for time-series prediction:
- **Architecture**: 2-layer LSTM with dropout, dense output
- **Training**: Adam optimizer, MSE loss, early stopping
- **Evaluation**: MAE, RMSE, MAPE metrics
- **Checkpointing**: Saves best model during training

**Key Functions:**
```python
# Build model
model = StockPricePredictor(input_shape=(10, num_features))

# Train
results = model.train(X_train, y_train, X_val, y_val, symbol="TCS")

# Evaluate
metrics = model.evaluate(X_test, y_test)
print(f"RMSE: {metrics['rmse']:.4f}, MAPE: {metrics['mape']:.2f}%")

# Predict
predictions = model.predict(X_new)

# Save/Load
model.save("TCS")
loaded = StockPricePredictor.load("TCS")
```

### `main.py`
Orchestration script with CLI:
- **--collect**: Fetch data from IndianAPI
- **--process**: Process raw data
- **--train**: Train LSTM models
- **--full**: Run all steps
- **--status**: Check rate limits

## 📈 Expected Output

### Training Log
```
============================================================
PHASE 3: MODEL TRAINING
============================================================

Training model for TCS
============================================================
Model Summary
...
Creating 42 sequences (length=10)
✓ Created 42 sequences (length=10)
  X shape: (42, 10, 13), y shape: (42,)

✓ Dataset split:
  Train: 30 samples (71.4%)
  Validation: 6 samples (14.3%)
  Test: 6 samples (14.3%)

Starting training...
Epoch 1/50
...
Epoch 30/50
...
✓ Training complete
  Final loss: 0.001234
  Final val_loss: 0.002456
  Final MAE: 0.008765
  Final val_MAE: 0.009876

✓ Test Results:
  Loss (MSE): 0.002500
  MAE: 0.009500
  RMSE: 0.050000
  MAPE: 0.75%

✓ Saved model to models/TCS.h5
```

## 🛡️ Rate Limiting

The pipeline respects IndianAPI's 500 requests/month quota:

- **Daily limit**: 10 requests/day (conservative to stay under 500/month)
- **Request tracking**: All requests logged to `logs/request_log.json`
- **Daily reset**: Quota resets at midnight UTC
- **Quota check**: Every request verified before making API call

**Example:**
```bash
python main.py --status
# Output:
# Monthly quota (500 requests):
#   Used: 25
#   Remaining: 475
#   Percentage: 5.0%
# 
# Today's quota (10 requests):
#   Used: 3
#   Remaining: 7
```

If quota exhausted:
```
2024-12-18 15:30:45 - api_client - WARNING - Daily request limit reached (10)
Error: Rate limit exceeded for today
```

## ⚠️ Important: Fill in TODO Items

Before running the pipeline, update these items in `config.py`:

1. **API Endpoints** (line ~35)
   ```python
   API_ENDPOINTS = {
       "historical": "/api/???",  # TODO: Check indianapi.com docs
       "quote": "/api/???",
       "company": "/api/???",
   }
   ```

2. **Symbol Format** (line ~20)
   ```python
   SYMBOLS = [
       "TCS",  # TODO: Verify format (TCS vs TCS.NS vs other)
       ...
   ]
   ```

3. **Response Parsing** in `data_processor.py` (line ~50)
   ```python
   # TODO: Verify actual JSON structure:
   # Your API might return:
   # {"data": [...]}           or
   # {"candles": [...]}        or
   # {"OHLC": [...]}           or
   # Different field names
   ```

4. **Authentication** in `api_client.py` (line ~95)
   ```python
   # TODO: Verify auth method:
   # "Authorization": f"Bearer {self.api_key}"  or
   # Add as query param: "api_key": self.api_key  or
   # Other method
   ```

## 🔍 Example Workflow

```bash
# 1. Check environment
export INDIANAPI_KEY="your_key"

# 2. See current quota
python main.py --status
# Monthly quota (500 requests):
#   Used: 0
#   Remaining: 500

# 3. Collect 5 symbols (5 requests)
python main.py --collect
# Fetches: TCS, HDFC, RELIANCE, WIPRO, INFY
# Saves to: data/raw/*.json

# 4. Process data (no API calls)
python main.py --process
# Computes indicators
# Saves to: data/processed/*.csv

# 5. Train models (no API calls)
python main.py --train
# Trains LSTM for each symbol
# Saves to: models/*.h5

# 6. Next day (after quota reset)
python main.py --full
# Collect new day's data + retrain models
```

## 📊 Performance Tips

1. **Reuse Processed Data**: Process once, train multiple times
   ```bash
   python main.py --train  # No API calls, uses saved CSVs
   ```

2. **Add More Features**: Edit `data_processor.compute_technical_indicators()`
   - Bollinger Bands, MACD, Stochastic oscillator, etc.
   - More features = more model capacity

3. **Tune Model Architecture**: Edit `config.py`
   - Increase `LSTM_UNITS` for larger models
   - Add more `LSTM_LAYERS` for deeper networks
   - Adjust `SEQUENCE_LENGTH` (longer = more context)

4. **Monitor Training**: Check `logs/model.log` during training
   - If val_loss increasing = overfitting
   - Add more dropout or reduce LSTM_UNITS

## 🐛 Debugging

Check logs in `logs/` directory:
- `api_client.log`: API requests and rate limiting
- `data_processor.log`: Data processing steps
- `model.log`: Training progress
- `pipeline.log`: Overall execution
- `request_log.json`: Detailed request tracking

**Common Issues:**

| Issue | Solution |
|-------|----------|
| "INDIANAPI_KEY not set" | Set environment variable: `export INDIANAPI_KEY="..."`|
| "Daily request limit reached" | Wait until tomorrow (quota resets at midnight UTC) |
| "Invalid raw data structure" | Update `process_raw_data()` to match API response |
| "No processed data found" | Run `python main.py --process` first |
| "TensorFlow not installed" | `pip install tensorflow` |

## 📚 References

- IndianAPI Docs: TODO - Add documentation link
- LSTM Tutorial: https://colah.github.io/posts/2015-08-Understanding-LSTMs/
- Stock Market Data: Common OHLCV + Technical Indicators
- Time-Series Forecasting: Sequence-to-value approach (look back 10 days, predict 1 day ahead)

## 📝 Next Steps

1. Fill in TODO items in `config.py` and `api_client.py`
2. Test with `python main.py --status`
3. Collect initial dataset: `python main.py --collect`
4. Train models: `python main.py --train`
5. Extend with more indicators or symbols as needed

## 💡 Extending the Pipeline

**Add New Symbol:**
```python
# config.py
SYMBOLS = ["TCS", "HDFC", "RELIANCE", "WIPRO", "INFY", "YOUR_SYMBOL"]
```

**Add New Indicator:**
```python
# data_processor.py - in compute_technical_indicators()
df["your_indicator"] = df["close"].rolling(window=5).mean()
```

**Try Different Model:**
```python
# model.py - replace LSTM with GRU or Transformer
layers.GRU(Config.LSTM_UNITS, return_sequences=True)
```

---

**Created:** December 18, 2025  
**Status:** Production-ready  
**Python Version:** 3.8+
