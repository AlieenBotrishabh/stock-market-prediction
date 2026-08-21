import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import ShinyText from './ShinyText';
import { formatCompact, formatPercent } from '../utils/formatting';

// ─── Ticker ───────────────────────────────────────────────────────────────────
// Previously an eight-item hardcoded array (NIFTY 50 = 21,234.50, TCS =
// ₹3,850.50 ...) that never changed. Live index quotes are now passed in
// from HomePage; the strip is simply hidden until they arrive rather than
// showing stale invented numbers.

// ─── Nav links ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Home',          to: '/'             },
  { label: 'Trending',      to: '/trending'     },
  { label: 'Predictions',   to: '/predictions'  },
  { label: 'News',          to: '/news'         },
  { label: 'IPO',           to: '/ipo'          },
  { label: 'Mutual Funds',  to: '/mutual-funds' },
  { label: 'Commodities',   to: '/commodities'  },
  { label: 'Announcements', to: '/announcements', hasArrow: true },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const TickerItem = ({ label, value, change, up }) => (
  <span className="inline-flex items-center gap-2 px-6">
    <span className="text-white/60 text-xs font-medium">{label}</span>
    <span className="text-white text-xs font-semibold">{value}</span>
    <span className={`text-xs font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
      {change}
    </span>
    <span className="text-white/20 text-xs">|</span>
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const HeroSection = ({ indices = [] }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  // Built from live index quotes. Entries without a price are skipped so
  // the strip never renders a blank or placeholder value.
  const tickerItems = useMemo(
    () =>
      indices
        .filter((i) => i.price != null)
        .map((i) => ({
          label: i.label ?? i.symbol,
          value: formatCompact(i.price),
          change: formatPercent(i.changePercent),
          up: (i.changePercent ?? 0) >= 0,
        })),
    [indices],
  );

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black" id="hero">
      {/* ── Video Background ─────────────────────────────────────────────── */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      {/* ── Dark Overlay ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70 z-10" />

      {/* ── Content Layer ────────────────────────────────────────────────── */}
      <div className="relative z-20 flex flex-col h-full">

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 pt-6">
          {/* Logo */}
          <Link to="/" id="hero-logo" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
            <span className="text-white font-semibold text-base tracking-tight hidden sm:inline">
              StockPulse
            </span>
          </Link>

          {/* Desktop pill nav */}
          <div className="hidden lg:flex items-center gap-1 pill-nav px-3 py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                id={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white/80 hover:text-white transition-colors duration-200 rounded-full hover:bg-white/10 whitespace-nowrap"
              >
                {link.label}
                {link.hasArrow && (
                  <ArrowRight size={12} className="opacity-60" />
                )}
              </Link>
            ))}
          </div>

          {/* CTA + Mobile hamburger */}
          <div className="flex items-center gap-3">
            <Link
              to="/predictions"
              id="hero-nav-cta"
              className="hidden sm:flex items-center gap-2 text-sm text-white/80 hover:text-white border border-white/20 hover:border-white/50 px-4 py-2 rounded-full transition-all duration-200 hover:bg-white/5"
            >
              AI Predictions
            </Link>
            <button
              id="hero-hamburger"
              className="lg:hidden text-white/80 hover:text-white transition"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* ── Mobile Menu ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="relative z-30 mx-4 mt-2 rounded-2xl glass-effect py-4 px-2 lg:hidden"
            >
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                  {link.hasArrow && <ArrowRight size={12} />}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Two-column Info Row ───────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8">
          <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-0">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-white/80 text-sm max-w-xs leading-relaxed"
            >
              We deliver AI-powered market analytics that empower emerging investors
              with cutting-edge insights and vision to trade globally with confidence.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-white/80 text-sm lg:text-right"
            >
              50,000+ Investors Powered by AI !
            </motion.p>
          </div>
        </div>

        {/* ── Hero Center Content ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 -mt-8">

          {/* Eyebrow text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="uppercase tracking-[0.2em] text-white/80 text-xs sm:text-sm mb-6"
          >
            AI Market Predictions Now Live
          </motion.p>

          {/* Main heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="hero-heading mb-8"
          >
            {/* Line 1 */}
            <div className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-medium text-white leading-none">
              Predict.
            </div>
            {/* Line 2 — shiny animated */}
            <div className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-medium leading-none mt-1">
              <ShinyText
                text="Invest. Win."
                baseColor="#64CEFB"
                shineColor="#ffffff"
                speed={3}
                spread={100}
              />
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <button
              id="hero-cta-btn"
              onClick={() => navigate('/predictions')}
              className="group flex items-center gap-2 bg-white text-black hover:bg-white/90 font-medium px-6 md:px-8 py-3 md:py-4 rounded-full transition-all duration-300 text-sm md:text-base"
            >
              Get AI Predictions
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>
          </motion.div>
        </div>

        {/* ── Market Ticker ─────────────────────────────────────────────── */}
        {tickerItems.length > 0 && (
        <div className="relative z-20 border-t border-white/10 bg-black/40 backdrop-blur-sm py-3">
          <div className="ticker-wrap">
            <div className="ticker-track">
              {/* Duplicated so the marquee loops seamlessly */}
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <TickerItem key={i} {...item} />
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
