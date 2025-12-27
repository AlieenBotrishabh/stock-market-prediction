import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import StockDetailsPage from './pages/StockDetailsPage';
import TrendingPage from './pages/TrendingPage';
import NewsPage from './pages/NewsPage';
import IpoPage from './pages/IpoPage';
import MutualFundsPage from './pages/MutualFundsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import Predictions from './pages/Predictions';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stock/:symbol" element={<StockDetailsPage />} />
        <Route path="/trending" element={<TrendingPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/ipo" element={<IpoPage />} />
        <Route path="/mutual-funds" element={<MutualFundsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/predictions" element={<Predictions />} />
      </Routes>
    </Router>
  );
}

export default App;
