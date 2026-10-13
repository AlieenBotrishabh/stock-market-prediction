import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true },
    currentPrice: Number,
    predictedPrice: Number,
    priceChangePercent: Number,
    direction: String,
  },
  { timestamps: true }
);

export default mongoose.model('Prediction', predictionSchema);
