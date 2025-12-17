import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2 } from 'lucide-react';
import StockChart from '../components/StockChart';
import Footer from '../components/Footer';
import { getStockDetails } from '../services/api';

const StockDetailsPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await getStockDetails(symbol);
        // Handle both response formats (from api.js it returns the full response)
        const stockData = response.data.data || response.data;
        setStock(stockData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stock:', error);
        // Use mock data as fallback
        const mockStock = {
          symbol: symbol,
          company_name: 'Company Name',
          current_price: 3500,
          change_percent: 2.5,
          change_amount: 85,
          opening_price: 3415,
          previous_close: 3415,
          day_high: 3600,
          day_low: 3400,
          volume: '1234567',
          market_cap: '500000000000',
          pe_ratio: 25.5,
          fifty_two_week_high: 4200,
          fifty_two_week_low: 3200,
          description: 'Company stock information'
        };
        setStock(mockStock);
        setLoading(false);
      }
    };

    fetchStock();
  }, [symbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light flex items-center justify-center">
        <div className="text-accent-green text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary text-xl mb-4">Stock not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-accent-green text-primary-dark rounded-lg font-semibold hover:bg-accent-light transition"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const isPositive = stock.change_percent >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-primary-light rounded-lg transition text-text-secondary hover:text-accent-green"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">{stock.symbol}</h1>
            <p className="text-text-secondary">{stock.company_name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsWatchlisted(!isWatchlisted)}
              className={`p-3 rounded-lg transition ${
                isWatchlisted
                  ? 'bg-accent-green text-primary-dark'
                  : 'glass-effect text-accent-green hover:text-accent-light'
              }`}
            >
              <Heart size={24} fill={isWatchlisted ? 'currentColor' : 'none'} />
            </button>
            <button className="p-3 glass-effect rounded-lg text-accent-green hover:text-accent-light transition">
              <Share2 size={24} />
            </button>
          </div>
        </div>

        {/* Price Section */}
        <div className="glass-effect p-8 rounded-xl mb-8 border border-border-color">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-text-secondary text-sm mb-2">Current Price</p>
              <p className="text-5xl font-bold text-white mb-4">
                ₹ {stock.current_price?.toFixed(2) || '0.00'}
              </p>
              <p
                className={`text-xl font-semibold flex items-center gap-2 ${
                  isPositive ? 'text-chart-up' : 'text-chart-down'
                }`}
              >
                {isPositive ? '▲' : '▼'} {Math.abs(stock.change_percent || 0).toFixed(2)}% (
                {isPositive ? '+' : ''} ₹ {stock.change_amount?.toFixed(2) || '0.00'})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary-light/50 p-4 rounded-lg">
                <p className="text-text-secondary text-sm mb-2">Opening Price</p>
                <p className="text-2xl font-bold text-accent-green">
                  ₹ {stock.opening_price?.toFixed(2) || 'N/A'}
                </p>
              </div>
              <div className="bg-primary-light/50 p-4 rounded-lg">
                <p className="text-text-secondary text-sm mb-2">Previous Close</p>
                <p className="text-2xl font-bold text-accent-green">
                  ₹ {stock.previous_close?.toFixed(2) || 'N/A'}
                </p>
              </div>
              <div className="bg-primary-light/50 p-4 rounded-lg">
                <p className="text-text-secondary text-sm mb-2">52W High</p>
                <p className="text-2xl font-bold text-chart-up">
                  ₹ {stock.fifty_two_week_high?.toFixed(2) || 'N/A'}
                </p>
              </div>
              <div className="bg-primary-light/50 p-4 rounded-lg">
                <p className="text-text-secondary text-sm mb-2">52W Low</p>
                <p className="text-2xl font-bold text-chart-down">
                  ₹ {stock.fifty_two_week_low?.toFixed(2) || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <StockChart symbol={stock.symbol} />

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="glass-effect p-6 rounded-xl border border-border-color">
            <h3 className="text-xl font-bold text-white mb-6">Key Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-border-color">
                <span className="text-text-secondary">Day High</span>
                <span className="text-white font-semibold">
                  ₹ {stock.day_high?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border-color">
                <span className="text-text-secondary">Day Low</span>
                <span className="text-white font-semibold">
                  ₹ {stock.day_low?.toFixed(2) || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border-color">
                <span className="text-text-secondary">PE Ratio</span>
                <span className="text-white font-semibold">
                  {stock.pe_ratio || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Volume</span>
                <span className="text-white font-semibold">{stock.volume || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="glass-effect p-6 rounded-xl border border-border-color">
            <h3 className="text-xl font-bold text-white mb-6">Market Info</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-border-color">
                <span className="text-text-secondary">Market Cap</span>
                <span className="text-white font-semibold">{stock.market_cap || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border-color">
                <span className="text-text-secondary">Status</span>
                <span className="px-3 py-1 bg-accent-green/20 text-accent-green rounded-full text-sm font-semibold">
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border-color">
                <span className="text-text-secondary">Last Updated</span>
                <span className="text-white font-semibold">Just now</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Exchange</span>
                <span className="text-white font-semibold">NSE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {stock.description && (
          <div className="glass-effect p-6 rounded-xl border border-border-color mt-8">
            <h3 className="text-xl font-bold text-white mb-4">About</h3>
            <p className="text-text-secondary leading-relaxed">{stock.description}</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default StockDetailsPage;
