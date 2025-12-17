import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Briefcase, TrendingUp, Percent, DollarSign } from 'lucide-react';

const MutualFundsPage = () => {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, equity, debt, hybrid

  useEffect(() => {
    const fetchFunds = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/api/indian/mutual-funds?filter=${filter}`
        );
        const result = await response.json();
        // Handle both array and object responses
        const fundsData = Array.isArray(result.data) ? result.data : result.data?.funds || [];
        setFunds(fundsData);
      } catch (error) {
        console.error('Error fetching mutual funds:', error);
        setFunds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFunds();
  }, [filter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light">
      <Navigation isOpen={navOpen} setIsOpen={setNavOpen} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="gradient-text text-5xl md:text-6xl font-bold mb-4">Mutual Funds</h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Explore and track mutual fund performance
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {['all', 'equity', 'debt', 'hybrid'].map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-4 py-2 rounded-lg font-semibold transition capitalize ${
                filter === category
                  ? 'bg-accent-green text-primary-dark'
                  : 'glass-effect text-text-secondary hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Funds Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-accent-green text-xl font-semibold">Loading mutual funds...</div>
          </div>
        ) : funds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary text-lg">No mutual funds available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {funds.map((fund, idx) => (
              <div
                key={idx}
                className="glass-effect p-6 rounded-xl border border-border-color hover:border-accent-green transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{fund.name}</h3>
                    <p className="text-text-secondary text-sm capitalize">{fund.category}</p>
                  </div>
                  <Briefcase className="text-accent-green flex-shrink-0" size={24} />
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-text-secondary" />
                      <span className="text-text-secondary text-sm">NAV</span>
                    </div>
                    <p className="text-white font-semibold">₹ {fund.nav?.toFixed(2)}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Percent size={16} className="text-text-secondary" />
                      <span className="text-text-secondary text-sm">Returns (1Y)</span>
                    </div>
                    <p className={`font-semibold ${
                      fund.returns1Y >= 0 ? 'text-chart-up' : 'text-chart-down'
                    }`}>
                      {fund.returns1Y >= 0 ? '+' : ''}{fund.returns1Y?.toFixed(2)}%
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-text-secondary" />
                      <span className="text-text-secondary text-sm">AUM</span>
                    </div>
                    <p className="text-white font-semibold">₹ {fund.aum}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-color">
                  <p className="text-text-secondary text-xs">{fund.fundHouse}</p>
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

export default MutualFundsPage;
