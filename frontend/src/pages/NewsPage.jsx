import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Newspaper, Calendar, ExternalLink } from 'lucide-react';

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('TCS');
  const navigate = useNavigate();

  const popularStocks = ['TCS', 'INFY', 'HDFC', 'RELIANCE', 'ICICIBANK', 'WIPRO'];

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/api/indian/news/${selectedSymbol}`
        );
        const result = await response.json();
        // Handle both array and object responses
        const newsData = Array.isArray(result.data) ? result.data : result.data?.news || [];
        setNews(newsData);
      } catch (error) {
        console.error('Error fetching news:', error);
        setNews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [selectedSymbol]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light">
      <Navigation isOpen={navOpen} setIsOpen={setNavOpen} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="gradient-text text-5xl md:text-6xl font-bold mb-4">Market News</h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Latest news and announcements from major stocks
          </p>
        </div>

        {/* Stock Selection */}
        <div className="mb-8 glass-effect p-6 rounded-xl border border-border-color">
          <h2 className="text-xl font-bold text-white mb-4">Select Stock</h2>
          <div className="flex flex-wrap gap-3">
            {popularStocks.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedSymbol === symbol
                    ? 'bg-accent-green text-primary-dark'
                    : 'glass-effect text-text-secondary hover:text-white'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* News List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-accent-green text-xl font-semibold">Loading news...</div>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary text-lg">No news available for {selectedSymbol}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {news.map((article, idx) => (
              <div
                key={idx}
                className="glass-effect p-6 rounded-xl border border-border-color hover:border-accent-green transition"
              >
                <div className="flex items-start gap-4">
                  <Newspaper className="text-accent-green flex-shrink-0 mt-1" size={24} />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{article.title}</h3>
                    <p className="text-text-secondary mb-4">{article.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Calendar size={16} />
                        {new Date(article.date).toLocaleDateString()}
                      </div>
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-accent-green hover:text-accent-light transition"
                        >
                          Read More
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
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

export default NewsPage;
