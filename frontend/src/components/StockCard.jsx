import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Search, Heart } from 'lucide-react';

const StockCard = ({ stock, onSelect, onWatchlist }) => {
  const isPositive = stock.change_percent >= 0;
  const changeSymbol = isPositive ? '▲' : '▼';

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      className="glass-effect card-hover p-6 rounded-xl cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-accent-light transition">
            {stock.symbol || stock.company_name}
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            {stock.company_name}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onWatchlist(stock);
          }}
          className="text-text-secondary hover:text-accent-green transition"
        >
          <Heart size={20} />
        </button>
      </div>

      <div className="mb-4">
        <p className="text-2xl font-bold text-white">
          ₹ {stock.current_price?.toFixed(2) || '0.00'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold flex items-center gap-1 ${
            isPositive ? 'text-chart-up' : 'text-chart-down'
          }`}
        >
          {changeSymbol} {Math.abs(stock.change_percent || 0).toFixed(2)}%
        </span>
        <span className="text-text-secondary text-sm">
          {isPositive ? '+' : ''} ₹ {stock.change_amount?.toFixed(2) || '0.00'}
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-border-color text-xs text-text-secondary space-y-1">
        <p>High: ₹ {stock.day_high?.toFixed(2) || 'N/A'}</p>
        <p>Low: ₹ {stock.day_low?.toFixed(2) || 'N/A'}</p>
      </div>
    </div>
  );
};

export default StockCard;
