# Docker Quick Start Guide

## 🚀 Quick Deploy (5 minutes)

### Prerequisites
- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- Windows PowerShell or macOS/Linux terminal

---

## 🐳 Three Docker Images

### 1️⃣ **Frontend Image** (nginx + React)
- **Base**: `node:18-alpine` (build) → `nginx:alpine` (serve)
- **Port**: 3000
- **Size**: ~50 MB
- **What it does**: Builds React app with Vite, serves static files

### 2️⃣ **Backend Image** (Node.js API)
- **Base**: `node:18-alpine`
- **Port**: 5000
- **Size**: ~200 MB
- **What it does**: Express server with 34 API endpoints

### 3️⃣ **MongoDB Image** (Database)
- **Base**: `mongo:latest` (official from Docker Hub)
- **Port**: 27017
- **Size**: ~700 MB
- **What it does**: NoSQL database with persistent storage

---

## ⚡ Quick Commands

### Windows (PowerShell)

```powershell
# Start all services (one command!)
.\docker-deploy.ps1 -Command up

# View logs
.\docker-deploy.ps1 -Command logs -Service backend

# Restart backend
.\docker-deploy.ps1 -Command restart -Service backend

# Stop everything
.\docker-deploy.ps1 -Command down

# Check health
.\docker-deploy.ps1 -Command health

# Clean up (removes all data)
.\docker-deploy.ps1 -Command clean
```

### macOS/Linux (Bash)

```bash
# Start all services
./docker-deploy.sh up

# View logs
./docker-deploy.sh logs backend

# Restart backend
./docker-deploy.sh restart backend

# Stop everything
./docker-deploy.sh down

# Check health
./docker-deploy.sh health

# Clean up
./docker-deploy.sh clean
```

### Direct Docker Compose (Any OS)

```bash
# Start all three services
docker-compose up -d

# View status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop everything
docker-compose down

# Remove all data
docker-compose down -v
```

---

## 📍 Access Points After Deploy

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| **Frontend** | http://localhost:3000 | - | - |
| **Backend API** | http://localhost:5000/api | - | - |
| **MongoDB** | localhost:27017 | root | password |

---

## 🔍 What Each Image Does

### Frontend Container
```
1. Takes React source code
2. Runs: npm install && npm run build
3. Generates optimized static files in /dist
4. Serves files via Nginx on port 3000
5. Automatically proxies /api requests to backend:5000
```

### Backend Container
```
1. Takes Node.js source code
2. Runs: npm install
3. Starts Express server on port 5000
4. Connects to MongoDB at mongodb://root:password@mongodb:27017
5. Serves 34 API endpoints:
   - 14 core endpoints (/api/stocks, /api/watchlist)
   - 20 Indian API endpoints (/api/indian/*)
```

### MongoDB Container
```
1. Runs official mongo:latest image
2. Creates admin user: root / password
3. Creates database: stock-market
4. Listens on port 27017
5. Stores data in named volume: mongodb_data
```

---

## 🐛 Troubleshooting

### "Port already in use"
```powershell
# Find process using port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or change port in docker-compose.yml
# ports:
#   - "3001:3000"  # Use 3001 instead
```

### "Connection refused" error
```bash
# Check if containers are running
docker-compose ps

# View logs to see errors
docker-compose logs -f

# Restart a service
docker-compose restart backend
```

### "Out of memory"
```bash
# Check Docker resources
docker stats

# Stop all containers
docker-compose down

# Clear cache
docker system prune -a
```

### Frontend shows "Cannot reach API"
```bash
# Check backend is running
docker-compose ps

# View backend logs
docker-compose logs backend

# Test connection from frontend container
docker exec stock-market-frontend curl http://backend:5000/api/stocks
```

---

## 🛠️ Common Tasks

### View live logs
```bash
docker-compose logs -f
```

### Open terminal in MongoDB
```bash
docker exec -it stock-market-mongodb mongosh --username root --password password
```

### Restart backend after code changes
```bash
docker-compose restart backend
```

### Rebuild images (after code changes)
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Check database data
```bash
docker exec -it stock-market-mongodb mongosh -u root -p password --authenticationDatabase admin

# In MongoDB shell:
use stock-market
db.stocks.find().pretty()
```

### View container resource usage
```bash
docker stats
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────┐
│        Your Computer                        │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │     Docker Desktop                  │  │
│  │                                     │  │
│  │  ┌──────┐  ┌──────┐  ┌──────────┐  │  │
│  │  │Front │  │Back  │  │ MongoDB  │  │  │
│  │  │ :3K  │→ │ :5K  │→ │  :27K    │  │  │
│  │  │      │  │      │  │          │  │  │
│  │  └──────┘  └──────┘  └──────────┘  │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘

Access Points:
- Browser: http://localhost:3000
- API: http://localhost:5000/api
- DB: localhost:27017
```

---

## 📈 Production Deployment

### Build for production
```bash
# Create optimized images with version tags
docker build -t stock-frontend:v1.0.0 ./frontend
docker build -t stock-backend:v1.0.0 ./backend
```

### Push to Docker Hub
```bash
# Login to Docker Hub
docker login

# Tag images
docker tag stock-frontend:v1.0.0 yourusername/stock-frontend:v1.0.0
docker tag stock-backend:v1.0.0 yourusername/stock-backend:v1.0.0

# Push images
docker push yourusername/stock-frontend:v1.0.0
docker push yourusername/stock-backend:v1.0.0
```

### Deploy on cloud (example with Railway.app)
```bash
# 1. Push code to GitHub
git push origin master

# 2. Connect GitHub to Railway
# 3. Deploy with Railway CLI
railway link
railway up
```

---

## 🎯 Next Steps

1. **Start services**: `.\docker-deploy.ps1 -Command up` (or `./docker-deploy.sh up`)
2. **Visit frontend**: Open browser to `http://localhost:3000`
3. **Check logs**: `docker-compose logs -f`
4. **View data**: Visit MongoDB UI or use shell
5. **Stop services**: `docker-compose down`

---

## 📚 More Information

- Full deployment guide: See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
- Setup instructions: See [SETUP_GUIDE.md](SETUP_GUIDE.md)
- API documentation: See [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

**Status**: ✅ Production Ready
**Last Updated**: December 17, 2025
