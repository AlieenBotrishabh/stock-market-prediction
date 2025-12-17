import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
    },
    stocks: [
      {
        symbol: String,
        company_name: String,
        added_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Watchlist', watchlistSchema);
