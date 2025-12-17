import Watchlist from '../models/Watchlist.js';

// Get user watchlist
export const getWatchlist = async (req, res) => {
  try {
    const { userId } = req.params;

    const watchlist = await Watchlist.findOne({ user_id: userId });

    if (!watchlist) {
      return res.status(404).json({ success: false, message: 'Watchlist not found' });
    }

    res.status(200).json({ success: true, data: watchlist.stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add stock to watchlist
export const addToWatchlist = async (req, res) => {
  try {
    const { userId } = req.params;
    const { symbol, company_name } = req.body;

    let watchlist = await Watchlist.findOne({ user_id: userId });

    if (!watchlist) {
      watchlist = new Watchlist({
        user_id: userId,
        stocks: [{ symbol, company_name }],
      });
    } else {
      const exists = watchlist.stocks.some((s) => s.symbol === symbol);
      if (!exists) {
        watchlist.stocks.push({ symbol, company_name });
      }
    }

    await watchlist.save();
    res.status(200).json({ success: true, data: watchlist.stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove stock from watchlist
export const removeFromWatchlist = async (req, res) => {
  try {
    const { userId, symbol } = req.params;

    const watchlist = await Watchlist.findOne({ user_id: userId });

    if (!watchlist) {
      return res.status(404).json({ success: false, message: 'Watchlist not found' });
    }

    watchlist.stocks = watchlist.stocks.filter((s) => s.symbol !== symbol);
    await watchlist.save();

    res.status(200).json({ success: true, data: watchlist.stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete entire watchlist
export const deleteWatchlist = async (req, res) => {
  try {
    const { userId } = req.params;

    await Watchlist.findOneAndDelete({ user_id: userId });

    res.status(200).json({ success: true, message: 'Watchlist deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
