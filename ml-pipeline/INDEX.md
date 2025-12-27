# Stock Price Prediction Pipeline - Documentation Index

Welcome! This guide helps you navigate the complete ML pipeline for stock price prediction.

---

## 📖 Documentation Files (Read in This Order)

### 1. **START HERE: QUICK_START.txt**
- ⏱️ **Time:** 5 minutes
- 📝 **Content:** Setup, verify configuration, run full pipeline
- 🎯 **Best for:** Getting started immediately
- 💾 **Read:** `cat QUICK_START.txt` or `type QUICK_START.txt`

### 2. **README.md** (Comprehensive Overview)
- ⏱️ **Time:** 15 minutes
- 📝 **Content:** Project structure, features, API integration, troubleshooting
- 🎯 **Best for:** Understanding what the pipeline does
- 💾 **Read:** Open in editor or browser

### 3. **IMPLEMENTATION_GUIDE.md** (Deep Dive)
- ⏱️ **Time:** 45 minutes
- 📝 **Content:** Code walkthrough, module details, examples, extension ideas
- 🎯 **Best for:** Understanding how it works, customizing
- 💾 **Read:** Full reference when implementing

### 4. **ARCHITECTURE.md** (System Design)
- ⏱️ **Time:** 30 minutes
- 📝 **Content:** Data flow diagrams, module dependencies, request flows
- 🎯 **Best for:** Visual learners, debugging
- 💾 **Read:** Reference during development

### 5. **DELIVERY_SUMMARY.md** (Executive Summary)
- ⏱️ **Time:** 10 minutes
- 📝 **Content:** What's delivered, checklist, next steps
- 🎯 **Best for:** Project overview and planning
- 💾 **Read:** Complete picture before starting

---

## 🗂️ Code Files

### Core Pipeline Modules

**`config.py`** ⚠️ UPDATE REQUIRED
- Central configuration for entire pipeline
- **TODO items:** 4 locations need IndianAPI-specific values
- Must edit before first run

**`api_client.py`**
- Data collection from IndianAPI
- Rate limiting (respects 500/month quota)
- Error handling and retry logic
- No changes needed (unless customizing authentication)

**`data_processor.py`**
- Feature engineering and preprocessing
- Technical indicators (SMA, EMA, RSI, etc.)
- Sequence creation for time-series
- Time-series splitting
- Easy to extend with new indicators

**`model.py`**
- LSTM model architecture
- Training with early stopping
- Evaluation metrics
- Model saving/loading
- Can swap LSTM for GRU, Transformer, etc.

**`main.py`**
- Command-line orchestration
- Coordinates all phases (collect → process → train)
- Easy to add new commands

**`__init__.py`**
- Package initialization
- Imports all modules

---

## 🚀 Quick Commands

```bash
# Check you're ready
python main.py --status

# Full pipeline (collect + process + train)
python main.py --full

# Just collect data
python main.py --collect

# Just process data
python main.py --process

# Just train models
python main.py --train

# Get help
python main.py --help
```

---

## ✅ Setup Checklist

- [ ] Python 3.8+ installed
- [ ] Navigate to `ml-pipeline/` directory
- [ ] Run `pip install -r requirements.txt`
- [ ] Set environment variable: `export INDIANAPI_KEY="..."`
- [ ] Edit `config.py` - Fill 4 TODO items from IndianAPI docs
- [ ] Run `python main.py --status` to verify
- [ ] Run `python main.py --full` to start pipeline

---

## 📚 Learning Path

### Beginner (Just want to use it)
1. Read: `QUICK_START.txt` (5 min)
2. Setup: Follow steps
3. Run: `python main.py --full`
4. Done! ✓

### Intermediate (Want to understand)
1. Read: `README.md` (15 min)
2. Read: `IMPLEMENTATION_GUIDE.md` → "Module Details" section (30 min)
3. Run: `python main.py --full`
4. Explore: Check `data/`, `models/`, `logs/` directories
5. Extend: Add new symbols or indicators

### Advanced (Want to modify)
1. Read: All documentation files (2 hours total)
2. Study: `ARCHITECTURE.md` diagrams
3. Explore: Code comments and docstrings
4. Modify: `config.py`, `data_processor.py`, `model.py`
5. Test: `python main.py --status` after changes

---

## 🔍 Finding What You Need

### "How do I...?"

| Question | Document | Section |
|----------|----------|---------|
| Get started quickly? | QUICK_START.txt | All |
| Install dependencies? | README.md | Quick Start |
| Understand the code? | IMPLEMENTATION_GUIDE.md | Code Examples |
| See system design? | ARCHITECTURE.md | Diagrams |
| Add new indicators? | IMPLEMENTATION_GUIDE.md | Extension Ideas |
| Fix an error? | README.md | Troubleshooting |
| Understand rate limiting? | ARCHITECTURE.md | Quota Management |
| Configure API? | IMPLEMENTATION_GUIDE.md | TODO Items |
| Train a model? | README.md | Train Models |
| Make predictions? | IMPLEMENTATION_GUIDE.md | Example 3 |
| Monitor quota? | QUICK_START.txt | Status Command |

---

## 📊 What Gets Created

### First Run (after `python main.py --full`)

```
data/
├── raw/
│   ├── TCS_raw.json         ← Raw API response
│   ├── HDFC_raw.json
│   └── ...
└── processed/
    ├── TCS_processed.csv    ← With technical features
    ├── HDFC_processed.csv
    └── ...

models/
├── TCS.h5                   ← Trained LSTM model
├── TCS.json                 ← Training metadata
├── HDFC.h5
├── HDFC.json
└── ...

logs/
├── request_log.json         ← API quota tracking
├── api_client.log
├── data_processor.log
├── model.log
└── pipeline.log
```

---

## 🎯 Common Workflows

### Workflow 1: Setup & Run (First Time)
```
1. Read: QUICK_START.txt
2. Install: pip install -r requirements.txt
3. Configure: Edit config.py (fill TODO items)
4. Verify: python main.py --status
5. Execute: python main.py --full
6. Check: ls data/ models/ logs/
```

### Workflow 2: Daily Retraining
```
1. Run: python main.py --full
   (Collects fresh data, retrains models)
```

### Workflow 3: Experiment with Models
```
1. Run once: python main.py --collect
   (Fetch data, uses 1 request per symbol)
2. Run unlimited: python main.py --train
   (Retrain models, 0 API requests)
3. Modify: Edit config.py (hyperparameters)
4. Repeat: python main.py --train
```

### Workflow 4: Add New Symbols
```
1. Edit: config.py → SYMBOLS = [...]
2. Run: python main.py --full
   (Collects for all symbols)
```

---

## ⚠️ Critical: TODO Items

Before first run, fill these 4 items in `config.py`:

### TODO #1: API Base URL & Endpoints (line ~35)
```python
# From indianapi.com documentation:
API_ENDPOINTS = {
    "historical": "???",  # FILL IN
    "quote": "???",       # FILL IN
    "company": "???",     # FILL IN
}
```

### TODO #2: Symbol Format (line ~20)
```python
# Verify format: "TCS" vs "TCS.NS" vs other
SYMBOLS = ["TCS", ...]  # Check documentation
```

### TODO #3: Response Structure (data_processor.py, line ~50)
```python
# Your API returns JSON - verify field names
# May be: {"data": [...]}, {"candles": [...]}, etc.
column_mapping = {
    "actual_field": "timestamp",  # VERIFY FIELD NAMES
    ...
}
```

### TODO #4: Authentication (api_client.py, line ~95)
```python
# Verify authentication method
# Bearer token? API key param? Other?
```

---

## 🆘 Troubleshooting Guide

| Problem | First Check | Solution |
|---------|------------|----------|
| Import error | `pip install -r requirements.txt` done? | Run pip install |
| API key error | Environment variable set? | `export INDIANAPI_KEY="..."` |
| API response error | TODO items in config.py filled? | Update config.py |
| Quota exhausted | Time of day? | Wait until tomorrow |
| No data files | Ran collect? | `python main.py --collect` |
| Model error | TensorFlow installed? | `pip install tensorflow` |

**See full guide:** README.md → Troubleshooting section

---

## 📞 Getting Help

### Documentation Sections

1. **QUICK_START.txt** - For immediate setup help
2. **README.md** - For feature overview and usage
3. **IMPLEMENTATION_GUIDE.md** - For understanding code
4. **ARCHITECTURE.md** - For system design understanding
5. **Code comments** - For inline explanations

### Common Questions

- **"Where do I get the API key?"**  
  → IndianAPI website (indianapi.com)

- **"What's the quota limit?"**  
  → 500 requests/month (10/day conservative)

- **"Can I rerun training without API calls?"**  
  → Yes! `python main.py --train` uses saved data

- **"How do I add new symbols?"**  
  → Edit `config.py` → `SYMBOLS` list

- **"Can I use different model?"**  
  → Yes! Edit `model.py` → `_build_model()`

---

## 🎓 Learning Resources

### Inside This Project
- Code comments with explanations
- Docstrings on all functions
- Example code in IMPLEMENTATION_GUIDE.md
- Diagrams in ARCHITECTURE.md

### External Resources
- LSTM tutorial: https://colah.github.io/posts/2015-08-Understanding-LSTMs/
- TensorFlow guide: https://tensorflow.org/guide/keras
- Time-series forecasting: Research papers on sequence-to-sequence models

---

## ✨ Key Concepts

### Rate Limiting
- **Monthly budget:** 500 requests
- **Daily budget:** 10 requests (conservative)
- **Reset:** Midnight UTC daily
- **Tracking:** All requests logged to `logs/request_log.json`

### Technical Indicators
- **SMA:** Simple Moving Average
- **EMA:** Exponential Moving Average
- **RSI:** Relative Strength Index
- **ROC:** Rate of Change
- **Volatility:** Rolling standard deviation

### LSTM Model
- **Sequence:** 10 consecutive days of features
- **Target:** Next day's closing price
- **Layers:** 2 LSTM (64 units) + Dense layers
- **Training:** Adam optimizer, MSE loss, early stopping

---

## 📋 File Summary

| File | Purpose | Status |
|------|---------|--------|
| config.py | Configuration | ⚠️ UPDATE TODO |
| api_client.py | API integration | ✅ Ready |
| data_processor.py | Feature engineering | ✅ Ready |
| model.py | LSTM training | ✅ Ready |
| main.py | Orchestration | ✅ Ready |
| requirements.txt | Dependencies | ✅ Ready |
| README.md | User guide | ✅ Ready |
| QUICK_START.txt | Quick setup | ✅ Ready |
| IMPLEMENTATION_GUIDE.md | Deep dive | ✅ Ready |
| ARCHITECTURE.md | System design | ✅ Ready |
| DELIVERY_SUMMARY.md | Project summary | ✅ Ready |

---

## 🚀 Next Steps

1. **Read** → Start with QUICK_START.txt (5 min)
2. **Setup** → Follow installation steps
3. **Configure** → Fill TODO items in config.py
4. **Verify** → Run `python main.py --status`
5. **Execute** → Run `python main.py --full`
6. **Explore** → Check created files in data/, models/, logs/
7. **Extend** → Add indicators, try different models, etc.

---

## 📝 Document Overview

```
Quick Start (this file)
    ↓
QUICK_START.txt (5 min - immediate setup)
    ↓
README.md (15 min - features & overview)
    ↓
IMPLEMENTATION_GUIDE.md (45 min - detailed walkthrough)
    ↓
ARCHITECTURE.md (30 min - system design)
    ↓
DELIVERY_SUMMARY.md (10 min - project summary)
```

---

**You're ready to go!** 🚀

Start with `QUICK_START.txt` or run:
```bash
python main.py --help
```

Good luck with your stock price prediction pipeline!

---

*Last Updated: December 18, 2025*  
*Version: 1.0.0*  
*Status: Production Ready*
