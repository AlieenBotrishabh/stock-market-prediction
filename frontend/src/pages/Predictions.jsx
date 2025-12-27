import { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from '../components/Navigation';

export default function Predictions() {
  const [navOpen, setNavOpen] = useState(false);
  const [symbol, setSymbol] = useState('TCS');
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Popular Indian stocks
  const popularStocks = [
    { symbol: 'TCS', name: 'Tata Consultancy Services' },
    { symbol: 'INFY', name: 'Infosys' },
    { symbol: 'WIPRO', name: 'Wipro' },
    { symbol: 'RELIANCE', name: 'Reliance Industries' },
    { symbol: 'HDFC', name: 'HDFC Bank' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank' },
    { symbol: 'LT', name: 'Larsen & Toubro' },
    { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto' },
  ];

  const fetchPrediction = async (sym) => {
    setLoading(true);
    setError(null);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${API_URL}/predict/${sym}`);
      
      if (response.data.success) {
        setPrediction(response.data);
        
        // Add to history
        setHistory(prev => [
          { ...response.data, timestamp: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9) // Keep last 10 predictions
        ]);
      } else {
        setError(response.data.message || 'Failed to get prediction');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error fetching prediction');
    } finally {
      setLoading(false);
    }
  };

  const handlePredictClick = (e) => {
    e.preventDefault();
    if (symbol.trim()) {
      fetchPrediction(symbol.toUpperCase());
    }
  };

  const handleQuickStock = (stockSymbol) => {
    setSymbol(stockSymbol);
    fetchPrediction(stockSymbol);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light">
      <Navigation isOpen={navOpen} setIsOpen={setNavOpen} />

      {/* Full Page Loader */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-xl font-semibold">Generating Prediction...</p>
            <p className="text-text-secondary text-sm mt-2">This may take a few moments</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="gradient-text text-5xl md:text-6xl font-bold mb-4">Stock Price Predictions</h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            AI-powered stock price predictions using advanced ML models. Get insights into potential price movements.
          </p>
        </div>

        {/* Prediction Form */}
        <div className="glass-effect border border-border-color rounded-lg p-8 mb-8 backdrop-blur-md">
          <form onSubmit={handlePredictClick} className="mb-6">
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Enter stock symbol (e.g., TCS)"
                className="flex-1 px-4 py-3 bg-primary-light border border-border-color rounded-lg text-white placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-green transition"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-accent-green to-accent-light text-primary-dark font-semibold rounded-lg hover:shadow-lg hover:shadow-accent-green/50 disabled:opacity-50 transition flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-transparent border-t-primary-dark border-r-primary-dark rounded-full animate-spin"></div>
                    Predicting...
                  </>
                ) : (
                  'Predict'
                )}
              </button>
            </div>
          </form>

          {/* Quick Access */}
          <div className="border-t border-border-color pt-6">
            <p className="text-sm font-semibold text-text-secondary mb-4">Popular Stocks:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {popularStocks.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleQuickStock(stock.symbol)}
                  className="px-4 py-2 text-sm font-medium bg-primary-light hover:bg-primary-light/80 text-accent-green border border-border-color rounded-lg transition hover:border-accent-green/50"
                >
                  {stock.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-effect border border-red-500/50 backdrop-blur-md text-accent-red px-6 py-4 rounded-lg mb-8 bg-red-500/10">
            {error}
          </div>
        )}

        {/* Current Prediction */}
        {prediction && (
          <div className="glass-effect border border-border-color rounded-lg p-8 mb-8 backdrop-blur-md">
            <h2 className="gradient-text text-4xl font-bold mb-8">{prediction.symbol}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Current Price */}
              <div className="bg-primary-light/50 border border-border-color rounded-lg p-6">
                <p className="text-text-secondary text-sm font-semibold mb-3">Current Price</p>
                <p className="text-4xl font-bold text-white">
                  ₹{prediction.currentPrice?.toFixed(2) || 'N/A'}
                </p>
              </div>

              {/* Predicted Price */}
              <div className="bg-gradient-to-br from-accent-green/20 to-accent-light/20 border border-accent-green/50 rounded-lg p-6">
                <p className="text-text-secondary text-sm font-semibold mb-3">Predicted Price (Next Day)</p>
                <p className="text-4xl font-bold text-accent-green">
                  ₹{prediction.predictedPrice?.toFixed(2) || 'N/A'}
                </p>
              </div>
            </div>

            {/* Prediction Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {/* Price Change */}
              <div className="bg-primary-light/50 border border-border-color rounded-lg p-4">
                <p className="text-text-secondary text-xs font-semibold mb-2">Price Change</p>
                <p className={`text-2xl font-bold ${prediction.priceChange >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  ₹{prediction.priceChange?.toFixed(2) || 'N/A'}
                </p>
              </div>

              {/* Percentage Change */}
              <div className="bg-primary-light/50 border border-border-color rounded-lg p-4">
                <p className="text-text-secondary text-xs font-semibold mb-2">% Change</p>
                <p className={`text-2xl font-bold ${prediction.priceChangePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {prediction.priceChangePercent?.toFixed(2) || 'N/A'}%
                </p>
              </div>

              {/* Direction */}
              <div className="bg-primary-light/50 border border-border-color rounded-lg p-4">
                <p className="text-text-secondary text-xs font-semibold mb-2">Direction</p>
                <p className={`text-lg font-bold flex items-center gap-2 ${prediction.direction === 'UP' ? 'text-accent-green' : 'text-accent-red'}`}>
                  {prediction.direction === 'UP' ? '📈' : '📉'} {prediction.direction}
                </p>
              </div>

              {/* Confidence */}
              <div className="bg-primary-light/50 border border-border-color rounded-lg p-4">
                <p className="text-text-secondary text-xs font-semibold mb-2">Confidence</p>
                <p className="text-lg font-bold text-accent-green">{prediction.confidence || 'N/A'}</p>
              </div>
            </div>

            {/* Data Points */}
            <div className="glass-effect border border-accent-green/50 bg-accent-green/10 rounded-lg p-6">
              <p className="text-text-secondary">
                <span className="font-semibold text-accent-green">{prediction.dataPoints || 0}</span> historical data points used for prediction
              </p>
              {prediction.message && (
                <p className="text-text-secondary/80 mt-2 text-sm">{prediction.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Prediction History */}
        {history.length > 0 && (
          <div className="glass-effect border border-border-color rounded-lg p-8 backdrop-blur-md">
            <h3 className="gradient-text text-3xl font-bold mb-8">Prediction History</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-color">
                    <th className="text-left p-3 font-semibold text-text-secondary">Stock</th>
                    <th className="text-left p-3 font-semibold text-text-secondary">Current</th>
                    <th className="text-left p-3 font-semibold text-text-secondary">Predicted</th>
                    <th className="text-left p-3 font-semibold text-text-secondary">Change %</th>
                    <th className="text-left p-3 font-semibold text-text-secondary">Direction</th>
                    <th className="text-left p-3 font-semibold text-text-secondary">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((pred, idx) => (
                    <tr key={idx} className="border-b border-border-color hover:bg-primary-light/50 transition">
                      <td className="p-3 font-semibold text-white">{pred.symbol}</td>
                      <td className="p-3 text-text-secondary">₹{pred.currentPrice?.toFixed(2)}</td>
                      <td className="p-3 text-text-secondary">₹{pred.predictedPrice?.toFixed(2)}</td>
                      <td className={`p-3 font-semibold ${pred.priceChangePercent >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {pred.priceChangePercent?.toFixed(2)}%
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${pred.direction === 'UP' ? 'bg-accent-green/80' : 'bg-accent-red/80'}`}>
                          {pred.direction}
                        </span>
                      </td>
                      <td className="p-3 text-text-secondary/70 text-xs">{pred.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

