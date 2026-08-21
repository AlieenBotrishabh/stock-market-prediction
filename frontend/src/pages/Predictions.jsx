import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Search, BookOpen, ShieldCheck } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import PredictionCard from '../components/PredictionCard';
import SearchBar from '../components/SearchBar';
import MarketStatusBadge from '../components/MarketStatusBadge';
import { getPredictions } from '../services/marketApi';
import { formatPercent } from '../utils/formatting';

/**
 * Forecasts page.
 *
 * What this replaces: a page titled "AI Predictions … powered by real-time
 * data" whose numbers came from
 *
 *     const hash = symbol.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
 *     const variation = ((hash % 100) / 100) * 4 - 2;
 *
 * — a character-code sum of the ticker. It returned the same value forever
 * for a given symbol, reported `dataPoints: 100` as a literal, and derived
 * its "confidence" from the magnitude of that same hash. Each click was
 * logged to a "Prediction History" table as though it were a fresh
 * inference.
 *
 * Every number here now comes from an LSTM trained offline on ten years of
 * daily bars, and PredictionCard refuses to render a figure at all unless
 * the model cleared its walk-forward baseline check.
 */

const POPULAR = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
  'SBIN', 'WIPRO', 'LT', 'ITC', 'MARUTI',
];

const Predictions = () => {
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState('RELIANCE');
  const [search, setSearch] = useState('');
  const [available, setAvailable] = useState([]);

  const loadAvailable = useCallback(async (signal) => {
    try {
      setAvailable(await getPredictions({ signal }));
    } catch {
      setAvailable([]);
    }
  }, []);

  useEffect(() => {
    const c = new AbortController();
    loadAvailable(c.signal);
    return () => c.abort();
  }, [loadAvailable]);

  useEffect(() => {
    const q = search.trim().toUpperCase();
    if (q) setSymbol(q);
  }, [search]);

  const modelled = new Set(available.map((a) => a.symbol));

  return (
    <PageLayout
      title="Price"
      accent="Forecasts"
      subtitle="Next-day closing price from an LSTM trained on 10 years of daily data"
      headerRight={<MarketStatusBadge />}
    >
      {/* How it works — set expectations before showing any number */}
      <div className="glass-effect rounded-2xl border border-white/10 p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-accent-blue/10 flex items-center justify-center shrink-0">
            <BookOpen size={16} className="text-accent-blue" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1.5">How these forecasts work</h3>
            <p className="text-white/45 text-sm leading-relaxed">
              A single-layer LSTM (150 units) predicts the next day's log
              return from twelve stationary features — denoised returns,
              RSI, MACD, ATR, volume ratio, plus NIFTY and USD/INR context.
              The architecture follows Bhandari et al. (2022); the feature
              selection and walk-forward validation follow Hiransha et al.
              (2018).
            </p>
            <p className="text-white/45 text-sm leading-relaxed mt-2">
              A model is published <strong className="text-white/70">only if</strong> it
              clears two bars in walk-forward backtesting: its error stays
              within 2% of a naive &ldquo;tomorrow equals today&rdquo;
              baseline, and it calls direction correctly at least 51% of
              the time. Symbols without a qualifying model show nothing
              rather than a guess.
            </p>
            <p className="text-white/35 text-xs leading-relaxed mt-2">
              Why two bars: daily closes are close to a random walk, so
              &ldquo;tomorrow equals today&rdquo; already scores about 1%
              error and is very hard to beat on error alone. Direction
              accuracy is where real skill shows up &mdash; 50% is a coin
              flip. Both raw numbers appear on every forecast below, so you
              can judge for yourself.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <SearchBar
          onSearch={setSearch}
          placeholder="Enter an NSE symbol, e.g. RELIANCE…"
          className="flex-1 min-w-[240px]"
        />
        <span className="text-xs text-white/30 flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-accent-green" />
          {available.length} model{available.length === 1 ? '' : 's'} published
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {POPULAR.map((sym) => (
          <motion.button
            key={sym}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSymbol(sym)}
            aria-pressed={symbol === sym}
            className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              symbol === sym
                ? 'bg-white text-black'
                : 'glass-effect text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {sym}
            {/* Dot marks symbols that actually have a published model */}
            {modelled.has(sym) && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green"
                title="Model available"
              />
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={symbol}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Brain size={18} className="text-accent-blue" /> {symbol}
            </h2>
            <button
              onClick={() => navigate(`/stock/${symbol}`)}
              className="text-sm text-accent-blue hover:underline"
            >
              View full details →
            </button>
          </div>
          <PredictionCard symbol={symbol} />
        </motion.div>
      </AnimatePresence>

      {/* Everything with a live model */}
      {available.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
            All published forecasts
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {available.map((p) => {
              const positive = (p.predictedChangePercent ?? 0) >= 0;
              return (
                <motion.button
                  key={p.symbol}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSymbol(p.symbol)}
                  className="glass-effect rounded-xl border border-white/10 hover:border-accent-blue/35 p-4 text-left transition-colors"
                >
                  <p className="text-sm font-bold text-white truncate">{p.symbol}</p>
                  <p
                    className={`text-lg font-bold tabular-nums mt-1 ${
                      positive ? 'text-accent-green' : 'text-accent-red'
                    }`}
                  >
                    {formatPercent(p.predictedChangePercent)}
                  </p>
                  <p className="text-[10px] text-white/25 mt-1 truncate">{p.direction}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {available.length === 0 && (
        <div className="mt-8 glass-effect rounded-2xl border border-white/10 p-5">
          <p className="text-white/45 text-sm flex items-start gap-2.5">
            <Search size={15} className="text-white/30 shrink-0 mt-0.5" />
            <span>
              No models are published yet. Run the training pipeline
              (<code className="text-accent-blue text-xs">python main.py --full</code> in{' '}
              <code className="text-accent-blue text-xs">ml-pipeline/</code>) and set{' '}
              <code className="text-accent-blue text-xs">MONGODB_URI</code> so results
              can be stored and served.
            </span>
          </p>
        </div>
      )}
    </PageLayout>
  );
};

export default Predictions;
