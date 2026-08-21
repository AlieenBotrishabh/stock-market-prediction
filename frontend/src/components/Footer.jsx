import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketStatusBadge from './MarketStatusBadge';

const QUICK_LINKS = [
  { label: 'Home',          to: '/'             },
  { label: 'Trending',      to: '/trending'     },
  { label: 'IPO',           to: '/ipo'          },
  { label: 'Mutual Funds',  to: '/mutual-funds' },
];

const FEATURE_LINKS = [
  { label: 'AI Predictions',  to: '/predictions'   },
  { label: 'Market News',     to: '/news'          },
  { label: 'Announcements',   to: '/announcements' },
  { label: 'Live Charts',     to: '/'              },
];

const Footer = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="border-t border-white/10 bg-black/60 backdrop-blur-sm mt-12" id="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-white" />
              </div>
              <span className="text-white font-semibold">StockPulse</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              AI-powered stock market intelligence and real-time analytics platform
              for modern investors.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-white/50 text-sm hover:text-white transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Features</h4>
            <ul className="space-y-2.5">
              {FEATURE_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-white/50 text-sm hover:text-white transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Market Status */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Market Status</h4>
            {/* Status comes from the server, computed in IST against the
                exchange's own session window. */}
            <div className="mb-3">
              <MarketStatusBadge />
            </div>
            <p className="text-white/40 text-sm font-mono">
              {currentTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            </p>
            <p className="text-white/30 text-xs mt-1">NSE/BSE: 9:15 AM – 3:30 PM</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} StockPulse. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Disclaimer'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-white/30 text-sm hover:text-white/70 transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
