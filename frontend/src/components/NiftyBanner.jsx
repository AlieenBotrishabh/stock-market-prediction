import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const NiftyBanner = ({ niftyData = [] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {niftyData.map((nifty, index) => {
        const isPositive = nifty.change_percent >= 0;
        return (
          <div
            key={index}
            className="glass-effect card-hover p-6 rounded-xl border border-border-color"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-bold text-white">{nifty.symbol}</h4>
              <div
                className={`p-2 rounded-lg ${
                  isPositive
                    ? 'bg-green-500/20 text-chart-up'
                    : 'bg-red-500/20 text-chart-down'
                }`}
              >
                {isPositive ? (
                  <TrendingUp size={20} />
                ) : (
                  <TrendingDown size={20} />
                )}
              </div>
            </div>

            <p className="text-2xl font-bold text-white mb-2">
              {nifty.current_price?.toFixed(2) || 'N/A'}
            </p>

            <p
              className={`text-sm font-semibold ${
                isPositive ? 'text-chart-up' : 'text-chart-down'
              }`}
            >
              {isPositive ? '+' : ''} {nifty.change_percent?.toFixed(2) || '0.00'}%
            </p>

            <p className="text-xs text-text-secondary mt-2 capitalize">
              {nifty.company_name}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default NiftyBanner;
