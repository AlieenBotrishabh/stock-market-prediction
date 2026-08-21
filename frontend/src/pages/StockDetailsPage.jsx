import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Heart, Share2, TrendingUp, TrendingDown, BarChart2, Globe,
  Building2, Newspaper, Megaphone,
} from 'lucide-react';
import StockChart from '../components/StockChart';
import PageLayout from '../components/PageLayout';
import IndicatorsPanel from '../components/IndicatorsPanel';
import PredictionCard from '../components/PredictionCard';
import MarketStatusBadge from '../components/MarketStatusBadge';
import RangeBar from '../components/ui/RangeBar';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { Skeleton, ErrorState, StaleBanner, EmptyState } from '../components/ui/States';
import {
  getQuote, getNews, getAnnouncements, getCorporateActions, getFundamentals,
} from '../services/marketApi';
import {
  formatPrice, formatPercent, formatChange, formatVolume, formatMarketCap,
  formatCompact, formatRelativeTime, changeColor, DASH,
} from '../utils/formatting';

/**
 * Stock detail page.
 *
 * The Open / Prev Close / 52W High / 52W Low tiles existed before but
 * always rendered "—", because the deployed build called localhost for its
 * data and every request failed. They now populate from the real quote,
 * and the 52-week and day ranges also get visual position bars, which is
 * the question those numbers are actually asked to answer.
 *
 * The previous `catch` block fabricated a complete stock (price 3500,
 * 52W 4200/3200, P/E 25.5, volume "1,234,567") that was visually
 * indistinguishable from real data. That is gone: failures render an error.
 */

const Tile = ({ label, value, color = 'text-white' }) => (
  <div className="glass-effect rounded-xl p-4 border border-white/5">
    <p className="text-white/40 text-xs mb-1">{label}</p>
    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
  </div>
);

const Section = ({ title, icon: Icon, children, right }) => (
  <div className="glass-effect p-6 rounded-2xl border border-white/10">
    <div className="flex items-center justify-between mb-4 gap-3">
      <h3 className="text-base font-bold text-white flex items-center gap-2">
        <Icon size={16} className="text-accent-blue" /> {title}
      </h3>
      {right}
    </div>
    {children}
  </div>
);

const StockDetailsPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const upper = (symbol ?? '').toUpperCase();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchlisted, setWatchlisted] = useState(false);

  const [news, setNews] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [dividends, setDividends] = useState([]);

  const loadQuote = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      setQuote(await getQuote(upper, { signal }));
    } catch (err) {
      if (err.name !== 'AbortError') { setError(err); setQuote(null); }
    } finally {
      setLoading(false);
    }
  }, [upper]);

  useEffect(() => {
    const c = new AbortController();
    loadQuote(c.signal);
    return () => c.abort();
  }, [loadQuote]);

  // Secondary content: each failure is contained so one bad section never
  // blanks the page.
  //
  // Fundamentals are fetched separately rather than waited on inside the
  // quote request. IndianAPI's company payload is large and slow on a cold
  // cache, and the price should never be delayed behind it — market cap
  // and the description simply fill in a moment later.
  useEffect(() => {
    const c = new AbortController();
    const opts = { signal: c.signal, timeout: 30_000 };

    getFundamentals(upper, opts)
      .then((f) =>
        setQuote((q) =>
          q ? {
            ...q,
            marketCap: q.marketCap ?? f.marketCap,
            peRatio: q.peRatio ?? f.peRatio,
            dividendYield: q.dividendYield ?? f.dividendYield,
            industry: q.industry ?? f.industry,
            about: q.about ?? f.about,
          } : q,
        ),
      )
      .catch(() => {});

    getNews(upper, opts).then((n) => setNews(n.slice(0, 6))).catch(() => setNews([]));
    getAnnouncements(upper, opts).then((a) => setAnnouncements(a.slice(0, 5))).catch(() => setAnnouncements([]));
    getCorporateActions(upper, opts)
      .then((ca) => setDividends((ca?.dividends?.rows ?? []).slice(0, 5)))
      .catch(() => setDividends([]));
    return () => c.abort();
  }, [upper]);

  // Keep the quote fresh while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') loadQuote();
    }, 60_000);
    return () => clearInterval(id);
  }, [loadQuote]);

  if (loading && !quote) {
    return (
      <PageLayout>
        <div className="space-y-6">
          <Skeleton className="h-14 w-72" />
          <Skeleton className="h-52 w-full" rounded="rounded-2xl" />
          <Skeleton className="h-80 w-full" rounded="rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (error || !quote) {
    return (
      <PageLayout>
        <button
          onClick={() => navigate(-1)}
          className="mb-6 p-2.5 glass-effect rounded-xl text-white/60 hover:text-white border border-white/10 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <ErrorState error={error} onRetry={() => loadQuote()} />
      </PageLayout>
    );
  }

  const positive = (quote.changePercent ?? 0) >= 0;

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6 flex-wrap">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-2.5 glass-effect rounded-xl text-white/60 hover:text-white border border-white/10 hover:border-white/30 transition-all mt-0.5"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <motion.h1
              layoutId={`symbol-${upper}`}
              className="text-4xl md:text-5xl font-bold text-white"
            >
              {quote.symbol}
            </motion.h1>
            <span
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full ${
                positive ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'
              }`}
            >
              {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {formatPercent(quote.changePercent)}
            </span>
            <MarketStatusBadge compact />
          </div>
          <p className="text-white/50 text-sm mt-1.5">
            {quote.name ?? upper}
            {quote.exchange && <span className="text-white/25"> · {quote.exchange}</span>}
          </p>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            onClick={() => setWatchlisted((w) => !w)}
            aria-pressed={watchlisted}
            aria-label="Toggle watchlist"
            className={`p-3 rounded-xl border transition-colors ${
              watchlisted
                ? 'bg-accent-red/20 border-accent-red/40 text-accent-red'
                : 'glass-effect border-white/10 text-white/50 hover:text-accent-red hover:border-accent-red/30'
            }`}
          >
            <Heart size={20} fill={watchlisted ? 'currentColor' : 'none'} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
            aria-label="Copy link"
            className="p-3 glass-effect rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors"
          >
            <Share2 size={20} />
          </motion.button>
        </div>
      </div>

      {quote.isStale && <StaleBanner asOf={quote.asOf} />}

      {/* Price + OHLC */}
      <div className="glass-effect p-6 md:p-8 rounded-2xl border border-white/10 mb-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-2">
              Current Price
            </p>
            <AnimatedNumber
              value={quote.price}
              format={(v) => formatPrice(v)}
              className="text-5xl font-bold text-white block mb-3"
            />
            <p className={`text-xl font-semibold flex items-center gap-2 ${changeColor(quote.change)}`}>
              {positive ? '▲' : '▼'} {formatPercent(quote.changePercent, { signed: false })}
              <span className="text-base font-normal">({formatChange(quote.change)})</span>
            </p>
            <p className="text-[11px] text-white/25 mt-3">
              Updated {formatRelativeTime(quote.asOf)} · source {quote.source}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Tile label="Open" value={formatPrice(quote.open)} color="text-accent-blue" />
            <Tile label="Prev. Close" value={formatPrice(quote.previousClose)} color="text-accent-blue" />
            <Tile label="Volume" value={formatVolume(quote.volume)} />
            <Tile label="Day High" value={formatPrice(quote.high)} color="text-accent-green" />
            <Tile label="Day Low" value={formatPrice(quote.low)} color="text-accent-red" />
            <Tile label="Last Close" value={formatPrice(quote.close)} />
          </div>
        </div>
      </div>

      {/* The ranges — what 52W High/Low is really for */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <RangeBar
          label="Day Range"
          low={quote.low} high={quote.high} current={quote.price}
          lowLabel="Day Low" highLabel="Day High"
        />
        <RangeBar
          label="52-Week Range"
          low={quote.fiftyTwoWeekLow} high={quote.fiftyTwoWeekHigh} current={quote.price}
          lowLabel="52W Low" highLabel="52W High"
        />
      </div>

      <div className="mb-5"><StockChart symbol={quote.symbol} /></div>

      <div className="mb-6"><IndicatorsPanel symbol={quote.symbol} /></div>

      <div className="mb-6"><PredictionCard symbol={quote.symbol} /></div>

      {/* Fundamentals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <Section title="Key Metrics" icon={BarChart2}>
          <div className="space-y-3">
            {[
              ['Market Cap', formatMarketCap(quote.marketCap)],
              ['P/E Ratio', quote.peRatio != null ? formatCompact(quote.peRatio) : DASH],
              ['Dividend Yield', quote.dividendYield != null ? `${formatCompact(quote.dividendYield)}%` : DASH],
              ['Volume', formatVolume(quote.volume)],
            ].map(([label, value], i, arr) => (
              <div
                key={label}
                className={`flex justify-between items-center py-2.5 ${
                  i < arr.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <span className="text-white/40 text-sm">{label}</span>
                <span className="text-sm font-semibold text-white tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Market Info" icon={Globe}>
          <div className="space-y-3">
            {[
              ['Exchange', quote.exchange ?? 'NSE'],
              ['Sector', quote.industry ?? quote.sector ?? DASH],
              ['Currency', quote.currency ?? 'INR'],
              ['Last Updated', formatRelativeTime(quote.asOf)],
            ].map(([label, value], i, arr) => (
              <div
                key={label}
                className={`flex justify-between items-center py-2.5 gap-4 ${
                  i < arr.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <span className="text-white/40 text-sm shrink-0">{label}</span>
                <span className="text-sm font-semibold text-white text-right truncate">{value}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Dividends */}
      {dividends.length > 0 && (
        <div className="mb-5">
          <Section title="Recent Dividends" icon={Megaphone}>
            <div className="space-y-2">
              {dividends.map((d, i) => (
                <div key={i} className="flex justify-between items-center gap-4 py-2 border-b border-white/5 last:border-0">
                  <span className="text-white/70 text-sm truncate">{d['Details'] ?? d['Dividend Percentage'] ?? DASH}</span>
                  <span className="text-white/40 text-xs shrink-0 tabular-nums">{d['Record Date'] ?? d['Ex-Date']}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="mb-5">
          <Section title="Recent Announcements" icon={Megaphone}>
            <div className="space-y-3">
              {announcements.map((a) => (
                <a
                  key={a.id} href={a.url ?? '#'}
                  target="_blank" rel="noopener noreferrer"
                  className="block group"
                >
                  <p className="text-sm text-white/80 group-hover:text-accent-blue transition-colors line-clamp-2">
                    {a.title}
                  </p>
                  {a.dateLabel && (
                    <p className="text-[11px] text-white/30 mt-0.5 line-clamp-1">{a.dateLabel}</p>
                  )}
                </a>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* News */}
      <div className="mb-5">
        <Section title={`News — ${upper}`} icon={Newspaper}>
          {news.length === 0 ? (
            <EmptyState message="No recent news for this stock." icon={Newspaper} />
          ) : (
            <div className="space-y-4">
              {news.map((n) => (
                <a
                  key={n.id} href={n.url ?? '#'}
                  target="_blank" rel="noopener noreferrer"
                  className="flex gap-4 group"
                >
                  {n.imageUrl && (
                    <img
                      src={n.imageUrl} alt=""
                      loading="lazy"
                      className="w-20 h-16 rounded-lg object-cover shrink-0 bg-white/5"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-white/85 group-hover:text-accent-blue transition-colors line-clamp-2">
                      {n.title}
                    </p>
                    <p className="text-xs text-white/35 mt-1 line-clamp-2">{n.summary}</p>
                    <p className="text-[11px] text-white/25 mt-1">
                      {n.source} · {formatRelativeTime(n.publishedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* About */}
      {quote.about && (
        <Section title={`About ${quote.symbol}`} icon={Building2}>
          <p className="text-white/50 text-sm leading-relaxed">{quote.about}</p>
        </Section>
      )}
    </PageLayout>
  );
};

export default StockDetailsPage;
