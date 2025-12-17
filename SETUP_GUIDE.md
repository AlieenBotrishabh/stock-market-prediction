# Project Setup & Installation Guide

## Complete Setup Instructions

This guide will help you set up the entire StockPulse application from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [MongoDB Setup](#mongodb-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Application](#running-the-application)
6. [Docker Setup (Alternative)](#docker-setup-alternative)
7. [Verification & Testing](#verification--testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you start, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **MongoDB** (local or cloud) - [Download](https://www.mongodb.com/try/download/community) or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **Git** (optional) - [Download](https://git-scm.com/)
- **VS Code** (recommended) - [Download](https://code.visualstudio.com/)

### Check Installation
```bash
node --version
npm --version
```

---

## MongoDB Setup

### Option 1: Local MongoDB

#### Windows
1. Download MongoDB Community Edition from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. MongoDB will automatically start as a service
4. Verify installation:
```bash
mongo --version
```

#### macOS (using Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu)
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### Option 2: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Create a database user
5. Whitelist your IP address
6. Copy the connection string
7. Update your backend `.env` file:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/stock-market
   ```

### Verify MongoDB Connection
```bash
# If using local MongoDB
mongo

# Or check with MongoDB Compass (GUI)
# Download from https://www.mongodb.com/products/compass
```

---

## Backend Setup

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- express
- mongoose
- dotenv
- axios
- cors
- body-parser
- nodemon (dev dependency)

### Step 3: Configure Environment Variables

Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/stock-market
# Or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/stock-market

# Server Configuration
PORT=5000
NODE_ENV=development

# Indian API Configuration (optional, for live data)
INDIAN_API_KEY=your_api_key_here
INDIAN_API_BASE_URL=https://api.indianapi.com
```

### Step 4: Verify Backend Structure
Check that the following files exist:
```
backend/
├── models/
│   ├── Stock.js
│   └── Watchlist.js
├── routes/
│   ├── stocks.js
│   └── watchlist.js
├── controllers/
│   ├── stockController.js
│   └── watchlistController.js
├── server.js
├── package.json
└── .env
```

### Step 5: Test Backend Server

Start the backend:
```bash
npm run dev
```

You should see:
```
✓ MongoDB Connected
✓ Server running on http://localhost:5000
```

Test with a health check:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "Server is running",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory
```bash
# From the root directory, or from backend directory:
cd ../frontend
# Or:
cd frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- react
- react-dom
- axios
- recharts
- lucide-react
- react-router-dom
- tailwindcss (dev)
- vite (dev)

### Step 3: Verify Frontend Structure
Check that the following files exist:
```
frontend/
├── src/
│   ├── components/
│   │   ├── Navigation.jsx
│   │   ├── SearchBar.jsx
│   │   ├── StockCard.jsx
│   │   ├── StockChart.jsx
│   │   ├── StockTable.jsx
│   │   ├── NiftyBanner.jsx
│   │   └── Footer.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   └── StockDetailsPage.jsx
│   ├── services/
│   │   └── api.js
│   ├── utils/
│   │   └── formatting.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

### Step 4: Test Frontend Server

Start the frontend:
```bash
npm run dev
```

You should see:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

Open http://localhost:3000 in your browser.

---

## Running the Application

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

---

## Docker Setup (Alternative)

If you prefer using Docker:

### Prerequisites
- Install [Docker](https://www.docker.com/products/docker-desktop)
- Install [Docker Compose](https://docs.docker.com/compose/install/)

### Step 1: Navigate to Root Directory
```bash
cd stock-market-prediction
```

### Step 2: Build and Run Containers
```bash
docker-compose up --build
```

This will:
- Start MongoDB on port 27017
- Start backend on port 5000
- Start frontend on port 3000

### Step 3: Stop Containers
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Verification & Testing

### 1. Check Backend Health
```bash
curl http://localhost:5000/api/health
```

### 2. Fetch All Stocks
```bash
curl http://localhost:5000/api/stocks
```

### 3. Fetch NIFTY Data
```bash
curl http://localhost:5000/api/stocks/nifty/data
```

### 4. Create a Stock
```bash
curl -X POST http://localhost:5000/api/stocks \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TEST",
    "company_name": "Test Company",
    "current_price": 1000,
    "change_percent": 5.25
  }'
```

### 5. Frontend Test
Open http://localhost:3000 and verify:
- [ ] Home page loads
- [ ] NIFTY data displays
- [ ] Search functionality works
- [ ] Clicking a stock shows details page
- [ ] Charts render correctly
- [ ] Grid/Table view toggles

---

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Windows - Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

#### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGO_URI in .env
- For local MongoDB:
  ```bash
  mongod --version  # Verify installation
  # Windows: Services > MongoDB Server
  # macOS: brew services list
  # Linux: sudo systemctl status mongodb
  ```

#### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### CORS Errors
- Ensure backend is running on port 5000
- Check vite.config.js proxy configuration:
  ```javascript
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  }
  ```

#### Vite Build Errors
```bash
# Clear vite cache
rm -rf .vite
npm run dev
```

#### Hot Module Replacement (HMR) Issues
Add to vite.config.js:
```javascript
export default defineConfig({
  server: {
    hmr: {
      host: 'localhost',
      port: 3000,
    },
  },
});
```

### Check npm Versions
```bash
npm list react
npm list express
npm list mongoose
```

### Reinstall Packages
```bash
# Backend
cd backend
rm package-lock.json
npm install

# Frontend
cd ../frontend
rm package-lock.json
npm install
```

---

## Environment Setup Checklist

- [ ] Node.js v16+ installed
- [ ] MongoDB installed and running
- [ ] Backend .env file created
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] MongoDB connection successful
- [ ] API endpoints respond correctly
- [ ] Frontend loads in browser

---

## Next Steps

1. **Integrate Indian API:**
   - Sign up at [indianapi.com](https://indianapi.com)
   - Get API key
   - Update .env with API key
   - Update `fetchLiveData` in `stockController.js`

2. **Add Authentication:**
   - Implement JWT
   - Create login/signup pages
   - Protect routes

3. **Enhance Features:**
   - Real-time WebSocket updates
   - Advanced charting
   - Portfolio tracking
   - Stock predictions

4. **Deployment:**
   - Deploy backend to Heroku/Railway
   - Deploy frontend to Vercel/Netlify
   - Use MongoDB Atlas for database

---

## Support

For more help:
- Check [React Documentation](https://react.dev)
- Check [Express Documentation](https://expressjs.com)
- Check [MongoDB Documentation](https://docs.mongodb.com)
- Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

**You're all set! 🎉**

The StockPulse application should now be running at http://localhost:3000
