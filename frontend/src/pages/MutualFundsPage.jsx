import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, RefreshCw, Star, ArrowUpDown } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import SearchBar from '../components/SearchBar';
import { getMutualFunds } from '../services/marketApi';
import { SkeletonRows, ErrorState, EmptyState } from '../components/ui/States';
import { formatCompact, formatPercent, DASH } from '../utils/formatting';

/**
 * Mutual fund explorer.
 *
 * The endpoint nests funds as category -> sub-category -> fund[], with
 * per-fund 1M/3M/6M/1Y/3Y/5Y returns, AUM and a star rating. The old page
 * assumed a flat array filtered by a hardcoded ['equity','debt','hybrid']
 * list; the live categories are Debt, Equity, Hybrid, Index Funds, Global
 * Fund of Funds, Solutions Oriented and Other, so its filters matched
 * nothing. Categories now come from the response.
 */

const SORTS = [
  { key: 'return1Y', label: '1Y Return' },
  { key: 'return3Y', label: '3Y Return' },
  { key: 'return5Y', label: '5Y Return' },
  { key: 'aum', label: 'Fund Size' },
  { key: 'rating', label: 'Rating' },
];

const Stars = ({ value }) => {
  if (value == null) return <span className="text-white/25 text-xs">{DASH}</span>;
  return (
    <span className="flex gap-0.5" title={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={11}
          className={i < value ? 'text-accent-amber fill-accent-amber' : 'text-white/15'}
        />
      ))}
    </span>
  );
};

const ReturnCell = ({ label, value }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
    <p
      className={`text-sm font-semibold tabular-nums ${
        value == null ? 'text-white/30' : value >= 0 ? 'text-accent-green' : 'text-accent-red'
      }`}
    >
      {value == null ? DASH : formatPercent(value)}
    </p>
  </div>
);

const MutualFundsPage = () => {
  const [payload, setPayload] = useState(null);
  const [category, setCategory] = useState('All');
  const [sortKey, setSortKey] = useState('return1Y');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      setPayload(await getMutualFunds({ signal }));
    } catch (err) {
      if (err.name !== 'AbortError') { setError(err); setPayload(null); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  const categories = useMemo(
    () => ['All', ...(payload?.categories ?? [])],
    [payload],
  );

  const funds = useMemo(() => {
    let rows = payload?.funds ?? [];
    if (category !== 'All') rows = rows.filter((f) => f.category === category);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((f) => f.name?.toLowerCase().includes(q));
    return [...rows].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
  }, [payload, category, search, sortKey]);

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
      title="Mutual"
      accent="Funds"
      subtitle="Explore funds across every category, ranked by performance"
      headerRight={RefreshBtn}
    >
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <SearchBar onSearch={setSearch} placeholder="Search fund name…" className="flex-1 min-w-[220px]" />
        <div className="flex items-center gap-2">
          <ArrowUpDown size={13} className="text-white/30" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            aria-label="Sort by"
            className="glass-effect border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white bg-transparent outline-none focus:border-accent-blue/60"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key} className="bg-[#0a0a0f]">{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {categories.map((cat) => (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCategory(cat)}
            aria-pressed={category === cat}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-white text-black'
                : 'glass-effect text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {cat}
          </motion.button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows count={6} height="h-24" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : funds.length === 0 ? (
        <EmptyState message="No funds match these filters." icon={Briefcase} />
      ) : (
        <>
          <p className="text-xs text-white/30 mb-4">
            {funds.length} fund{funds.length === 1 ? '' : 's'}
          </p>
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.03 } } }}
          >
            {funds.slice(0, 60).map((f, i) => (
              <motion.div
                key={`${f.name}-${i}`}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -2 }}
                className="glass-effect rounded-2xl border border-white/10 hover:border-accent-blue/30 p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-semibold text-sm leading-snug">{f.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">
                        {f.category}
                      </span>
                      <span className="text-[11px] text-white/30">{f.subCategory}</span>
                      <Stars value={f.rating} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/30">NAV</p>
                    <p className="text-lg font-bold text-white tabular-nums">
                      {f.nav == null ? DASH : `₹${formatCompact(f.nav)}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-3 border-t border-white/5">
                  <ReturnCell label="1M" value={f.return1M} />
                  <ReturnCell label="6M" value={f.return6M} />
                  <ReturnCell label="1Y" value={f.return1Y} />
                  <ReturnCell label="3Y" value={f.return3Y} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30">AUM</p>
                    <p className="text-sm font-semibold text-white/70 tabular-nums">
                      {f.aum == null ? DASH : `₹${formatCompact(f.aum, 0)} Cr`}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </PageLayout>
  );
};

export default MutualFundsPage;
