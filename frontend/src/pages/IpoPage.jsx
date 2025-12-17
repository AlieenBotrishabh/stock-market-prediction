import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';

const IpoPage = () => {
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const fetchIpos = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/indian/ipo');
        const result = await response.json();
        // Handle both array and object responses
        const iposData = Array.isArray(result.data) ? result.data : result.data?.ipos || [];
        setIpos(iposData);
      } catch (error) {
        console.error('Error fetching IPO data:', error);
        setIpos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIpos();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark to-primary-light">
      <Navigation isOpen={navOpen} setIsOpen={setNavOpen} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="gradient-text text-5xl md:text-6xl font-bold mb-4">IPO Listings</h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Upcoming and recent Initial Public Offerings
          </p>
        </div>

        {/* IPO List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-accent-green text-xl font-semibold">Loading IPOs...</div>
          </div>
        ) : ipos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary text-lg">No IPO data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ipos.map((ipo, idx) => (
              <div
                key={idx}
                className="glass-effect p-6 rounded-xl border border-border-color hover:border-accent-green transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{ipo.name}</h3>
                    <p className="text-text-secondary text-sm">{ipo.sector}</p>
                  </div>
                  <DollarSign className="text-accent-green" size={28} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-text-secondary text-sm">Price Range</p>
                    <p className="text-white font-semibold">
                      ₹ {ipo.priceMin} - ₹ {ipo.priceMax}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm">Issue Size</p>
                    <p className="text-white font-semibold">₹ {ipo.issueSize}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-text-secondary text-sm flex items-center gap-1">
                      <Calendar size={14} />
                      Opens
                    </p>
                    <p className="text-white font-semibold">{ipo.openDate}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-sm flex items-center gap-1">
                      <Calendar size={14} />
                      Closes
                    </p>
                    <p className="text-white font-semibold">{ipo.closeDate}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-color">
                  <p className="text-text-secondary text-sm mb-2">Status</p>
                  <p className={`text-lg font-bold ${
                    ipo.status === 'Open' ? 'text-chart-up' : 
                    ipo.status === 'Closed' ? 'text-chart-down' :
                    'text-accent-green'
                  }`}>
                    {ipo.status}
                  </p>
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

export default IpoPage;
