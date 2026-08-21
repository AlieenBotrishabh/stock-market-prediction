import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, TrendingUp, Newspaper, DollarSign, Briefcase, Bell, Zap, Home, Coins } from 'lucide-react';
import ShinyText from './ShinyText';
import Footer from './Footer';

const NAV_LINKS = [
  { to: '/',              icon: Home,       label: 'Home'          },
  { to: '/trending',      icon: TrendingUp, label: 'Trending'      },
  { to: '/predictions',   icon: Zap,        label: 'Predictions'   },
  { to: '/news',          icon: Newspaper,  label: 'News'          },
  { to: '/ipo',           icon: DollarSign, label: 'IPO'           },
  { to: '/mutual-funds',  icon: Briefcase,  label: 'Mutual Funds'  },
  { to: '/announcements', icon: Bell,       label: 'Announcements' },
  { to: '/commodities',   icon: Coins,      label: 'Commodities'   },
];

/**
 * PageLayout — wraps every inner page with the consistent dark-themed header + footer.
 *
 * Props:
 *   children     — page body content
 *   title        — white portion of the page heading  (e.g. "Market")
 *   accent       — gradient portion                   (e.g. "Intelligence")
 *   subtitle     — subheading text
 *   headerRight  — optional JSX rendered to the right of the heading
 *   maxWidth     — optional max-width class (default "max-w-7xl")
 */
const PageLayout = ({
  children,
  title,
  accent,
  subtitle,
  headerRight,
  maxWidth = 'max-w-7xl',
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate  = useNavigate();

  return (
    <div className="page-bg min-h-screen flex flex-col">

      {/* ── Sticky Top Bar ──────────────────────────────────────────────── */}
      <header className="glass-effect border-b border-white/10 sticky top-0 z-50" id="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" id="page-logo" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-white" />
              </div>
              <span className="text-white font-semibold text-base tracking-tight hidden sm:block">
                Stock<ShinyText text="Pulse" baseColor="#64CEFB" shineColor="#ffffff" speed={4} />
              </span>
            </Link>

            {/* Desktop pill nav */}
            <nav className="hidden lg:flex items-center gap-0.5 pill-nav px-3 py-2">
              {NAV_LINKS.map(({ to, label }) => {
                const isActive = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    id={`hdr-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-white/15 text-white font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* CTA + hamburger */}
            <div className="flex items-center gap-3">
              <button
                id="hdr-ai-cta"
                onClick={() => navigate('/predictions')}
                className="hidden sm:flex items-center gap-1.5 text-sm text-white/70 hover:text-white border border-white/20 hover:border-accent-blue px-4 py-1.5 rounded-full transition-all duration-200"
              >
                <Zap size={13} />
                AI Predict
              </button>
              <button
                id="hdr-hamburger"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden text-white/70 hover:text-white transition"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="lg:hidden overflow-hidden pb-4"
              >
                <div className="space-y-1 pt-2">
                  {NAV_LINKS.map(({ to, icon: Icon, label }) => {
                    const isActive = location.pathname === to;
                    return (
                      <Link
                        key={to}
                        to={to}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/8'
                        }`}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Icon size={16} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Page Body ────────────────────────────────────────────────────── */}
      <main className="flex-1">
        <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-12`}>

          {/* Page header (title + optional right slot) */}
          {(title || accent) && (
            <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {title}{' '}
                  {accent && (
                    <span className="gradient-text">{accent}</span>
                  )}
                </h1>
                {subtitle && (
                  <p className="text-white/50 text-base max-w-2xl">{subtitle}</p>
                )}
              </div>
              {headerRight && (
                <div className="flex-shrink-0">{headerRight}</div>
              )}
            </div>
          )}

          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PageLayout;
