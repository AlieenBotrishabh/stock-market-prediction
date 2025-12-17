# StockPulse - Quick Start Guide

## Installation & Setup (5 minutes)

### Step 1: MongoDB Setup
If you don't have MongoDB:
- Download from [mongodb.com](https://www.mongodb.com/try/download/community)
- Or use MongoDB Atlas cloud: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

### Step 2: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add MongoDB URI
# MONGO_URI=mongodb://localhost:27017/stock-market

# Start backend server
npm run dev
```

### Step 3: Frontend Setup (new terminal)

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Start frontend development server
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## Features Overview

### Home Page
- NIFTY 50, NIFTY IT, NIFTY BANK indices
- 8 featured stocks with real-time data
- Search functionality
- Market statistics

### Stock Details Page
- Interactive price chart
- Key metrics (PE Ratio, Volume, Market Cap)
- 52-week highs and lows
- Add to watchlist feature

### Color Scheme
- **Background**: Dark blue-black (#0a0e27, #1a1f3a)
- **Accent**: Green (#00d084, #00f5a0)
- **Text**: White and light gray

## Mock Data Included

The application comes with 8 mock stocks:
- TCS (Tata Consultancy Services)
- INFY (Infosys)
- HDFC (HDFC Bank)
- RELIANCE (Reliance Industries)
- ICICIBANK (ICICI Bank)
- WIPRO (Wipro)
- LT (Larsen & Toubro)
- BAJAJFINSV (Bajaj Finserv)

## API Integration (Indian API)

To connect with live data from indianapi.com:

1. Sign up at [indianapi.com](https://indianapi.com)
2. Get your API key
3. Update backend `.env` file:
   ```
   INDIAN_API_KEY=your_key_here
   ```
4. Uncomment the actual API call in `controllers/stockController.js`

## Key Endpoints

**GET** `/api/stocks` - List all stocks
**GET** `/api/stocks/:symbol` - Get stock details
**POST** `/api/stocks` - Create/update stock
**PUT** `/api/stocks/:symbol` - Update stock
**DELETE** `/api/stocks/:symbol` - Delete stock

**GET** `/api/watchlist/:userId` - Get watchlist
**POST** `/api/watchlist/:userId` - Add to watchlist
**DELETE** `/api/watchlist/:userId/:symbol` - Remove from watchlist

## npm Scripts

**Frontend:**
```bash
npm run dev    # Start dev server
npm run build  # Build for production
```

**Backend:**
```bash
npm start  # Start server
npm run dev # Start with nodemon
```

## File Structure

```
frontend/src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── services/       # API services
└── index.css       # Tailwind CSS

backend/
├── models/         # Database schemas
├── routes/         # API routes
├── controllers/    # Business logic
└── server.js       # Express setup
```

## Customization

### Change Colors
Edit `frontend/tailwind.config.js`:
```javascript
colors: {
  'primary-dark': '#your-color',
  'accent-green': '#your-color',
}
```

### Add More Stocks
Edit `HomePage.jsx` mockStocks array with more stock data

### Modify Charts
Update chart colors and properties in `StockChart.jsx`

## Troubleshooting

**Port 3000/5000 already in use?**
```bash
# Change frontend port in vite.config.js
server: { port: 3001 }

# Change backend port in .env
PORT=5001
```

**MongoDB connection error?**
- Ensure MongoDB service is running
- Check MONGO_URI in .env
- If using Atlas, whitelist your IP

**Module not found errors?**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. Integrate real Indian API data
2. Add user authentication
3. Implement advanced charts
4. Add stock predictions
5. Create mobile app

---

**Enjoy your stock market dashboard! 🚀**
