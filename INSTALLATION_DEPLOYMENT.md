# 🎓 Complete Installation & Deployment Guide

## Table of Contents
1. [Prerequisites Checklist](#prerequisites-checklist)
2. [Step-by-Step Installation](#step-by-step-installation)
3. [Verification](#verification)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Docker Deployment](#docker-deployment)
6. [Cloud Deployment](#cloud-deployment)
7. [Performance Optimization](#performance-optimization)

---

## Prerequisites Checklist

Before starting, ensure you have:

### Required Software
- [ ] **Node.js** v16+ ([Download](https://nodejs.org/))
  ```bash
  node --version  # Should be v16.0.0 or higher
  npm --version   # Should be 7.0.0 or higher
  ```

- [ ] **Git** ([Download](https://git-scm.com/))
  ```bash
  git --version
  ```

- [ ] **MongoDB** (Local or Atlas)
  - Local: [Download Community Edition](https://www.mongodb.com/try/download/community)
  - Cloud: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free tier available)

### System Requirements
- [ ] **OS**: Windows, macOS, or Linux
- [ ] **RAM**: Minimum 2GB (4GB recommended)
- [ ] **Disk Space**: 500MB for dependencies
- [ ] **Internet Connection**: Required for npm packages

### Optional but Recommended
- [ ] **VS Code** with extensions:
  - ES7+ React/Redux/React-Native snippets
  - MongoDB for VS Code
  - Tailwind CSS IntelliSense
  - Thunder Client or Postman (API testing)

---

## Step-by-Step Installation

### Step 1: Clone/Download Project

```bash
# If cloned from GitHub
git clone <repository-url>
cd stock-market-prediction

# If downloaded, extract and navigate
cd stock-market-prediction
```

### Step 2: MongoDB Setup

#### Option A: Local MongoDB (Windows)

```bash
# Verify installation
mongod --version

# Start MongoDB service (runs in background)
# Windows: Services panel → MongoDB Server → Start
# Or via terminal:
mongod
```

#### Option B: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create cluster (takes 5-10 minutes)
4. Create database user:
   - Username: your_username
   - Password: your_password
5. Whitelist IP: 0.0.0.0/0 (for development)
6. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/stock-market
   ```

### Step 3: Backend Installation

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your settings
# Windows: notepad .env
# macOS/Linux: nano .env
```

**Content of .env:**
```env
# For local MongoDB
MONGO_URI=mongodb://localhost:27017/stock-market

# OR for MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/stock-market?retryWrites=true&w=majority

# Server configuration
PORT=5000
NODE_ENV=development

# Indian API (optional)
INDIAN_API_KEY=your_api_key_here
INDIAN_API_BASE_URL=https://api.indianapi.com
```

**Test backend:**
```bash
npm run dev
```

You should see:
```
✓ MongoDB Connected
✓ Server running on http://localhost:5000
```

Press `Ctrl+C` to stop.

### Step 4: Frontend Installation

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies
npm install

# Verify installation
npm run dev
```

You should see:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

Press `Ctrl+C` to stop.

---

## Verification

### Test All Components

#### 1. MongoDB Connection
```bash
# In new terminal, test with MongoDB client
mongo
# or
mongosh

# List databases
show dbs

# Exit
exit
```

#### 2. Backend API
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Expected response:
# {"status":"Server is running","timestamp":"..."}

# Or in browser: http://localhost:5000/api/health
```

#### 3. Get All Stocks
```bash
curl http://localhost:5000/api/stocks

# Should return array of stocks
```

#### 4. Frontend
```bash
# Open browser
http://localhost:3000

# You should see:
# - Header with logo
# - Search bar
# - NIFTY indices
# - Stock cards
# - Footer
```

#### 5. End-to-End Test
1. Go to http://localhost:3000
2. Search for "TCS"
3. Click on a stock card
4. View stock details page
5. Go back
6. Toggle between Grid and Table view

### Checklist
- [ ] Backend server running
- [ ] Frontend server running
- [ ] MongoDB connected
- [ ] Health check responds
- [ ] Stocks display on home page
- [ ] Search functionality works
- [ ] Stock details page loads
- [ ] Charts render correctly

---

## Common Issues & Solutions

### Issue 1: Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID 12345 /F

# macOS/Linux
lsof -i :3000
kill -9 12345

# Or change port in vite.config.js
# server: { port: 3001 }
```

### Issue 2: MongoDB Connection Error

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:27017`

**Solutions**:

```bash
# Check if MongoDB is running
# Windows: Services > MongoDB Server
# macOS: brew services list | grep mongodb
# Linux: sudo systemctl status mongodb

# Start MongoDB
# Windows: services.msc → MongoDB Server → Start
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongodb

# Verify connection
mongosh

# Check MONGO_URI in .env
MONGO_URI=mongodb://localhost:27017/stock-market
```

### Issue 3: Module Not Found

**Error**: `Cannot find module 'react'`

**Solutions**:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be v16+

# Clear npm cache
npm cache clean --force
npm install
```

### Issue 4: CORS Errors

**Error**: `Access to XMLHttpRequest has been blocked by CORS policy`

**Solutions**:

```bash
# Check backend is running on port 5000
# Check vite.config.js proxy:

proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}
```

### Issue 5: Hot Module Replacement (HMR) Issues

**Error**: `Uncaught SyntaxError: Unexpected token '<'`

**Solutions**:

```javascript
// In vite.config.js
server: {
  hmr: {
    host: 'localhost',
    port: 3000,
  },
  middlewareMode: false,
}
```

### Issue 6: Build Failures

**Error**: `npm ERR! code LIFECYCLE`

**Solutions**:

```bash
# Clear cache
npm cache clean --force
rm -rf node_modules

# Reinstall
npm install

# Update npm
npm install -g npm@latest

# Check for syntax errors
npm run build  # Frontend
```

### Issue 7: Charts Not Rendering

**Error**: `Cannot read property 'map' of undefined`

**Solutions**:

```bash
# Ensure recharts is installed
npm list recharts

# Reinstall if missing
npm install recharts

# Check data structure in StockChart.jsx
```

---

## Docker Deployment

### Prerequisites
- Docker Desktop installed
- Docker Compose installed

### Build and Run

```bash
# From project root
docker-compose up --build

# First run takes 2-3 minutes
# Services will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# MongoDB: localhost:27017
```

### Dockerfile Details

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Rebuild images
docker-compose up --build

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

---

## Cloud Deployment

### Deploy Backend to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add MongoDB Atlas URI
heroku config:set MONGO_URI="your_atlas_uri"

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### Deploy Backend to Railway.app

1. Go to [Railway.app](https://railway.app)
2. Connect GitHub repository
3. Set environment variables:
   - MONGO_URI
   - PORT (should be auto-assigned)
   - NODE_ENV=production
4. Deploy

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts
# Set API endpoint to your deployed backend
```

### Deploy Frontend to Netlify

```bash
# Build production
cd frontend
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### Using MongoDB Atlas

1. Create cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user
3. Get connection string
4. Set in environment variables:
   ```
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/stock-market
   ```

---

## Performance Optimization

### Frontend Optimization

```javascript
// 1. Lazy loading
const HomePage = React.lazy(() => import('./pages/HomePage'));

// 2. Memoization
const StockCard = React.memo(({ stock }) => {
  return <div>{stock.symbol}</div>;
});

// 3. useCallback
const handleSearch = useCallback((term) => {
  // search logic
}, []);

// 4. useMemo
const sortedStocks = useMemo(() => {
  return stocks.sort();
}, [stocks]);
```

### Backend Optimization

```javascript
// 1. Database indexing
stockSchema.index({ symbol: 1 });
stockSchema.index({ company_name: 'text' });

// 2. Query optimization
const stocks = await Stock.find().limit(50);

// 3. Caching (Redis)
const cache = new Map();

// 4. Pagination
const stocks = await Stock.find()
  .skip((page - 1) * limit)
  .limit(limit);
```

### Build Optimization

```bash
# Frontend production build
npm run build

# Check bundle size
npm install -g webpack-bundle-analyzer

# Backend optimization
npm prune --production
```

---

## Environment Configuration Summary

### Development
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/stock-market
```

### Production
```env
NODE_ENV=production
PORT=process.env.PORT
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
```

---

## SSL/HTTPS Setup (Production)

### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com

# Configure Nginx
# Point to certificate files
```

### Self-signed Certificate (Testing)

```bash
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
```

---

## Monitoring & Logging

### Backend Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Error Tracking

- Use Sentry: https://sentry.io
- Use New Relic: https://newrelic.com
- Use Datadog: https://www.datadoghq.com

---

## Scaling Strategy

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy)
- Run multiple backend instances
- Use PM2 for process management

### Vertical Scaling
- Upgrade server resources (RAM, CPU)
- Optimize database queries
- Implement caching layer (Redis)

### Database Scaling
- Use MongoDB sharding
- Implement read replicas
- Archive old data

---

## Backup & Recovery

### MongoDB Backup

```bash
# Backup
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/stock-market"

# Restore
mongorestore dump/

# AWS S3 backup
mongodump | gzip > backup.gz
aws s3 cp backup.gz s3://your-bucket/
```

---

## Security Checklist

- [ ] Use HTTPS/SSL
- [ ] Validate all inputs
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting
- [ ] Add CORS properly
- [ ] Use helmet.js for headers
- [ ] Sanitize user inputs
- [ ] Keep dependencies updated

---

## Testing

### Backend Tests

```bash
npm install --save-dev jest supertest

# Create __tests__ folder
# Write test files
npm test
```

### Frontend Tests

```bash
npm install --save-dev vitest

# Create .test.js files
npm run test
```

---

## Troubleshooting Checklist

- [ ] Node.js version correct?
- [ ] MongoDB running?
- [ ] .env file exists?
- [ ] Ports not blocked?
- [ ] Dependencies installed?
- [ ] No syntax errors?
- [ ] API endpoints correct?
- [ ] CORS configured?
- [ ] Database connected?

---

## Final Verification

After deployment:

```bash
# Health check
curl https://your-api.com/api/health

# API test
curl https://your-api.com/api/stocks

# Frontend
Visit https://your-domain.com

# Check logs
tail -f logs/error.log
```

---

## Support Resources

- **Node.js Docs**: https://nodejs.org/docs/
- **Express Docs**: https://expressjs.com
- **MongoDB Docs**: https://docs.mongodb.com
- **React Docs**: https://react.dev
- **Deployment Guides**: https://vercel.com/docs

---

**Congratulations! Your StockPulse application is now deployed! 🎉**

For additional help, refer to:
- QUICK_START.md - Quick setup
- SETUP_GUIDE.md - Detailed setup
- API_DOCUMENTATION.md - API reference
- FEATURES_OVERVIEW.md - Feature details
