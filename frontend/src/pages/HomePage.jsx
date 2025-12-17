import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import SearchBar from '../components/SearchBar';
import StockCard from '../components/StockCard';
import StockTable from '../components/StockTable';
import NiftyBanner from '../components/NiftyBanner';
import Footer from '../components/Footer';
import { getStocks, getNiftyData } from '../services/api';

const HomePage = () => {
  const [stocks, setStocks] = useState([]);
  const [niftyData, setNiftyData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const navigate = useNavigate();

  // Mock stock data for demo
  const mockStocks = [
    {
      symbol: 'TCS',
      company_name: 'Tata Consultancy Services',
      current_price: 3850.50,
      change_percent: 2.45,
      change_amount: 92.50,
      day_high: 3900,
      day_low: 3800,
      opening_price: 3825,
      previous_close: 3758,
    },
    {
      symbol: 'INFY',
      company_name: 'Infosys Limited',
      current_price: 1625.75,
      change_percent: -1.23,
      change_amount: -20.25,
      day_high: 1680,
      day_low: 1620,
      opening_price: 1645,
      previous_close: 1646,
    },
    {
      symbol: 'HDFC',
      company_name: 'HDFC Bank Limited',
      current_price: 1750.25,
      change_percent: 3.15,
      change_amount: 53.50,
      day_high: 1800,
      day_low: 1720,
      opening_price: 1700,
      previous_close: 1696.75,
    },
    {
      symbol: 'RELIANCE',
      company_name: 'Reliance Industries',
      current_price: 2845.90,
      change_percent: 1.75,
      change_amount: 49.25,
      day_high: 2900,
      day_low: 2820,
      opening_price: 2810,
      previous_close: 2796.65,
    },
    {
      symbol: 'ICICIBANK',
      company_name: 'ICICI Bank Limited',
      current_price: 825.50,
      change_percent: -0.85,
      change_amount: -7.10,
      day_high: 850,
      day_low: 820,
      opening_price: 835,
      previous_close: 832.60,
    },
    {
      symbol: 'WIPRO',
      company_name: 'Wipro Limited',
      current_price: 450.75,
      change_percent: 2.30,
      change_amount: 10.15,
      day_high: 465,
      day_low: 445,
      opening_price: 442,
      previous_close: 440.60,
    },
    {
      symbol: 'LT',
      company_name: 'Larsen & Toubro',
      current_price: 2125.50,
      change_percent: 1.95,
      change_amount: 41.00,
      day_high: 2150,
      day_low: 2100,
      opening_price: 2090,
      previous_close: 2084.50,
    },
    {
      symbol: 'BAJAJFINSV',
      company_name: 'Bajaj Finserv Limited',
      current_price: 1565.25,
      change_percent: -0.45,
      change_amount: -7.10,
      day_high: 1600,
      day_low: 1550,
      opening_price: 1575,
      previous_close: 1572.35,
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stocks
        if (searchTerm) {
          const filteredStocks = mockStocks.filter(
            (stock) =>
              stock.symbol.includes(searchTerm.toUpperCase()) ||
              stock.company_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setStocks(filteredStocks);
        } else {
          setStocks(mockStocks);
        }

        // Fetch NIFTY data
        setNiftyData([
          {
            symbol: 'NIFTY 50',
            company_name: 'NIFTY 50 Index',
            current_price: 21234.50,
            change_percent: 1.25,
          },
          {
            symbol: 'NIFTY IT',
            company_name: 'NIFTY IT Index',
            current_price: 42156.00,
            change_percent: 2.15,
          },
          {
            symbol: 'NIFTY BANK',
            company_name: 'NIFTY BANK Index',
            current_price: 54321.75,
            change_percent: -0.85,
          },
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectStock = (symbol) => {
    navigate(`/stock/${symbol}`);
  };

  const handleWatchlist = (stock) => {
    console.log('Added to watchlist:', stock);
    // Implement watchlist functionality
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light">
      <Navigation isOpen={navOpen} setIsOpen={setNavOpen} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="gradient-text text-5xl md:text-6xl font-bold mb-4">
            Stock Market Intelligence
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Real-time stock data, live charts, and market insights. Track your favorite companies
            and make informed investment decisions.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <SearchBar onSearch={setSearchTerm} />
        </div>

        {/* NIFTY Banner */}
        <NiftyBanner niftyData={niftyData} />

        {/* Stocks Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-white">Featured Stocks</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  viewMode === 'grid'
                    ? 'bg-accent-green text-primary-dark'
                    : 'glass-effect text-text-secondary hover:text-white'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-accent-green text-primary-dark'
                    : 'glass-effect text-text-secondary hover:text-white'
                }`}
              >
                Table
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-accent-green text-xl font-semibold">Loading stocks...</div>
            </div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary text-lg">No stocks found matching your search.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stocks.map((stock) => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  onSelect={handleSelectStock}
                  onWatchlist={handleWatchlist}
                />
              ))}
            </div>
          ) : (
            <StockTable stocks={stocks} onSelectStock={handleSelectStock} />
          )}
        </div>


      <Footer />
        {/* Market Stats Footer */}
        <div className="glass-effect p-6 rounded-xl border border-border-color mt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-text-secondary text-sm mb-2">Total Stocks</p>
              <p className="text-2xl font-bold text-accent-green">{stocks.length}</p>
            </div>
            <div>
              <p className="text-text-secondary text-sm mb-2">Market Status</p>
              <p className="text-2xl font-bold text-accent-green">Open</p>
            </div>
            <div>
              <p className="text-text-secondary text-sm mb-2">Gainers</p>
              <p className="text-2xl font-bold text-chart-up">
                {stocks.filter((s) => s.change_percent > 0).length}
              </p>
            </div>
            <div>
              <p className="text-text-secondary text-sm mb-2">Losers</p>
              <p className="text-2xl font-bold text-chart-down">
                {stocks.filter((s) => s.change_percent < 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
