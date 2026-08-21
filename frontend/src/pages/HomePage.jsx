import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutGrid, List, TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';
import HeroSection from '../components/HeroSection';
import PageLayout from '../components/PageLayout';
import StockCard from '../components/StockCard';
import StockTable from '../components/StockTable';
import NiftyBanner from '../components/NiftyBanner';
import SearchBar from '../components/SearchBar';
import MarketStatusBadge from '../components/MarketStatusBadge';
import { SkeletonGrid, ErrorState, EmptyState, StaleBanner } from '../components/ui/States';
import { getQuotes, getIndices } from '../services/marketApi';
import { formatPercent } from '../utils/formatting';

/**
 * Home / market overview.
 *
 * Removed from the previous version:
 *  - `mockStocks`, an 8-entry hardcoded array used whenever a fetch failed
 *    (which, in production, was always — see the localhost bug).
 *  - Hardcoded NIFTY fallbacks (NIFTY 50 = 21,234.50 etc.).
 *  - `Market Status: 'Open'` as a literal string, regardless of the time,
 *    the day, or the exchange.
 *  - One HTTP request per symbol, refired on every keystroke because
 *    `searchTerm` sat in the fetch effect's dependency array. Search is now
 *    debounced and filters client-side; quotes load once in a single
 *    batched request.
 */

/** Default watch universe. */
const SYMBOLS = [
  'TCS', 'INFY', 'RELIANCE', 'HDFCBANK', 'ICICIBANK',
  'WIPRO', 'LT', 'SBIN', 'BHARTIARTL', 'AXISBANK',
  'TATASTEEL', 'MARUTI', 'HCLTECH', 'ITC', 'BAJFINANCE',
];

const REFRESH_MS = 60_000;

const HomePage = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [indices, setIndices] = useState([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  // Set on mount as well as cleared on unmount. Under React 18 StrictMode
  // effects run mount -> cleanup -> mount, so a cleanup-only version would
  // leave this false forever after the remount and the loading state would
  // never resolve.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async ({ signal, quiet = false } = {}) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      // Both in flight together; a failure in one must not blank the other.
      const [quoteResult, indexResult] = await Promise.allSettled([
        getQuotes(SYMBOLS, { signal }),
        getIndices({ signal }),
      ]);

      // A cancelled request means this effect was superseded, not that
      // loading failed. Without the guard, StrictMode's discarded first
      // mount would set an error over the successful retry.
      if (!mounted.current || signal?.aborted) return;

      if (quoteResult.status === 'fulfilled') {
        setQuotes(quoteResult.value.quotes);
        setError(null);
      } else if (!quiet && quoteResult.reason?.name !== 'AbortError') {
        setError(quoteResult.reason);
      }

      if (indexResult.status === 'fulfilled') setIndices(indexResult.value);
    } finally {
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    load({ signal: c.signal });
    return () => c.abort();
  }, [load]);

  // Poll only while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load({ quiet: true });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // Client-side filter — the full universe is already loaded.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter(
      (s) =>
        s.symbol?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q),
    );
  }, [quotes, search]);

  const stats = useMemo(() => {
    const gainers = quotes.filter((s) => (s.changePercent ?? 0) > 0);
    const losers = quotes.filter((s) => (s.changePercent ?? 0) < 0);
    const avg = quotes.length
      ? quotes.reduce((a, s) => a + (s.changePercent ?? 0), 0) / quotes.length
      : null;
    return { total: quotes.length, gainers: gainers.length, losers: losers.length, avg };
  }, [quotes]);

  const anyStale = quotes.some((q) => q.isStale);

  return (
    <>
      <HeroSection indices={indices} />

      <PageLayout>
        {/* Indices */}
        <div className="mb-8">
          <NiftyBanner indices={indices} loading={loading} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-white">Market Overview</h2>
            <MarketStatusBadge />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar onSearch={setSearch} placeholder="Filter by symbol or company…" />
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => load({ quiet: true })}
              aria-label="Refresh"
              className="p-2 rounded-lg glass-effect border border-white/10 text-white/50 hover:text-white transition-colors"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </motion.button>
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-white/5">
              {[
                { key: 'grid', Icon: LayoutGrid },
                { key: 'table', Icon: List },
              ].map(({ key, Icon }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  aria-label={`${key} view`}
                  aria-pressed={viewMode === key}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                  }`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {anyStale && <StaleBanner />}

        {/* Stats */}
        {!loading && !error && quotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Tracked', value: stats.total, Icon: Activity, color: 'text-accent-blue' },
              { label: 'Advancing', value: stats.gainers, Icon: TrendingUp, color: 'text-accent-green' },
              { label: 'Declining', value: stats.losers, Icon: TrendingDown, color: 'text-accent-red' },
              {
                label: 'Avg Change',
                value: stats.avg == null ? '—' : formatPercent(stats.avg),
                Icon: Activity,
                color: (stats.avg ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red',
              },
            ].map(({ label, value, Icon, color }) => (
              <div key={label} className="glass-effect rounded-2xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} className={color} />
                  <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">
                    {label}
                  </p>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Listing */}
        {loading ? (
          <SkeletonGrid count={8} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => load()} />
        ) : filtered.length === 0 ? (
          <EmptyState message={search ? `No stocks match "${search}".` : 'No stocks available.'} />
        ) : viewMode === 'grid' ? (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          >
            {filtered.map((stock) => (
              <motion.div
                key={stock.symbol}
                variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
              >
                <StockCard
                  stock={stock}
                  onClick={() => navigate(`/stock/${stock.symbol}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <StockTable
            stocks={filtered}
            onRowClick={(s) => navigate(`/stock/${s.symbol}`)}
          />
        )}
      </PageLayout>
    </>
  );
};

export default HomePage;
