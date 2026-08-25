import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, BookOpen, ShieldCheck, TrendingUp, TrendingDown, RefreshCw,
  Info, ArrowUpRight, Zap, EyeOff, AlertTriangle,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import PredictionCard from '../components/PredictionCard';
import MarketStatusBadge from '../components/MarketStatusBadge';
import { SkeletonRows, ErrorState } from '../components/ui/States';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { getPredictions } from '../services/marketApi';
import { formatPrice, formatPercent, formatRelativeTime } from '../utils/formatting';

/**
 * Forecasts.
 *
 * Every company with a model is evaluated in one request and shown at once,
 * re-running live inference on a timer. Companies that did not clear
 * validation are listed too, with their reason — "evaluated and did not
 * qualify" is a different statement from "does not exist", and collapsing
 * the two is how a page ends up implying coverage it does not have.
 *
 * Replaces a page whose numbers came from a character-code sum of the
 * ticker:
 *     const hash = symbol.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
 *     const variation = ((hash % 100) / 100) * 4 - 2;
 */

const REFRESH_MS = 60_000;

/**
 * One company in the live grid.
 *
 * `provisional` companies show a real model number that has not cleared
 * validation, so they are rendered muted, without the direction wash, and
 * with their accuracy called out. The visual difference is the point: the
 * figure is shown, but never dressed up as a validated forecast.
 */
const ForecastTile = ({ p, active, onSelect }) => {
  const up = (p.predictedChangePercent ?? 0) >= 0;
  const weak = Boolean(p.provisional);
  const belowChance = (p.directionAccuracy ?? 0) < 50;
  return (
    <motion.button
      layout
      onClick={() => onSelect(p.symbol)}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      aria-pressed={active}
      className={`relative overflow-hidden text-left rounded-2xl p-4 border transition-colors ${
        active
          ? 'bg-white/[0.07] border-accent-blue/60'
          : weak
            ? 'bg-white/[0.015] border-dashed border-white/12 hover:border-white/25'
            : 'glass-effect border-white/10 hover:border-accent-blue/35'
      }`}
    >
      {/* Direction wash — validated forecasts only. */}
      {!weak && (
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            background: `radial-gradient(120% 100% at 50% 100%, ${
              up ? '#00d084' : '#ff4757'
            } 0%, transparent 70%)`,
          }}
        />
      )}
      <div className="relative">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-sm font-bold text-white truncate">{p.symbol}</span>
          <span
            className={`shrink-0 flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
              weak
                ? 'bg-white/8 text-white/45'
                : up ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'
            }`}
          >
            {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {formatPercent(p.predictedChangePercent)}
          </span>
        </div>

        <AnimatedNumber
          value={p.predictedClose}
          format={(v) => formatPrice(v)}
          className={`text-xl font-bold block ${weak ? 'text-white/55' : 'text-white'}`}
        />
        <p className="text-[11px] text-white/30 mt-0.5">from {formatPrice(p.basePrice)}</p>

        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px]">
          <span className="text-white/30">direction</span>
          <span
            className={
              belowChance
                ? 'text-accent-red/70 font-semibold'
                : (p.directionAccuracy ?? 0) >= 52
                  ? 'text-accent-green font-semibold'
                  : 'text-white/60 font-semibold'
            }
            title={belowChance ? 'Worse than a coin flip out of sample' : undefined}
          >
            {p.directionAccuracy?.toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.button>
  );
};

const Predictions = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [symbol, setSymbol] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showWithheld, setShowWithheld] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async ({ signal, quiet = false } = {}) => {
    if (quiet) setRefreshing(true);
    else setState((s) => ({ ...s, loading: true }));
    try {
      // Every company runs inference server-side, so allow a longer budget
      // than the default client timeout.
      const data = await getPredictions({ signal, timeout: 60_000 });
      if (!mounted.current || signal?.aborted) return;
      setState({ loading: false, data, error: null });
      setLastUpdated(new Date().toISOString());
      // Default to the strongest expected mover rather than a fixed ticker.
      setSymbol((cur) => cur ?? data.served?.[0]?.symbol ?? null);
    } catch (err) {
      if (err.name === 'AbortError' || !mounted.current) return;
      if (!quiet) setState({ loading: false, data: null, error: err });
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    load({ signal: c.signal });
    return () => c.abort();
  }, [load]);

  // Re-run inference on a timer, but only while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load({ quiet: true });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const served = state.data?.served ?? [];
  const provisional = state.data?.provisional ?? [];
  const unavailable = state.data?.unavailable ?? [];
  const total = state.data?.total ?? 0;

  const HeaderRight = (
    <div className="flex items-center gap-3">
      {lastUpdated && (
        <span className="text-[11px] text-white/30 hidden sm:inline">
          updated {formatRelativeTime(lastUpdated)}
        </span>
      )}
      <motion.button
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.06 }}
        onClick={() => load({ quiet: true })}
        aria-label="Re-run inference"
        className="p-2 rounded-lg glass-effect border border-white/10 text-white/50 hover:text-white transition-colors"
      >
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
      </motion.button>
      <MarketStatusBadge compact />
    </div>
  );

  return (
    <PageLayout
      title="Price"
      accent="Forecasts"
      subtitle="Next-day close — inference runs live on every request"
      headerRight={HeaderRight}
    >
      {/* Summary band */}
      {!state.loading && !state.error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {[
            { label: 'Companies evaluated', value: total, color: 'text-accent-blue', Icon: Brain },
            { label: 'Validated', value: served.length, color: 'text-accent-green', Icon: ShieldCheck },
            { label: 'Unvalidated', value: provisional.length, color: 'text-accent-amber', Icon: AlertTriangle },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="glass-effect rounded-2xl border border-white/10 p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={12} className={color} />
                <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold truncate">
                  {label}
                </p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            </div>
          ))}
        </motion.div>
      )}

      {state.loading ? (
        <SkeletonRows count={4} height="h-24" />
      ) : state.error ? (
        <ErrorState error={state.error} onRetry={() => load()} />
      ) : (
        <>
          {/* Live grid */}
          {served.length > 0 && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={13} className="text-accent-green" /> Validated forecasts
                </h3>
                <p className="text-[11px] text-white/30">
                  largest expected move first · tap to inspect
                </p>
              </div>
              <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {served.map((p) => (
                  <ForecastTile
                    key={p.symbol}
                    p={p}
                    active={p.symbol === symbol}
                    onSelect={setSymbol}
                  />
                ))}
              </motion.div>
            </div>
          )}

          {/* Detail for the selected company */}
          {/* Keyed remount rather than AnimatePresence: with mode="wait"
              the exiting child's completion never fired here, so the
              incoming one never mounted and the detail card stayed pinned
              to whichever company loaded first while the tile highlight
              moved. Changing `key` remounts the subtree, so `initial` ->
              `animate` plays on every selection. */}
          {symbol && (
            <div>
              <motion.div
                key={symbol}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Brain size={18} className="text-accent-blue" /> {symbol}
                  </h2>
                  <button
                    onClick={() => navigate(`/stock/${symbol}`)}
                    className="text-sm text-accent-blue hover:underline flex items-center gap-1"
                  >
                    Full details <ArrowUpRight size={14} />
                  </button>
                </div>
                <PredictionCard symbol={symbol} />
              </motion.div>
            </div>
          )}

          {/* Unvalidated tier — shown with the numbers, clearly separated */}
          {provisional.length > 0 && (
            <div className="mb-8">
              <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={13} className="text-accent-amber" /> Unvalidated
                </h3>
                <p className="text-[11px] text-white/30">
                  real model output · has not beaten a coin flip out of sample
                </p>
              </div>

              <div className="flex items-start gap-2.5 text-[11px] text-accent-amber bg-accent-amber/[0.07] border border-accent-amber/20 rounded-xl px-3.5 py-2.5 mb-3">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  These come from the same model, but on held-out sessions it
                  called their direction correctly{' '}
                  {Math.min(...provisional.map((p) => p.directionAccuracy ?? 100)).toFixed(1)}–
                  {Math.max(...provisional.map((p) => p.directionAccuracy ?? 0)).toFixed(1)}% of
                  the time. Anything at or below 50% is no better than guessing,
                  so treat these as illustrative rather than forecasts.
                </span>
              </div>

              <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {provisional.map((p) => (
                  <ForecastTile
                    key={p.symbol}
                    p={p}
                    active={p.symbol === symbol}
                    onSelect={setSymbol}
                  />
                ))}
              </motion.div>
            </div>
          )}

          {/* Companies with no usable output at all */}
          {unavailable.length > 0 && (
            <div className="mb-8">
              <button
                onClick={() => setShowWithheld((v) => !v)}
                aria-expanded={showWithheld}
                className="w-full glass-effect rounded-2xl border border-white/10 hover:border-white/20 p-4 flex items-center justify-between gap-3 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-left">
                  <EyeOff size={15} className="text-white/40 shrink-0" />
                  <span className="text-sm text-white/70">
                    <strong className="text-white">{unavailable.length}</strong> companies
                    produced no usable output
                  </span>
                </span>
                <span className="text-xs text-accent-blue shrink-0">
                  {showWithheld ? 'Hide' : 'Show reasons'}
                </span>
              </button>

              <AnimatePresence>
                {showWithheld && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                      {unavailable.map((w) => (
                        <div key={w.symbol} className="glass-effect rounded-xl border border-white/5 p-3.5">
                          <p className="text-sm font-bold text-white/70 mb-1">{w.symbol}</p>
                          <p className="text-[11px] text-white/35 leading-relaxed">{w.reason}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* How it works */}
          <div className="glass-effect rounded-2xl border border-white/10 p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-accent-blue/10 flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-accent-blue" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  How these forecasts work
                </h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  A two-layer LSTM reads the last 10 sessions and predicts the
                  next day&rsquo;s log return from stationary features —
                  denoised returns, RSI, MACD, ATR, volume ratio, plus NIFTY
                  and USD/INR context. The model is exported to ONNX and
                  executed on the server when you open this page, in about
                  four milliseconds. Nothing is read from a precomputed batch.
                </p>
                <p className="text-white/45 text-sm leading-relaxed mt-2">
                  One model serves every company. Training each separately was
                  measured and performed <em>worse</em> — the shared model
                  generalises better, which is the transfer result Hiransha
                  et&nbsp;al. (2018) reported for NSE stocks. Every company is
                  still validated on its own held-out sessions and passes or
                  fails on its own numbers.
                </p>
                <p className="text-white/35 text-xs leading-relaxed mt-3 flex items-start gap-2">
                  <Info size={12} className="shrink-0 mt-0.5" />
                  <span>
                    A company is shown only if its error stays within 2% of a
                    naive &ldquo;tomorrow equals today&rdquo; baseline
                    <strong className="text-white/55"> and </strong>
                    it calls direction at least 51% of the time. Daily closes
                    are close to a random walk, so the naive baseline already
                    scores about 1% error — direction is where real skill
                    shows, and 50% is a coin flip. Forecasts are for research,
                    not investment advice.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </PageLayout>
  );
};

export default Predictions;
