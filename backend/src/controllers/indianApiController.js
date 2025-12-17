import * as indianApi from '../services/indianApiService.js';

// Stock Details Controller
export const getStockDetailsController = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
    const data = await indianApi.fetchStockDetails(symbol);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Historical Data Controller
export const getHistoricalDataController = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 30 } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
    const data = await indianApi.fetchHistoricalData(symbol, days);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Trending Stocks Controller
export const getTrendingStocksController = async (req, res) => {
  try {
    const data = await indianApi.fetchTrendingStocks();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// News Data Controller
export const getNewsDataController = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
    const data = await indianApi.fetchNewsData(symbol);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Price Shockers Controller (Gainers/Losers)
export const getPriceShockersController = async (req, res) => {
  try {
    const { type = 'gainers' } = req.query;
    const data = await indianApi.fetchPriceShockers(type);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// NSE Most Active Stocks Controller
export const getNseMostActiveController = async (req, res) => {
  try {
    const data = await indianApi.fetchNseMostActive();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// BSE Most Active Stocks Controller
export const getBseMostActiveController = async (req, res) => {
  try {
    const data = await indianApi.fetchBseMostActive();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// IPO Data Controller
export const getIpoDataController = async (req, res) => {
  try {
    const data = await indianApi.fetchIpoData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mutual Funds Data Controller
export const getMutualFundsController = async (req, res) => {
  try {
    const { filter = 'all' } = req.query;
    const data = await indianApi.fetchMutualFundsData(filter);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mutual Fund Details Controller
export const getMutualFundDetailsController = async (req, res) => {
  try {
    const { fundId } = req.params;
    if (!fundId) {
      return res.status(400).json({ error: 'Fund ID is required' });
    }
    const data = await indianApi.fetchMutualFundDetails(fundId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mutual Fund Search Controller
export const searchMutualFundsController = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const data = await indianApi.searchMutualFunds(query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Commodities Data Controller
export const getCommoditiesController = async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    const data = await indianApi.fetchCommoditiesData(type);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Industry Search Controller
export const getIndustrySearchController = async (req, res) => {
  try {
    const { industry } = req.query;
    if (!industry) {
      return res.status(400).json({ error: 'Industry name is required' });
    }
    const data = await indianApi.fetchIndustrySearch(industry);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Stock Forecasts Controller
export const getStockForecastsController = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
    const data = await indianApi.fetchStockForecasts(symbol);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Historical Stats Controller
export const getHistoricalStatsController = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y' } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
    const data = await indianApi.fetchHistoricalStats(symbol, period);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Stock Target Price Controller
export const getStockTargetPriceController = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
    const data = await indianApi.fetchStockTargetPrice(symbol);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Corporate Actions Controller
export const getCorporateActionsController = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
    const data = await indianApi.fetchCorporateActions(symbol);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Financial Statements Controller
export const getFinancialStatementsController = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { type = 'quarterly' } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
    const data = await indianApi.fetchFinancialStatements(symbol, type);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Recent Announcements Controller
export const getRecentAnnouncementsController = async (req, res) => {
  try {
    const data = await indianApi.fetchRecentAnnouncements();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 52 Week High/Low Controller
export const get52WeekHighLowController = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }
    const data = await indianApi.fetch52WeekHighLow(symbol);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  getStockDetailsController,
  getHistoricalDataController,
  getTrendingStocksController,
  getNewsDataController,
  getPriceShockersController,
  getNseMostActiveController,
  getBseMostActiveController,
  getIpoDataController,
  getMutualFundsController,
  getMutualFundDetailsController,
  searchMutualFundsController,
  getCommoditiesController,
  getIndustrySearchController,
  getStockForecastsController,
  getHistoricalStatsController,
  getStockTargetPriceController,
  getCorporateActionsController,
  getFinancialStatementsController,
  getRecentAnnouncementsController,
  get52WeekHighLowController
};
