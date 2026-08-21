import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, ExternalLink, Coins, Split, Gift, CalendarDays } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import SearchBar from '../components/SearchBar';
import { getAnnouncements, getCorporateActions } from '../services/marketApi';
import { SkeletonRows, ErrorState, EmptyState } from '../components/ui/States';

/**
 * Corporate announcements and actions.
 *
 * Replaces five hardcoded fake announcements ("Interim Dividend of ₹15 per
 * Share" etc.) with two live feeds: recent filings and the corporate
 * actions tables (dividends, splits, bonus, rights, board meetings).
 *
 * The corporate-actions endpoint returns each section as
 * `{title, header:[], data:[[]]}` or, when a company has none, a `msg`
 * explaining that. The backend converts rows to objects and preserves the
 * message so an empty section can say why it is empty.
 */

const POPULAR = ['TCS', 'INFY', 'RELIANCE', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'ITC', 'SBIN'];

const SECTIONS = [
  { key: 'dividends', label: 'Dividends', Icon: Coins, color: 'text-accent-green' },
  { key: 'bonus', label: 'Bonus', Icon: Gift, color: 'text-accent-blue' },
  { key: 'splits', label: 'Splits', Icon: Split, color: 'text-accent-amber' },
  { key: 'rights', label: 'Rights', Icon: Gift, color: 'text-white/60' },
  { key: 'board_meetings', label: 'Board Meetings', Icon: CalendarDays, color: 'text-white/60' },
];

/** Renders a header/rows table generically — column names vary by section. */
const ActionTable = ({ section }) => {
  if (section?.message) {
    return <p className="text-white/30 text-sm py-3">{section.message}</p>;
  }
  const rows = section?.rows ?? [];
  if (!rows.length) return <p className="text-white/30 text-sm py-3">Nothing recorded.</p>;

  const columns = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-[420px]">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((c) => (
              <th
                key={c}
                className="px-2 py-2 text-left text-[10px] uppercase tracking-wider font-semibold text-white/35 whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              {columns.map((c) => (
                <td key={c} className="px-2 py-2.5 text-white/70 align-top">
                  <span className="line-clamp-2">{row[c] ?? '—'}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AnnouncementsPage = () => {
  const [symbol, setSymbol] = useState('TCS');
  const [search, setSearch] = useState('');
  const [filings, setFilings] = useState([]);
  const [actions, setActions] = useState(null);
  const [section, setSection] = useState('dividends');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = search.trim().toUpperCase();
    if (q) setSymbol(q);
  }, [search]);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const [f, a] = await Promise.allSettled([
        getAnnouncements(symbol, { signal }),
        getCorporateActions(symbol, { signal }),
      ]);
      if (signal?.aborted) return;   // superseded effect, not a failure
      setFilings(f.status === 'fulfilled' ? f.value : []);
      setActions(a.status === 'fulfilled' ? a.value : null);
      const realFailure = [f, a].every(
        (r) => r.status === 'rejected' && r.reason?.name !== 'AbortError',
      );
      if (realFailure) setError(f.reason);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  return (
    <PageLayout
      title="Corporate"
      accent="Announcements"
      subtitle="Filings, dividends, splits and bonus issues"
      maxWidth="max-w-5xl"
    >
      <div className="mb-5">
        <SearchBar onSearch={setSearch} placeholder="Enter an NSE symbol, e.g. TCS…" />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {POPULAR.map((sym) => (
          <motion.button
            key={sym}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSymbol(sym)}
            aria-pressed={symbol === sym}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              symbol === sym
                ? 'bg-white text-black'
                : 'glass-effect text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {sym}
          </motion.button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows count={5} height="h-20" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : (
        <div className="space-y-6">
          {/* Recent filings */}
          <div className="glass-effect rounded-2xl border border-white/10 p-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Megaphone size={16} className="text-accent-blue" /> Recent Filings — {symbol}
            </h3>
            {filings.length === 0 ? (
              <EmptyState message="No recent filings for this stock." icon={Megaphone} />
            ) : (
              <motion.div
                className="space-y-4"
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.05 } } }}
              >
                {filings.map((a) => (
                  <motion.a
                    key={a.id}
                    href={a.url ?? undefined}
                    target={a.url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    className="block group border-b border-white/5 last:border-0 pb-3 last:pb-0"
                  >
                    <p className="text-sm text-white/85 group-hover:text-accent-blue transition-colors leading-snug">
                      {a.title}
                    </p>
                    {a.dateLabel && (
                      <p className="text-[11px] text-white/30 mt-1 flex items-center gap-1.5">
                        {a.dateLabel}
                        {a.url && <ExternalLink size={9} />}
                      </p>
                    )}
                  </motion.a>
                ))}
              </motion.div>
            )}
          </div>

          {/* Corporate actions */}
          {actions && (
            <div className="glass-effect rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="text-base font-bold text-white">Corporate Actions</h3>
                <div className="flex gap-1.5 flex-wrap">
                  {SECTIONS.map(({ key, label, Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => setSection(key)}
                      aria-pressed={section === key}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        section === key
                          ? 'bg-white/15 text-white'
                          : 'text-white/40 hover:text-white hover:bg-white/8'
                      }`}
                    >
                      <Icon size={12} className={section === key ? color : ''} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <ActionTable section={actions[section]} />
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default AnnouncementsPage;
