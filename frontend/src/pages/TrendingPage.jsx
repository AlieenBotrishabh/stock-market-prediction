import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const TrendingPage = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('gainers'); // gainers, losers, trending
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let url = 'http://localhost:5000/api/indian/shockers?type=';
        
        if (activeTab === 'gainers') {
          url += 'gainers';
        } else if (activeTab === 'losers') {
          url += 'losers';
        } else {
          url = 'http://localhost:5000/api/indian/trending';
        }

        const response = await fetch(url);
        const result = await response.json();
        // Handle both array and object responses
        const stocksData = Array.isArray(result.data) ? result.data : result.data?.trending || result.data || [];
        setStocks(stocksData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light">
      <Navigation isOpen={navOpen} setIsOpen={setNavOpen} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="gradient-text text-5xl md:text-6xl font-bold mb-4">Market Trends</h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Discover top gainers, losers, and trending stocks in the market
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setActiveTab('gainers')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'gainers'
                ? 'bg-chart-up text-white'
                : 'glass-effect text-text-secondary hover:text-white'
            }`}
          >
            <TrendingUp className="inline mr-2" size={20} />
            Top Gainers
          </button>
          <button
            onClick={() => setActiveTab('losers')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'losers'
                ? 'bg-chart-down text-white'
                : 'glass-effect text-text-secondary hover:text-white'
            }`}
          >
            <TrendingDown className="inline mr-2" size={20} />
            Top Losers
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'trending'
                ? 'bg-accent-green text-primary-dark'
                : 'glass-effect text-text-secondary hover:text-white'
            }`}
          >
            <AlertCircle className="inline mr-2" size={20} />
            Trending
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-accent-green text-xl font-semibold">Loading stocks...</div>
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary text-lg">No stocks found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock, idx) => (
              <div
                key={idx}
                onClick={() => navigate(`/stock/${stock.symbol}`)}
                className="glass-effect card-hover p-6 rounded-xl cursor-pointer border border-border-color"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{stock.symbol}</h3>
                    <p className="text-text-secondary text-sm">{stock.company_name}</p>
                  </div>
                  {stock.change_percent >= 0 ? (
                    <TrendingUp className="text-chart-up" size={24} />
                  ) : (
                    <TrendingDown className="text-chart-down" size={24} />
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-3xl font-bold text-white">
                    ₹ {stock.current_price?.toFixed(2) || stock.price?.toFixed(2)}
                  </p>
                  <p className={`text-lg font-semibold ${
                    stock.change_percent >= 0 ? 'text-chart-up' : 'text-chart-down'
                  }`}>
                    {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent?.toFixed(2)}%
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-text-secondary">Day High</p>
                    <p className="text-white font-semibold">₹ {stock.day_high?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Day Low</p>
                    <p className="text-white font-semibold">₹ {stock.day_low?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default TrendingPage;
