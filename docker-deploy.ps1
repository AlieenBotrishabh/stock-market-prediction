# Docker Deployment Script for Stock Market Prediction App with ML Integration
# Usage: .\docker-deploy.ps1 -Command <command> [-Environment <env>]
# Commands: up, down, build, logs, clean, status, restart, shell, ml, help

param(
    [Parameter(Position=0)]
    [ValidateSet('up', 'down', 'build', 'logs', 'clean', 'status', 'restart', 'shell', 'health', 'ml', 'help')]
    [string]$Command = 'help',
    
    [Parameter(Position=1)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter()]
    [string]$Service
)

$ProjectName = "stock-market-prediction"
$ComposeFile = if ($Environment -eq 'prod') { 'docker-compose.prod.yml' } else { 'docker-compose.yml' }

# Colors for output
function Print-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
}

function Print-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Check-Docker {
    Print-Header "Checking Docker Installation"
    
    try {
        $docker = docker --version
        Print-Success "Docker: $docker"
    }
    catch {
        Print-Error "Docker is not installed. Please install Docker Desktop for Windows."
        exit 1
    }
    
    try {
        $compose = docker-compose --version
        Print-Success "Docker Compose: $compose"
    }
    catch {
        Print-Error "Docker Compose is not installed. Please install Docker Desktop for Windows."
        exit 1
    }
}

function Start-Services {
    Print-Header "Starting Services"
    
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Services started successfully"
        Print-Warning "Waiting for services to be ready..."
        Start-Sleep -Seconds 5
        
        docker-compose ps
        
        Write-Host ""
        Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Green
        Write-Host "🔌 Backend: http://localhost:5000/api" -ForegroundColor Green
        Write-Host "💾 MongoDB: localhost:27017" -ForegroundColor Green
    }
    else {
        Print-Error "Failed to start services"
    }
}

function Stop-Services {
    Print-Header "Stopping Services"
    
    docker-compose down
    
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Services stopped successfully"
    }
    else {
        Print-Error "Failed to stop services"
    }
}

function Clean-Services {
    Print-Header "Cleaning Up"
    Print-Warning "This will remove all containers and volumes. Continue? (y/n)"
    
    $response = Read-Host
    if ($response -eq 'y' -or $response -eq 'Y') {
        docker-compose down -v
        
        if ($LASTEXITCODE -eq 0) {
            Print-Success "Cleanup completed"
        }
        else {
            Print-Error "Failed to cleanup"
        }
    }
    else {
        Print-Warning "Cleanup cancelled"
    }
}

function Build-Images {
    Print-Header "Building Docker Images"
    
    docker-compose build
    
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Images built successfully"
        
        Write-Host ""
        Print-Header "Built Images"
        docker images | Select-String -Pattern "stock|mongo"
    }
    else {
        Print-Error "Failed to build images"
    }
}

function View-Logs {
    param([string]$ServiceName)
    
    if (-not $ServiceName) {
        Print-Header "Service Logs"
        Write-Host "Available services: mongodb, backend, frontend"
        Write-Host "Usage: .\docker-deploy.ps1 logs <service>"
        Write-Host ""
        Print-Header "All Logs (last 50 lines)"
        docker-compose logs --tail=50 -f
    }
    else {
        Print-Header "Logs for $ServiceName"
        docker-compose logs --tail=100 -f $ServiceName
    }
}

function Show-Status {
    Print-Header "Service Status"
    docker-compose ps
    
    Write-Host ""
    Print-Header "Network"
    docker network ls | Select-String -Pattern "stock|bridge"
    
    Write-Host ""
    Print-Header "Volumes"
    docker volume ls | Select-String -Pattern "stock"
}

function Restart-Service {
    param([string]$ServiceName)
    
    if (-not $ServiceName) {
        Print-Error "Please specify a service: mongodb, backend, or frontend"
        return
    }
    
    Print-Header "Restarting $ServiceName"
    docker-compose restart $ServiceName
    
    if ($LASTEXITCODE -eq 0) {
        Print-Success "$ServiceName restarted"
    }
    else {
        Print-Error "Failed to restart $ServiceName"
    }
}

function Open-Shell {
    param([string]$ServiceName)
    
    if (-not $ServiceName) {
        Print-Error "Please specify a service: mongodb, backend, or frontend"
        return
    }
    
    Print-Header "Opening shell in $ServiceName"
    
    switch ($ServiceName) {
        'mongodb' {
            docker exec -it stock-market-mongodb mongosh --username root --password password
        }
        'backend' {
            docker exec -it stock-market-api cmd /s /c
        }
        'frontend' {
            docker exec -it stock-market-frontend cmd /s /c
        }
        default {
            Print-Error "Unknown service: $ServiceName"
        }
    }
}

function Health-Check {
    Print-Header "Health Check"
    
    # Check MongoDB
    Write-Host "MongoDB... " -NoNewline
    try {
        docker exec stock-market-mongodb mongosh --username root --password password --eval "db.adminCommand('ping')" *> $null
        Print-Success "Connected"
    }
    catch {
        Print-Error "Not responding"
    }
    
    # Check Backend
    Write-Host "Backend... " -NoNewline
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/stocks" -ErrorAction SilentlyContinue
        Print-Success "Responding"
    }
    catch {
        Print-Error "Not responding"
    }
    
    # Check Frontend
    Write-Host "Frontend... " -NoNewline
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -ErrorAction SilentlyContinue
        Print-Success "Responding"
    }
    catch {
        Print-Error "Not responding"
    }
}

function Show-Usage {
    Write-Host ""
    Write-Host "Docker Deployment Script for $ProjectName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\docker-deploy.ps1 -Command <command> [-Service <service>]"
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  up              Start all services"
    Write-Host "  down            Stop all services"
    Write-Host "  build           Build Docker images"
    Write-Host "  logs            View service logs (optionally specify service)"
    Write-Host "  status          Show service status"
    Write-Host "  restart         Restart specific service"
    Write-Host "  shell           Open shell in container"
    Write-Host "  health          Run health check"
    Write-Host "  clean           Stop and remove all data (WARNING)"
    Write-Host "  help            Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\docker-deploy.ps1 -Command up"
    Write-Host "  .\docker-deploy.ps1 -Command logs -Service backend"
    Write-Host "  .\docker-deploy.ps1 -Command restart -Service backend"
    Write-Host "  .\docker-deploy.ps1 -Command shell -Service mongodb"
    Write-Host ""
}

# Main execution
Check-Docker

switch ($Command) {
    'up' {
        Start-Services
    }
    'down' {
        Stop-Services
    }
    'build' {
        Build-Images
    }
    'logs' {
        View-Logs -ServiceName $Service
    }
    'status' {
        Show-Status
    }
    'restart' {
        Restart-Service -ServiceName $Service
    }
    'shell' {
        Open-Shell -ServiceName $Service
    }
    'health' {
        Health-Check
    }
    'clean' {
        Clean-Services
    }
    'help' {
        Show-Usage
    }
    default {
        Print-Error "Unknown command: $Command"
        Show-Usage
        exit 1
    }
}
