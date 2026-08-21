import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, Search, Globe } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { getNews } from '../services/marketApi';
import { SkeletonRows, ErrorState, EmptyState } from '../components/ui/States';
import { formatRelativeTime, formatDate } from '../utils/formatting';

/**
 * Market news.
 *
 * Two bugs fixed here. The old page called stock.indianapi.in directly
 * from the browser, so CORS preflight blocked every request and it always
 * fell through to four fabricated headlines. And it read `title`/
 * `description` when the endpoint actually returns `title`/`summary`/
 * `image_url`/`pub_date`/`source` — so even a successful call rendered
 * blank cards.
 *
 * Requests now go through the backend proxy, which maps the fields once.
 */

const POPULAR = ['All', 'TCS', 'INFY', 'RELIANCE', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'LT', 'SBIN'];

const NewsPage = () => {
  const [articles, setArticles] = useState([]);
  const [symbol, setSymbol] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNews(symbol === 'All' ? undefined : symbol, { signal });
      setArticles(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name !== 'AbortError') { setError(err); setArticles([]); }
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [load]);

  return (
    <PageLayout
      title="Market"
      accent="News"
      subtitle="Latest headlines and analysis from Indian markets"
      maxWidth="max-w-5xl"
    >
      <div className="glass-effect p-5 rounded-2xl border border-white/10 mb-8">
        <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2">
          <Search size={12} /> Filter by stock
        </p>
        <div className="flex flex-wrap gap-2">
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
      </div>

      {loading ? (
        <SkeletonRows count={6} height="h-28" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : articles.length === 0 ? (
        <EmptyState
          message={`No recent news${symbol === 'All' ? '' : ` for ${symbol}`}.`}
          icon={Newspaper}
        />
      ) : (
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        >
          {articles.map((a) => (
            <motion.a
              key={a.id}
              href={a.url ?? undefined}
              target={a.url ? '_blank' : undefined}
              rel="noopener noreferrer"
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -2 }}
              className="glass-effect rounded-2xl border border-white/10 hover:border-accent-blue/35 p-5 flex gap-5 group transition-colors"
            >
              {a.imageUrl && (
                <img
                  src={a.imageUrl}
                  alt=""
                  loading="lazy"
                  className="w-28 h-24 rounded-xl object-cover shrink-0 bg-white/5 hidden sm:block"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold leading-snug group-hover:text-accent-blue transition-colors line-clamp-2">
                  {a.title}
                </h3>
                {a.summary && (
                  <p className="text-white/45 text-sm mt-2 line-clamp-2 leading-relaxed">
                    {a.summary}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3 text-[11px] text-white/30 flex-wrap">
                  {a.source && (
                    <span className="flex items-center gap-1">
                      <Globe size={10} /> {a.source}
                    </span>
                  )}
                  {a.publishedAt && (
                    <span title={formatDate(a.publishedAt, { withTime: true })}>
                      {formatRelativeTime(a.publishedAt)}
                    </span>
                  )}
                  {a.topics?.slice(0, 2).map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                      {t}
                    </span>
                  ))}
                  {a.url && <ExternalLink size={10} className="ml-auto" />}
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>
      )}
    </PageLayout>
  );
};

export default NewsPage;
