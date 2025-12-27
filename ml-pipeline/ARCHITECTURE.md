# Stock Price Prediction Pipeline - Architecture & Design

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                         (Command Line)                          │
│  python main.py --collect | --process | --train | --full       │
└────────────────┬──────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MAIN ORCHESTRATION (main.py)                  │
│  Coordinates: collect_data() → process_data() → train_models() │
└────────────────┬──────────────────────────────────────────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      ▼          ▼          ▼
   COLLECT    PROCESS    TRAIN
   (Phase 1)  (Phase 2)  (Phase 3)
      │          │          │
      └──────────┼──────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌──────────────┐      ┌──────────────┐
│ API CLIENT   │      │ DATA PROCESSOR
│ (api_client) │      │ (data_processor)
│              │      │
│ • Rate limit │      │ • Parse JSON
│ • Fetch data │      │ • Compute indicators
│ • Save JSON  │      │ • Create sequences
│ • Log quota  │      │ • Normalize
└──────┬───────┘      │ • Split train/test
       │              └──────────┬─────┘
       │                         │
       ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│  Raw Data Files  │    │  Processed Data  │
│  data/raw/*.json │    │  data/processed/ │
│                  │    │  *.csv           │
│ TCS_raw.json     │    │ TCS_processed.csv
│ HDFC_raw.json    │    │ HDFC_processed.csv
│ ...              │    │ ...
└────────────────┘    └────────┬──────────┘
                               │
                               ▼
                       ┌──────────────────┐
                       │  MODEL TRAINING  │
                       │  (model.py)      │
                       │                  │
                       │ • Build LSTM     │
                       │ • Train on data  │
                       │ • Evaluate       │
                       │ • Save model     │
                       └────────┬─────────┘
                               │
                               ▼
                       ┌──────────────────┐
                       │  Trained Models  │
                       │  models/*.h5     │
                       │                  │
                       │ TCS.h5           │
                       │ HDFC.h5          │
                       │ ...              │
                       └──────────────────┘
```

---

## Data Pipeline: From API to Predictions

```
PHASE 1: DATA COLLECTION
═════════════════════════════════════════════════════════════

  IndianAPI (Cloud)
        │
        │ Fetch 60 days of OHLCV
        │ Symbol: TCS
        │ (1 HTTP request)
        ▼
  ┌────────────────────────────┐
  │ Raw JSON Response:         │
  │ {                          │
  │   "data": [                │
  │     {                      │
  │       "date": "2024-12-01",
  │       "open": 3245.50,     │
  │       "high": 3290.25,     │
  │       "low": 3240.00,      │
  │       "close": 3280.75,    │
  │       "volume": 1234567    │
  │     },                     │
  │     ...                    │
  │   ]                        │
  │ }                          │
  └────────────────────────────┘
        │
        │ Save to file
        ▼
  ┌────────────────────────────┐
  │ data/raw/TCS_raw.json      │
  │ (Raw API response)         │
  │ 60 days of OHLCV data      │
  └────────────────────────────┘


PHASE 2: FEATURE ENGINEERING
═════════════════════════════════════════════════════════════

  data/raw/TCS_raw.json
        │
        │ Parse JSON
        │ Clean data
        ▼
  ┌──────────────────────────────────────┐
  │ DataFrame (57 rows × 6 columns):     │
  │ timestamp  open   high   low  close │
  │ 2024-11-14 3245.5 3290.2 3240.0 3280.7 │
  │ 2024-11-15 3281.0 3295.5 3275.0 3290.5 │
  │ ...        ...    ...    ...   ...   │
  └──────────────────────────────────────┘
        │
        │ Add Technical Indicators
        │ - SMA (5, 10, 20 day)
        │ - EMA (5, 10, 20 day)
        │ - RSI, ROC, Volatility
        ▼
  ┌────────────────────────────────────────────────────────┐
  │ DataFrame (57 rows × 20 columns):                      │
  │ timestamp open high low close volume sma_5 ema_10 rsi_14 ...
  │ 2024-11-14  ... (all OHLCV + indicators)              │
  │ 2024-11-15  ... (computed for each row)               │
  │ ...         ...                                        │
  └────────────────────────────────────────────────────────┘
        │
        │ Create Sequences:
        │ - Window: 10 consecutive days
        │ - Target: Next day's close price
        ▼
  ┌──────────────────────────────────────┐
  │ Training Sequences (47 samples):     │
  │ X shape: (47, 10, 20)                │
  │   - 47 sequences                     │
  │   - 10 days lookback                 │
  │   - 20 features per day              │
  │                                      │
  │ y shape: (47,)                       │
  │   - 47 target prices                 │
  │   - Next day's close price           │
  └──────────────────────────────────────┘
        │
        │ Normalize (zero mean, unit variance)
        │ Split (70% train, 20% val, 10% test)
        │
        │ Save to CSV
        ▼
  ┌──────────────────────────────────────┐
  │ data/processed/TCS_processed.csv     │
  │ (Ready for ML)                       │
  └──────────────────────────────────────┘


PHASE 3: MODEL TRAINING
═════════════════════════════════════════════════════════════

  data/processed/TCS_processed.csv
        │
        │ Load data
        │ Create sequences
        │ Normalize
        ▼
  ┌──────────────────────────────┐
  │ Train/Val/Test Data:         │
  │ X_train: (33, 10, 20)        │
  │ y_train: (33,)               │
  │ X_val:   (10, 10, 20)        │
  │ y_val:   (10,)               │
  │ X_test:  (5, 10, 20)         │
  │ y_test:  (5,)                │
  └──────────────────────────────┘
        │
        │ Build LSTM Model
        │ Input: (10 days, 20 features)
        ▼
  ┌────────────────────────────────────┐
  │ LSTM Architecture:                 │
  │                                    │
  │ Input (None, 10, 20)               │
  │    │                               │
  │    ├─► LSTM(64) + Dropout(0.2)    │
  │    │                               │
  │    ├─► LSTM(64) + Dropout(0.2)    │
  │    │                               │
  │    ├─► Dense(32, ReLU)            │
  │    │                               │
  │    └─► Dense(1) ─► Price output   │
  │                                    │
  │ Parameters: ~18,000                │
  │ Optimizer: Adam (lr=0.001)         │
  │ Loss: MSE                          │
  └────────────────────────────────────┘
        │
        │ Training Loop (Epochs 1-50)
        │ Epoch 1: loss=0.234, val_loss=0.198
        │ Epoch 2: loss=0.189, val_loss=0.156
        │ ...
        │ Epoch 30: loss=0.045, val_loss=0.052
        │ Early stopping at epoch 30
        ▼
  ┌────────────────────────────────────┐
  │ Trained Model Evaluation:          │
  │                                    │
  │ Test Loss (MSE): 0.0062            │
  │ Test MAE: 0.0048                   │
  │ Test RMSE: 0.0787                  │
  │ Test MAPE: 0.52%                   │
  └────────────────────────────────────┘
        │
        │ Save Model
        ▼
  ┌────────────────────────────────────┐
  │ models/TCS.h5                      │
  │ (Trained LSTM model - 2.3 MB)      │
  │                                    │
  │ Can now predict on new data        │
  │ Input: 10 days of features         │
  │ Output: Next day price             │
  └────────────────────────────────────┘
```

---

## Rate Limiting & Quota Management

```
MONTHLY QUOTA (500 requests)
════════════════════════════════════════════════════════════

Total Budget: 500 API calls per month
Daily Budget: 10 API calls per day (conservative)
Monthly Reset: Calendar month (1st-30th)
Daily Reset: Midnight UTC (00:00)

Daily Quota Tracking:
  ┌─────────────────────────────────────┐
  │ 2024-12-18                          │
  │ ├─ 10:30am: Request 1/10 (TCS)      │
  │ ├─ 11:00am: Request 2/10 (HDFC)     │
  │ ├─ 11:30am: Request 3/10 (RELIANCE)│
  │ ├─ Request 4/10 (WIPRO)             │
  │ ├─ Request 5/10 (INFY)              │
  │ └─ Daily limit reached ✓            │
  │                                     │
  │ 2024-12-19 (next day)               │
  │ └─ Counter resets to 0/10           │
  └─────────────────────────────────────┘

Monthly Usage Tracking (JSON file):
  {
    "total_requests": 125,
    "daily_requests": {
      "2024-12-15": 5,
      "2024-12-16": 0,
      "2024-12-17": 5,
      "2024-12-18": 5,
      ...
    },
    "last_reset": "2024-12-18T00:00:00"
  }

API Requests by Type:
  - Collect: 1 request per symbol (5 symbols = 5 requests)
  - Process: 0 requests (uses saved JSON)
  - Train: 0 requests (uses saved CSV)
  
Example Month:
  Days 1-5: Collect data (5 requests × 5 days = 25)
  Days 6-30: Train only (0 requests × 25 days = 0)
  Total: 25/500 requests used
```

---

## Module Dependency Graph

```
config.py (Central Configuration)
    ▲
    │ Imported by all modules
    │
    ├─────────────────────────┬──────────────────────┐
    │                         │                      │
    ▼                         ▼                      ▼
api_client.py         data_processor.py          model.py
(Data Collection)     (Feature Engineering)  (LSTM Training)
    │                         │                      │
    │ Depends on              │ Depends on           │ Depends on
    │ - requests (HTTP)       │ - pandas (DataFr)    │ - tensorflow (NN)
    │ - json (parsing)        │ - numpy (math)       │ - numpy (arrays)
    │ - logging               │ - logging            │ - logging
    │                         │                      │
    └─────────────┬───────────┴──────────────────────┘
                  │
                  ▼
              main.py
          (Orchestration)
              CLI Entry Point
```

---

## Configuration Hierarchy

```
Environment Variables (Highest Priority)
    │
    ├─ INDIANAPI_KEY
    │
    ▼
config.py (Central Configuration)
    │
    ├─ INDIANAPI_BASE_URL = "https://api.indianapi.com"
    ├─ API_ENDPOINTS = {...}
    ├─ SYMBOLS = [...]
    ├─ HISTORY_DAYS = 60
    ├─ SEQUENCE_LENGTH = 10
    ├─ LSTM_UNITS = 64
    ├─ EPOCHS = 50
    ├─ MAX_REQUESTS_PER_DAY = 10
    ├─ MA_PERIODS = [5, 10, 20]
    ├─ TECHNICAL_INDICATORS = ["SMA", "EMA", "RSI"]
    └─ DATA_PATHS = {...}
    
All modules import Config and use these values
```

---

## Data File Organization

```
ml-pipeline/
│
├── data/
│   ├── raw/
│   │   ├── TCS_raw.json         (Raw API response - 60 days OHLCV)
│   │   ├── HDFC_raw.json        (1 file per symbol from --collect)
│   │   ├── RELIANCE_raw.json
│   │   ├── WIPRO_raw.json
│   │   └── INFY_raw.json
│   │
│   └── processed/
│       ├── TCS_processed.csv     (CSV with all features + indicators)
│       ├── HDFC_processed.csv    (1 file per symbol from --process)
│       ├── RELIANCE_processed.csv
│       ├── WIPRO_processed.csv
│       └── INFY_processed.csv
│
├── models/
│   ├── TCS.h5                    (Trained LSTM model)
│   ├── TCS.json                  (Model metadata: loss, metrics)
│   ├── HDFC.h5                   (1 model per symbol from --train)
│   ├── HDFC.json
│   ├── RELIANCE.h5
│   ├── RELIANCE.json
│   ├── WIPRO.h5
│   ├── WIPRO.json
│   ├── INFY.h5
│   └── INFY.json
│
└── logs/
    ├── request_log.json          (Tracks all API calls + quota)
    ├── api_client.log            (API debugging logs)
    ├── data_processor.log        (Feature engineering logs)
    ├── model.log                 (Training progress logs)
    └── pipeline.log              (Overall execution logs)
```

---

## Request Flow Example: Collecting TCS Data

```
User: python main.py --collect
│
├─ main.py:collect_data()
│  │
│  ├─ Create IndianAPIClient()
│  │  │
│  │  ├─ Load INDIANAPI_KEY from environment
│  │  ├─ Initialize RateLimiter
│  │  └─ Load request_log.json
│  │
│  ├─ For each symbol in CONFIG.SYMBOLS:
│  │  │
│  │  ├─ Check rate limit (RateLimiter.check_limit())
│  │  │  │ Is daily quota (10) exceeded?
│  │  │  │ ✓ OK - Proceed
│  │  │  │
│  │  ├─ Call client.get_historical_data("TCS", days=60)
│  │  │  │
│  │  │  ├─ _make_request("/api/historical", {"symbol": "TCS", ...})
│  │  │  │  │
│  │  │  │  ├─ Create HTTP request
│  │  │  │  │  URL: https://api.indianapi.com/api/historical?symbol=TCS&period=60d
│  │  │  │  │
│  │  │  │  ├─ Send request (with retry logic)
│  │  │  │  │  Attempt 1: Timeout → Wait 1 sec → Retry
│  │  │  │  │  Attempt 2: Success ✓
│  │  │  │  │
│  │  │  │  ├─ Response: 200 OK
│  │  │  │  │  Content-Type: application/json
│  │  │  │  │  Body: {"data": [...57 days of OHLCV...]}
│  │  │  │  │
│  │  │  │  ├─ Record request in quota tracker
│  │  │  │  │  logs/request_log.json updated
│  │  │  │  │  {
│  │  │  │  │    "total_requests": 1,
│  │  │  │  │    "daily_requests": {"2024-12-18": 1}
│  │  │  │  │  }
│  │  │  │  │
│  │  │  │  └─ Return parsed JSON
│  │  │  │
│  │  │  └─ Save raw response to file
│  │  │     _save_raw_data("TCS", response_json)
│  │  │     → data/raw/TCS_raw.json
│  │  │
│  │  └─ Log success
│  │     "✓ Successfully collected data for TCS"
│  │
│  └─ Summary
│     "Data collection complete: 5/5 symbols"
│     "Total requests made: 5"
│     "Remaining today: 5"
│
└─ Exit
```

---

## Training Flow Example: Training TCS Model

```
User: python main.py --train
│
├─ main.py:train_models()
│  │
│  ├─ For each symbol in CONFIG.SYMBOLS:
│  │  │
│  │  ├─ Load processed data
│  │  │  processor.load_processed_data("TCS")
│  │  │  → Reads data/processed/TCS_processed.csv
│  │  │  → Returns DataFrame (57 rows × 20 columns)
│  │  │
│  │  ├─ Create sequences
│  │  │  processor.create_sequences(df, sequence_length=10)
│  │  │  │
│  │  │  ├─ Slide window: 10 consecutive days → next day target
│  │  │  │  [Day 1-10 features] → Day 11 close price
│  │  │  │  [Day 2-11 features] → Day 12 close price
│  │  │  │  ...
│  │  │  │
│  │  │  └─ Returns X (47, 10, 20), y (47,)
│  │  │     47 training samples
│  │  │     10 days per sample
│  │  │     20 features per day
│  │  │
│  │  ├─ Normalize
│  │  │  processor.normalize_data(X, fit=True)
│  │  │  → Compute mean & std across training data
│  │  │  → Apply: X = (X - mean) / std
│  │  │
│  │  ├─ Split chronologically (prevent data leakage)
│  │  │  processor.split_dataset(X, y)
│  │  │  │
│  │  │  ├─ Training data: Days 1-33 (70%)
│  │  │  ├─ Validation data: Days 34-43 (20%)
│  │  │  └─ Test data: Days 44-47 (10%)
│  │  │
│  │  │  Returns: X_train, X_val, X_test, y_train, y_val, y_test
│  │  │
│  │  ├─ Build LSTM model
│  │  │  model = StockPricePredictor(input_shape=(10, 20))
│  │  │  │
│  │  │  ├─ Create layers:
│  │  │  │  ├─ LSTM(64, return_sequences=True)
│  │  │  │  ├─ Dropout(0.2)
│  │  │  │  ├─ LSTM(64)
│  │  │  │  ├─ Dropout(0.2)
│  │  │  │  ├─ Dense(32, activation='relu')
│  │  │  │  ├─ Dropout(0.2)
│  │  │  │  └─ Dense(1)  ← Output (1 price)
│  │  │  │
│  │  │  └─ Compile:
│  │  │     optimizer = Adam(lr=0.001)
│  │  │     loss = 'mse'
│  │  │     metrics = ['mae']
│  │  │
│  │  ├─ Train model
│  │  │  model.train(X_train, y_train, X_val, y_val, symbol="TCS")
│  │  │  │
│  │  │  ├─ Epoch 1:
│  │  │  │  Batch 1: loss=0.234
│  │  │  │  Batch 2: loss=0.198
│  │  │  │  Epoch avg: loss=0.210, val_loss=0.189
│  │  │  │
│  │  │  ├─ Epoch 2:
│  │  │  │  ...
│  │  │  │
│  │  │  ├─ Epoch 45:
│  │  │  │  loss=0.045, val_loss=0.052
│  │  │  │  ← Early stopping (no improvement)
│  │  │  │
│  │  │  └─ Best model saved during training
│  │  │
│  │  ├─ Evaluate on test data
│  │  │  metrics = model.evaluate(X_test, y_test)
│  │  │  │
│  │  │  ├─ Predictions: [122.45, 125.67, 123.89, 126.34, 124.12]
│  │  │  ├─ Actual:     [122.50, 125.60, 123.95, 126.25, 124.20]
│  │  │  │
│  │  │  ├─ MAE: 0.048 (average error in ₹)
│  │  │  ├─ RMSE: 0.079 (penalizes large errors more)
│  │  │  ├─ MAPE: 0.52% (percentage error)
│  │  │  │
│  │  │  └─ Returns: {"mae": 0.048, "rmse": 0.079, "mape": 0.52}
│  │  │
│  │  └─ Save model
│  │     model.save("TCS")
│  │     → models/TCS.h5 (2.3 MB - LSTM weights)
│  │     → models/TCS.json (metadata - loss, metrics)
│  │
│  └─ Summary
│     "Model training complete: 5/5 symbols"
│     "Average test RMSE: 0.079"
│     "Average test MAPE: 0.52%"
│
└─ Exit
```

---

## Error Handling & Logging

```
Logging Levels:
  DEBUG: Detailed info (not shown by default)
  INFO:  Key events (✓ symbols processed, ✓ models saved)
  WARNING: Recoverable issues (quota exhausted, missing data)
  ERROR: Failures (API down, invalid config)

Log Files:
  logs/pipeline.log        → Overall execution
  logs/api_client.log      → API calls, rate limiting
  logs/data_processor.log  → Data processing steps
  logs/model.log           → Training progress
  logs/request_log.json    → Quota tracking (JSON)

Error Recovery:
  Network timeout → Retry 3 times with exponential backoff
  Server 429 (rate limit) → Wait 5-30 seconds, retry
  Invalid response → Log error, skip symbol, continue
  Missing file → Log warning, skip processing
  Training failure → Log error, save partial results, continue
```

---

**Created:** December 18, 2025  
**Status:** Complete Reference  
**Version:** 1.0.0
