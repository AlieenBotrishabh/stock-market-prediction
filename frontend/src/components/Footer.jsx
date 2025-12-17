import React, { useState, useEffect } from 'react';

const Footer = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="glass-effect border-t border-border-color mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold mb-4">StockPulse</h3>
            <p className="text-text-secondary text-sm">
              Real-time stock market intelligence and tracking platform.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="hover:text-accent-green transition cursor-pointer">Home</li>
              <li className="hover:text-accent-green transition cursor-pointer">Stocks</li>
              <li className="hover:text-accent-green transition cursor-pointer">About</li>
              <li className="hover:text-accent-green transition cursor-pointer">Contact</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Features</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="hover:text-accent-green transition cursor-pointer">Live Charts</li>
              <li className="hover:text-accent-green transition cursor-pointer">Watchlist</li>
              <li className="hover:text-accent-green transition cursor-pointer">Analytics</li>
              <li className="hover:text-accent-green transition cursor-pointer">Alerts</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Market Status</h4>
            <p className="text-accent-green font-semibold">Market Open</p>
            <p className="text-text-secondary text-sm mt-2">
              {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="border-t border-border-color pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-text-secondary text-sm mb-4 md:mb-0">
              © 2024 StockPulse. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-text-secondary">
              <a href="#" className="hover:text-accent-green transition">Privacy Policy</a>
              <a href="#" className="hover:text-accent-green transition">Terms of Service</a>
              <a href="#" className="hover:text-accent-green transition">Disclaimer</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
