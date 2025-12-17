# Docker Quick Reference Guide - StockPulse

Quick lookup guide for commonly used Docker and Docker Compose commands.

## Table of Contents

1. [Docker Compose Commands](#docker-compose-commands)
2. [Service Management](#service-management)
3. [Logs and Debugging](#logs-and-debugging)
4. [Image Management](#image-management)
5. [Container Inspection](#container-inspection)
6. [Network Commands](#network-commands)
7. [Volume Management](#volume-management)
8. [Build Commands](#build-commands)
9. [Environment and Configuration](#environment-and-configuration)
10. [Cleanup Commands](#cleanup-commands)

---

## Docker Compose Commands

### Basic Operations

| Command | Purpose |
|---------|---------|
| `docker-compose up` | Start services in foreground |
| `docker-compose up -d` | Start services in background |
| `docker-compose stop` | Stop running services |
| `docker-compose start` | Start stopped services |
| `docker-compose restart` | Restart all services |
| `docker-compose down` | Stop and remove containers |
| `docker-compose ps` | List containers status |

### Examples

```bash
# Start services and see logs
docker-compose up

# Start services in background
docker-compose up -d

# Stop services
docker-compose stop

# Restart a specific service
docker-compose restart backend

# Remove all containers
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

---

## Service Management

### Start/Stop Individual Services

```bash
# Start specific service
docker-compose up -d backend

# Stop specific service
docker-compose stop frontend

# Restart specific service
docker-compose restart mongodb

# Start service with dependencies
docker-compose up -d --no-deps backend
```

### Scale Services

```bash
# Run multiple instances
docker-compose up -d --scale backend=3

# Set specific replica count
docker-compose up -d --no-deps -d backend --scale backend=5
```

### Update and Rebuild

```bash
# Rebuild images before starting
docker-compose up -d --build

# Rebuild specific service
docker-compose build backend

# Rebuild without cache
docker-compose build --no-cache

# Build and restart service
docker-compose up -d --build backend
```

---

## Logs and Debugging

### View Logs

```bash
# View all logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# Follow logs for specific service
docker-compose logs -f backend

# View last N lines
docker-compose logs --tail=50

# View logs since timestamp
docker-compose logs --since 2024-01-01

# View logs with timestamps
docker-compose logs -t

# Stream logs from multiple services
docker-compose logs -f backend frontend
```

### Access Container Shell

```bash
# Execute command in container
docker-compose exec backend sh

# Execute command and exit
docker-compose exec backend npm list

# Interactive shell
docker-compose exec -it backend /bin/bash

# Run as specific user
docker-compose exec -u root backend apt-get update
```

### Run One-off Commands

```bash
# Run temporary command
docker-compose run backend npm test

# Run and remove container
docker-compose run --rm backend npm test

# Run without starting dependent services
docker-compose run --no-deps backend npm test
```

---

## Image Management

### List Images

```bash
# List all images
docker images

# List images with filter
docker images stockpulse*

# List image details
docker inspect stockpulse-backend:latest
```

### Build Images

```bash
# Build all images
docker-compose build

# Build specific image
docker-compose build backend

# Build without cache
docker-compose build --no-cache

# Build with tag
docker build -t stockpulse-backend:v1.0 ./backend

# Build and push
docker build -t myregistry/stockpulse-backend:latest ./backend
docker push myregistry/stockpulse-backend:latest
```

### Tag Images

```bash
# Tag image with new name
docker tag stockpulse-backend:latest stockpulse-backend:v1.0.0

# Tag for registry
docker tag stockpulse-backend:latest myregistry/stockpulse-backend:latest

# Tag and push
docker tag stockpulse-backend myregistry/backend:v1.0
docker push myregistry/backend:v1.0
```

### Remove Images

```bash
# Remove specific image
docker rmi stockpulse-backend:old-version

# Force remove (with running containers)
docker rmi -f stockpulse-backend:latest

# Remove unused images
docker image prune

# Remove all unused
docker image prune -a
```

---

## Container Inspection

### List Containers

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# List container IDs only
docker ps -q

# List with filter
docker ps --filter "name=backend"

# List with custom format
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Inspect Container

```bash
# View container details
docker inspect stockpulse-backend

# View specific property
docker inspect -f '{{.State.Running}}' stockpulse-backend

# View environment variables
docker inspect stockpulse-backend | grep -A 20 "Env"

# View mounted volumes
docker inspect stockpulse-backend | grep -A 5 "Mounts"

# View network information
docker inspect stockpulse-backend | grep -A 10 "NetworkSettings"
```

### Container Statistics

```bash
# View live stats
docker stats

# View stats for specific container
docker stats stockpulse-backend

# View memory usage
docker stats --no-stream

# High memory usage containers
docker stats --no-stream | sort -k4 -h
```

### Container Events

```bash
# View container events
docker events --filter container=stockpulse-backend

# View all events
docker events

# Filter by event type
docker events --filter event=start,stop
```

---

## Network Commands

### View Networks

```bash
# List all networks
docker network ls

# Inspect specific network
docker network inspect stockpulse-network

# View network containers
docker network inspect stockpulse-network | grep Containers -A 20
```

### Create Networks

```bash
# Create custom network
docker network create stockpulse-net

# Create with specific driver
docker network create --driver bridge stockpulse-net

# Create with subnet
docker network create --subnet=172.20.0.0/16 stockpulse-net
```

### Connect/Disconnect

```bash
# Connect container to network
docker network connect stockpulse-net container_id

# Disconnect container
docker network disconnect stockpulse-net container_id

# Inspect connection
docker network inspect stockpulse-net
```

### Test Connectivity

```bash
# Ping another service
docker-compose exec backend ping mongodb

# Curl another service
docker-compose exec frontend curl http://backend:5000/api

# DNS lookup
docker-compose exec backend nslookup backend

# Network diagnostics
docker-compose exec backend nc -zv mongodb 27017
```

---

## Volume Management

### List Volumes

```bash
# List all volumes
docker volume ls

# Filter volumes
docker volume ls --filter "name=mongodb"

# Inspect volume
docker volume inspect stockpulse_mongodb-data
```

### Create Volumes

```bash
# Create volume
docker volume create stockpulse-data

# Create with specific driver
docker volume create --driver local stockpulse-data

# Create with options
docker volume create --driver local --opt type=tmpfs stockpulse-temp
```

### Backup/Restore

```bash
# Backup volume
docker run --rm \
  -v stockpulse_mongodb-data:/data \
  -v $(pwd):/backup \
  ubuntu tar czf /backup/data-backup.tar.gz -C /data .

# Restore volume
docker run --rm \
  -v stockpulse_mongodb-data:/data \
  -v $(pwd):/backup \
  ubuntu bash -c "rm -rf /data/* && tar xzf /backup/data-backup.tar.gz -C /data"

# Copy from volume
docker run --rm \
  -v stockpulse_mongodb-data:/data \
  -v $(pwd):/backup \
  ubuntu cp -r /data/* /backup/
```

### Clean Up Volumes

```bash
# Remove specific volume
docker volume rm stockpulse_mongodb-data

# Remove unused volumes
docker volume prune

# Force remove
docker volume rm -f stockpulse_mongodb-data
```

---

## Build Commands

### Basic Build

```bash
# Build from Dockerfile
docker build -t stockpulse-backend:latest ./backend

# Build with specific file
docker build -f backend/Dockerfile -t stockpulse-backend:latest .

# Build with build args
docker build --build-arg NODE_ENV=production -t stockpulse-backend ./backend

# Build with no cache
docker build --no-cache -t stockpulse-backend ./backend
```

### Build with Tags

```bash
# Single tag
docker build -t stockpulse-backend:v1.0 ./backend

# Multiple tags
docker build -t stockpulse-backend:latest -t stockpulse-backend:v1.0 ./backend

# Tag for registry
docker build -t myregistry.azurecr.io/stockpulse-backend:v1.0 ./backend
```

### Build Arguments

```bash
# Pass build arguments
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  -t stockpulse-backend:v1.0 ./backend

# From file
docker build --build-arg-file args.txt -t stockpulse-backend ./backend
```

### Multi-stage Builds

```bash
# Build specific stage
docker build --target builder -t stockpulse-backend:builder ./backend

# Build final stage
docker build --target runtime -t stockpulse-backend:latest ./backend
```

---

## Environment and Configuration

### Set Environment Variables

```bash
# In docker-compose.yml
environment:
  - NODE_ENV=production
  - MONGODB_URI=mongodb://mongodb:27017

# In .env file
docker-compose --env-file .env up -d

# Command line
docker-compose -e NODE_ENV=production up -d
```

### View Environment

```bash
# View container environment
docker-compose exec backend env

# Filter specific variable
docker-compose exec backend env | grep NODE

# Check specific variable
docker inspect stockpulse-backend | grep -i "env"
```

### Configuration Files

```bash
# Copy config to container
docker cp app.config backend_container:/app/config.json

# Copy from container
docker cp backend_container:/app/config.json ./config.json

# View file in container
docker-compose exec backend cat /app/package.json
```

---

## Cleanup Commands

### Remove Stopped Containers

```bash
# Remove specific container
docker rm stockpulse-backend

# Force remove running container
docker rm -f stockpulse-backend

# Remove all stopped containers
docker container prune

# Remove with filter
docker container prune --filter "until=24h"
```

### Clean Unused Resources

```bash
# Remove unused images
docker image prune

# Remove all unused images (including tagged)
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Complete cleanup
docker system prune -a --volumes
```

### Deep Cleanup

```bash
# Remove all containers
docker container prune -f

# Remove all images
docker image prune -af

# Remove all volumes
docker volume prune -f

# Remove all networks
docker network prune -f

# Show what would be removed
docker system prune --dry-run
```

### Size Analysis

```bash
# Show disk usage
docker system df

# Show image sizes
docker images --format "{{.Repository}}\t{{.Size}}"

# Show volume sizes
du -sh /var/lib/docker/volumes/*/

# Show container sizes
docker ps -a --format "{{.Names}}\t{{.Size}}"
```

---

## Common Task Workflows

### Deploy Application

```bash
# 1. Build images
docker-compose build

# 2. Start services
docker-compose up -d

# 3. Verify
docker-compose ps

# 4. Check logs
docker-compose logs -f
```

### Update Backend

```bash
# 1. Make code changes
# 2. Rebuild image
docker-compose build backend

# 3. Restart service
docker-compose up -d --no-deps backend

# 4. Verify
curl http://localhost:5000/api
```

### Debug Issue

```bash
# 1. Check container status
docker-compose ps

# 2. View logs
docker-compose logs backend

# 3. Access shell
docker-compose exec backend sh

# 4. Check connectivity
docker-compose exec backend ping mongodb
```

### Backup Database

```bash
# 1. Start containers
docker-compose up -d

# 2. Dump database
docker-compose exec mongodb mongoexport -d stock-market -c stocks -o /tmp/stocks.json

# 3. Copy from container
docker cp stockpulse-mongodb:/tmp/stocks.json ./backup/

# 4. Verify
ls -lh ./backup/stocks.json
```

### Reset Environment

```bash
# 1. Stop containers
docker-compose down

# 2. Remove volumes (deletes data)
docker volume rm stockpulse_mongodb-data

# 3. Remove images (optional)
docker-compose rm -f

# 4. Rebuild and start fresh
docker-compose build --no-cache
docker-compose up -d
```

---

## Aliases for Faster Work

### PowerShell (Windows)

```powershell
# Add to PowerShell profile
Set-Alias -Name dcu -Value docker-compose up -d
Set-Alias -Name dcs -Value docker-compose stop
Set-Alias -Name dcl -Value docker-compose logs -f
Set-Alias -Name dcp -Value docker-compose ps
Set-Alias -Name dcb -Value docker-compose build
Set-Alias -Name dcx -Value docker-compose exec
```

### Bash/Zsh (macOS/Linux)

```bash
# Add to ~/.bashrc or ~/.zshrc
alias dcu='docker-compose up -d'
alias dcs='docker-compose stop'
alias dcl='docker-compose logs -f'
alias dcp='docker-compose ps'
alias dcb='docker-compose build'
alias dcx='docker-compose exec'
alias dcd='docker-compose down'
alias dcr='docker-compose restart'
```

---

## Emergency Commands

### Force Stop Everything

```bash
# Stop all containers
docker stop $(docker ps -q)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images
docker rmi $(docker images -q)
```

### Emergency Reset

```bash
# WARNING: This removes EVERYTHING
docker system prune -a --volumes -f

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

---

## Performance Tuning Commands

### Monitor Performance

```bash
# Real-time stats
docker stats

# Memory usage
docker stats --format "table {{.Container}}\t{{.MemUsage}}"

# Check disk usage
docker system df

# Identify large images
docker images --format "{{.Repository}}\t{{.Size}}" | sort -k2 -h
```

### Optimize Images

```bash
# List image layers
docker inspect stockpulse-backend

# View Dockerfile history
docker history stockpulse-backend:latest

# Check image size
docker images | grep stockpulse-backend

# Build with optimizations
docker build --squash -t stockpulse-backend:optimized ./backend
```

---

## Common Patterns

### Pattern 1: Build and Test

```bash
docker-compose build
docker-compose up -d
docker-compose exec backend npm test
docker-compose down
```

### Pattern 2: Deploy New Version

```bash
docker-compose build
docker tag stockpulse-backend myregistry/stockpulse-backend:v1.1
docker push myregistry/stockpulse-backend:v1.1
docker-compose down
docker-compose up -d
```

### Pattern 3: Development Workflow

```bash
# Start services
docker-compose up -d

# Make code changes

# Rebuild affected service
docker-compose build frontend

# Restart service
docker-compose up -d --no-deps frontend

# View logs
docker-compose logs -f frontend
```

### Pattern 4: Debugging

```bash
# Stop problematic service
docker-compose stop backend

# Review logs
docker-compose logs backend

# Check configuration
docker inspect stockpulse-backend

# Rebuild with verbose output
docker-compose build --verbose backend

# Restart
docker-compose up -d backend
```

---

## Help and Documentation

```bash
# Docker help
docker --help
docker-compose --help

# Specific command help
docker-compose up --help
docker run --help

# View online docs
# https://docs.docker.com/reference/cli/docker/
# https://docs.docker.com/reference/cli/docker_compose/
```

---

**Last Updated:** January 2024  
**Version:** 1.0.0  
**Quick Reference for Docker v20.10+ and Docker Compose v1.29+**
