# Production Deployment Guide - StockPulse

Complete guide for deploying the Stock Market Prediction application to production environments. Covers cloud deployment, security hardening, scaling, monitoring, and disaster recovery.

## Table of Contents

1. [Pre-Production Checklist](#pre-production-checklist)
2. [Environment Preparation](#environment-preparation)
3. [Cloud Deployment Options](#cloud-deployment-options)
4. [Security Hardening](#security-hardening)
5. [Performance Optimization](#performance-optimization)
6. [Scaling and Load Balancing](#scaling-and-load-balancing)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
9. [Database Management](#database-management)
10. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
11. [Troubleshooting Production Issues](#troubleshooting-production-issues)
12. [Maintenance Procedures](#maintenance-procedures)

---

## Pre-Production Checklist

### Code Quality

- [ ] All tests passing (`npm test`)
- [ ] No console logs or debug code remaining
- [ ] Code reviewed and approved
- [ ] Dependencies updated and audited (`npm audit`)
- [ ] No security vulnerabilities in dependencies
- [ ] TypeScript types validated (if applicable)
- [ ] Error handling implemented for all API endpoints
- [ ] Environment-specific code removed/separated

### Configuration

- [ ] Environment variables documented in `.env.example`
- [ ] All secrets in environment variables (never hardcoded)
- [ ] Database connection strings verified
- [ ] API endpoints tested and working
- [ ] CORS configuration verified
- [ ] Rate limiting configured
- [ ] SSL/TLS certificates ready

### Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Load testing completed
- [ ] Security testing completed
- [ ] API endpoint testing completed
- [ ] Frontend accessibility testing done
- [ ] Browser compatibility verified

### Documentation

- [ ] API documentation complete
- [ ] Deployment guide updated
- [ ] Troubleshooting guide complete
- [ ] Architecture documentation updated
- [ ] Database schema documented
- [ ] Configuration guide created

### Infrastructure

- [ ] Server/cloud resources provisioned
- [ ] Network security configured
- [ ] Firewall rules set
- [ ] DNS records configured
- [ ] SSL/TLS certificates installed
- [ ] Backup solution configured
- [ ] Monitoring tools configured

---

## Environment Preparation

### Create Production Environment File

Create `.env.production`:

```env
# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/stock-market?retryWrites=true&w=majority
MONGODB_BACKUP_URI=mongodb+srv://backup-user:password@backup-cluster.mongodb.net/stock-market

# Server
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
LOG_LEVEL=info

# Frontend
REACT_APP_API_URL=https://api.stockpulse.com
REACT_APP_API_TIMEOUT=30000
REACT_APP_ENV=production

# Security
JWT_SECRET=your-very-long-secret-key-change-this
JWT_EXPIRY=7d
BCRYPT_ROUNDS=12

# API Keys
INDIAN_API_KEY=your_api_key_here
REDIS_URL=redis://cache-server:6379

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@stockpulse.com
SMTP_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=https://your-key@sentry.io/project-id
NEW_RELIC_KEY=your-new-relic-key

# CDN
CDN_URL=https://cdn.stockpulse.com

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15
```

### Create Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: stock-market-mongodb-prod
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${DB_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${DB_PASSWORD}
      MONGO_INITDB_DATABASE: stock-market
    volumes:
      - mongodb_prod_data:/data/db
      - mongodb_prod_backup:/backup
    networks:
      - stock-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 40s

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: stock-market-api-prod
    restart: always
    ports:
      - "5000:5000"
    environment:
      MONGO_URI: mongodb://${DB_USER}:${DB_PASSWORD}@mongodb:27017/stock-market
      NODE_ENV: production
      PORT: 5000
      LOG_LEVEL: info
      SENTRY_DSN: ${SENTRY_DSN}
    depends_on:
      mongodb:
        condition: service_healthy
    volumes:
      - ./backend/logs:/app/logs
    networks:
      - stock-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: stock-market-frontend-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    environment:
      REACT_APP_API_URL: https://api.stockpulse.com
      REACT_APP_ENV: production
    depends_on:
      - backend
    volumes:
      - ./frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - frontend_cache:/var/cache/nginx
    networks:
      - stock-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: stock-market-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - stock-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  mongodb_prod_data:
  mongodb_prod_backup:
  redis_data:
  frontend_cache:

networks:
  stock-network:
    driver: bridge
```

### Database Setup

Create initial database user:

```javascript
// init-mongo.js
db.createUser({
  user: "app_user",
  pwd: "strong-password-here",
  roles: ["readWrite", "dbAdmin"]
});

db.stocks.createIndex({ "symbol": 1 });
db.stocks.createIndex({ "date": -1 });
db.watchlist.createIndex({ "userId": 1 });
```

---

## Cloud Deployment Options

### AWS ECS (Recommended)

#### Prerequisites

```bash
# Install AWS CLI
aws --version

# Configure credentials
aws configure
```

#### Deployment Steps

1. **Create ECR Repositories**

```bash
# Backend repository
aws ecr create-repository --repository-name stock-market-backend --region us-east-1

# Frontend repository
aws ecr create-repository --repository-name stock-market-frontend --region us-east-1
```

2. **Build and Push Images**

```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
docker build -t stock-market-backend:latest ./backend
docker tag stock-market-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/stock-market-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/stock-market-backend:latest

# Build and push frontend
docker build -t stock-market-frontend:latest ./frontend
docker tag stock-market-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/stock-market-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/stock-market-frontend:latest
```

3. **Create ECS Cluster**

```bash
aws ecs create-cluster --cluster-name stock-market-prod

aws ecs create-service \
  --cluster stock-market-prod \
  --service-name stock-market-backend \
  --task-definition stock-market-backend:1 \
  --desired-count 2
```

### Google Cloud Run

#### Deployment

```bash
# Build and push to Google Container Registry
docker build -t gcr.io/$PROJECT_ID/stock-market-backend ./backend
docker push gcr.io/$PROJECT_ID/stock-market-backend

# Deploy to Cloud Run
gcloud run deploy stock-market-backend \
  --image gcr.io/$PROJECT_ID/stock-market-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MONGO_URI=$MONGO_URI,NODE_ENV=production
```

### DigitalOcean App Platform

#### Deployment via Docker Compose

```bash
# Create app.yaml
doctl apps create --spec app.yaml

# Or deploy via GitHub integration
# Connect repository to App Platform
# Set environment variables
# Deploy automatically on push
```

### Kubernetes Deployment

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stock-market-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: stock-market-backend
  template:
    metadata:
      labels:
        app: stock-market-backend
    spec:
      containers:
      - name: backend
        image: stock-market-backend:1.0.0
        ports:
        - containerPort: 5000
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mongo-uri
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: stock-market-backend-service
spec:
  selector:
    app: stock-market-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: LoadBalancer
```

---

## Security Hardening

### Docker Security

```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Final stage with non-root user
FROM node:18-alpine

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 5000

CMD ["node", "server.js"]
```

### Network Security

```yaml
# In docker-compose.prod.yml
services:
  backend:
    networks:
      - stock-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### Environment Variable Security

```bash
# Use secrets management
# Docker Swarm secrets
echo "your-secret-value" | docker secret create app_jwt_secret -

# Or Kubernetes secrets
kubectl create secret generic app-secrets \
  --from-literal=mongo-uri=$MONGO_URI \
  --from-literal=jwt-secret=$JWT_SECRET
```

### SSL/TLS Configuration

Create `nginx-ssl.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name api.stockpulse.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.stockpulse.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Performance Optimization

### Caching Strategy

```javascript
// backend/middleware/caching.js
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

app.get('/api/stocks/:id', async (req, res) => {
  const cacheKey = `stock:${req.params.id}`;
  
  // Check cache
  const cached = await client.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  
  // Fetch and cache
  const stock = await Stock.findById(req.params.id);
  await client.setEx(cacheKey, 3600, JSON.stringify(stock)); // 1 hour
  
  res.json(stock);
});
```

### Image Optimization

```dockerfile
# Multi-stage build for frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Enable gzip compression
RUN sed -i 's/# gzip/gzip/' /etc/nginx/nginx.conf
```

### Database Optimization

```javascript
// Create indexes
db.stocks.createIndex({ symbol: 1, date: -1 });
db.stocks.createIndex({ sector: 1 });
db.watchlist.createIndex({ userId: 1, createdAt: -1 });

// Use aggregation pipeline for complex queries
db.stocks.aggregate([
  { $match: { sector: "Technology" } },
  { $group: { _id: "$sector", avgPrice: { $avg: "$price" } } }
]);
```

---

## Scaling and Load Balancing

### Horizontal Scaling

```bash
# Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.prod.yml stock-market

# Scale backend service
docker service scale stock-market_backend=5

# Scale frontend service
docker service scale stock-market_frontend=3
```

### Load Balancer Configuration (Nginx)

```nginx
upstream backend {
    least_conn;
    server backend-1:5000 max_fails=3 fail_timeout=30s;
    server backend-2:5000 max_fails=3 fail_timeout=30s;
    server backend-3:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
    }
}
```

---

## Monitoring and Logging

### Setup Sentry for Error Tracking

```javascript
// backend/config/sentry.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Setup Prometheus for Metrics

```javascript
// backend/middleware/metrics.js
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path, res.statusCode)
      .observe(duration);
  });
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### Docker Logging

```bash
# Configure Docker to use json-file driver with rotation
docker run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  stock-market-backend
```

---

## Backup and Disaster Recovery

### MongoDB Backup Strategy

```bash
# Full backup
mongodump --uri="mongodb://user:pass@localhost:27017/stock-market" --out=/backups/monthly

# Scheduled backup (cron)
# 0 2 * * * mongodump --uri="mongodb://user:pass@localhost:27017/stock-market" --out=/backups/daily/$(date +\%Y-\%m-\%d)

# Restore
mongorestore --uri="mongodb://user:pass@localhost:27017" /backups/daily/2024-01-01
```

### Docker Volume Backup

```bash
# Backup MongoDB volume
docker run --rm \
  -v stock-market-prediction_mongodb_data:/data \
  -v /backup:/backup \
  alpine tar czf /backup/mongo-backup.tar.gz -C /data .

# Restore MongoDB volume
docker run --rm \
  -v stock-market-prediction_mongodb_data:/data \
  -v /backup:/backup \
  alpine tar xzf /backup/mongo-backup.tar.gz -C /data
```

### Disaster Recovery Plan

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** 1 hour

| Component | Backup Method | Frequency | Storage |
|-----------|---------------|-----------|---------|
| MongoDB | mongodump | Daily | AWS S3 |
| Application Code | Git | Continuous | GitHub |
| Docker Images | Registry | Per release | ECR |
| Configuration | Git-ops | Continuous | Git |

---

## Database Management

### Database Migrations

```bash
# Create migration
npm run migrate:create -- create_stocks_table

# Run migrations
npm run migrate:up

# Rollback
npm run migrate:down
```

### Connection Pooling

```javascript
// backend/config/mongodb.js
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
});
```

---

## CI/CD Pipeline Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker images
        run: |
          docker build -t stock-market-backend:${{ github.sha }} ./backend
          docker build -t stock-market-frontend:${{ github.sha }} ./frontend
      
      - name: Push to ECR
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}
          docker tag stock-market-backend:${{ github.sha }} ${{ secrets.ECR_REGISTRY }}/stock-market-backend:latest
          docker push ${{ secrets.ECR_REGISTRY }}/stock-market-backend:latest
      
      - name: Deploy to ECS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws ecs update-service --cluster stock-market-prod --service stock-market-backend --force-new-deployment
```

### Docker Hub Auto-build

1. Connect GitHub repository to Docker Hub
2. Set build rules:
   - Source: `main` → Tag: `latest`
   - Source: `refs/tags/v*` → Tag: `{sourceref}`

---

## Troubleshooting Production Issues

### Health Check Failures

```bash
# Check service logs
docker-compose logs backend

# Check health status
docker ps --format "table {{.Names}}\t{{.Status}}"

# Manual health check
curl -f http://localhost:5000/api/health || echo "Unhealthy"
```

### High CPU Usage

```bash
# Monitor resource usage
docker stats

# Check for memory leaks
docker top stock-market-api

# Analyze performance
npm install clinic
clinic doctor -- node server.js
```

### Database Connection Issues

```bash
# Test MongoDB connection
docker-compose exec backend npm run test:db

# Check connection pool
docker-compose exec backend sh -c 'echo "db.adminCommand(\"connPoolStats\")" | mongo $MONGO_URI'

# Restart database
docker-compose restart mongodb
```

---

## Maintenance Procedures

### Regular Maintenance Schedule

| Task | Frequency | Duration |
|------|-----------|----------|
| Database backup | Daily | 30 min |
| Security updates | Weekly | 2 hours |
| Certificate renewal | Quarterly | 15 min |
| Full system backup | Monthly | 1 hour |
| Load testing | Quarterly | 3 hours |

### Database Maintenance

```bash
# Compact database
docker-compose exec mongodb mongo $MONGO_URI --eval "db.repairDatabase()"

# Rebuild indexes
docker-compose exec mongodb mongo $MONGO_URI --eval "db.stocks.reIndex()"

# Analyze disk usage
docker-compose exec mongodb mongo $MONGO_URI --eval "db.stats()"
```

### Update Procedures

```bash
# Update base images
docker pull mongo:latest
docker pull node:18-alpine
docker pull nginx:latest

# Rebuild with new images
docker-compose build --no-cache

# Deploy new version
docker-compose up -d --no-deps --build

# Verify deployment
docker-compose ps
```

### Rollback Procedure

```bash
# If issues occur, rollback to previous version
docker-compose down
git checkout previous-tag
docker-compose build
docker-compose up -d

# Verify
docker-compose logs -f
```

---

## Production Deployment Checklist

- [ ] Pre-production testing completed
- [ ] Security hardening implemented
- [ ] SSL/TLS certificates installed
- [ ] Database backups configured
- [ ] Monitoring and logging setup
- [ ] Error tracking enabled (Sentry)
- [ ] Performance metrics configured (Prometheus)
- [ ] CI/CD pipeline tested
- [ ] Load balancer configured
- [ ] Secrets management implemented
- [ ] Disaster recovery plan documented
- [ ] Team trained on deployment procedures
- [ ] Incident response plan ready
- [ ] Documentation complete and accessible
- [ ] Runbooks created for common issues
- [ ] Database maintenance schedule set
- [ ] Update procedures documented
- [ ] Rollback procedures tested
- [ ] Performance baselines recorded
- [ ] Cost analysis completed

---

**Last Updated:** January 2024  
**Version:** 1.0.0  
**Status:** Production-Ready  
**Maintainer:** DevOps Team
