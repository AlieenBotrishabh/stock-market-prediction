import express from 'express';
import {
  getStocks,
  getStockDetails,
  fetchLiveData,
  createOrUpdateStock,
  deleteStock,
  getNiftyData,
} from '../controllers/stockController.js';

const router = express.Router();

// GET all stocks / search
router.get('/', getStocks);

// GET NIFTY data
router.get('/nifty/data', getNiftyData);

// GET single stock details
router.get('/:symbol', getStockDetails);

// GET live data from API
router.get('/:symbol/live', fetchLiveData);

// POST - Create or Update stock
router.post('/', createOrUpdateStock);

// PUT - Update stock (alias for POST)
router.put('/:symbol', async (req, res) => {
  req.body.symbol = req.params.symbol;
  createOrUpdateStock(req, res);
});

// DELETE - Delete stock
router.delete('/:symbol', deleteStock);

export default router;
