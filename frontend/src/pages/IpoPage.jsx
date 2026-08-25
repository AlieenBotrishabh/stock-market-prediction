import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, RefreshCw, TrendingUp, TrendingDown, Rocket } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { getIpos } from '../services/marketApi';
import { SkeletonRows, ErrorState, EmptyState } from '../components/ui/States';
import { formatPrice, formatPercent, formatDate, DASH } from '../utils/formatting';

/**
 * IPO listings.
 *
 * The endpoint returns `{ upcoming[], listed[], active[], closed[] }` —
 * grouped, not the flat array the old page expected — with fields
 * `min_price`/`max_price`/`issue_price`/`listing_gains`/`bidding_*_date`.
 * The old status filter matched against 'Open'/'Upcoming'/'Closed', which
 * only ever worked against its own mock data.
 */

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Open Now' },
  { key: 'listed', label: 'Recently Listed' },
  { key: 'closed', label: 'Closed' },
];

const STATUS_STYLE = {
  upcoming: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
  active: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  listed: 'bg-white/10 text-white/70 border-white/20',
  closed: 'bg-accent-red/15 text-accent-red border-accent-red/30',
};

const Field = ({ label, value, className = '' }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-white/30 mb-0.5">{label}</p>
    <p className={`text-sm font-semibold tabular-nums truncate ${className || 'text-white'}`}>
      {value}
    </p>
  </div>
);

const IpoPage = () => {
  const [groups, setGroups] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await getIpos({ signal }));
    } catch (err) {
      if (err.name !== 'AbortError') { setError(err); setGroups(null); }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  const rows = useMemo(() => groups?.[tab] ?? [], [groups, tab]);

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
      title="IPO"
      accent="Listings"
      subtitle="Upcoming, open and recently listed Initial Public Offerings"
      headerRight={RefreshBtn}
    >
      <div className="flex gap-2 flex-wrap mb-8">
        {TABS.map(({ key, label }) => {
          const count = groups?.[key]?.length ?? 0;
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-white text-black'
                  : 'glass-effect text-white/60 hover:text-white border border-white/10'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-2 text-xs ${tab === key ? 'text-black/50' : 'text-white/30'}`}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {loading ? (
        <SkeletonRows count={5} height="h-32" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : rows.length === 0 ? (
        <EmptyState message={`No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} IPOs right now.`} icon={Rocket} />
      ) : (
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        >
          {rows.map((ipo, i) => {
            const gainsPositive = (ipo.listingGains ?? 0) >= 0;
            return (
              <motion.div
                key={`${ipo.symbol ?? ipo.name}-${i}`}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }}
                className="glass-effect rounded-2xl border border-white/10 hover:border-accent-blue/30 p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-white font-bold truncate">{ipo.name ?? ipo.symbol}</h3>
                    <p className="text-xs text-white/35 mt-0.5">
                      {ipo.symbol}
                      {ipo.isSme && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-white/10 text-white/50">SME</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize ${
                      STATUS_STYLE[ipo.status] ?? STATUS_STYLE.listed
                    }`}
                  >
                    {ipo.status}
                  </span>
                </div>

                {/* Only fields that are meaningful for this stage. An
                    upcoming IPO has no issue or listing price yet — showing
                    those as em-dashes made the page look like it had failed
                    to load rather than like the data does not exist yet. */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(ipo.priceMin != null && ipo.priceMax != null) && (
                    <Field
                      label="Price Band"
                      value={`${formatPrice(ipo.priceMin)} – ${formatPrice(ipo.priceMax)}`}
                    />
                  )}
                  {ipo.issuePrice != null && (
                    <Field label="Issue Price" value={formatPrice(ipo.issuePrice)} />
                  )}
                  {ipo.listingPrice != null && (
                    <Field label="Listed At" value={formatPrice(ipo.listingPrice)} />
                  )}
                  {ipo.listingGains != null && (
                    <Field
                      label="Listing Gain"
                      value={formatPercent(ipo.listingGains)}
                      className={gainsPositive ? 'text-accent-green' : 'text-accent-red'}
                    />
                  )}
                  {ipo.priceMin == null && ipo.issuePrice == null && (
                    <p className="col-span-full text-sm text-white/35">
                      Price band not announced yet.
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4 text-[11px] text-white/35 flex-wrap">
                  {ipo.biddingStart && (
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> Opens {formatDate(ipo.biddingStart)}
                    </span>
                  )}
                  {ipo.biddingEnd && <span>Closes {formatDate(ipo.biddingEnd)}</span>}
                  {ipo.listingDate && <span>Lists {formatDate(ipo.listingDate)}</span>}
                  {ipo.listingGains != null && (
                    gainsPositive
                      ? <TrendingUp size={11} className="text-accent-green ml-auto" />
                      : <TrendingDown size={11} className="text-accent-red ml-auto" />
                  )}
                </div>

                {ipo.note && (
                  <p className="text-[11px] text-white/25 mt-3 line-clamp-2">{ipo.note}</p>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageLayout>
  );
};

export default IpoPage;
