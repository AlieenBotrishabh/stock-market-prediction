import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { formatPrice, percentOfRange, DASH } from '../../utils/formatting';

/**
 * Where the current price sits inside a low–high band.
 *
 * Used for both the intraday day range and the 52-week range. The old
 * StockDetailsPage rendered 52W High and 52W Low as two unrelated numbers
 * in separate tiles, which makes it hard to tell whether a stock is near
 * its high or its low — the actual question those figures answer.
 *
 * Renders an explicit "not available" state rather than defaulting the
 * marker to one end, which would imply a position the data doesn't support.
 */
const RangeBar = ({
  label,
  low,
  high,
  current,
  lowLabel = 'Low',
  highLabel = 'High',
  accent = 'from-accent-red via-accent-amber to-accent-green',
  showPercent = true,
}) => {
  const reduceMotion = useReducedMotion();
  const position = percentOfRange(current, low, high);
  const hasData = position !== null;

  return (
    <div className="glass-effect rounded-2xl p-5 border border-white/10">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-white/40">
          {label}
        </h4>
        {showPercent && hasData && (
          <span className="text-xs font-semibold text-accent-blue tabular-nums">
            {position.toFixed(0)}% of range
          </span>
        )}
      </div>

      {hasData ? (
        <>
          <div className="relative h-2 rounded-full bg-white/8 overflow-visible mb-3">
            <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${accent} opacity-30`} />
            {/* Filled portion up to the current price */}
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${accent}`}
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${position}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Marker at the current price */}
            <motion.div
              className="absolute top-1/2 z-10"
              initial={reduceMotion ? false : { left: '0%', opacity: 0 }}
              animate={{ left: `${position}%`, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ translateX: '-50%', translateY: '-50%' }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white ring-4 ring-white/20 shadow-lg shadow-black/50" />
            </motion.div>
          </div>

          <div className="flex justify-between items-end gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">{lowLabel}</p>
              <p className="text-sm font-bold text-accent-red tabular-nums truncate">
                {formatPrice(low)}
              </p>
            </div>
            <div className="text-center min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">Current</p>
              <p className="text-sm font-bold text-white tabular-nums truncate">
                {formatPrice(current)}
              </p>
            </div>
            <div className="text-right min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">{highLabel}</p>
              <p className="text-sm font-bold text-accent-green tabular-nums truncate">
                {formatPrice(high)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-white/30 py-3">
          {DASH} Range data unavailable
        </p>
      )}
    </div>
  );
};

export default RangeBar;
