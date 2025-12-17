import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const StockChart = ({ symbol, data = [] }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Generate mock historical data
    const mockData = Array.from({ length: 30 }, (_, i) => {
      const basePrice = 2000 + Math.random() * 1000;
      return {
        date: `Day ${i + 1}`,
        price: basePrice + Math.random() * 500 - 250,
        volume: Math.floor(Math.random() * 10000000),
      };
    });
    setChartData(mockData);
  }, [symbol]);

  return (
    <div className="glass-effect p-6 rounded-xl">
      <h3 className="text-xl font-bold text-white mb-6">Price Chart - {symbol}</h3>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d084" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#00d084" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
          <XAxis
            dataKey="date"
            stroke="#a0a0a0"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#a0a0a0" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1f3a',
              border: '1px solid #00d084',
              borderRadius: '8px',
              color: '#00d084',
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#00d084"
            fillOpacity={1}
            fill="url(#colorPrice)"
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
