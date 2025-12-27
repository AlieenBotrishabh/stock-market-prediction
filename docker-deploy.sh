#!/bin/bash

# Docker Deployment Script for Stock Market Prediction App with ML Integration
# Usage: ./docker-deploy.sh [command]
# Commands: up, down, build, logs, clean, status, restart, shell, ml

set -e

PROJECT_NAME="stock-market-prediction"
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check Docker installation
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Start all services
start_services() {
    print_header "Starting Services"
    
    docker-compose up -d
    
    print_success "Services started"
    print_warning "Waiting for services to be ready..."
    sleep 5
    
    docker-compose ps
}

# Stop all services
stop_services() {
    print_header "Stopping Services"
    
    docker-compose down
    
    print_success "Services stopped"
}

# Stop and remove all data
clean() {
    print_header "Cleaning Up"
    print_warning "This will remove all containers and volumes. Continue? (y/n)"
    
    read -r response
    if [[ "$response" == "y" || "$response" == "Y" ]]; then
        docker-compose down -v
        print_success "Cleanup completed"
    else
        print_warning "Cleanup cancelled"
    fi
}

# Build images
build_images() {
    print_header "Building Docker Images"
    
    docker-compose build
    
    print_success "Images built successfully"
    
    echo ""
    print_header "Built Images"
    docker images | grep -E "stock|mongo" || echo "No stock market images found"
}

# View logs
view_logs() {
    print_header "Service Logs"
    
    if [ -z "$1" ]; then
        echo "Available services: mongodb, backend, frontend"
        echo "Usage: ./docker-deploy.sh logs [service]"
        echo ""
        print_header "All Logs"
        docker-compose logs -f --tail=50
    else
        docker-compose logs -f --tail=100 "$1"
    fi
}

# Show service status
show_status() {
    print_header "Service Status"
    docker-compose ps
    
    echo ""
    print_header "Network"
    docker network ls | grep -E "stock|bridge" || echo "No networks found"
    
    echo ""
    print_header "Volumes"
    docker volume ls | grep stock || echo "No volumes found"
}

# Restart specific service
restart_service() {
    if [ -z "$1" ]; then
        print_error "Please specify a service: mongodb, backend, or frontend"
        return 1
    fi
    
    print_header "Restarting $1"
    docker-compose restart "$1"
    print_success "$1 restarted"
}

# Open shell in container
open_shell() {
    if [ -z "$1" ]; then
        print_error "Please specify a service: mongodb, backend, or frontend"
        return 1
    fi
    
    service=$1
    print_header "Opening shell in $service"
    
    case $service in
        mongodb)
            docker exec -it stock-market-mongodb mongosh --username root --password password
            ;;
        backend)
            docker exec -it stock-market-api sh
            ;;
        frontend)
            docker exec -it stock-market-frontend sh
            ;;
        *)
            print_error "Unknown service: $service"
            ;;
    esac
}

# Show health check
health_check() {
    print_header "Health Check"
    
    # Check MongoDB
    echo -n "MongoDB... "
    if docker exec stock-market-mongodb mongosh --username root --password password --eval "db.adminCommand('ping')" &> /dev/null; then
        print_success "Connected"
    else
        print_error "Not responding"
    fi
    
    # Check Backend
    echo -n "Backend... "
    if curl -s http://localhost:5000/api/stocks &> /dev/null; then
        print_success "Responding"
    else
        print_error "Not responding"
    fi
    
    # Check Frontend
    echo -n "Frontend... "
    if curl -s http://localhost:3000 &> /dev/null; then
        print_success "Responding"
    else
        print_error "Not responding"
    fi
}

# Display usage
show_usage() {
    echo "Docker Deployment Script for $PROJECT_NAME"
    echo ""
    echo "Usage: ./docker-deploy.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  up              Start all services"
    echo "  down            Stop all services"
    echo "  build           Build Docker images"
    echo "  logs [service]  View service logs"
    echo "  status          Show service status"
    echo "  restart [svc]   Restart specific service"
    echo "  shell [svc]     Open shell in container"
    echo "  health          Run health check"
    echo "  clean           Stop and remove all data (WARNING)"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./docker-deploy.sh up"
    echo "  ./docker-deploy.sh logs backend"
    echo "  ./docker-deploy.sh restart backend"
    echo "  ./docker-deploy.sh shell mongodb"
}

# Main script
main() {
    check_docker
    
    case "${1:-help}" in
        up)
            start_services
            echo ""
            echo -e "${GREEN}📱 Frontend: http://localhost:3000${NC}"
            echo -e "${GREEN}🔌 Backend: http://localhost:5000/api${NC}"
            echo -e "${GREEN}💾 MongoDB: localhost:27017${NC}"
            ;;
        down)
            stop_services
            ;;
        build)
            build_images
            ;;
        logs)
            view_logs "$2"
            ;;
        status)
            show_status
            ;;
        restart)
            restart_service "$2"
            ;;
        shell)
            open_shell "$2"
            ;;
        health)
            health_check
            ;;
        clean)
            clean
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
