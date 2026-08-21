import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Minus, Gauge } from 'lucide-react';
import { getIndicators } from '../services/marketApi';
import { Skeleton, ErrorState } from './ui/States';
import { formatPrice, formatCompact, DASH } from '../utils/formatting';

/**
 * Technical indicators panel.
 *
 * These are the same values the LSTM trains on — backend indicators.js and
 * ml-pipeline/indicators.py are verified to agree to floating-point
 * precision against a shared fixture, so the panel cannot contradict the
 * model.
 *
 * All figures derive from real OHLCV. Nothing here has a mock path: if the
 * request fails the panel says so.
 */

const RSI_ZONES = [
  { max: 30, label: 'Oversold', color: 'text-accent-green' },
  { max: 70, label: 'Neutral', color: 'text-white/60' },
  { max: 100, label: 'Overbought', color: 'text-accent-red' },
];

/** RSI as a 0–100 arc with the standard 30/70 bands marked. */
const RsiGauge = ({ value }) => {
  if (value == null) return <p className="text-white/30 text-sm">{DASH}</p>;
  const zone = RSI_ZONES.find((z) => value <= z.max) ?? RSI_ZONES[1];

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-white tabular-nums">{value.toFixed(1)}</span>
        <span className={`text-xs font-semibold ${zone.color}`}>{zone.label}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/8 overflow-hidden">
        {/* Oversold / overbought bands */}
        <div className="absolute inset-y-0 left-0 w-[30%] bg-accent-green/20" />
        <div className="absolute inset-y-0 left-[70%] right-0 bg-accent-red/20" />
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-white rounded-full"
          initial={{ left: '50%' }}
          animate={{ left: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/25 mt-1 tabular-nums">
        <span>0</span><span>30</span><span>70</span><span>100</span>
      </div>
    </div>
  );
};

const MacdBlock = ({ macd, signal, histogram, direction }) => {
  if (macd == null) return <p className="text-white/30 text-sm">{DASH}</p>;
  const bullish = direction === 'bullish';

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-white tabular-nums">{macd.toFixed(2)}</span>
        <span className={`text-xs font-semibold flex items-center gap-1 ${
          bullish ? 'text-accent-green' : 'text-accent-red'
        }`}>
          {bullish ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {bullish ? 'Bullish' : 'Bearish'}
        </span>
      </div>
      <div className="space-y-1 text-xs tabular-nums">
        <div className="flex justify-between">
          <span className="text-white/40">Signal</span>
          <span className="text-white/80">{signal?.toFixed(2) ?? DASH}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Histogram</span>
          <span className={histogram >= 0 ? 'text-accent-green' : 'text-accent-red'}>
            {histogram?.toFixed(2) ?? DASH}
          </span>
        </div>
      </div>
    </div>
  );
};

/** Moving averages with price position relative to each. */
const MovingAverages = ({ latest }) => {
  const rows = [
    { label: 'SMA 20', value: latest.sma20 },
    { label: 'SMA 50', value: latest.sma50 },
    { label: 'SMA 200', value: latest.sma200 },
    { label: 'EMA 20', value: latest.ema20 },
  ];
  const price = latest.price;

  return (
    <div className="space-y-2">
      {rows.map(({ label, value }) => {
        const above = price != null && value != null && price > value;
        return (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-white/40">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-white/80 tabular-nums">{formatPrice(value)}</span>
              {value != null && price != null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    above ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'
                  }`}
                  title={above ? 'Price is above this average' : 'Price is below this average'}
                >
                  {above ? 'above' : 'below'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TREND_META = {
  uptrend: { Icon: TrendingUp, color: 'text-accent-green', bg: 'bg-accent-green/10 border-accent-green/25', label: 'Uptrend' },
  downtrend: { Icon: TrendingDown, color: 'text-accent-red', bg: 'bg-accent-red/10 border-accent-red/25', label: 'Downtrend' },
  sideways: { Icon: Minus, color: 'text-white/60', bg: 'bg-white/5 border-white/10', label: 'Sideways' },
};

const Tile = ({ title, children }) => (
  <div className="glass-effect rounded-2xl p-5 border border-white/10">
    <h4 className="text-xs uppercase tracking-wider font-semibold text-white/40 mb-3">{title}</h4>
    {children}
  </div>
);

const IndicatorsPanel = ({ symbol }) => {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const load = useCallback(async (signal) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getIndicators(symbol, { signal });
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

  if (state.loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-full" rounded="rounded-2xl" />
        ))}
      </div>
    );
  }

  if (state.error) return <ErrorState error={state.error} onRetry={() => load()} />;

  const { latest, barsUsed } = state.data;
  const trend = TREND_META[latest.trend] ?? TREND_META.sideways;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Activity size={16} className="text-accent-blue" />
          Technical Indicators
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${trend.bg} ${trend.color}`}
          >
            <trend.Icon size={12} />
            {trend.label}
          </span>
          <span className="text-[11px] text-white/25">{barsUsed} sessions</span>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      >
        {[
          { title: 'RSI (14)', node: <RsiGauge value={latest.rsi14} /> },
          {
            title: 'MACD (12,26,9)',
            node: (
              <MacdBlock
                macd={latest.macd}
                signal={latest.macdSignal}
                histogram={latest.macdHistogram}
                direction={latest.macdSignalDirection}
              />
            ),
          },
          { title: 'Moving Averages', node: <MovingAverages latest={latest} /> },
          {
            title: 'Volatility & Bands',
            node: (
              <div className="space-y-2 text-xs tabular-nums">
                <div className="flex items-baseline gap-2 mb-1">
                  <Gauge size={14} className="text-accent-blue" />
                  <span className="text-2xl font-bold text-white">
                    {latest.atr14 != null ? formatCompact(latest.atr14) : DASH}
                  </span>
                  <span className="text-[10px] text-white/40">ATR-14</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Upper Band</span>
                  <span className="text-white/80">{formatPrice(latest.bbUpper)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Lower Band</span>
                  <span className="text-white/80">{formatPrice(latest.bbLower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">%B</span>
                  <span className="text-accent-blue">
                    {latest.bbPercentB != null ? `${latest.bbPercentB.toFixed(0)}%` : DASH}
                  </span>
                </div>
              </div>
            ),
          },
        ].map(({ title, node }) => (
          <motion.div
            key={title}
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
          >
            <Tile title={title}>{node}</Tile>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default IndicatorsPanel;
