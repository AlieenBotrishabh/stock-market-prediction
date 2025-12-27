import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// CORS configuration for Vercel
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.FRONTEND_URL || 'https://your-vercel-app.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
let mongoConnected = false;

const connectMongo = async () => {
  if (mongoConnected) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stock-market', {
      serverSelectionTimeoutMS: 5000,
    });
    mongoConnected = true;
    console.log('✓ MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    throw error;
  }
};

// Stock Schema
const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true },
  name: String,
  price: Number,
  change: Number,
  changePercent: Number,
  volume: Number,
  sector: String,
  date: { type: Date, default: Date.now }
});

// Watchlist Schema
const watchlistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  stocks: [String],
  createdAt: { type: Date, default: Date.now }
});

const Stock = mongoose.model('Stock', stockSchema);
const Watchlist = mongoose.model('Watchlist', watchlistSchema);

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    timestamp: new Date().toISOString(),
    database: mongoConnected ? 'connected' : 'disconnected'
  });
});

// ==================== STOCKS API ====================
app.get('/api/stocks', async (req, res) => {
  try {
    await connectMongo();
    const { search } = req.query;
    
    let query = {};
    if (search) {
      query = { 
        $or: [
          { symbol: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    const stocks = await Stock.find(query).limit(20);
    res.json({ success: true, data: stocks });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/stocks/nifty/data', async (req, res) => {
  try {
    await connectMongo();
    const stocks = await Stock.find().limit(8);
    res.json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/stocks', async (req, res) => {
  try {
    await connectMongo();
    const stock = new Stock(req.body);
    const saved = await stock.save();
    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.put('/api/stocks/:symbol', async (req, res) => {
  try {
    await connectMongo();
    const updated = await Stock.findOneAndUpdate(
      { symbol: req.params.symbol },
      req.body,
      { new: true }
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/stocks/:symbol', async (req, res) => {
  try {
    await connectMongo();
    await Stock.deleteOne({ symbol: req.params.symbol });
    res.json({ success: true, message: 'Stock deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== INDIAN API ENDPOINTS ====================
app.get('/api/indian/trending', async (req, res) => {
  try {
    await connectMongo();
    const stocks = await Stock.find().sort({ changePercent: -1 }).limit(10);
    res.json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/indian/details/:symbol', async (req, res) => {
  try {
    await connectMongo();
    const stock = await Stock.findOne({ symbol: req.params.symbol });
    if (!stock) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }
    res.json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/indian/news', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: [
        { id: 1, title: 'Market Update', source: 'News API', date: new Date() },
        { id: 2, title: 'Stock Rally', source: 'News API', date: new Date() }
      ] 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/indian/ipo', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: [
        { name: 'Company A', price: 100, date: '2024-01-15' },
        { name: 'Company B', price: 150, date: '2024-02-01' }
      ] 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/indian/mutual-funds', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: [
        { name: 'Fund A', nav: 50, aum: 1000 },
        { name: 'Fund B', nav: 75, aum: 2000 }
      ] 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/indian/announcements', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: [
        { symbol: 'INFY', announcement: 'Dividend declared', date: new Date() },
        { symbol: 'TCS', announcement: 'Stock split', date: new Date() }
      ] 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== WATCHLIST API ====================
app.get('/api/watchlist/:userId', async (req, res) => {
  try {
    await connectMongo();
    const watchlist = await Watchlist.findOne({ userId: req.params.userId });
    res.json({ success: true, data: watchlist || { userId: req.params.userId, stocks: [] } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/watchlist/:userId', async (req, res) => {
  try {
    await connectMongo();
    const { symbol } = req.body;
    let watchlist = await Watchlist.findOne({ userId: req.params.userId });
    
    if (!watchlist) {
      watchlist = new Watchlist({ userId: req.params.userId, stocks: [symbol] });
    } else if (!watchlist.stocks.includes(symbol)) {
      watchlist.stocks.push(symbol);
    }
    
    await watchlist.save();
    res.json({ success: true, data: watchlist });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.put('/api/watchlist/:userId/:symbol', async (req, res) => {
  try {
    await connectMongo();
    const watchlist = await Watchlist.findOne({ userId: req.params.userId });
    
    if (watchlist) {
      watchlist.stocks = watchlist.stocks.filter(s => s !== req.params.symbol);
      await watchlist.save();
    }
    
    res.json({ success: true, data: watchlist });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/watchlist/:userId', async (req, res) => {
  try {
    await connectMongo();
    await Watchlist.deleteOne({ userId: req.params.userId });
    res.json({ success: true, message: 'Watchlist deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ML Prediction Endpoints
 * Connects to Python ML pipeline for stock predictions
 */

// Helper: Run Python prediction
async function runPythonPrediction(symbol) {
  return new Promise((resolve, reject) => {
    const mlPipelineDir = path.join(__dirname, '../ml-pipeline');
    
    const pythonScript = `
import sys
import json
import os
sys.path.insert(0, '${mlPipelineDir.replace(/\\/g, '\\\\')}')

try:
    if not os.getenv('INDIANAPI_KEY'):
        os.environ['INDIANAPI_KEY'] = 'demo_key'
    
    from model import StockPricePredictor
    from data_processor import DataProcessor
    from config import Config
    import numpy as np
    
    symbol = '${symbol}'
    
    # Try to load model
    model = StockPricePredictor.load(symbol)
    
    if model is None:
        # Return demo prediction
        print(json.dumps({
            'success': True,
            'symbol': symbol,
            'currentPrice': 2800 + hash(symbol) % 500,
            'predictedPrice': 2850 + hash(symbol) % 500,
            'priceChange': 50,
            'priceChangePercent': 1.79,
            'direction': 'UP',
            'confidence': 'Medium',
            'dataPoints': 100,
            'trained': False,
            'message': 'Model not trained. Showing demo prediction. Run: python main.py --full'
        }))
    else:
        # Load processed data
        processor = DataProcessor()
        df = processor.load_processed_data(symbol)
        
        if df is not None and len(df) >= 10:
            latest_price = float(df['close'].iloc[-1])
            
            # Create feature array from last 10 days
            features = ['open', 'high', 'low', 'close', 'volume', 'sma_5', 'sma_10', 'sma_20', 
                        'ema_5', 'ema_10', 'ema_20', 'rsi_14', 'roc', 'volatility', 'return']
            available_features = [f for f in features if f in df.columns]
            
            X_last = df[available_features].tail(10).values
            
            if len(X_last) == 10:
                X_normalized = processor.normalize_data(np.array([X_last]), fit=False)
                prediction = float(model.predict(X_normalized)[0][0])
                
                price_change = prediction - latest_price
                price_change_percent = (price_change / latest_price) * 100
                
                print(json.dumps({
                    'success': True,
                    'symbol': symbol,
                    'currentPrice': float(latest_price),
                    'predictedPrice': float(prediction),
                    'priceChange': float(price_change),
                    'priceChangePercent': float(price_change_percent),
                    'direction': 'UP' if price_change > 0 else 'DOWN',
                    'confidence': 'Medium',
                    'dataPoints': len(df),
                    'trained': True
                }))
            else:
                raise Exception('Insufficient feature data')
        else:
            raise Exception('No processed data available')

except Exception as e:
    print(json.dumps({
        'success': True,
        'symbol': '${symbol}',
        'currentPrice': 2800 + hash('${symbol}') % 500,
        'predictedPrice': 2850 + hash('${symbol}') % 500,
        'priceChange': 50,
        'priceChangePercent': 1.79,
        'direction': 'UP',
        'confidence': 'Low',
        'dataPoints': 0,
        'trained': False,
        'message': f'Using demo prediction. Error: {str(e)}'
    }))
`;

    const python = spawn('python', ['-c', pythonScript], {
      cwd: mlPipelineDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          resolve(result);
        } else {
          // Return default prediction on parse error
          resolve({
            success: true,
            symbol: symbol,
            currentPrice: 2800 + parseInt(symbol.charCodeAt(0)) % 500,
            predictedPrice: 2850 + parseInt(symbol.charCodeAt(0)) % 500,
            priceChange: 50,
            priceChangePercent: 1.79,
            direction: 'UP',
            confidence: 'Demo',
            dataPoints: 0,
            trained: false,
            message: 'Demo prediction mode'
          });
        }
      } catch (err) {
        resolve({
          success: true,
          symbol: symbol,
          currentPrice: 2800 + parseInt(symbol.charCodeAt(0)) % 500,
          predictedPrice: 2850 + parseInt(symbol.charCodeAt(0)) % 500,
          priceChange: 50,
          priceChangePercent: 1.79,
          direction: 'UP',
          confidence: 'Demo',
          dataPoints: 0,
          trained: false,
          message: 'Demo prediction mode'
        });
      }
    });

    python.on('error', (err) => {
      resolve({
        success: true,
        symbol: symbol,
        currentPrice: 2800 + parseInt(symbol.charCodeAt(0)) % 500,
        predictedPrice: 2850 + parseInt(symbol.charCodeAt(0)) % 500,
        priceChange: 50,
        priceChangePercent: 1.79,
        direction: 'UP',
        confidence: 'Demo',
        dataPoints: 0,
        trained: false,
        message: 'Demo prediction mode'
      });
    });
  });
}

// GET prediction for a stock
app.get('/api/predict/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stock symbol required' 
      });
    }

    const prediction = await runPythonPrediction(symbol.toUpperCase());
    res.json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET prediction status
app.get('/api/predict/status/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const mlPipelineDir = path.join(__dirname, '../ml-pipeline');
    const status = {
      symbol: symbol.toUpperCase(),
      modelTrained: false,
      dataProcessed: false,
      ready: false
    };

    // For now, return status indicating model needs training
    res.json({ 
      success: true, 
      ...status,
      message: 'To get predictions, run: python main.py --full' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Endpoint not found: ${req.method} ${req.path}`,
    available_endpoints: [
      'GET /api/health',
      'GET /api/stocks',
      'POST /api/stocks',
      'PUT /api/stocks/:symbol',
      'DELETE /api/stocks/:symbol',
      'GET /api/stocks/nifty/data',
      'GET /api/indian/trending',
      'GET /api/indian/details/:symbol',
      'GET /api/indian/news',
      'GET /api/indian/ipo',
      'GET /api/indian/mutual-funds',
      'GET /api/indian/announcements',
      'GET /api/watchlist/:userId',
      'POST /api/watchlist/:userId',
      'PUT /api/watchlist/:userId/:symbol',
      'DELETE /api/watchlist/:userId',
      'GET /api/predict/:symbol',
      'GET /api/predict/status/:symbol'
    ]
  });
});

export default app;
