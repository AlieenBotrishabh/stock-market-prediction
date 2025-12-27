# Vercel Deployment Guide - StockPulse

Complete step-by-step guide to deploy StockPulse to Vercel with separate frontend and backend deployments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture](#architecture)
3. [MongoDB Atlas Setup](#mongodb-atlas-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Connecting Frontend to Backend](#connecting-frontend-to-backend)
7. [Testing All Endpoints](#testing-all-endpoints)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- GitHub account (for code repository)
- Vercel account (https://vercel.com/signup)
- MongoDB Atlas account (https://www.mongodb.com/cloud/atlas)

### Required Tools
- Node.js v18+ installed
- Git installed
- Vercel CLI: `npm install -g vercel`

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Vercel Platform                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  Frontend Project (Vite + React)             │   │
│  │  - Auto-deployed from GitHub push            │   │
│  │  - Hosted at: your-app.vercel.app            │   │
│  │  - Environment: VITE_API_URL                 │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                              │
│  ┌──────────────────────────────────────────────┐   │
│  │  Backend Project (Node.js Express)           │   │
│  │  - Serverless Functions at /api/*            │   │
│  │  - Hosted at: your-api.vercel.app/api/*      │   │
│  │  - Connects to MongoDB Atlas                 │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                              │
├─────────────────────────────────────────────────────┤
│                   MongoDB Atlas                      │
│            (Cloud Database Service)                  │
│        mongodb+srv://user:pass@cluster...           │
└─────────────────────────────────────────────────────┘
```

---

## MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Cluster

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up or log in
3. Click "Create a Project"
4. Name it "stock-market-prediction"
5. Click "Create Project"

### Step 2: Create a Cluster

1. Click "Build a Cluster"
2. Select **M0 Free** tier (good for development/testing)
3. Choose your preferred cloud provider (AWS, Google Cloud, or Azure)
4. Choose region close to you
5. Click "Create Cluster"

Wait 5-10 minutes for cluster to be ready.

### Step 3: Create Database User

1. Go to "Database Access" in the left menu
2. Click "Add New Database User"
3. Set username: `stockmarket_user`
4. Set password: (use auto-generated or set a strong password)
5. Click "Add User"
6. **Save the password somewhere safe!**

### Step 4: Allow Network Access

1. Go to "Network Access" in the left menu
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (for development)
4. Click "Confirm"

### Step 5: Get Connection String

1. Go back to "Clusters"
2. Click "Connect" button
3. Select "Connect to application"
4. Copy the connection string:
   ```
   mongodb+srv://stockmarket_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Keep this handy for backend deployment

---

## Backend Deployment

### Step 1: Push Backend to GitHub

```bash
# Navigate to project root
cd c:\Users\Admin\Desktop\stock-market-prediction

# Initialize git if not already done
git init

# Add all files
git add .

# Create initial commit
git commit -m "feat: initial commit with serverless backend for Vercel"

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/stock-market-prediction.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to backend directory
cd backend

# Deploy
vercel

# Choose:
# - Scope: your account
# - Project name: stock-market-api
# - Framework: Other
# - Output directory: ./ (or just press enter)
```

#### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. **Important:** Change settings:
   - Framework: "Other"
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Output Directory: `.`
5. Click "Deploy"

### Step 3: Add Environment Variables to Backend

1. Go to your backend project on Vercel dashboard
2. Click "Settings" → "Environment Variables"
3. Add the following:
   - **Name:** `MONGODB_URI`
   - **Value:** `mongodb+srv://stockmarket_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/stock-market?retryWrites=true&w=majority`
   - **Environments:** Check all (Production, Preview, Development)
4. Click "Save"

5. Add another variable:
   - **Name:** `NODE_ENV`
   - **Value:** `production`
   - **Environments:** All

6. Redeploy: Go to "Deployments" and click "Redeploy" on the latest deployment

### Step 4: Test Backend Endpoints

Once deployed, test your backend endpoints:

```bash
# Health check
curl https://your-api.vercel.app/api/health

# Get stocks
curl https://your-api.vercel.app/api/stocks

# Get stock details
curl https://your-api.vercel.app/api/indian/details/INFY

# Get trending stocks
curl https://your-api.vercel.app/api/indian/trending

# Get news
curl https://your-api.vercel.app/api/indian/news

# Get IPO data
curl https://your-api.vercel.app/api/indian/ipo

# Get mutual funds
curl https://your-api.vercel.app/api/indian/mutual-funds

# Get announcements
curl https://your-api.vercel.app/api/indian/announcements
```

**Expected response format:**
```json
{
  "success": true,
  "data": [...]
}
```

---

## Frontend Deployment

### Step 1: Update Frontend Configuration

Update `.env.production` with your actual backend URL:

```env
VITE_API_URL=https://your-api.vercel.app/api
```

Replace `your-api` with your actual Vercel backend project name.

### Step 2: Deploy Frontend to Vercel

#### Option A: Using Vercel CLI

```bash
# Navigate to frontend directory
cd frontend

# Deploy
vercel

# Choose:
# - Scope: your account
# - Project name: stock-market-frontend
# - Framework: Vite
# - Output directory: dist
```

#### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. **Important:** Change settings:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click "Deploy"

### Step 3: Add Environment Variables to Frontend

1. Go to your frontend project on Vercel dashboard
2. Click "Settings" → "Environment Variables"
3. Add the following:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-api.vercel.app/api` (your actual backend URL)
   - **Environments:** Check "Production" and "Preview"
4. Click "Save"

### Step 4: Redeploy Frontend

1. Go to "Deployments"
2. Click the three dots menu on the latest deployment
3. Select "Redeploy"
4. Wait for deployment to complete

---

## Connecting Frontend to Backend

### Verify Configuration

The frontend should now use the backend URL from environment variables:

1. Visit your frontend: `https://your-app.vercel.app`
2. Open browser DevTools (F12)
3. Go to Network tab
4. Navigate to a page that loads data
5. Look for API requests to `https://your-api.vercel.app/api/*`

### Update API Service (if needed)

The `src/services/api.js` is already configured to use `VITE_API_URL`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

This automatically uses the production URL when deployed.

---

## Testing All Endpoints

### Frontend Pages

Test these pages in your Vercel-deployed app:

1. **Home Page** (`/`)
   - Should load NIFTY banner
   - Should display 8 stocks
   - Should have search bar

2. **Stock Details** (`/stock/:symbol`)
   - Click on any stock
   - Should load charts and details
   - Should display price, change, volume

3. **Trending** (`/trending`)
   - Should show Gainers tab
   - Should show Losers tab
   - Should show Top Traders tab

4. **News** (`/news`)
   - Should display market news
   - Should have news items with titles

5. **IPO** (`/ipo`)
   - Should display upcoming IPOs
   - Should show IPO details

6. **Mutual Funds** (`/mutual-funds`)
   - Should display mutual fund listings
   - Should have filters

7. **Announcements** (`/announcements`)
   - Should display corporate announcements
   - Should show announcement details

### API Testing

Use curl or Postman to test:

```bash
# Test health endpoint
curl https://your-api.vercel.app/api/health

# Expected response:
{
  "status": "Server is running",
  "timestamp": "2024-01-01T12:00:00Z",
  "database": "connected"
}
```

### Common Endpoints

```bash
# Stocks
GET  https://your-api.vercel.app/api/stocks
GET  https://your-api.vercel.app/api/stocks?search=INFY
POST https://your-api.vercel.app/api/stocks
PUT  https://your-api.vercel.app/api/stocks/INFY
DELETE https://your-api.vercel.app/api/stocks/INFY

# Indian APIs
GET https://your-api.vercel.app/api/indian/trending
GET https://your-api.vercel.app/api/indian/details/INFY
GET https://your-api.vercel.app/api/indian/news
GET https://your-api.vercel.app/api/indian/ipo
GET https://your-api.vercel.app/api/indian/mutual-funds
GET https://your-api.vercel.app/api/indian/announcements

# Watchlist
GET https://your-api.vercel.app/api/watchlist/user123
POST https://your-api.vercel.app/api/watchlist/user123
PUT https://your-api.vercel.app/api/watchlist/user123/INFY
DELETE https://your-api.vercel.app/api/watchlist/user123
```

---

## Troubleshooting

### Issue: 404 Errors on API Calls

**Solution:**
1. Verify backend is deployed and running:
   ```bash
   curl https://your-api.vercel.app/api/health
   ```

2. Check VITE_API_URL in frontend environment variables:
   - Should be `https://your-api.vercel.app/api` (without trailing slash)

3. Verify CORS is enabled in backend:
   - Check `vercel-app.js` for CORS configuration
   - Make sure frontend URL is in allowed origins

4. Check Vercel deployment logs:
   - Go to Vercel dashboard → Backend project → Deployments
   - Click latest deployment → Logs
   - Look for errors

### Issue: MongoDB Connection Error

**Solution:**
1. Verify MongoDB Atlas cluster is running
2. Check connection string is correct:
   ```
   mongodb+srv://user:password@cluster.mongodb.net/stock-market
   ```
3. Verify network access is enabled in MongoDB Atlas
4. Check database user exists and password is correct
5. Verify environment variable is set in Vercel

### Issue: CORS Errors

**Solution:**
1. Update CORS in `vercel-app.js`:
   ```javascript
   app.use(cors({
     origin: ['https://your-frontend-url.vercel.app', 'https://your-api.vercel.app'],
     credentials: true
   }));
   ```

2. Redeploy backend after changes

### Issue: Build Fails on Vercel

**Solution:**
1. Check build logs in Vercel dashboard
2. Verify `package.json` has correct scripts:
   ```json
   {
     "scripts": {
       "build": "vite build",
       "dev": "vite"
     }
   }
   ```

3. Ensure all dependencies are in `package.json`
4. Check Node.js version compatibility

### Issue: Frontend Can't Connect to Backend

**Solution:**
1. Open browser DevTools → Network tab
2. Look for failed API requests
3. Check the URL being called
4. Compare with VITE_API_URL in environment variables
5. Ensure backend URL doesn't have trailing slash

### Debug Mode

Enable debug logging in frontend `api.js`:

```javascript
// Add logging to axios interceptor
axios.interceptors.response.use(
  response => response,
  error => {
    console.log('API Error:', error.config.url);
    console.log('Status:', error.response?.status);
    console.log('Message:', error.message);
    return Promise.reject(error);
  }
);
```

---

## Useful Commands

### Local Testing Before Deployment

```bash
# Test backend locally
cd backend
npm install
npm start
# Visit http://localhost:5000/api/health

# Test frontend locally with production env
cd frontend
npm install
VITE_API_URL=http://localhost:5000/api npm run build
npm run preview
```

### Vercel CLI Commands

```bash
# List all projects
vercel projects ls

# Deploy specific project
vercel --prod

# View logs
vercel logs

# Environment variables
vercel env ls
vercel env add MONGODB_URI
vercel env rm MONGODB_URI
```

### MongoDB Atlas Commands

```bash
# Connect to database
mongosh "mongodb+srv://user:password@cluster.mongodb.net/stock-market"

# List all databases
show databases

# Use database
use stock-market

# List collections
show collections

# View collection data
db.stocks.find()
```

---

## Deployment Checklist

- [ ] GitHub repository created and code pushed
- [ ] MongoDB Atlas cluster created
- [ ] Database user created with password saved
- [ ] Network access configured
- [ ] Backend deployed to Vercel
- [ ] MongoDB URI added to backend environment variables
- [ ] Backend tested with curl/Postman
- [ ] Frontend .env.production updated with backend URL
- [ ] Frontend deployed to Vercel
- [ ] VITE_API_URL added to frontend environment variables
- [ ] Frontend redeployed after env changes
- [ ] All pages tested and loading data
- [ ] All API endpoints responding correctly
- [ ] No CORS errors in browser console
- [ ] No 404 errors on API calls
- [ ] Database connection working
- [ ] Production app accessible and fully functional

---

## Next Steps

### Add Real Data

```bash
# Connect to MongoDB and insert sample data
mongosh "mongodb+srv://stockmarket_user:password@cluster.mongodb.net/stock-market"

# Insert sample stocks
db.stocks.insertMany([
  { symbol: "INFY", name: "Infosys", price: 1500, change: 25, changePercent: 1.7, volume: 5000000, sector: "IT" },
  { symbol: "TCS", name: "Tata Consultancy", price: 3500, change: -50, changePercent: -1.4, volume: 3000000, sector: "IT" },
  { symbol: "WIPRO", name: "Wipro", price: 450, change: 10, changePercent: 2.3, volume: 8000000, sector: "IT" }
])
```

### Configure Custom Domain

1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

### Enable Analytics

1. In Vercel dashboard, go to "Analytics"
2. Enable Web Analytics
3. Monitor page performance and user behavior

### Setup Monitoring

1. Add Sentry for error tracking
2. Add New Relic for performance monitoring
3. Setup alerts for critical errors

---

**Last Updated:** January 2024  
**Version:** 1.0.0  
**Status:** Ready for Production Deployment
