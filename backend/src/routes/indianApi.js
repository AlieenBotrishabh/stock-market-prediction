import express from 'express';
import {
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
} from '../controllers/indianApiController.js';

const router = express.Router();

// Stock Details
router.get('/details/:symbol', getStockDetailsController);

// Historical Data
router.get('/historical/:symbol', getHistoricalDataController);

// Trending Stocks
router.get('/trending', getTrendingStocksController);

// News Data
router.get('/news/:symbol', getNewsDataController);

// Price Shockers (Gainers/Losers)
router.get('/shockers', getPriceShockersController);

// NSE Most Active
router.get('/nse/most-active', getNseMostActiveController);

// BSE Most Active
router.get('/bse/most-active', getBseMostActiveController);

// IPO Data
router.get('/ipo', getIpoDataController);

// Mutual Funds
router.get('/mutual-funds', getMutualFundsController);
router.get('/mutual-funds/:fundId', getMutualFundDetailsController);
router.get('/mutual-funds/search', searchMutualFundsController);

// Commodities
router.get('/commodities', getCommoditiesController);

// Industry Search
router.get('/industry', getIndustrySearchController);

// Stock Forecasts
router.get('/forecasts/:symbol', getStockForecastsController);

// Historical Stats
router.get('/stats/:symbol', getHistoricalStatsController);

// Stock Target Price
router.get('/target-price/:symbol', getStockTargetPriceController);

// Corporate Actions
router.get('/corporate-actions/:symbol', getCorporateActionsController);

// Financial Statements
router.get('/statements/:symbol', getFinancialStatementsController);

// Recent Announcements
router.get('/announcements', getRecentAnnouncementsController);

// 52 Week High/Low
router.get('/52week/:symbol', get52WeekHighLowController);

export default router;
