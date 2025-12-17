#!/bin/bash

# Stock Market Prediction - Docker Deployment Script (macOS/Linux)
# This script helps you build and deploy the application using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display header
clear
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     StockPulse - Docker Deployment Script                  ║"
echo "║     (Frontend, Backend, MongoDB)                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker installation
echo -e "${YELLOW}Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo "📥 Please install Docker from: https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${GREEN}✅ Docker $(docker --version)${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose $(docker-compose --version)${NC}"
echo ""

# Menu
show_menu() {
    echo -e "${BLUE}What would you like to do?${NC}"
    echo ""
    echo "1) Build all images (frontend, backend, MongoDB)"
    echo "2) Start all services (docker-compose up)"
    echo "3) Stop all services (docker-compose down)"
    echo "4) Restart services"
    echo "5) View logs"
    echo "6) Build and start (build + up)"
    echo "7) Full deployment (build + up)"
    echo "8) Clean up (remove containers, images, volumes)"
    echo "9) List running containers"
    echo "10) View service status"
    echo "11) Open application in browser"
    echo "12) Exit"
    echo ""
    read -p "Enter your choice (1-12): " choice
}

# Function to build all images
build_images() {
    echo ""
    echo -e "${YELLOW}🔨 Building Docker images...${NC}"
    echo ""
    
    docker-compose build --no-cache
    
    echo ""
    echo -e "${GREEN}✅ Images built successfully!${NC}"
}

# Function to start services
start_services() {
    echo ""
    echo -e "${YELLOW}🚀 Starting services...${NC}"
    echo ""
    
    docker-compose up -d
    
    echo ""
    echo -e "${GREEN}✅ Services started!${NC}"
    echo ""
    echo "📍 Frontend: http://localhost:3000"
    echo "📍 Backend: http://localhost:5000"
    echo "📍 MongoDB: localhost:27017"
    echo ""
    echo "💡 Run 'docker-compose logs -f' to view logs"
}

# Function to stop services
stop_services() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    
    docker-compose down
    
    echo -e "${GREEN}✅ Services stopped!${NC}"
}

# Function to restart services
restart_services() {
    echo ""
    echo -e "${YELLOW}🔄 Restarting services...${NC}"
    
    docker-compose restart
    
    echo -e "${GREEN}✅ Services restarted!${NC}"
}

# Function to view logs
view_logs() {
    echo ""
    echo -e "${YELLOW}📋 Displaying logs (Ctrl+C to exit)...${NC}"
    echo ""
    
    docker-compose logs -f
}

# Function to build and start
build_and_start() {
    build_images
    start_services
}

# Function to full deployment
full_deployment() {
    echo ""
    echo -e "${YELLOW}🚀 Starting full deployment...${NC}"
    
    build_images
    start_services
    
    echo ""
    echo -e "${GREEN}✅ Full deployment complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Wait 10-15 seconds for MongoDB to initialize"
    echo "2. Open http://localhost:3000 in your browser"
    echo "3. Backend API available at http://localhost:5000/api"
}

# Function to list containers
list_containers() {
    echo ""
    echo -e "${YELLOW}📦 Running containers:${NC}"
    echo ""
    docker ps
}

# Function to view status
view_status() {
    echo ""
    echo -e "${YELLOW}📊 Service Status:${NC}"
    echo ""
    
    echo "Frontend Container:"
    docker-compose ps stockpulse-frontend || echo "  Not running"
    
    echo ""
    echo "Backend Container:"
    docker-compose ps stockpulse-backend || echo "  Not running"
    
    echo ""
    echo "MongoDB Container:"
    docker-compose ps stockpulse-mongodb || echo "  Not running"
}

# Function to clean up
cleanup() {
    echo ""
    echo -e "${RED}⚠️  This will remove all containers, images, and volumes!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        echo ""
        echo -e "${YELLOW}🧹 Cleaning up...${NC}"
        
        docker-compose down -v
        
        echo -e "${GREEN}✅ Cleanup complete!${NC}"
    else
        echo "Cleanup cancelled"
    fi
}

# Function to open in browser
open_browser() {
    echo ""
    echo -e "${YELLOW}🌐 Opening application...${NC}"
    
    if command -v open &> /dev/null; then
        open "http://localhost:3000"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3000"
    else
        echo "Please open http://localhost:3000 in your browser"
    fi
}

# Main loop
while true; do
    show_menu
    
    case $choice in
        1) build_images ;;
        2) start_services ;;
        3) stop_services ;;
        4) restart_services ;;
        5) view_logs ;;
        6) build_and_start ;;
        7) full_deployment ;;
        8) cleanup ;;
        9) list_containers ;;
        10) view_status ;;
        11) open_browser ;;
        12) 
            echo ""
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice. Please try again.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
