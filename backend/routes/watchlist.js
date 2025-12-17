import express from 'express';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  deleteWatchlist,
} from '../controllers/watchlistController.js';

const router = express.Router();

// GET user watchlist
router.get('/:userId', getWatchlist);

// POST - Add stock to watchlist
router.post('/:userId', addToWatchlist);

// PUT - Remove stock from watchlist (using query param)
router.put('/:userId/:symbol', removeFromWatchlist);

// DELETE - Delete entire watchlist
router.delete('/:userId', deleteWatchlist);

export default router;
