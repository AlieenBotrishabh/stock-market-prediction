import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import stockRoutes from './routes/stocks.js';
import watchlistRoutes from './routes/watchlist.js';
import indianApiRoutes from './src/routes/indianApi.js';
import Prediction from './models/Prediction.js';

dotenv.config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stock-market')
  .then(() => console.log('✓ MongoDB Connected'))
  .catch((err) => console.log('MongoDB Connection Error:', err));

// Routes
app.use('/api/stocks', stockRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/indian', indianApiRoutes);

// Prediction Endpoints (LSTM model served by the Flask ML service)
app.get('/api/predict/history/:symbol', async (req, res) => {
  try {
    const history = await Prediction.find({ symbol: req.params.symbol.toUpperCase() })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/predict/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  try {
    const { data } = await axios.get(`${ML_SERVICE_URL}/predict/${symbol}`);

    // Save to MongoDB (best-effort: a DB problem should not break the prediction)
    Prediction.create({
      symbol,
      currentPrice: data.currentPrice,
      predictedPrice: data.predictedPrice,
      priceChangePercent: data.priceChangePercent,
      direction: data.direction,
    }).catch((err) => console.log('Could not save prediction:', err.message));

    res.json(data);
  } catch (error) {
    if (error.response) {
      // Flask replied with an error (e.g. 404 = no trained model)
      return res.status(error.response.status).json(error.response.data);
    }
    console.error('ML service error:', error.message);
    res.status(503).json({
      success: false,
      message: `ML service not running at ${ML_SERVICE_URL}. Start it with: cd ml-pipeline && python app.py`,
    });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
