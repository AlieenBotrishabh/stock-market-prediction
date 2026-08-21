import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { CandlestickChart, LineChart as LineIcon, BarChart3 } from 'lucide-react';
import { getHistory } from '../services/marketApi';
import { Skeleton, ErrorState, StaleBanner } from './ui/States';
import { formatPrice, formatVolume, formatShortDate, formatCompact } from '../utils/formatting';

/**
 * Price chart with candlestick, line and volume views.
 *
 * Two things changed from the previous version:
 *
 *  1. It no longer invents data. The old component generated a
 *     `Math.random()` walk whenever the fetch returned null, which meant
 *     the "chart" re-randomised on every render and period change — the
 *     displayed price history was different each time you looked at it.
 *     Failure now renders an error state.
 *
 *  2. It can draw candlesticks. The backend previously discarded open,
 *     high and low from the historical response and returned close only;
 *     it now returns full OHLCV, so real candles are possible.
 *
 * Recharts has no native candlestick, so the wick+body is drawn as a
 * custom Bar shape over a [low, high] domain.
 */

const PERIODS = [
  { key: '5D', range: '5d' },
  { key: '1M', range: '1mo' },
  { key: '3M', range: '3mo' },
  { key: '6M', range: '6mo' },
  { key: '1Y', range: '1y' },
  { key: '5Y', range: '5y' },
];

const UP = '#00d084';
const DOWN = '#ff4757';

/**
 * One candle. Recharts hands us the pixel box for the [low, high] value
 * pair, from which the body is positioned by linear interpolation.
 */
const Candle = ({ x, y, width, height, payload }) => {
  const { o, h, l, c } = payload;
  if ([o, h, l, c].some((v) => v == null) || h === l) return null;

  const rising = c >= o;
  const color = rising ? UP : DOWN;
  const pxPerUnit = height / (h - l);

  const bodyTop = y + (h - Math.max(o, c)) * pxPerUnit;
  const bodyHeight = Math.max(Math.abs(c - o) * pxPerUnit, 1); // doji stays visible
  const centerX = x + width / 2;
  const bodyWidth = Math.max(width * 0.62, 1);

  return (
    <g>
      <line x1={centerX} y1={y} x2={centerX} y2={y + height} stroke={color} strokeWidth={1} />
      <rect
        x={centerX - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={rising ? 'transparent' : color}
        stroke={color}
        strokeWidth={1.2}
        rx={0.5}
      />
    </g>
  );
};

const ChartTooltip = ({ active, payload, mode }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rising = d.c >= d.o;

  return (
    <div className="glass-effect px-4 py-3 rounded-xl border border-accent-blue/30 text-xs shadow-xl shadow-black/50">
      <p className="text-white/50 mb-2 font-medium">{formatShortDate(d.date)}</p>
      {mode === 'line' ? (
        <p className="text-accent-blue font-bold text-sm">{formatPrice(d.c)}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
          <span className="text-white/40">Open</span>
          <span className="text-white text-right">{formatPrice(d.o)}</span>
          <span className="text-white/40">High</span>
          <span className="text-accent-green text-right">{formatPrice(d.h)}</span>
          <span className="text-white/40">Low</span>
          <span className="text-accent-red text-right">{formatPrice(d.l)}</span>
          <span className="text-white/40">Close</span>
          <span className={`text-right font-bold ${rising ? 'text-accent-green' : 'text-accent-red'}`}>
            {formatPrice(d.c)}
          </span>
        </div>
      )}
      {d.v != null && (
        <p className="text-white/30 mt-2 pt-2 border-t border-white/10">
          Vol {formatVolume(d.v)}
        </p>
      )}
    </div>
  );
};

const StockChart = ({ symbol, height = 340 }) => {
  const [candles, setCandles] = useState([]);
  const [period, setPeriod] = useState('1M');
  const [mode, setMode] = useState('candle');
  const [showVolume, setShowVolume] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [asOf, setAsOf] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const range = PERIODS.find((p) => p.key === period)?.range ?? '1mo';
      const result = await getHistory(symbol, { range, signal });
      setCandles(result.candles ?? []);
      setIsStale(Boolean(result.isStale));
      setAsOf(result.asOf);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
      setCandles([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Recharts needs an explicit [low, high] pair per row to size the candle.
  const data = useMemo(
    () => candles.map((d) => ({ ...d, range: [d.l, d.h] })),
    [candles],
  );

  const { min, max, first, last } = useMemo(() => {
    if (!candles.length) return { min: 0, max: 0, first: null, last: null };
    const lows = candles.map((d) => d.l ?? d.c);
    const highs = candles.map((d) => d.h ?? d.c);
    return {
      min: Math.min(...lows),
      max: Math.max(...highs),
      first: candles[0].c,
      last: candles[candles.length - 1].c,
    };
  }, [candles]);

  const rising = last >= first;
  const lineColor = rising ? UP : DOWN;
  const pad = (max - min) * 0.06 || 1;

  return (
    <div className="glass-effect p-5 md:p-6 rounded-2xl border border-white/10">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            Price Chart — <span className="text-accent-blue">{symbol}</span>
          </h3>
          {!loading && !error && candles.length > 0 && (
            <p className="text-xs text-white/40 mt-1 tabular-nums">
              {candles.length} sessions · {formatPrice(min)} – {formatPrice(max)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart type */}
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5">
            {[
              { key: 'candle', Icon: CandlestickChart, title: 'Candlestick' },
              { key: 'line', Icon: LineIcon, title: 'Line' },
            ].map(({ key, Icon, title }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                title={title}
                aria-label={title}
                aria-pressed={mode === key}
                className={`p-1.5 rounded-md transition-colors ${
                  mode === key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
            <button
              onClick={() => setShowVolume((v) => !v)}
              title="Toggle volume"
              aria-label="Toggle volume"
              aria-pressed={showVolume}
              className={`p-1.5 rounded-md transition-colors ${
                showVolume ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
              }`}
            >
              <BarChart3 size={15} />
            </button>
          </div>

          {/* Period */}
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                aria-pressed={period === p.key}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  period === p.key
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/8'
                }`}
              >
                {p.key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isStale && <StaleBanner asOf={asOf} />}

      {loading ? (
        <Skeleton className="w-full" rounded="rounded-xl" style={{ height }} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : candles.length === 0 ? (
        <div className="flex items-center justify-center text-white/30 text-sm" style={{ height }}>
          No price history available for this period.
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`area-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatShortDate}
                minTickGap={40}
              />
              <YAxis
                yAxisId="price"
                domain={[min - pad, max + pad]}
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCompact(v, 0)}
                width={64}
              />
              {showVolume && (
                <YAxis yAxisId="volume" hide domain={[0, (dataMax) => dataMax * 4]} />
              )}

              <Tooltip
                content={<ChartTooltip mode={mode} />}
                cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
              />

              {showVolume && (
                <Bar yAxisId="volume" dataKey="v" isAnimationActive={false} barSize={6}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.c >= d.o ? UP : DOWN} fillOpacity={0.22} />
                  ))}
                </Bar>
              )}

              {mode === 'candle' ? (
                <Bar
                  yAxisId="price"
                  dataKey="range"
                  shape={<Candle />}
                  isAnimationActive={false}
                />
              ) : (
                <>
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="c"
                    stroke="none"
                    fill={`url(#area-${symbol})`}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="c"
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                    animationDuration={800}
                  />
                </>
              )}

              {/* Where the period started, so the move is readable at a glance */}
              {first != null && (
                <ReferenceLine
                  yAxisId="price"
                  y={first}
                  stroke="rgba(255,255,255,0.18)"
                  strokeDasharray="4 4"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
};

export default StockChart;
