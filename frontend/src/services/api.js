import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getStocks = (search = '') => {
  return axios.get(`${API_BASE_URL}/stocks`, { params: { search } });
};

export const getStockDetails = (symbol) => {
  return axios.get(`${API_BASE_URL}/indian/details/${symbol}`);
};

export const getNiftyData = () => {
  return axios.get(`${API_BASE_URL}/stocks/nifty/data`);
};

export const createStock = (stockData) => {
  return axios.post(`${API_BASE_URL}/stocks`, stockData);
};

export const updateStock = (symbol, stockData) => {
  return axios.put(`${API_BASE_URL}/stocks/${symbol}`, stockData);
};

export const deleteStock = (symbol) => {
  return axios.delete(`${API_BASE_URL}/stocks/${symbol}`);
};

// Watchlist APIs
export const getWatchlist = (userId) => {
  return axios.get(`${API_BASE_URL}/watchlist/${userId}`);
};

export const addToWatchlist = (userId, stock) => {
  return axios.post(`${API_BASE_URL}/watchlist/${userId}`, stock);
};

export const removeFromWatchlist = (userId, symbol) => {
  return axios.put(`${API_BASE_URL}/watchlist/${userId}/${symbol}`);
};

export const deleteWatchlist = (userId) => {
  return axios.delete(`${API_BASE_URL}/watchlist/${userId}`);
};
