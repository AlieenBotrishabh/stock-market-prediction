import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Flame, Zap, RefreshCw, Activity } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import MarketStatusBadge from '../components/MarketStatusBadge';
import { getTrending, getMostActive, getPriceShockers } from '../services/marketApi';
import { SkeletonGrid, ErrorState, EmptyState } from '../components/ui/States';
import { formatPrice, formatPercent, formatVolume, DASH } from '../utils/formatting';

/**
 * Market movers.
 *
 * Expanded from the old page, which derived "gainers" and "losers" by
 * client-side filtering of the same nine hardcoded stocks. This pulls the
 * exchange's own gainer/loser lists plus most-active and price-shocker
 * feeds, so all four tabs show genuinely different data.
 */

const TABS = [
  { key: 'gainers', label: 'Top Gainers', Icon: TrendingUp },
  { key: 'losers', label: 'Top Losers', Icon: TrendingDown },
  { key: 'active', label: 'Most Active', Icon: Activity },
  { key: 'shockers', label: 'Price Shockers', Icon: Zap },
];

const MoverCard = ({ stock, onClick, rank }) => {
  const positive = (stock.changePercent ?? 0) >= 0;
  // Some feeds supply a company name but no exchange ticker. Those cards
  // still show their data; they just are not links to a detail page that
  // could not resolve.
  const linkable = Boolean(stock.symbol);

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      whileHover={linkable ? { y: -4 } : undefined}
      whileTap={linkable ? { scale: 0.985 } : undefined}
      onClick={() => linkable && onClick(stock.symbol)}
      className={`glass-effect rounded-2xl border border-white/10 p-5 group transition-colors ${
        linkable ? 'hover:border-accent-blue/35 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {rank != null && (
              <span className="text-[10px] font-bold text-white/25 tabular-nums">#{rank}</span>
            )}
            <h3 className={`font-bold text-white truncate ${linkable ? 'group-hover:text-accent-blue transition-colors' : ''}`}>
              {stock.symbol ?? stock.name ?? DASH}
            </h3>
          </div>
          {stock.symbol && (
            <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{stock.name ?? DASH}</p>
          )}
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

      <p className="text-2xl font-bold text-white tabular-nums">{formatPrice(stock.price)}</p>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-[11px]">
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

const TrendingPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('gainers');
  const [data, setData] = useState({ gainers: [], losers: [], active: [], shockers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [trending, active, shockers] = await Promise.allSettled([
        getTrending({ signal }),
        getMostActive('NSE', { signal }),
        getPriceShockers({ signal }),
      ]);

      // A cancelled request is not a failure — it means this effect was
      // superseded (React StrictMode's double mount, or navigating away).
      // Without this guard the discarded first mount's aborts would land
      // as a permanent "Could not load data" over the successful retry.
      if (signal?.aborted) return;

      const next = { gainers: [], losers: [], active: [], shockers: [] };
      if (trending.status === 'fulfilled') {
        next.gainers = trending.value.gainers ?? [];
        next.losers = trending.value.losers ?? [];
      }
      if (active.status === 'fulfilled') next.active = active.value ?? [];
      if (shockers.status === 'fulfilled') next.shockers = shockers.value.nse ?? [];

      // Only a total failure is an error; partial data still renders.
      const realFailure = [trending, active, shockers].find(
        (r) => r.status === 'rejected' && r.reason?.name !== 'AbortError',
      );
      if (Object.values(next).every((v) => v.length === 0)) {
        setError(realFailure?.reason ?? new Error('No data available right now.'));
      }
      setData(next);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  const rows = useMemo(() => data[tab] ?? [], [data, tab]);

  const RefreshBtn = (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => load()}
      disabled={loading}
      className="flex items-center gap-2 text-sm text-white/60 hover:text-white border border-white/20 hover:border-white/50 px-4 py-2 rounded-full transition-colors disabled:opacity-40"
    >
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
    </motion.button>
  );

  return (
    <PageLayout
      title="Trending"
      accent="Stocks"
      subtitle="The day's biggest movers on the NSE"
      headerRight={RefreshBtn}
    >
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(({ key, label, Icon }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-white text-black'
                  : 'glass-effect text-white/60 hover:text-white border border-white/10'
              }`}
            >
              <Icon size={14} /> {label}
              {data[key]?.length > 0 && (
                <span className={tab === key ? 'text-black/45' : 'text-white/30'}>
                  {data[key].length}
                </span>
              )}
            </motion.button>
          ))}
        </div>
        <MarketStatusBadge />
      </div>

      {loading ? (
        <SkeletonGrid count={8} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : rows.length === 0 ? (
        <EmptyState message="No movers in this category right now." icon={Flame} />
      ) : (
        <motion.div
          key={tab}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
        >
          {rows.map((stock, i) => (
            <MoverCard
              key={`${stock.symbol}-${i}`}
              stock={stock}
              rank={i + 1}
              onClick={(sym) => navigate(`/stock/${sym}`)}
            />
          ))}
        </motion.div>
      )}
    </PageLayout>
  );
};

export default TrendingPage;
