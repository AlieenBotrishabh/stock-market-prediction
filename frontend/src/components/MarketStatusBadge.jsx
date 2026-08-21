import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getMarketStatus } from '../services/marketApi';
import { formatDuration } from '../utils/formatting';

/**
 * Live NSE open/closed indicator with a countdown.
 *
 * Status is computed on the SERVER, from the exchange-supplied trading
 * period. The previous implementation lived in Footer.jsx and called
 * `new Date().getHours()` — the viewer's local hour — while its comment
 * claimed IST, so anyone outside India saw the wrong state (a user in New
 * York saw "Market Open" at 09:15 ET). It also had no holiday awareness.
 *
 * The countdown ticks locally between polls so the display stays live
 * without a request every second.
 */

const PHASE_STYLES = {
  open: {
    label: 'Market Open',
    dot: 'bg-accent-green',
    text: 'text-accent-green',
    ring: 'bg-accent-green',
    chip: 'bg-accent-green/10 border-accent-green/25',
  },
  pre: {
    label: 'Pre-Open',
    dot: 'bg-accent-amber',
    text: 'text-accent-amber',
    ring: 'bg-accent-amber',
    chip: 'bg-accent-amber/10 border-accent-amber/25',
  },
  closed: {
    label: 'Market Closed',
    dot: 'bg-white/40',
    text: 'text-white/50',
    ring: '',
    chip: 'bg-white/5 border-white/10',
  },
};

export function useMarketStatus(pollMs = 60_000) {
  const [status, setStatus] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (signal) => {
    try {
      const s = await getMarketStatus({ signal });
      setStatus(s);
      setCountdown(s.secondsUntilChange ?? null);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') setError(err);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    const id = setInterval(() => refresh(controller.signal), pollMs);
    return () => { controller.abort(); clearInterval(id); };
  }, [refresh, pollMs]);

  // Local 1s tick so the countdown moves between polls.
  useEffect(() => {
    if (countdown == null) return undefined;
    const id = setInterval(() => setCountdown((c) => (c == null ? null : Math.max(0, c - 1))), 1000);
    return () => clearInterval(id);
  }, [countdown != null]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, countdown, error };
}

const MarketStatusBadge = ({ showCountdown = true, compact = false, className = '' }) => {
  const { status, countdown } = useMarketStatus();

  // Render nothing rather than guessing while the first request is in flight.
  if (!status) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-white/20" />
        <span className="text-xs text-white/30">Checking market…</span>
      </div>
    );
  }

  const style = PHASE_STYLES[status.phase] ?? PHASE_STYLES.closed;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2.5 rounded-full border px-3 py-1.5 ${style.chip} ${className}`}
      title={`${status.serverTimeLabel ?? ''}${
        status.source === 'clock' ? ' — holiday calendar unavailable' : ''
      }`}
    >
      <span className="relative flex items-center justify-center w-2 h-2">
        {status.isOpen && (
          <span
            className={`absolute inline-flex w-2 h-2 rounded-full ${style.ring} animate-pulse-ring motion-reduce:animate-none`}
          />
        )}
        <span className={`relative inline-flex w-2 h-2 rounded-full ${style.dot}`} />
      </span>

      <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>

      {showCountdown && !compact && countdown != null && countdown > 0 && (
        <span className="text-xs text-white/35 tabular-nums border-l border-white/10 pl-2.5">
          {status.isOpen ? 'closes in' : 'opens in'} {formatDuration(countdown)}
        </span>
      )}
    </motion.div>
  );
};

export default MarketStatusBadge;
