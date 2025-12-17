import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const StockTable = ({ stocks, onSelectStock }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStocks = [...stocks].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
  });

  return (
    <div className="glass-effect rounded-xl overflow-hidden border border-border-color">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-color">
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary cursor-pointer hover:text-white transition" onClick={() => handleSort('symbol')}>
                <div className="flex items-center gap-2">
                  Symbol <ChevronDown size={16} />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary cursor-pointer hover:text-white transition" onClick={() => handleSort('current_price')}>
                <div className="flex items-center gap-2">
                  Price <ChevronDown size={16} />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary cursor-pointer hover:text-white transition" onClick={() => handleSort('change_percent')}>
                <div className="flex items-center gap-2">
                  Change <ChevronDown size={16} />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Day High</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Day Low</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-text-secondary">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedStocks.map((stock) => {
              const isPositive = stock.change_percent >= 0;
              return (
                <tr
                  key={stock.symbol}
                  className="border-b border-border-color hover:bg-primary-light/50 transition cursor-pointer"
                  onClick={() => onSelectStock(stock.symbol)}
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-semibold">{stock.symbol}</p>
                      <p className="text-text-secondary text-sm">{stock.company_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white font-semibold">
                    ₹ {stock.current_price?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${isPositive ? 'text-chart-up' : 'text-chart-down'}`}>
                      {isPositive ? '▲' : '▼'} {Math.abs(stock.change_percent || 0).toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">₹ {stock.day_high?.toFixed(2)}</td>
                  <td className="px-6 py-4 text-white">₹ {stock.day_low?.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <button className="px-3 py-1 bg-accent-green/20 text-accent-green rounded text-sm font-semibold hover:bg-accent-green/30 transition">
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockTable;
