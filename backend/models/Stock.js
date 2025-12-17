import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    company_name: {
      type: String,
      required: true,
    },
    current_price: {
      type: Number,
      required: true,
    },
    previous_close: {
      type: Number,
      default: null,
    },
    opening_price: {
      type: Number,
      default: null,
    },
    day_high: {
      type: Number,
      default: null,
    },
    day_low: {
      type: Number,
      default: null,
    },
    volume: {
      type: String,
      default: null,
    },
    market_cap: {
      type: String,
      default: null,
    },
    pe_ratio: {
      type: Number,
      default: null,
    },
    change_percent: {
      type: Number,
      default: 0,
    },
    change_amount: {
      type: Number,
      default: 0,
    },
    fifty_two_week_high: {
      type: Number,
      default: null,
    },
    fifty_two_week_low: {
      type: Number,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    price_history: [
      {
        price: Number,
        timestamp: Date,
      },
    ],
    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Stock', stockSchema);
