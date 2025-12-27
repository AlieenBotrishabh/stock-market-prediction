import React from 'react';
import { Menu, Home, BarChart3, Heart, TrendingUp, Newspaper, DollarSign, Briefcase, Bell, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navigation = ({ isOpen, setIsOpen }) => {
  return (
    <nav className="glass-effect border-b border-border-color sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-green to-accent-light rounded-lg flex items-center justify-center">
              <BarChart3 size={24} className="text-primary-dark font-bold" />
            </div>
            <span className="gradient-text text-xl font-bold hidden sm:inline">
              StockPulse
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6">
            <Link
              to="/"
              className="text-text-secondary hover:text-accent-green transition flex items-center gap-2 whitespace-nowrap"
            >
              <Home size={18} />
              <span>Home</span>
            </Link>
            <Link
              to="/trending"
              className="text-text-secondary hover:text-accent-green transition flex items-center gap-2 whitespace-nowrap"
            >
              <TrendingUp size={18} />
              <span>Trending</span>
            </Link>
            <Link
              to="/predictions"
              className="text-text-secondary hover:text-accent-green transition flex items-center gap-2 whitespace-nowrap"
            >
              <Zap size={18} />
              <span>Predictions</span>
            </Link>
            <Link
              to="/news"
              className="text-text-secondary hover:text-accent-green transition flex items-center gap-2 whitespace-nowrap"
            >
              <Newspaper size={18} />
              <span>News</span>
            </Link>
            <Link
              to="/ipo"
              className="text-text-secondary hover:text-accent-green transition flex items-center gap-2 whitespace-nowrap"
            >
              <DollarSign size={18} />
              <span>IPO</span>
            </Link>
            <Link
              to="/mutual-funds"
              className="text-text-secondary hover:text-accent-green transition flex items-center gap-2 whitespace-nowrap"
            >
              <Briefcase size={18} />
              <span>MF</span>
            </Link>
            <Link
              to="/announcements"
              className="text-text-secondary hover:text-accent-green transition flex items-center gap-2 whitespace-nowrap"
            >
              <Bell size={18} />
              <span>News</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-accent-green hover:text-accent-light transition"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden pb-4 space-y-2">
            <Link
              to="/"
              className="block px-4 py-2 text-text-secondary hover:text-accent-green transition rounded"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/trending"
              className="block px-4 py-2 text-text-secondary hover:text-accent-green transition rounded"
              onClick={() => setIsOpen(false)}
            >
              Trending Stocks
            </Link>
            <Link
              to="/predictions"
              className="block px-4 py-2 text-text-secondary hover:text-accent-green transition rounded"
              onClick={() => setIsOpen(false)}
            >
              AI Predictions
            </Link>
            <Link
              to="/news"
              className="block px-4 py-2 text-text-secondary hover:text-accent-green transition rounded"
              onClick={() => setIsOpen(false)}
            >
              Market News
            </Link>
            <Link
              to="/ipo"
              className="block px-4 py-2 text-text-secondary hover:text-accent-green transition rounded"
              onClick={() => setIsOpen(false)}
            >
              IPO Listings
            </Link>
            <Link
              to="/mutual-funds"
              className="block px-4 py-2 text-text-secondary hover:text-accent-green transition rounded"
              onClick={() => setIsOpen(false)}
            >
              Mutual Funds
            </Link>
            <Link
              to="/announcements"
              className="block px-4 py-2 text-text-secondary hover:text-accent-green transition rounded"
              onClick={() => setIsOpen(false)}
            >
              Announcements
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
