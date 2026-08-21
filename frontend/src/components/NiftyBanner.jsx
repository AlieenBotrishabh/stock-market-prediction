import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import AnimatedNumber from './ui/AnimatedNumber';
import { Skeleton } from './ui/States';
import { formatPercent, formatCompact, DASH } from '../utils/formatting';

/**
 * Benchmark index strip: NIFTY 50, BANK NIFTY, NIFTY IT, SENSEX, INDIA VIX.
 *
 * Live values only — the previous version's caller supplied hardcoded
 * fallbacks (NIFTY 50 = 21,234.50) whenever the fetch failed, which in the
 * deployed build was every time. Indices that fail to load are simply
 * absent rather than invented.
 *
 * India VIX is shown as a plain index level: it is a volatility gauge, so
 * "up" is not good news and it deliberately gets no green/red treatment.
 */
const NiftyBanner = ({ indices = [], loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" rounded="rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!indices.length) return null;

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      {indices.map((index) => {
        const positive = (index.changePercent ?? 0) >= 0;
        const isVix = (index.yahooSymbol ?? index.symbol ?? '').includes('VIX');

        return (
          <motion.div
            key={index.symbol}
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="glass-effect p-4 rounded-2xl border border-white/10 hover:border-accent-blue/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <h4 className="text-xs font-bold text-white/70 uppercase tracking-wide truncate">
                {index.label ?? index.symbol}
              </h4>
              {!isVix && (
                <span
                  className={`shrink-0 p-1 rounded-lg ${
                    positive ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'
                  }`}
                >
                  {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                </span>
              )}
            </div>

            <AnimatedNumber
              value={index.price}
              format={(v) => formatCompact(v)}
              className="text-lg font-bold text-white block"
            />

            <p
              className={`text-xs font-semibold mt-1 ${
                isVix ? 'text-white/50' : positive ? 'text-accent-green' : 'text-accent-red'
              }`}
            >
              {index.changePercent != null ? formatPercent(index.changePercent) : DASH}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default NiftyBanner;
