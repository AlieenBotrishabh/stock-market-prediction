import axios from 'axios';
import Stock from '../models/Stock.js';

const INDIAN_API_BASE_URL = 'https://api.indianapi.com/api/v1/';

// Fetch all stocks or search by symbol
export const getStocks = async (req, res) => {
  try {
    const { search, category } = req.query;

    let query = {};
    if (search) {
      query = {
        $or: [
          { symbol: { $regex: search, $options: 'i' } },
          { company_name: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const stocks = await Stock.find(query).sort({ market_cap: -1 }).limit(50);
    res.status(200).json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single stock details
export const getStockDetails = async (req, res) => {
  try {
    const { symbol } = req.params;
    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });

    if (!stock) {
      return res
        .status(404)
        .json({ success: false, message: 'Stock not found' });
    }

    res.status(200).json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch live data from Indian API
export const fetchLiveData = async (req, res) => {
  try {
    const { symbol } = req.params;

    // Mock API call - replace with actual Indian API integration
    // const response = await axios.get(
    //   `${INDIAN_API_BASE_URL}stock/${symbol.toUpperCase()}`,
    //   {
    //     headers: {
    //       'X-API-Key': process.env.INDIAN_API_KEY,
    //     },
    //   }
    // );

    // For demo purposes, returning mock data
    const mockData = {
      symbol: symbol.toUpperCase(),
      company_name: symbol,
      current_price: Math.random() * 5000,
      change_percent: (Math.random() - 0.5) * 10,
      last_updated: new Date(),
    };

    res.status(200).json({ success: true, data: mockData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create/Update stock
export const createOrUpdateStock = async (req, res) => {
  try {
    const { symbol, ...updateData } = req.body;

    const stock = await Stock.findOneAndUpdate(
      { symbol: symbol.toUpperCase() },
      { symbol: symbol.toUpperCase(), ...updateData, last_updated: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete stock
export const deleteStock = async (req, res) => {
  try {
    const { symbol } = req.params;

    await Stock.findOneAndDelete({ symbol: symbol.toUpperCase() });

    res.status(200).json({ success: true, message: 'Stock deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get NIFTY index data
export const getNiftyData = async (req, res) => {
  try {
    const niftyStocks = [
      { symbol: 'NIFTY50', company_name: 'NIFTY 50', current_price: 21234.50 },
      { symbol: 'NIFTYIT', company_name: 'NIFTY IT', current_price: 42156.00 },
      { symbol: 'NIFTYBANK', company_name: 'NIFTY BANK', current_price: 54321.75 },
    ];

    res.status(200).json({ success: true, data: niftyStocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
