# Docker Deployment Guide

## Overview
This project uses Docker to containerize three separate services:
1. **Frontend** - React + Vite app served via Nginx
2. **Backend** - Node.js + Express API server
3. **MongoDB** - NoSQL database

## Prerequisites
- Docker installed ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose installed (included with Docker Desktop)
- Git installed

## Project Structure
```
stock-market-prediction/
├── frontend/
│   ├── Dockerfile          # Frontend image (Node build + Nginx serve)
│   ├── nginx.conf          # Nginx reverse proxy config
│   └── src/
├── backend/
│   ├── Dockerfile          # Backend image (Node.js Alpine)
│   ├── src/
│   └── package.json
├── docker-compose.yml      # Orchestrates all three services
└── .env                    # Environment variables
```

## Three Docker Images

### 1. Frontend Image
**File**: `frontend/Dockerfile`
```dockerfile
FROM node:18-alpine as build      # Build stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine                 # Production stage
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

**Features**:
- Multi-stage build (optimized for production)
- Build React app with Vite
- Serve static files via Nginx
- Port: 3000
- Image size: ~50 MB

### 2. Backend Image
**File**: `backend/Dockerfile`
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**Features**:
- Node.js 18 Alpine (lightweight)
- Installs dependencies
- Express API server
- Port: 5000
- Image size: ~200 MB

### 3. MongoDB Image
**File**: Uses official `mongo:latest` image from Docker Hub
- Pre-built, no custom Dockerfile needed
- Includes authentication
- Port: 27017
- Data persistence with volumes

## Docker Compose Configuration

**File**: `docker-compose.yml`

Creates three interconnected services:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: stock-market-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: stock-market
    volumes:
      - mongodb_data:/data/db
    networks:
      - stock-network

  backend:
    build: ./backend
    container_name: stock-market-api
    ports:
      - "5000:5000"
    environment:
      MONGO_URI: mongodb://root:password@mongodb:27017/stock-market
      PORT: 5000
      NODE_ENV: development
    depends_on:
      - mongodb
    networks:
      - stock-network

  frontend:
    build: ./frontend
    container_name: stock-market-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - stock-network
```

## Deployment Methods

### Method 1: Docker Compose (Recommended for Development)

#### Start All Services
```bash
docker-compose up -d
```

**Output**:
```
Creating stock-market-mongodb ... done
Creating stock-market-api ... done
Creating stock-market-frontend ... done
```

#### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

#### Stop All Services
```bash
docker-compose down
```

#### Stop and Remove Volumes
```bash
docker-compose down -v
```

---

### Method 2: Build Individual Images

#### Build All Images
```bash
docker-compose build
```

#### Build Specific Image
```bash
# Frontend
docker build -t stock-frontend:latest ./frontend

# Backend
docker build -t stock-backend:latest ./backend
```

#### Check Built Images
```bash
docker images | grep stock
```

**Expected Output**:
```
stock-market-frontend   latest   abc123...   50MB
stock-market-api        latest   def456...   200MB
mongo                   latest   ghi789...   700MB
```

---

### Method 3: Run Individual Containers

#### MongoDB Container
```bash
docker run -d \
  --name stock-mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest
```

#### Backend Container (requires MongoDB running)
```bash
docker run -d \
  --name stock-api \
  -e MONGO_URI=mongodb://root:password@localhost:27017/stock-market \
  -e NODE_ENV=production \
  -p 5000:5000 \
  stock-backend:latest
```

#### Frontend Container (requires Backend running)
```bash
docker run -d \
  --name stock-frontend \
  -p 3000:3000 \
  stock-frontend:latest
```

---

## Docker Network

All containers communicate via `stock-network` bridge network:

```
┌─────────────────────────────────────────┐
│        Docker Bridge Network             │
│       (stock-network)                    │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Frontend │  │ Backend  │  │ MongoDB││
│  │ :3000    │→ │ :5000    │→ │ :27017 ││
│  │ nginx    │  │ express  │  │ mongo  ││
│  └──────────┘  └──────────┘  └────────┘│
│                                          │
└─────────────────────────────────────────┘
```

**DNS Resolution**:
- Backend accessible as: `mongodb://root:password@mongodb:27017`
- Backend accessible as: `http://backend:5000`
- Frontend accessible as: `http://frontend:3000`

---

## Environment Variables

### Frontend (.env or environment variables)
```env
VITE_API_URL=http://localhost:5000/api
```

### Backend (.env)
```env
MONGO_URI=mongodb://root:password@mongodb:27017/stock-market
PORT=5000
NODE_ENV=development
```

### MongoDB (docker-compose.yml)
```env
MONGO_INITDB_ROOT_USERNAME=root
MONGO_INITDB_ROOT_PASSWORD=password
MONGO_INITDB_DATABASE=stock-market
```

---

## Data Persistence

### MongoDB Data Volume
```yaml
volumes:
  mongodb_data:/data/db    # Docker managed volume
```

**View Volumes**:
```bash
docker volume ls | grep stock
```

**Inspect Volume**:
```bash
docker volume inspect stock-market-prediction_mongodb_data
```

---

## Production Deployment

### Build Production Images
```bash
# Frontend Production Build
docker build -t stock-frontend:v1.0.0 ./frontend

# Backend Production Build
docker build -t stock-backend:v1.0.0 ./backend
```

### Tag Images for Registry
```bash
# For Docker Hub
docker tag stock-frontend:v1.0.0 your-username/stock-frontend:v1.0.0
docker tag stock-backend:v1.0.0 your-username/stock-backend:v1.0.0

# For Custom Registry
docker tag stock-frontend:v1.0.0 registry.example.com/stock-frontend:v1.0.0
docker tag stock-backend:v1.0.0 registry.example.com/stock-backend:v1.0.0
```

### Push to Registry
```bash
# Docker Hub
docker push your-username/stock-frontend:v1.0.0
docker push your-username/stock-backend:v1.0.0

# Custom Registry
docker push registry.example.com/stock-frontend:v1.0.0
docker push registry.example.com/stock-backend:v1.0.0
```

---

## Debugging

### Check Container Status
```bash
docker ps -a
```

### View Container Logs
```bash
docker logs stock-market-api
docker logs stock-market-frontend
docker logs stock-market-mongodb
```

### Execute Commands in Container
```bash
# MongoDB
docker exec -it stock-market-mongodb mongosh --username root --password password

# Backend
docker exec -it stock-market-api npm run dev

# Frontend
docker exec -it stock-market-frontend sh
```

### Inspect Container
```bash
docker inspect stock-market-api
```

### Remove Containers
```bash
docker rm stock-market-api stock-market-frontend stock-market-mongodb
```

### Prune Unused Resources
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a
```

---

## Troubleshooting

### "Connection refused" between Backend and MongoDB
**Issue**: Backend cannot connect to MongoDB
**Solution**:
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Check MongoDB logs
docker logs stock-market-mongodb

# Verify network
docker network inspect stock-network
```

### "Address already in use"
**Issue**: Port 3000, 5000, or 27017 already in use
**Solution**:
```bash
# Change port in docker-compose.yml
# Or kill the process using the port

# On Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# On macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Frontend shows "API connection failed"
**Issue**: Frontend cannot reach backend
**Solution**:
1. Check backend is running: `docker logs stock-market-api`
2. Verify nginx config forwards requests to backend
3. Check network connectivity: `docker exec stock-market-frontend curl http://backend:5000`

### Build fails
**Issue**: Docker build fails
**Solution**:
```bash
# Clear Docker cache and rebuild
docker-compose build --no-cache

# Or remove and rebuild
docker-compose down -v
docker-compose build
```

---

## Useful Commands

```bash
# Start services in background
docker-compose up -d

# View running services
docker-compose ps

# View logs of specific service
docker-compose logs backend

# Stop specific service
docker-compose stop backend

# Restart specific service
docker-compose restart backend

# Scale service (if supported)
docker-compose up -d --scale backend=3

# Execute command in service
docker-compose exec backend npm run seed

# Clean up everything
docker-compose down -v

# Rebuild specific service
docker-compose build --no-cache frontend
```

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│                   Docker Host                          │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │     Docker Bridge Network: stock-network         │ │
│  │                                                   │ │
│  │  ┌────────────────┐  ┌────────────────┐          │ │
│  │  │  Frontend      │  │  Backend       │          │ │
│  │  │  Container     │  │  Container     │          │ │
│  │  │  (nginx)       │  │  (express)     │          │ │
│  │  │  Port: 3000    │→ │  Port: 5000    │          │ │
│  │  └────────────────┘  │  (localhost)   │          │ │
│  │         ↓            │                │          │ │
│  │    http://           │                │          │ │
│  │  localhost:3000      │                │          │ │
│  │                      │                │          │ │
│  │                      │       ↓        │          │ │
│  │                      │  ┌──────────┐  │          │ │
│  │                      │  │ MongoDB  │  │          │ │
│  │                      │→ │ Container│  │          │ │
│  │                      │  │ :27017   │  │          │ │
│  │                      │  └──────────┘  │          │ │
│  │                      │  (persistent   │          │ │
│  │                      │   volume)      │          │ │
│  │                      └────────────────┘          │ │
│  │                                                   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Volumes:                                              │
│  └─ mongodb_data (persistent database storage)        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Start services**: `docker-compose up -d`
2. **Verify deployment**: Visit `http://localhost:3000`
3. **Check logs**: `docker-compose logs -f`
4. **Monitor containers**: `docker stats`
5. **Push to registry**: Follow "Production Deployment" section
6. **Deploy to cloud**: Use Kubernetes, Docker Swarm, or cloud platforms

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Nginx Docker Documentation](https://hub.docker.com/_/nginx)
- [MongoDB Docker Documentation](https://hub.docker.com/_/mongo)

---

**Last Updated**: December 17, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
