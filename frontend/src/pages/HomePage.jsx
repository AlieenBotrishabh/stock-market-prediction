import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutGrid, List, TrendingUp, TrendingDown, Activity, RefreshCw,
  ArrowUpRight, Brain, LineChart, Zap, ShieldCheck,
} from 'lucide-react';
import HeroSection from '../components/HeroSection';
import PageLayout from '../components/PageLayout';
import StockCard from '../components/StockCard';
import StockTable from '../components/StockTable';
import NiftyBanner from '../components/NiftyBanner';
import SearchBar from '../components/SearchBar';
import MarketStatusBadge from '../components/MarketStatusBadge';
import { SkeletonGrid, ErrorState, EmptyState, StaleBanner } from '../components/ui/States';
import {
  Reveal, Stagger, Parallax, ScrollProgress, CountUpOnView, MaskedHeading,
} from '../components/ui/Scroll';
import { getQuotes, getIndices } from '../services/marketApi';
import { formatPercent } from '../utils/formatting';

/**
 * Home / market overview.
 *
 * Structured as distinct scroll sections rather than one flat list, each
 * with its own entrance choreography: indices lift in, the stat band
 * counts up when reached, the grid staggers, and the closing panels
 * parallax. Everything is suppressed under prefers-reduced-motion.
 *
 * Removed from the original: an 8-entry `mockStocks` array used on every
 * failure, hardcoded NIFTY fallbacks, a literal `Market Status: 'Open'`,
 * and one HTTP request per symbol refired on every keystroke.
 */

const SYMBOLS = [
  'TCS', 'INFY', 'RELIANCE', 'HDFCBANK', 'ICICIBANK',
  'WIPRO', 'LT', 'SBIN', 'BHARTIARTL', 'AXISBANK',
  'TATASTEEL', 'MARUTI', 'HCLTECH', 'ITC', 'BAJFINANCE',
];

const REFRESH_MS = 60_000;

const FEATURES = [
  {
    Icon: Brain,
    title: 'Live LSTM inference',
    body: 'Forecasts run the moment you ask, executing an ONNX graph in about four milliseconds — not read from a nightly batch.',
  },
  {
    Icon: ShieldCheck,
    title: 'Validated before published',
    body: 'A model appears only after walk-forward backtesting clears both its error and direction-accuracy bars. Otherwise you see the reason, not a number.',
  },
  {
    Icon: LineChart,
    title: 'Real OHLCV, cached',
    body: 'Yahoo Finance primary with an IndianAPI fallback, market-hours-aware TTLs, and stale data always labelled as stale.',
  },
  {
    Icon: Zap,
    title: 'Full technical stack',
    body: 'RSI, MACD, ATR, Bollinger and moving averages — the same values the model trains on, verified to match across both runtimes.',
  },
];

const SectionHeading = ({ eyebrow, title, accent, children }) => (
  <div className="mb-8">
    {eyebrow && (
      <Reveal>
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent-blue/70 font-semibold mb-3">
          {eyebrow}
        </p>
      </Reveal>
    )}
    <MaskedHeading>
      <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
        {title} {accent && <span className="text-accent-blue">{accent}</span>}
      </h2>
    </MaskedHeading>
    {children && (
      <Reveal delay={0.1}>
        <p className="text-white/40 text-sm mt-3 max-w-2xl leading-relaxed">{children}</p>
      </Reveal>
    )}
  </div>
);

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
  // leave this false forever after the remount and loading would never end.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async ({ signal, quiet = false } = {}) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    try {
      const [quoteResult, indexResult] = await Promise.allSettled([
        getQuotes(SYMBOLS, { signal }),
        getIndices({ signal }),
      ]);

      // A cancelled request means this effect was superseded, not that
      // loading failed.
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

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load({ quiet: true });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter(
      (s) => s.symbol?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q),
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
      <ScrollProgress />
      <HeroSection indices={indices} />

      <PageLayout>
        {/* ── Indices ───────────────────────────────────────────────── */}
        <section className="mb-20">
          <SectionHeading eyebrow="Benchmarks" title="Index" accent="Snapshot">
            NIFTY 50, Bank Nifty, Nifty IT, Sensex and India VIX, refreshed
            every minute while the market is open.
          </SectionHeading>
          <Reveal y={36}>
            <NiftyBanner indices={indices} loading={loading} />
          </Reveal>
        </section>

        {/* ── Market breadth ────────────────────────────────────────── */}
        {!loading && !error && quotes.length > 0 && (
          <section className="mb-20">
            <Reveal>
              <div className="relative rounded-3xl border border-white/10 overflow-hidden">
                {/* Soft gradient wash behind the stat band */}
                <div
                  className="absolute inset-0 opacity-[0.07] pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(120% 140% at 15% 0%, #64CEFB 0%, transparent 55%), radial-gradient(110% 130% at 85% 100%, #00d084 0%, transparent 55%)',
                  }}
                />
                <div className="relative glass-effect grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/5">
                  {[
                    { label: 'Tracked', value: stats.total, Icon: Activity, color: 'text-accent-blue', fmt: (v) => Math.round(v) },
                    { label: 'Advancing', value: stats.gainers, Icon: TrendingUp, color: 'text-accent-green', fmt: (v) => Math.round(v) },
                    { label: 'Declining', value: stats.losers, Icon: TrendingDown, color: 'text-accent-red', fmt: (v) => Math.round(v) },
                    {
                      label: 'Avg Change',
                      value: stats.avg ?? 0,
                      Icon: Activity,
                      color: (stats.avg ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red',
                      fmt: (v) => formatPercent(v),
                    },
                  ].map(({ label, value, Icon, color, fmt }) => (
                    <div key={label} className="p-6 md:p-8">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon size={13} className={color} />
                        <p className="text-white/40 text-[11px] uppercase tracking-[0.15em] font-semibold">
                          {label}
                        </p>
                      </div>
                      <p className={`text-3xl md:text-4xl font-bold ${color}`}>
                        <CountUpOnView value={value} format={fmt} />
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </section>
        )}

        {/* ── Stock listing ─────────────────────────────────────────── */}
        <section className="mb-20" id="market">
          <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
            <div>
              <SectionHeading eyebrow="Live prices" title="Market" accent="Overview" />
              <Reveal delay={0.05}>
                <MarketStatusBadge />
              </Reveal>
            </div>

            <Reveal delay={0.1}>
              <div className="flex items-center gap-3 flex-wrap">
                <SearchBar onSearch={setSearch} placeholder="Filter by symbol or company…" />
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.06 }}
                  onClick={() => load({ quiet: true })}
                  aria-label="Refresh prices"
                  className="p-2.5 rounded-xl glass-effect border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-colors"
                >
                  <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                </motion.button>
                <div className="flex gap-0.5 p-0.5 rounded-xl bg-white/5">
                  {[{ key: 'grid', Icon: LayoutGrid }, { key: 'table', Icon: List }].map(
                    ({ key, Icon }) => (
                      <button
                        key={key}
                        onClick={() => setViewMode(key)}
                        aria-label={`${key} view`}
                        aria-pressed={viewMode === key}
                        className={`p-2 rounded-lg transition-colors ${
                          viewMode === key ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        <Icon size={15} />
                      </button>
                    ),
                  )}
                </div>
              </div>
            </Reveal>
          </div>

          {anyStale && <StaleBanner />}

          {loading ? (
            <SkeletonGrid count={8} />
          ) : error ? (
            <ErrorState error={error} onRetry={() => load()} />
          ) : filtered.length === 0 ? (
            <EmptyState message={search ? `No stocks match "${search}".` : 'No stocks available.'} />
          ) : viewMode === 'grid' ? (
            <Stagger
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              stagger={0.05}
            >
              {filtered.map((stock) => (
                <Stagger.Item key={stock.symbol}>
                  <StockCard stock={stock} onClick={() => navigate(`/stock/${stock.symbol}`)} />
                </Stagger.Item>
              ))}
            </Stagger>
          ) : (
            <Reveal>
              <StockTable stocks={filtered} onRowClick={(s) => navigate(`/stock/${s.symbol}`)} />
            </Reveal>
          )}
        </section>

        {/* ── How it works ──────────────────────────────────────────── */}
        <section className="mb-20">
          <SectionHeading eyebrow="Under the hood" title="Built to be" accent="Verifiable">
            Every number on this site traces to a source. Nothing is
            generated to fill a gap — when data is unavailable the page says
            so.
          </SectionHeading>

          <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-5" stagger={0.09}>
            {FEATURES.map(({ Icon, title, body }) => (
              <Stagger.Item key={title}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="glass-effect rounded-2xl border border-white/10 hover:border-accent-blue/30 p-7 h-full transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-5">
                    <Icon size={19} className="text-accent-blue" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{body}</p>
                </motion.div>
              </Stagger.Item>
            ))}
          </Stagger>
        </section>

        {/* ── Closing CTA ───────────────────────────────────────────── */}
        <section className="mb-16">
          <Parallax speed={-0.06}>
            <Reveal y={40}>
              <div className="relative rounded-3xl border border-white/10 overflow-hidden">
                <div
                  className="absolute inset-0 opacity-[0.12] pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(90% 160% at 50% 120%, #64CEFB 0%, transparent 60%)',
                  }}
                />
                <div className="relative glass-effect px-8 py-14 md:py-20 text-center">
                  <MaskedHeading>
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
                      See a forecast <span className="text-accent-blue">run live</span>
                    </h2>
                  </MaskedHeading>
                  <Reveal delay={0.15}>
                    <p className="text-white/45 max-w-xl mx-auto mb-8 leading-relaxed">
                      Inference executes on request against the latest
                      sessions, and every forecast ships with the backtest
                      that earned it a place on the page.
                    </p>
                  </Reveal>
                  <Reveal delay={0.25}>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate('/predictions')}
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors"
                    >
                      Open forecasts <ArrowUpRight size={16} />
                    </motion.button>
                  </Reveal>
                </div>
              </div>
            </Reveal>
          </Parallax>
        </section>
      </PageLayout>
    </>
  );
};

export default HomePage;
