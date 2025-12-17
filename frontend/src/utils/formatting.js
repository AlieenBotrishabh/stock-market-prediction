export const formatPrice = (price) => {
  if (!price) return '0.00';
  return parseFloat(price).toFixed(2);
};

export const formatChangePercent = (percent) => {
  if (!percent) return '0.00';
  return Math.abs(percent).toFixed(2);
};

export const getChangeColor = (change) => {
  return change >= 0 ? 'text-chart-up' : 'text-chart-down';
};

export const getChangeBgColor = (change) => {
  return change >= 0 ? 'bg-green-500/20' : 'bg-red-500/20';
};

export const formatMarketCap = (marketCap) => {
  if (!marketCap) return 'N/A';
  
  const value = parseFloat(marketCap);
  if (value >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₹${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `₹${(value / 1e6).toFixed(2)}M`;
  
  return `₹${value.toFixed(2)}`;
};

export const formatVolume = (volume) => {
  if (!volume) return 'N/A';
  
  const value = parseFloat(volume);
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  
  return value.toFixed(0);
};
