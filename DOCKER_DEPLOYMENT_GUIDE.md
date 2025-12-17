# Docker Deployment Guide - StockPulse

A comprehensive guide for deploying the Stock Market Prediction application using Docker. This guide covers building Docker images, running containers, managing services, and troubleshooting.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Building Docker Images](#building-docker-images)
6. [Running Services](#running-services)
7. [Managing Services](#managing-services)
8. [Environment Configuration](#environment-configuration)
9. [Networking](#networking)
10. [Data Persistence](#data-persistence)
11. [Logs and Debugging](#logs-and-debugging)
12. [Production Best Practices](#production-best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Docker**: Version 20.10 or later
  - [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
  - [Docker Desktop for macOS](https://www.docker.com/products/docker-desktop)
  - [Docker Engine for Linux](https://docs.docker.com/engine/install/)

- **Docker Compose**: Version 1.29.2 or later (included with Docker Desktop)

- **Git**: For cloning the repository
  - [Git for Windows](https://git-scm.com/download/win)
  - [Homebrew for macOS](https://brew.sh/)

### System Requirements

- **Disk Space**: Minimum 5GB free space
- **RAM**: Minimum 4GB (8GB recommended)
- **CPU**: Multi-core processor recommended
- **Network**: Ports 3000, 5000, 27017 must be available

### Verify Installation

```bash
# Check Docker
docker --version
# Output: Docker version 20.10.x, build xxxxxxxxx

# Check Docker Compose
docker-compose --version
# Output: Docker Compose version 1.29.x, build xxxxxxxxx

# Test Docker
docker run hello-world
```

---

## Architecture Overview

### Service Architecture

```
┌─────────────────────────────────────────────────────┐
│           Docker Compose Network                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  Frontend Container (Nginx)                  │   │
│  │  - Port: 3000                                │   │
│  │  - Image: stockpulse-frontend:latest         │   │
│  │  - Built from: frontend/Dockerfile           │   │
│  │  - Depends on: backend                       │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                              │
│  ┌──────────────────────────────────────────────┐   │
│  │  Backend Container (Node.js)                 │   │
│  │  - Port: 5000                                │   │
│  │  - Image: stockpulse-backend:latest          │   │
│  │  - Built from: backend/Dockerfile            │   │
│  │  - Depends on: mongodb                       │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                              │
│  ┌──────────────────────────────────────────────┐   │
│  │  MongoDB Container                           │   │
│  │  - Port: 27017                               │   │
│  │  - Image: mongo:6.0                          │   │
│  │  - Persists: /data/db volume                 │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Service Dependencies

- **Frontend** depends on **Backend** (health check)
- **Backend** depends on **MongoDB** (health check)
- All services connected through Docker network `stockpulse-network`

### File Structure

```
project-root/
├── docker-compose.yml          # Service orchestration
├── deploy.sh                   # Bash deployment script
├── deploy.bat                  # Windows deployment script
├── DOCKER_DEPLOYMENT_GUIDE.md  # This file
├── DOCKER_QUICK_REFERENCE.md   # Quick command reference
│
├── frontend/
│   ├── Dockerfile              # Frontend build instructions
│   ├── nginx.conf              # Nginx server config
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│
├── backend/
│   ├── Dockerfile              # Backend build instructions
│   ├── package.json
│   ├── server.js
│   └── src/
│
└── mongodb/
    └── (data persisted in Docker volume)
```

---

## Quick Start

### For Beginners

1. **Clone Repository** (if not already done)
   ```bash
   git clone <repository-url>
   cd stock-market-prediction
   ```

2. **Run Deployment Script**
   
   **Windows:**
   ```bash
   deploy.bat
   # Select option 7 (Full deployment)
   ```
   
   **macOS/Linux:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   # Select option 7 (Full deployment)
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - MongoDB: localhost:27017

4. **View Logs**
   ```bash
   docker-compose logs -f
   ```

### For Experienced Docker Users

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Verify
docker-compose ps

# Access
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5000
```

---

## Detailed Setup

### Step 1: Navigate to Project Directory

```bash
cd /path/to/stock-market-prediction
```

### Step 2: Verify Docker Configuration

Ensure these files exist:

```bash
# Check docker-compose.yml
ls -la docker-compose.yml

# Check Dockerfiles
ls -la frontend/Dockerfile
ls -la backend/Dockerfile
```

### Step 3: Review docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: stockpulse-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    networks:
      - stockpulse-network

  backend:
    build: ./backend
    container_name: stockpulse-backend
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/stock-market
      - NODE_ENV=production
    networks:
      - stockpulse-network

  frontend:
    build: ./frontend
    container_name: stockpulse-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - stockpulse-network

volumes:
  mongodb-data:

networks:
  stockpulse-network:
    driver: bridge
```

### Step 4: Set Environment Variables

#### Option A: Using .env file

Create a `.env` file in the project root:

```bash
# MongoDB
MONGODB_URI=mongodb://mongodb:27017/stock-market
MONGODB_USER=admin
MONGODB_PASSWORD=password123

# Node.js
NODE_ENV=production
PORT=5000

# API Keys
INDIAN_API_KEY=your_api_key_here

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
```

#### Option B: Environment Variables File

Create `backend/.env`:

```
MONGODB_URI=mongodb://mongodb:27017/stock-market
NODE_ENV=production
PORT=5000
INDIAN_API_KEY=your_api_key_here
```

### Step 5: Pre-build Cleanup (Optional)

Remove any previous builds:

```bash
# Stop running containers
docker-compose down

# Remove images
docker-compose rm -f

# Remove volumes (WARNING: Deletes database data)
docker volume rm stockpulse_mongodb-data
```

---

## Building Docker Images

### Understanding Dockerfiles

#### Frontend Dockerfile

```dockerfile
# Stage 1: Build
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

**Benefits:**
- Reduces final image size (only production code included)
- Separates build environment from runtime
- Nginx serves static files efficiently

#### Backend Dockerfile

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**Benefits:**
- Alpine Linux reduces image size
- Uses Node.js LTS version
- Efficient for production deployment

### Build All Images

```bash
# Build with no cache (recommended for first build)
docker-compose build --no-cache

# Build with cache (faster for subsequent builds)
docker-compose build
```

**Output:**
```
Building backend
[+] Building 45.3s (15/15) FINISHED
 => [backend internal] load build definition from Dockerfile
 => [backend] exporting to image
 => => naming to stockpulse-backend:latest

Building frontend
[+] Building 120.5s (18/18) FINISHED
 => [frontend internal] load build definition from Dockerfile
 => [frontend] exporting to image
 => => naming to stockpulse-frontend:latest
```

### Build Individual Images

```bash
# Build only backend
docker-compose build backend

# Build only frontend
docker-compose build frontend

# Build with specific tag
docker build -t stockpulse-backend:v1.0 ./backend
```

### Verify Images

```bash
# List all images
docker images | grep stockpulse

# Output:
# stockpulse-backend    latest    abc123def456    45 MB
# stockpulse-frontend   latest    xyz789uvw456    95 MB
```

---

## Running Services

### Start All Services

```bash
# Start in detached mode (background)
docker-compose up -d

# Start with foreground logging
docker-compose up
```

### Start Specific Service

```bash
# Start only backend
docker-compose up -d backend

# Start backend and MongoDB (without frontend)
docker-compose up -d mongodb backend
```

### Wait for Services to Initialize

MongoDB takes ~10 seconds to start. Use health checks:

```bash
# Wait for MongoDB
docker-compose exec mongodb mongo --eval "db.adminCommand('ping')"

# Wait for Backend (check API)
curl -s http://localhost:5000/api/health || echo "Backend not ready"

# Wait for all services
docker-compose ps
```

### Access Services

#### Frontend (Nginx)
```
http://localhost:3000
```

**Expected Response:**
- React application loads
- Navigation bar visible
- Stock data displays

#### Backend API
```
http://localhost:5000/api
```

**Test health endpoint:**
```bash
curl http://localhost:5000/api/health
# Response: {"status":"ok","timestamp":"2024-01-01T00:00:00Z"}
```

#### MongoDB
```bash
# Connect using MongoDB client
mongo mongodb://localhost:27017/stock-market

# Or use MongoDB Compass GUI
# Connection String: mongodb://localhost:27017
```

---

## Managing Services

### View Status

```bash
# List all containers
docker-compose ps

# Output:
# NAME                  STATUS              PORTS
# stockpulse-backend    Up 2 minutes        5000/tcp
# stockpulse-frontend   Up 2 minutes        3000/tcp
# stockpulse-mongodb    Up 3 minutes        27017/tcp
```

### Stop Services

```bash
# Stop all services (containers remain)
docker-compose stop

# Stop specific service
docker-compose stop backend

# Stop and remove containers
docker-compose down
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Restart with new build
docker-compose up -d --build
```

### Remove Services Completely

```bash
# Remove containers but keep volumes
docker-compose down

# Remove containers and volumes (WARNING: Deletes data)
docker-compose down -v

# Remove images as well
docker-compose down -v --rmi all
```

### Scale Services

```bash
# Run multiple backend instances (for load balancing)
docker-compose up -d --scale backend=3

# Note: Requires port configuration adjustment
```

---

## Environment Configuration

### Configure Backend

Create `backend/.env`:

```env
# MongoDB Connection
MONGODB_URI=mongodb://mongodb:27017/stock-market

# Server
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# API Configuration
INDIAN_API_KEY=your_key_here
API_TIMEOUT=30000

# Logging
LOG_LEVEL=info
```

### Configure Frontend

Create `frontend/.env`:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_API_TIMEOUT=30000

# Feature Flags
REACT_APP_ENABLE_ADVANCED_CHARTS=true
REACT_APP_ENABLE_REAL_TIME_DATA=true
```

### Load Environment in docker-compose.yml

```yaml
services:
  backend:
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/stock-market
      - NODE_ENV=production
      - INDIAN_API_KEY=${INDIAN_API_KEY}
```

### Using .env file

```bash
# docker-compose will automatically load .env file
docker-compose up -d

# Or explicitly specify
docker-compose --env-file .env up -d
```

---

## Networking

### Docker Network Architecture

```
Host Machine
├── Port 3000 → Docker Bridge → Frontend Container
├── Port 5000 → Docker Bridge → Backend Container
└── Port 27017 → Docker Bridge → MongoDB Container
```

### Service Discovery

Services communicate by name (DNS resolution):

```javascript
// Backend connecting to MongoDB
const mongoUri = "mongodb://mongodb:27017/stock-market";

// Frontend calling Backend (from inside Nginx)
const apiUrl = "http://backend:5000/api";
```

### Port Mapping

```yaml
# Format: "host-port:container-port"
services:
  backend:
    ports:
      - "5000:5000"  # Access backend at localhost:5000
      
  frontend:
    ports:
      - "3000:3000"  # Access frontend at localhost:3000
      
  mongodb:
    ports:
      - "27017:27017"  # Access MongoDB at localhost:27017
```

### Custom Network Configuration

```bash
# Create custom network
docker network create stockpulse-net

# Run container on custom network
docker run --network stockpulse-net --name backend stockpulse-backend

# Inspect network
docker network inspect stockpulse-net
```

### Cross-container Communication

```bash
# From frontend container, call backend
curl http://backend:5000/api

# From backend container, call MongoDB
mongo mongodb://mongodb:27017

# DNS is automatic within Docker Compose
```

---

## Data Persistence

### MongoDB Data Volume

```yaml
volumes:
  mongodb-data:
    driver: local
```

**Purpose:**
- Persists database data across container restarts
- Allows database updates to survive container removal

### Volume Management

```bash
# List all volumes
docker volume ls

# View volume details
docker volume inspect stockpulse_mongodb-data

# Clean up unused volumes
docker volume prune

# Backup MongoDB data
docker run --rm -v stockpulse_mongodb-data:/data -v $(pwd):/backup \
  mongo:6.0 mongodump -d stock-market -o /backup/dump

# Restore MongoDB data
docker run --rm -v stockpulse_mongodb-data:/data -v $(pwd):/backup \
  mongo:6.0 mongorestore --db stock-market /backup/dump/stock-market
```

### Backup and Recovery

#### Backup

```bash
# Backup MongoDB database
docker-compose exec mongodb mongoexport \
  -d stock-market \
  -c stocks \
  -o /tmp/stocks.json

# Copy to host
docker cp stockpulse-mongodb:/tmp/stocks.json ./backup/
```

#### Restore

```bash
# Copy to container
docker cp ./backup/stocks.json stockpulse-mongodb:/tmp/

# Restore to MongoDB
docker-compose exec mongodb mongoimport \
  -d stock-market \
  -c stocks \
  /tmp/stocks.json
```

---

## Logs and Debugging

### View Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100

# View logs with timestamps
docker-compose logs -t

# View logs since specific time
docker-compose logs --since 2024-01-01 backend
```

### Debug Container Issues

```bash
# Access container shell
docker-compose exec backend sh

# Execute command in container
docker-compose exec backend npm list

# Inspect container details
docker inspect stockpulse-backend

# View container events
docker events --filter container=stockpulse-backend
```

### Check Resource Usage

```bash
# View container resource stats
docker stats stockpulse-backend

# Memory usage
docker stats --no-stream | grep backend

# Check logs for errors
docker-compose logs backend | grep -i error
```

### Common Log Patterns

**Backend Starting:**
```
backend_1 | Server running on port 5000
backend_1 | Connected to MongoDB at mongodb://mongodb:27017
```

**Frontend Building:**
```
frontend_1 | npm run build
frontend_1 | > vite build
frontend_1 | ✓ 543 modules transformed.
```

**MongoDB Initializing:**
```
mongodb_1 | 2024-01-01T12:00:00.000+0000 I CONTROL  [initandlisten] MongoDB starting
mongodb_1 | 2024-01-01T12:00:00.000+0000 I CONTROL  [initandlisten] waiting for connections on port 27017
```

---

## Production Best Practices

### Security

1. **Environment Variables**
   ```bash
   # Never commit .env files
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore
   
   # Use environment-specific configurations
   .env.production
   .env.staging
   ```

2. **Image Security**
   ```bash
   # Use specific image versions (not 'latest')
   mongo:6.0
   node:18-alpine
   nginx:1.21-alpine
   
   # Scan for vulnerabilities
   docker scan stockpulse-backend
   ```

3. **Network Security**
   ```yaml
   # Use network policies
   networks:
     stockpulse-network:
       driver: bridge
       driver_opts:
         com.docker.network.bridge.name: br-stockpulse
   ```

### Performance Optimization

1. **Image Size Reduction**
   ```dockerfile
   # Use alpine images
   FROM node:18-alpine
   FROM nginx:alpine
   
   # Multi-stage builds
   FROM node:18 as builder
   ...
   FROM node:18-alpine as runtime
   ```

2. **Caching Optimization**
   ```dockerfile
   # Install dependencies before copying code
   COPY package.json .
   RUN npm install
   COPY . .
   ```

3. **Resource Limits**
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '0.5'
             memory: 512M
           reservations:
             cpus: '0.25'
             memory: 256M
   ```

### Monitoring and Logging

1. **Centralized Logging**
   ```bash
   # Send logs to external service
   docker-compose logs | tee app.log
   ```

2. **Health Checks**
   ```yaml
   services:
     backend:
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

3. **Metrics Collection**
   ```bash
   # Monitor container metrics
   docker stats --no-stream
   ```

### Update Procedures

1. **Zero-downtime Updates**
   ```bash
   # Build new image
   docker-compose build backend
   
   # Update with new container
   docker-compose up -d --no-deps --build backend
   
   # Verify
   docker-compose ps
   ```

2. **Version Management**
   ```bash
   # Tag images with versions
   docker build -t stockpulse-backend:v1.0.0 ./backend
   docker push stockpulse-backend:v1.0.0
   ```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Docker Daemon Not Running

**Error:**
```
Cannot connect to the Docker daemon. Is the docker daemon running?
```

**Solution:**
```bash
# Windows - Restart Docker Desktop
# macOS - Run: open -a Docker

# Linux
sudo systemctl start docker

# Verify
docker ps
```

#### Issue: Port Already in Use

**Error:**
```
bind: address already in use
```

**Solution:**
```bash
# Find what's using the port
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000

# Kill the process or use different port
# In docker-compose.yml, change: "3001:3000"

# Or stop conflicting container
docker-compose down
docker stop <container_id>
```

#### Issue: Services Not Communicating

**Error:**
```
Cannot connect to backend from frontend
```

**Solution:**
```bash
# Check network
docker network ls

# Verify services on same network
docker inspect stockpulse-frontend | grep Networks

# Test connectivity
docker-compose exec frontend ping backend

# Check DNS resolution
docker-compose exec frontend nslookup backend
```

#### Issue: MongoDB Connection Timeout

**Error:**
```
MongoError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
```bash
# Wait for MongoDB to start
sleep 10
docker-compose up -d

# Check MongoDB is running
docker-compose ps mongodb

# Test connection
docker-compose exec mongodb mongo --eval "db.adminCommand('ping')"

# Check logs
docker-compose logs mongodb
```

#### Issue: Out of Disk Space

**Error:**
```
no space left on device
```

**Solution:**
```bash
# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Remove images
docker image rm stockpulse-backend:old-version

# Check disk space
df -h
```

#### Issue: High Memory Usage

**Error:**
```
Container killed due to OOM
```

**Solution:**
```bash
# Check memory usage
docker stats

# Limit memory in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M

# Rebuild and restart
docker-compose up -d --build
```

#### Issue: Frontend Not Loading

**Error:**
```
Cannot GET /
```

**Solution:**
```bash
# Check frontend container
docker-compose ps frontend

# Check Nginx logs
docker-compose logs frontend

# Verify Nginx config
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Test curl
curl http://localhost:3000
```

### Debug Checklist

```bash
# 1. Verify all containers running
docker-compose ps

# 2. Check logs for errors
docker-compose logs

# 3. Verify network
docker network inspect stockpulse-network

# 4. Test connectivity
docker-compose exec backend curl http://mongodb:27017

# 5. Check resource usage
docker stats

# 6. Rebuild if needed
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 7. Check ports
netstat -tlnp | grep LISTEN

# 8. Review environment variables
docker-compose exec backend env
```

---

## Quick Reference

### Start/Stop Operations

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose stop

# Restart services
docker-compose restart

# Remove containers
docker-compose down

# Full cleanup
docker-compose down -v --rmi all
```

### Viewing Information

```bash
# List containers
docker-compose ps

# View logs
docker-compose logs -f

# Container details
docker inspect <container_name>

# Network details
docker network inspect stockpulse-network
```

### Building and Pushing

```bash
# Build images
docker-compose build

# Push to registry
docker push stockpulse-backend:latest

# Tag for registry
docker tag stockpulse-backend:latest myregistry/stockpulse-backend:v1.0.0
```

---

## Support and Additional Resources

### Docker Documentation
- [Docker Official Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)

### MongoDB
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [MongoDB Connection String](https://docs.mongodb.com/manual/reference/connection-string/)

### Node.js
- [Node.js Docker Hub](https://hub.docker.com/_/node)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

### Nginx
- [Nginx Docker Hub](https://hub.docker.com/_/nginx)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)

---

**Last Updated:** January 2024  
**Version:** 1.0.0  
**Status:** Complete and Production-Ready
