/**
 * Canonical Mongoose models — the single source of truth.
 *
 * Replaces the previous split where backend/models/Stock.js (snake_case)
 * and an inline schema in vercel-app.js (camelCase) both registered a
 * model named 'Stock' against the same collection with incompatible field
 * names, so whichever app wrote a document decided whether the other could
 * read it.
 *
 * Convention here: camelCase everywhere, matching the canonical quote
 * object the providers emit and the JSON the frontend consumes.
 *
 * `mongoose.models.X || mongoose.model(...)` guards against
 * OverwriteModelError when a serverless instance is reused across
 * invocations.
 */

import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Daily OHLCV plus precomputed indicators. Written by the ML pipeline. */
const ohlcvSchema = new Schema(
  {
    symbol: { type: String, required: true, uppercase: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD (IST trading day)
    t: Number,
    o: Number,
    h: Number,
    l: Number,
    c: { type: Number, required: true },
    v: Number,
    adjClose: Number,
    // Indicator values for this bar, computed by ml-pipeline/indicators.py
    // so the model's features and the UI panel cannot disagree.
    indicators: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: 'ohlcv', versionKey: false, timestamps: true },
);
ohlcvSchema.index({ symbol: 1, date: 1 }, { unique: true });

/**
 * A model-generated forecast.
 *
 * `isModelBacked` is the honesty gate: it is false when no trained model
 * exists for the symbol, or when the model failed to beat the naive-drift
 * baseline in walk-forward backtesting. The API contract requires the UI
 * to refuse to render a number in that case.
 */
const predictionSchema = new Schema(
  {
    symbol: { type: String, required: true, uppercase: true, index: true },
    generatedAt: { type: Date, required: true, default: Date.now },
    horizonDays: { type: Number, required: true, default: 1 },

    basePrice: Number,        // last close the forecast was made from
    predictedClose: Number,
    predictedChange: Number,
    predictedChangePercent: Number,
    direction: { type: String, enum: ['UP', 'DOWN', 'FLAT', null], default: null },

    // Interval derived from the model's own walk-forward residuals.
    confidenceLow: Number,
    confidenceHigh: Number,
    confidenceLevel: { type: Number, default: 0.8 },

    modelVersion: String,
    modelArchitecture: String,
    trainedAt: Date,
    featureSet: [String],

    isModelBacked: { type: Boolean, required: true, default: false },
    unavailableReason: String,
  },
  { collection: 'predictions', versionKey: false, timestamps: true },
);
predictionSchema.index({ symbol: 1, generatedAt: -1 });

/** Walk-forward backtest results. One doc per (symbol, modelVersion). */
const backtestSchema = new Schema(
  {
    symbol: { type: String, required: true, uppercase: true, index: true },
    modelVersion: { type: String, required: true },
    evaluatedAt: { type: Date, default: Date.now },

    mape: Number,
    rmse: Number,
    mae: Number,
    r: Number,
    directionAccuracy: Number,

    // The bar the model must clear to be allowed to publish.
    baselineMape: Number,
    baselineRmse: Number,
    baselineName: { type: String, default: 'naive-drift' },
    beatsBaseline: Boolean,

    walkForwardWindows: Number,
    trainRows: Number,
    testRows: Number,
    residualStd: Number,

    // Small sample of predicted-vs-actual pairs for the UI overlay chart.
    sample: [{ date: String, actual: Number, predicted: Number }],
  },
  { collection: 'backtests', versionKey: false, timestamps: true },
);
backtestSchema.index({ symbol: 1, modelVersion: 1 }, { unique: true });

/** Optional user watchlist. */
const watchlistSchema = new Schema(
  {
    userId: { type: String, required: true, index: true, unique: true },
    symbols: [{ type: String, uppercase: true }],
  },
  { collection: 'watchlists', versionKey: false, timestamps: true },
);

export const Ohlcv = mongoose.models.Ohlcv || mongoose.model('Ohlcv', ohlcvSchema);
export const Prediction = mongoose.models.Prediction || mongoose.model('Prediction', predictionSchema);
export const Backtest = mongoose.models.Backtest || mongoose.model('Backtest', backtestSchema);
export const Watchlist = mongoose.models.Watchlist || mongoose.model('Watchlist', watchlistSchema);

export default { Ohlcv, Prediction, Backtest, Watchlist };
