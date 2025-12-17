# StockPulse - Stock Market Prediction App

A modern, real-time stock market tracking application built with React, Node.js, Express, MongoDB, and Tailwind CSS.

## 🎨 Features

- **Real-time Stock Data**: Live stock prices and market updates
- **NIFTY Indices**: Track NIFTY 50, NIFTY IT, and NIFTY BANK indices
- **Interactive Charts**: Beautiful price charts with Recharts
- **Stock Search**: Search stocks by symbol or company name
- **Stock Details**: Comprehensive stock information including PE ratio, market cap, 52-week highs/lows
- **Watchlist**: Add and manage your favorite stocks
- **Modern UI**: Dark theme with green accents using Tailwind CSS
- **Responsive Design**: Works seamlessly on desktop and mobile
- **RESTful API**: Complete backend with GET, POST, PUT, DELETE operations
- **MongoDB Integration**: Persistent data storage

## 🛠️ Tech Stack

### Frontend
- **React 18**: UI library
- **Vite**: Build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Interactive charting library
- **Lucide React**: Icon library
- **React Router**: Navigation

### Backend
- **Node.js**: Runtime environment
- **Express**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: ODM for MongoDB
- **Axios**: HTTP client
- **CORS**: Cross-origin resource sharing

## 📁 Project Structure

```
stock-market-prediction/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navigation.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── StockCard.jsx
│   │   │   ├── StockChart.jsx
│   │   │   └── NiftyBanner.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   └── StockDetailsPage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── backend/
│   ├── models/
│   │   ├── Stock.js
│   │   └── Watchlist.js
│   ├── routes/
│   │   ├── stocks.js
│   │   └── watchlist.js
│   ├── controllers/
│   │   ├── stockController.js
│   │   └── watchlistController.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your MongoDB URI and API credentials:
```
MONGO_URI=mongodb://localhost:27017/stock-market
PORT=5000
INDIAN_API_KEY=your_api_key_here
INDIAN_API_BASE_URL=https://api.indianapi.com
NODE_ENV=development
```

5. Start the backend server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 📚 API Endpoints

### Stock Routes
- `GET /api/stocks` - Get all stocks (supports search query)
- `GET /api/stocks/nifty/data` - Get NIFTY indices data
- `GET /api/stocks/:symbol` - Get single stock details
- `GET /api/stocks/:symbol/live` - Get live data from API
- `POST /api/stocks` - Create/Update a stock
- `PUT /api/stocks/:symbol` - Update a stock
- `DELETE /api/stocks/:symbol` - Delete a stock

### Watchlist Routes
- `GET /api/watchlist/:userId` - Get user's watchlist
- `POST /api/watchlist/:userId` - Add stock to watchlist
- `PUT /api/watchlist/:userId/:symbol` - Remove stock from watchlist
- `DELETE /api/watchlist/:userId` - Delete entire watchlist

## 🎨 Design Features

- **Dark Theme**: Beautiful black and green color scheme
- **Glass Morphism**: Frosted glass effect on cards
- **Gradient Text**: Premium gradient effects on headers
- **Smooth Animations**: Hover effects and transitions
- **Custom Scrollbar**: Styled scrollbars matching the theme
- **Responsive Grid**: Adaptable layouts for all screen sizes

## 🔌 Indian API Integration

The application is designed to work with IndianAPI.com's stock data API. To enable live data:

1. Sign up on [indianapi.com](https://indianapi.com)
2. Get your API key
3. Update the `.env` file with your API key
4. Update the `fetchLiveData` function in `stockController.js` to use actual API calls

```javascript
const response = await axios.get(
  `${INDIAN_API_BASE_URL}stock/${symbol.toUpperCase()}`,
  {
    headers: {
      'X-API-Key': process.env.INDIAN_API_KEY,
    },
  }
);
```

## 💾 Database Schema

### Stock Model
```javascript
{
  symbol: String (unique),
  company_name: String,
  current_price: Number,
  previous_close: Number,
  opening_price: Number,
  day_high: Number,
  day_low: Number,
  volume: String,
  market_cap: String,
  pe_ratio: Number,
  change_percent: Number,
  change_amount: Number,
  fifty_two_week_high: Number,
  fifty_two_week_low: Number,
  description: String,
  price_history: Array,
  last_updated: Date
}
```

### Watchlist Model
```javascript
{
  user_id: String,
  stocks: [
    {
      symbol: String,
      company_name: String,
      added_at: Date
    }
  ]
}
```

## 🎯 Usage

### Viewing Stocks
1. Open the application and view the NIFTY indices on the home page
2. Browse featured stocks in the grid
3. Use the search bar to find specific stocks

### Stock Details
1. Click on any stock card to view detailed information
2. View interactive price charts
3. Check key metrics like PE ratio, market cap, and 52-week highs/lows
4. Add stocks to your watchlist

### Managing Watchlist
1. Click the heart icon on any stock card to add to watchlist
2. View all watchlisted stocks (feature can be extended)
3. Remove stocks from watchlist by clicking the filled heart icon

## 🔐 Environment Variables

### Backend
```
MONGO_URI - MongoDB connection string
PORT - Server port (default: 5000)
INDIAN_API_KEY - API key for indianapi.com
INDIAN_API_BASE_URL - Base URL for the API
NODE_ENV - Environment (development/production)
```

## 📦 Build for Production

### Frontend
```bash
cd frontend
npm run build
```

### Backend
Ensure all environment variables are set and MongoDB is accessible, then:
```bash
npm start
```

## 🤝 Contributing

Feel free to fork, modify, and improve this project. Some enhancement ideas:
- Real-time WebSocket updates
- User authentication
- Portfolio tracking
- Stock predictions using ML
- Advanced charting features
- Mobile app version

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running locally or update MONGO_URI with your Atlas connection string
- Check that your firewall allows MongoDB connections

### CORS Errors
- Ensure backend is running on port 5000
- Check that frontend proxy is correctly configured in vite.config.js

### API Errors
- Verify Indian API key is valid
- Check API rate limits
- Ensure correct API base URL

## 📞 Support

For issues and questions, please refer to the documentation or check the respective library documentation:
- [React Documentation](https://react.dev)
- [Express Documentation](https://expressjs.com)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)

---

**Enjoy tracking the stock market with StockPulse! 📈**
