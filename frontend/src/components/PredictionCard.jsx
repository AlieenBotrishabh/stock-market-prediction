import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Brain, TrendingUp, TrendingDown, Info, AlertTriangle, Target, Clock,
} from 'lucide-react';
import { getPrediction } from '../services/marketApi';
import { Skeleton, ErrorState } from './ui/States';
import {
  formatPrice, formatPercent, formatShortDate, formatRelativeTime, formatDate, DASH,
} from '../utils/formatting';

/**
 * Model forecast, presented honestly.
 *
 * The contract this component enforces:
 *   - `isModelBacked === false` renders an explanation, never a number.
 *   - When a number IS shown it always appears with its confidence
 *     interval, its backtested error, and how it compares to a naive
 *     baseline.
 *
 * This replaces a UI that labelled a character-code hash of the ticker
 * symbol as an "AI Prediction" with a "High" confidence badge derived from
 * the size of that same hash.
 */

const MetricPill = ({ label, value, hint, tone = 'default' }) => {
  const tones = {
    default: 'text-white',
    good: 'text-accent-green',
    bad: 'text-accent-red',
  };
  return (
    <div className="min-w-0" title={hint}>
      <p className="text-[10px] uppercase tracking-wider text-white/35 mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums truncate ${tones[tone]}`}>{value}</p>
    </div>
  );
};

/** Predicted vs actual over the backtest window. */
const BacktestChart = ({ sample }) => {
  if (!sample?.length) return null;
  return (
    <div className="mt-5 pt-5 border-t border-white/10">
      <p className="text-xs uppercase tracking-wider font-semibold text-white/40 mb-3">
        Backtest — predicted vs actual
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={sample} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            tickLine={false} axisLine={false} minTickGap={40}
          />
          <YAxis
            stroke="rgba(255,255,255,0.2)"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            tickLine={false} axisLine={false} width={56}
            domain={['dataMin - 20', 'dataMax + 20']}
            tickFormatter={(v) => Math.round(v).toLocaleString('en-IN')}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(10,10,15,0.95)', border: '1px solid rgba(100,206,251,0.3)',
              borderRadius: 12, fontSize: 12,
            }}
            labelFormatter={formatShortDate}
            formatter={(v, name) => [formatPrice(v), name === 'actual' ? 'Actual' : 'Predicted']}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}
            formatter={(v) => (v === 'actual' ? 'Actual' : 'Predicted')}
          />
          <Line type="monotone" dataKey="actual" stroke="#ffffff" strokeWidth={1.8} dot={false} />
          <Line
            type="monotone" dataKey="predicted" stroke="#64CEFB"
            strokeWidth={1.8} strokeDasharray="4 3" dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Shown when no trustworthy model output exists. */
const Unavailable = ({ symbol, reason }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-effect rounded-2xl border border-white/10 p-6"
  >
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0">
        <Info size={16} className="text-white/40" />
      </div>
      <div className="min-w-0">
        <h3 className="text-white font-semibold mb-1">
          No forecast available for {symbol}
        </h3>
        <p className="text-white/45 text-sm leading-relaxed">{reason}</p>
        <p className="text-white/25 text-xs mt-3 leading-relaxed">
          Forecasts come from an LSTM trained offline on 10 years of daily
          data. A model is published only once walk-forward backtesting
          shows its error is within 2% of a naive baseline and it calls
          direction better than chance, so nothing is shown here rather
          than a guess.
        </p>
      </div>
    </div>
  </motion.div>
);

const PredictionCard = ({ symbol, showBacktest = true }) => {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const load = useCallback(async (signal) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getPrediction(symbol, { signal });
      setState({ loading: false, data, error: null });
    } catch (err) {
      if (err.name !== 'AbortError') setState({ loading: false, data: null, error: err });
    }
  }, [symbol]);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  if (state.loading) return <Skeleton className="h-56 w-full" rounded="rounded-2xl" />;
  if (state.error) return <ErrorState error={state.error} onRetry={() => load()} />;

  const p = state.data;
  if (!p?.isModelBacked) {
    return <Unavailable symbol={symbol} reason={p?.unavailableReason ?? 'No trained model.'} />;
  }

  const up = (p.predictedChangePercent ?? 0) >= 0;
  const bt = p.backtest;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-2xl border border-white/10 p-6"
    >
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Brain size={16} className="text-accent-blue" />
          Next-Day Forecast
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {p.isStale && (
            <span className="inline-flex items-center gap-1 text-[11px] text-accent-amber bg-accent-amber/10 border border-accent-amber/25 px-2 py-0.5 rounded-full">
              <AlertTriangle size={10} /> {p.ageHours}h old
            </span>
          )}
          <span className="text-[11px] text-white/30 font-mono">{p.model?.version}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40 mb-1.5">
            Predicted close ({p.horizonDays}d)
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl font-bold text-white tabular-nums">
              {formatPrice(p.predictedClose)}
            </span>
            <span
              className={`flex items-center gap-1 text-base font-semibold ${
                up ? 'text-accent-green' : 'text-accent-red'
              }`}
            >
              {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {formatPercent(p.predictedChangePercent)}
            </span>
          </div>

          {/* Interval derived from the model's own out-of-sample residuals */}
          {p.confidenceLow != null && (
            <div className="mt-3">
              <p className="text-[11px] text-white/35 mb-1.5">
                {Math.round((p.confidenceLevel ?? 0.8) * 100)}% interval
              </p>
              <div className="flex items-center gap-2 text-xs tabular-nums">
                <span className="text-white/60">{formatPrice(p.confidenceLow)}</span>
                <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-accent-blue/20 via-accent-blue/60 to-accent-blue/20" />
                <span className="text-white/60">{formatPrice(p.confidenceHigh)}</span>
              </div>
            </div>
          )}

          <p className="text-[11px] text-white/30 mt-3 flex items-center gap-1.5">
            <Clock size={11} />
            from {formatPrice(p.basePrice)} · generated {formatRelativeTime(p.generatedAt)}
          </p>
        </div>

        {/* How well this model has actually performed */}
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
            <Target size={12} /> Backtested accuracy
          </p>
          {bt ? (
            <>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <MetricPill
                  label="MAPE" value={`${bt.mape?.toFixed(2)}%`}
                  hint="Mean absolute percentage error on out-of-sample data. Lower is better."
                  tone={bt.beatsBaseline ? 'good' : 'bad'}
                />
                <MetricPill
                  label="vs naive" value={`${bt.baselineMape?.toFixed(2)}%`}
                  hint="Error of simply predicting that tomorrow equals today. Daily closes are near a random walk, so this is a hard number to beat; the model must stay within 2% of it."
                />
                <MetricPill
                  label="Direction" value={`${bt.directionAccuracy?.toFixed(1)}%`}
                  hint="Share of days the predicted up/down direction was right. 50% is chance."
                  tone={bt.directionAccuracy > 52 ? 'good' : bt.directionAccuracy < 48 ? 'bad' : 'default'}
                />
                <MetricPill
                  label="RMSE" value={formatPrice(bt.rmse)}
                  hint="Root mean squared error, in rupees."
                />
              </div>
              <p className="text-[10px] text-white/25 mt-3 pt-3 border-t border-white/5">
                {bt.walkForwardWindows} walk-forward windows · trained{' '}
                {formatDate(p.model?.trainedAt)}
              </p>
            </>
          ) : (
            <p className="text-white/30 text-sm">{DASH} No backtest recorded</p>
          )}
        </div>
      </div>

      {showBacktest && <BacktestChart sample={bt?.sample} />}

      <p className="text-[10px] text-white/25 mt-5 pt-4 border-t border-white/5 leading-relaxed">
        Model output for research and education only. Next-day equity prices
        are close to a random walk; a low error here does not imply a
        profitable strategy. This is not investment advice.
      </p>
    </motion.div>
  );
};

export default PredictionCard;
