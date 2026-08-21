import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import AnimatedNumber from './ui/AnimatedNumber';
import {
  formatPrice, formatPercent, formatChange, formatVolume, percentOfRange, DASH,
} from '../utils/formatting';

/**
 * Stock summary card.
 *
 * Uses the canonical quote field names (price / changePercent / high / low)
 * that every provider now normalises to, replacing the snake_case guesswork
 * the old card relied on. Missing values render as an em dash rather than
 * "0.00", so absent data never reads as a real zero.
 *
 * The `layoutId` lets the symbol morph into the details-page heading via
 * framer-motion's shared layout animation.
 */
const StockCard = ({ stock, onClick }) => {
  const positive = (stock.changePercent ?? 0) >= 0;
  const rangePos = percentOfRange(stock.price, stock.low, stock.high);

  return (
    <motion.div
      onClick={() => onClick?.(stock)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(stock); }
      }}
      className="glass-effect p-5 rounded-2xl cursor-pointer group border border-white/10 hover:border-accent-blue/40 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
    >
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="min-w-0">
          <motion.h3
            layoutId={`symbol-${stock.symbol}`}
            className="text-lg font-bold text-white group-hover:text-accent-blue transition-colors truncate"
          >
            {stock.symbol}
          </motion.h3>
          <p className="text-sm text-white/45 mt-0.5 line-clamp-1">
            {stock.name ?? DASH}
          </p>
        </div>
        <span
          className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            positive ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'
          }`}
        >
          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {formatPercent(stock.changePercent, { signed: false })}
        </span>
      </div>

      <AnimatedNumber
        value={stock.price}
        format={(v) => formatPrice(v)}
        className="text-2xl font-bold text-white block mb-1"
      />
      <p className={`text-sm font-medium ${positive ? 'text-accent-green' : 'text-accent-red'}`}>
        {formatChange(stock.change)}
      </p>

      {/* Where the price sits in today's range */}
      {rangePos !== null && (
        <div className="mt-4">
          <div className="relative h-1 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full ${
                positive ? 'bg-accent-green/60' : 'bg-accent-red/60'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${rangePos}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      )}

      <div className="pt-3 mt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <p className="text-white/30">Low</p>
          <p className="text-white/70 tabular-nums truncate">{formatPrice(stock.low)}</p>
        </div>
        <div className="text-center">
          <p className="text-white/30">High</p>
          <p className="text-white/70 tabular-nums truncate">{formatPrice(stock.high)}</p>
        </div>
        <div className="text-right">
          <p className="text-white/30">Vol</p>
          <p className="text-white/70 tabular-nums truncate">{formatVolume(stock.volume)}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default StockCard;
