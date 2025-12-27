import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.INDIAN_API_KEY || 'demo-key';
const BASE_URL = 'https://stock.indianapi.in';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 5000
});

// Mock data for fallback
const mockStocks = [
  { symbol: 'TCS', company_name: 'Tata Consultancy Services', current_price: 3850.50, lastPrice: 3850.50, change_percent: 2.45, day_high: 3900, day_low: 3800 },
  { symbol: 'INFY', company_name: 'Infosys Limited', current_price: 1625.75, lastPrice: 1625.75, change_percent: -1.23, day_high: 1680, day_low: 1620 },
  { symbol: 'HDFC', company_name: 'HDFC Bank Limited', current_price: 1750.25, lastPrice: 1750.25, change_percent: 3.15, day_high: 1800, day_low: 1720 },
  { symbol: 'RELIANCE', company_name: 'Reliance Industries', current_price: 1500, lastPrice: 1500, change_percent: 1.75, day_high: 1550, day_low: 1480 },
  { symbol: 'ICICIBANK', company_name: 'ICICI Bank Limited', current_price: 825.50, lastPrice: 825.50, change_percent: -0.85, day_high: 850, day_low: 820 },
  { symbol: 'WIPRO', company_name: 'Wipro Limited', current_price: 450.75, lastPrice: 450.75, change_percent: 2.30, day_high: 465, day_low: 445 },
];

// Error handler utility with fallback
const handleApiError = (error, context, fallbackData = null) => {
  console.warn(`Error in ${context}:`, error.message, '- Using fallback data');
  if (fallbackData) {
    return fallbackData;
  }
  throw new Error(`Failed to fetch ${context}: ${error.message}`);
};

// 1. Stock Details
export const fetchStockDetails = async (symbol) => {
  try {
    const response = await apiClient.get(`/details/`, {
      params: { symbol }
    });
    return response.data;
  } catch (error) {
    const stock = mockStocks.find(s => s.symbol === symbol);
    return handleApiError(error, 'stock details', stock || mockStocks[0]);
  }
};

// 2. Historical Data (OHLCV - Open, High, Low, Close, Volume)
export const fetchHistoricalData = async (symbol, days = 30) => {
  try {
    const response = await apiClient.get(`/historical/`, {
      params: { symbol, days }
    });
    return response.data;
  } catch (error) {
    const mockData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      open: 3700 + Math.random() * 200,
      high: 3800 + Math.random() * 200,
      low: 3600 + Math.random() * 200,
      close: 3750 + Math.random() * 200,
      volume: Math.floor(Math.random() * 5000000)
    }));
    return handleApiError(error, 'historical data', { data: mockData });
  }
};

// 3. Trending Stocks
export const fetchTrendingStocks = async () => {
  try {
    const response = await apiClient.get('/trending/');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'trending stocks', {
      trending: mockStocks.filter(s => s.change_percent > 0).slice(0, 6)
    });
  }
};

// 4. News Data
export const fetchNewsData = async (symbol) => {
  try {
    const response = await apiClient.get('/news/', {
      params: { symbol }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'news data', {
      news: [
        { title: `${symbol} Trading Update`, description: 'Market activity and price movements', date: new Date(), url: '#' },
        { title: `${symbol} Q3 Results`, description: 'Quarterly performance analysis', date: new Date(), url: '#' },
        { title: `${symbol} Market Analysis`, description: 'Technical analysis and insights', date: new Date(), url: '#' }
      ]
    });
  }
};

// 5. Price Shockers (Top gainers/losers)
export const fetchPriceShockers = async (type = 'gainers') => {
  try {
    const response = await apiClient.get('/shockers/', {
      params: { type }
    });
    return response.data;
  } catch (error) {
    const fallbackData = type === 'gainers' 
      ? mockStocks.filter(s => s.change_percent > 0).sort((a, b) => b.change_percent - a.change_percent)
      : mockStocks.filter(s => s.change_percent < 0).sort((a, b) => a.change_percent - b.change_percent);
    
    return handleApiError(error, 'price shockers', fallbackData);
  }
};

// 6. NSE Most Active Stocks
export const fetchNseMostActive = async () => {
  try {
    const response = await apiClient.get('/nse/most-active/');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'NSE most active stocks', {
      stocks: mockStocks.slice(0, 5)
    });
  }
};

// 7. BSE Most Active Stocks
export const fetchBseMostActive = async () => {
  try {
    const response = await apiClient.get('/bse/most-active/');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'BSE most active stocks', {
      stocks: mockStocks.slice(0, 5)
    });
  }
};

// 8. IPO Data
export const fetchIpoData = async () => {
  try {
    const response = await apiClient.get('/ipo/');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'IPO data', {
      ipos: [
        { name: 'Tech Startup Ltd', sector: 'Technology', priceMin: 100, priceMax: 150, issueSize: '₹500 Cr', openDate: '2024-01-15', closeDate: '2024-01-20', status: 'Open' },
        { name: 'Green Energy Corp', sector: 'Energy', priceMin: 80, priceMax: 120, issueSize: '₹300 Cr', openDate: '2024-01-22', closeDate: '2024-01-27', status: 'Upcoming' }
      ]
    });
  }
};

// 9. Mutual Funds Data
export const fetchMutualFundsData = async (filter = 'all') => {
  try {
    const response = await apiClient.get('/mutual-funds/', {
      params: { filter }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'mutual funds data', {
      funds: [
        { name: 'HDFC Growth Fund', category: 'equity', nav: 450.50, returns1Y: 12.5, aum: '₹5000 Cr', fundHouse: 'HDFC' },
        { name: 'ICICI Equity Fund', category: 'equity', nav: 380.75, returns1Y: 15.2, aum: '₹4000 Cr', fundHouse: 'ICICI' },
        { name: 'Axis Bond Fund', category: 'debt', nav: 250.25, returns1Y: 8.3, aum: '₹2000 Cr', fundHouse: 'Axis' }
      ]
    });
  }
};

// 10. Mutual Fund Details
export const fetchMutualFundDetails = async (fundId) => {
  try {
    const response = await apiClient.get(`/mutual-funds/${fundId}/`);
    return response.data;
  } catch (error) {
    return handleApiError(error, 'mutual fund details', {
      fund: { name: 'Fund Detail', nav: 400, returns1Y: 12.5, returns3Y: 11.2, returns5Y: 10.5 }
    });
  }
};

// 11. Mutual Fund Search
export const searchMutualFunds = async (query) => {
  try {
    const response = await apiClient.get('/mutual-funds/search/', {
      params: { q: query }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'mutual fund search', {
      funds: [{ name: query + ' Fund', category: 'equity', nav: 350 }]
    });
  }
};

// 12. Commodities Data
export const fetchCommoditiesData = async (type = 'all') => {
  try {
    const response = await apiClient.get('/commodities/', {
      params: { type }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'commodities data', {
      commodities: [
        { name: 'Gold', price: 65000, change: 1.5, unit: 'per gram' },
        { name: 'Silver', price: 85000, change: -0.8, unit: 'per kg' },
        { name: 'Crude Oil', price: 8500, change: 2.1, unit: 'per barrel' }
      ]
    });
  }
};

// 13. Industry Search
export const fetchIndustrySearch = async (industry) => {
  try {
    const response = await apiClient.get('/industry/', {
      params: { name: industry }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'industry search', {
      stocks: mockStocks.slice(0, 3)
    });
  }
};

// 14. Stock Forecasts
export const fetchStockForecasts = async (symbol) => {
  try {
    const response = await apiClient.get(`/forecasts/`, {
      params: { symbol }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'stock forecasts', {
      forecast: { target: 4000, recommendation: 'BUY', upside: '5%' }
    });
  }
};

// 15. Historical Stats (Technical Analysis)
export const fetchHistoricalStats = async (symbol, period = '1y') => {
  try {
    const response = await apiClient.get('/stats/', {
      params: { symbol, period }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'historical stats', {
      stats: { ma50: 3800, ma200: 3700, rsi: 65, macd: 'Positive' }
    });
  }
};

// 16. Stock Target Price
export const fetchStockTargetPrice = async (symbol) => {
  try {
    const response = await apiClient.get('/target-price/', {
      params: { symbol }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'stock target price', {
      target: { price: 4200, confidence: '80%' }
    });
  }
};

// 17. Corporate Actions
export const fetchCorporateActions = async (symbol) => {
  try {
    const response = await apiClient.get('/corporate-actions/', {
      params: { symbol }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'corporate actions', {
      actions: [
        { type: 'Dividend', amount: '₹10 per share', date: '2024-01-15' },
        { type: 'Stock Split', ratio: '1:2', date: '2024-02-01' }
      ]
    });
  }
};

// 18. Financial Statements
export const fetchFinancialStatements = async (symbol, type = 'quarterly') => {
  try {
    const response = await apiClient.get('/statements/', {
      params: { symbol, type }
    });
    return response.data;
  } catch (error) {
    return handleApiError(error, 'financial statements', {
      statements: { revenue: '₹50000 Cr', profit: '₹5000 Cr', eps: '₹15' }
    });
  }
};

// 19. Recent Announcements
export const fetchRecentAnnouncements = async () => {
  try {
    const response = await apiClient.get('/announcements/');
    return response.data;
  } catch (error) {
    return handleApiError(error, 'recent announcements', {
      announcements: [
        { symbol: 'TCS', company: 'Tata Consultancy Services', type: 'Dividend', title: 'Interim Dividend Announced', date: new Date(), details: '₹15 per share' },
        { symbol: 'INFY', company: 'Infosys Limited', type: 'Split', title: 'Stock Split Approved', date: new Date(), details: '1:5' },
        { symbol: 'HDFC', company: 'HDFC Bank', type: 'Bonus', title: 'Bonus Shares Issued', date: new Date(), details: '1:2' }
      ]
    });
  }
};

// 20. 52 Week High/Low
export const fetch52WeekHighLow = async (symbol) => {
  try {
    const response = await apiClient.get('/52week/', {
      params: { symbol }
    });
    return response.data;
  } catch (error) {
    const stock = mockStocks.find(s => s.symbol === symbol);
    return handleApiError(error, '52 week high/low', {
      high: stock?.day_high || 4200,
      low: stock?.day_low || 3200
    });
  }
};

export default {
  fetchStockDetails,
  fetchHistoricalData,
  fetchTrendingStocks,
  fetchNewsData,
  fetchPriceShockers,
  fetchNseMostActive,
  fetchBseMostActive,
  fetchIpoData,
  fetchMutualFundsData,
  fetchMutualFundDetails,
  searchMutualFunds,
  fetchCommoditiesData,
  fetchIndustrySearch,
  fetchStockForecasts,
  fetchHistoricalStats,
  fetchStockTargetPrice,
  fetchCorporateActions,
  fetchFinancialStatements,
  fetchRecentAnnouncements,
  fetch52WeekHighLow
};
