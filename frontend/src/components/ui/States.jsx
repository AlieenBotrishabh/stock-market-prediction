import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, SearchX, WifiOff, Clock, Inbox } from 'lucide-react';
import { ApiError } from '../../services/marketApi';
import { formatRelativeTime } from '../../utils/formatting';

/**
 * Loading, empty, error and staleness states.
 *
 * These exist so no page ever has to fall back to invented data. The old
 * build responded to every failure by rendering mock prices that were
 * visually identical to real ones — StockDetailsPage's catch block
 * fabricated a full stock (price 3500, 52W 4200/3200, P/E 25.5) and
 * StockChart generated a Math.random() walk. A user could not tell.
 */

/** Shimmering placeholder block. */
export const Skeleton = ({ className = '', rounded = 'rounded-lg', style }) => (
  <div
    className={`${rounded} ${className} animate-skeleton motion-reduce:animate-none`}
    style={{
      background:
        'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 37%, rgba(255,255,255,0.04) 63%)',
      backgroundSize: '200% 100%',
      ...style,
    }}
  />
);

/** Card-shaped skeleton, sized to match StockCard. */
export const SkeletonCard = () => (
  <div className="glass-effect rounded-2xl p-5 border border-white/10 space-y-3">
    <div className="flex justify-between items-start">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-8" rounded="rounded-full" />
    </div>
    <Skeleton className="h-9 w-36" />
    <div className="flex gap-3 pt-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-20" />
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 8 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
  </div>
);

export const SkeletonRows = ({ count = 6, height = 'h-14' }) => (
  <div className="space-y-2">
    {Array.from({ length: count }, (_, i) => (
      <Skeleton key={i} className={`${height} w-full`} rounded="rounded-xl" />
    ))}
  </div>
);

/**
 * Error state. Picks its wording from the ApiError code so the user learns
 * something actionable instead of a generic "something went wrong".
 */
export const ErrorState = ({ error, onRetry, compact = false }) => {
  const isApi = error instanceof ApiError;
  const code = isApi ? error.code : 'REQUEST_FAILED';

  const presets = {
    SYMBOL_NOT_FOUND: {
      Icon: SearchX,
      title: 'Not found',
      body: error?.message ?? 'No market data exists for that symbol.',
      retry: false,
    },
    NETWORK: {
      Icon: WifiOff,
      title: "Can't reach the server",
      body: 'Check your connection and try again.',
      retry: true,
    },
    TIMEOUT: {
      Icon: Clock,
      title: 'Request timed out',
      body: 'The data provider is slow to respond right now.',
      retry: true,
    },
    NO_API_KEY: {
      Icon: AlertTriangle,
      title: 'Data source not configured',
      body: 'This section needs an API key set on the server.',
      retry: false,
    },
  };

  const { Icon, title, body, retry } = presets[code] ?? {
    Icon: AlertTriangle,
    title: 'Could not load data',
    body: error?.message ?? 'The request failed.',
    retry: true,
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-white/50 py-3">
        <Icon size={15} className="text-accent-amber shrink-0" />
        <span className="min-w-0">{body}</span>
        {retry && onRetry && (
          <button onClick={onRetry} className="text-accent-blue hover:underline font-medium shrink-0">
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect rounded-2xl border border-white/10 py-14 px-6 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-accent-amber/10 flex items-center justify-center mx-auto mb-4">
        <Icon size={22} className="text-accent-amber" />
      </div>
      <h3 className="text-white font-semibold mb-1.5">{title}</h3>
      <p className="text-white/40 text-sm max-w-sm mx-auto">{body}</p>
      {retry && onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition"
        >
          Try again
        </button>
      )}
    </motion.div>
  );
};

/** Nothing to show, but nothing went wrong either. */
export const EmptyState = ({ message = 'Nothing to show here yet.', icon: Icon = Inbox }) => (
  <div className="glass-effect rounded-2xl border border-white/10 py-14 text-center">
    <Icon size={22} className="text-white/25 mx-auto mb-3" />
    <p className="text-white/40 text-sm">{message}</p>
  </div>
);

/**
 * Banner shown when the API served a cached copy because the upstream
 * provider was unreachable. Being explicit about age is the honest
 * alternative to quietly presenting old numbers as current.
 */
export const StaleBanner = ({ asOf }) => (
  <div className="flex items-center gap-2 text-xs text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-lg px-3 py-2 mb-4">
    <Clock size={13} className="shrink-0" />
    <span>
      Live data is unavailable — showing the last known values
      {asOf ? ` from ${formatRelativeTime(asOf)}` : ''}.
    </span>
  </div>
);

export default { Skeleton, SkeletonCard, SkeletonGrid, SkeletonRows, ErrorState, EmptyState, StaleBanner };
