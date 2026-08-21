import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import HomePage from './pages/HomePage';
import StockDetailsPage from './pages/StockDetailsPage';
import TrendingPage from './pages/TrendingPage';
import NewsPage from './pages/NewsPage';
import IpoPage from './pages/IpoPage';
import MutualFundsPage from './pages/MutualFundsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import CommoditiesPage from './pages/CommoditiesPage';
import Predictions from './pages/Predictions';
import './index.css';

/**
 * Routes with cross-fade transitions.
 *
 * `AnimatePresence mode="wait"` lets the outgoing page finish before the
 * next mounts, which avoids the two briefly overlapping. Movement is
 * dropped entirely under prefers-reduced-motion — the fade remains, since
 * opacity alone does not trigger motion sensitivity.
 */
const AnimatedRoutes = () => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const variants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
      };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/stock/:symbol" element={<StockDetailsPage />} />
          <Route path="/trending" element={<TrendingPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/ipo" element={<IpoPage />} />
          <Route path="/mutual-funds" element={<MutualFundsPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/commodities" element={<CommoditiesPage />} />
          <Route path="/predictions" element={<Predictions />} />
          {/* Unknown paths fall back to the overview rather than a blank screen */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
