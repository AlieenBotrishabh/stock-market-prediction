import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Coins, RefreshCw, Clock } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import SearchBar from '../components/SearchBar';
import { getCommodities } from '../services/marketApi';
import { SkeletonRows, ErrorState, EmptyState } from '../components/ui/States';
import { formatCompact, DASH } from '../utils/formatting';

/**
 * MCX commodity futures.
 *
 * New section — the data source carries ~85 contracts (gold, silver,
 * crude, copper, natural gas and their mini/micro variants) that the app
 * was not surfacing at all.
 *
 * Note these are futures quotes with an expiry, not spot prices, so the
 * expiry is shown alongside every contract.
 */
const CommoditiesPage = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCommodities({ signal });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name !== 'AbortError') { setError(err); setItems([]); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q ? items.filter((i) => i.product?.toLowerCase().includes(q)) : items;
    return [...rows].sort((a, b) => (a.product ?? '').localeCompare(b.product ?? ''));
  }, [items, search]);

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
      title="Commodity"
      accent="Futures"
      subtitle="Live MCX contracts — gold, silver, crude, base metals and energy"
      headerRight={RefreshBtn}
    >
      <div className="mb-6">
        <SearchBar onSearch={setSearch} placeholder="Search a contract, e.g. GOLD…" />
      </div>

      {loading ? (
        <SkeletonRows count={8} height="h-16" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No contracts match that search." icon={Coins} />
      ) : (
        <>
          <p className="text-xs text-white/30 mb-4">{filtered.length} contracts</p>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.025 } } }}
          >
            {filtered.map((c) => {
              // The bid/ask midpoint gives a sense of the current spread.
              const spread =
                c.buyPrice != null && c.sellPrice != null ? c.sellPrice - c.buyPrice : null;
              return (
                <motion.div
                  key={c.id ?? `${c.product}-${c.expiry}`}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  whileHover={{ y: -3 }}
                  className="glass-effect rounded-2xl border border-white/10 hover:border-accent-amber/30 p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-white font-bold text-sm truncate">{c.product ?? DASH}</h3>
                      <p className="text-[11px] text-white/30 mt-0.5">Expiry {c.expiry ?? DASH}</p>
                    </div>
                    <Coins size={15} className="text-accent-amber shrink-0" />
                  </div>

                  <p className="text-xl font-bold text-white tabular-nums">
                    {c.lastPrice == null ? DASH : `₹${formatCompact(c.lastPrice, 0)}`}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-[11px]">
                    <div>
                      <p className="text-white/30">Bid</p>
                      <p className="text-white/70 tabular-nums truncate">
                        {c.buyPrice == null ? DASH : formatCompact(c.buyPrice, 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/30">Ask</p>
                      <p className="text-white/70 tabular-nums truncate">
                        {c.sellPrice == null ? DASH : formatCompact(c.sellPrice, 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/30">Spread</p>
                      <p className="text-white/70 tabular-nums truncate">
                        {spread == null ? DASH : formatCompact(spread, 0)}
                      </p>
                    </div>
                  </div>

                  {c.lastTradedTime && (
                    <p className="text-[10px] text-white/25 mt-2.5 flex items-center gap-1">
                      <Clock size={9} /> {c.lastTradedTime}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </>
      )}
    </PageLayout>
  );
};

export default CommoditiesPage;
