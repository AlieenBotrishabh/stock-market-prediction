@echo off
REM Stock Market Prediction - Docker Deployment Script (Windows)
REM This script helps you build and deploy the application using Docker

setlocal enabledelayedexpansion

color 0A
cls

echo.
echo ============================================================
echo     StockPulse - Docker Deployment Script
echo     (Frontend, Backend, MongoDB)
echo ============================================================
echo.

REM Check Docker installation
echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo ERROR: Docker is not installed!
    echo Please install Docker from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VER=%%i
echo [OK] %DOCKER_VER%

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Docker Compose is not installed!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('docker-compose --version') do set COMPOSE_VER=%%i
echo [OK] %COMPOSE_VER%

:menu
cls
color 0A
echo.
echo ============================================================
echo     DEPLOYMENT MENU
echo ============================================================
echo.
echo 1) Build all images (frontend, backend, MongoDB)
echo 2) Start all services (docker-compose up)
echo 3) Stop all services (docker-compose down)
echo 4) Restart services
echo 5) View logs
echo 6) Build and start (build + up)
echo 7) Full deployment (build + up)
echo 8) Clean up (remove containers, images, volumes)
echo 9) List running containers
echo 10) View service status
echo 11) Open application in browser
echo 12) Exit
echo.

set /p choice="Enter your choice (1-12): "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto start
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto build_start
if "%choice%"=="7" goto full_deploy
if "%choice%"=="8" goto cleanup
if "%choice%"=="9" goto list
if "%choice%"=="10" goto status
if "%choice%"=="11" goto browser
if "%choice%"=="12" goto end

color 0C
echo Invalid choice. Please try again.
pause
goto menu

:build
cls
echo.
echo [INFO] Building Docker images...
echo.
docker-compose build --no-cache
if errorlevel 1 (
    color 0C
    echo [ERROR] Build failed!
) else (
    color 0A
    echo [OK] Images built successfully!
)
pause
goto menu

:start
cls
echo.
echo [INFO] Starting services...
echo.
docker-compose up -d
if errorlevel 1 (
    color 0C
    echo [ERROR] Failed to start services!
) else (
    color 0A
    echo [OK] Services started!
    echo.
    echo Frontend: http://localhost:3000
    echo Backend:  http://localhost:5000
    echo MongoDB:  localhost:27017
)
pause
goto menu

:stop
cls
echo.
echo [INFO] Stopping services...
docker-compose down
color 0A
echo [OK] Services stopped!
pause
goto menu

:restart
cls
echo.
echo [INFO] Restarting services...
docker-compose restart
color 0A
echo [OK] Services restarted!
pause
goto menu

:logs
cls
echo.
echo [INFO] Displaying logs (Ctrl+C to exit)...
echo.
docker-compose logs -f
goto menu

:build_start
cls
echo.
echo [INFO] Building and starting...
echo.
docker-compose build --no-cache
docker-compose up -d
color 0A
echo [OK] Build and start complete!
pause
goto menu

:full_deploy
cls
echo.
echo [INFO] Starting full deployment...
echo.
docker-compose build --no-cache
docker-compose up -d
color 0A
echo.
echo [OK] Full deployment complete!
echo.
echo Next steps:
echo 1. Wait 10-15 seconds for MongoDB to initialize
echo 2. Open http://localhost:3000 in your browser
echo 3. Backend API available at http://localhost:5000/api
echo.
pause
goto menu

:list
cls
echo.
echo [INFO] Running containers:
echo.
docker ps
echo.
pause
goto menu

:status
cls
echo.
echo [INFO] Service Status:
echo.
docker-compose ps
echo.
pause
goto menu

:browser
cls
echo.
echo [INFO] Opening application...
start http://localhost:3000
echo [OK] Application opened in browser!
pause
goto menu

:cleanup
cls
echo.
color 0C
echo WARNING: This will remove all containers, images, and volumes!
echo.
set /p confirm="Are you sure? (yes/no): "
if /i "%confirm%"=="yes" (
    echo.
    echo [INFO] Cleaning up...
    docker-compose down -v
    color 0A
    echo [OK] Cleanup complete!
) else (
    echo Cleanup cancelled
)
pause
goto menu

:end
color 0A
echo.
echo Goodbye!
exit /b 0
