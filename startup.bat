@echo off
REM StockPulse Startup Script for Windows
REM This script helps you quickly start the application

setlocal enabledelayedexpansion

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║          Welcome to StockPulse - Stock Market App          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    echo 📥 Download from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% detected

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% detected
echo.

REM Menu
echo What would you like to do?
echo.
echo 1) Fresh Installation (npm install in both directories)
echo 2) Start Application (run both servers)
echo 3) Start Backend Only
echo 4) Start Frontend Only
echo 5) Install Dependencies Only
echo 6) View Documentation
echo 7) Run with Docker
echo 8) Exit
echo.

set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto fresh_install
if "%choice%"=="2" goto start_app
if "%choice%"=="3" goto start_backend
if "%choice%"=="4" goto start_frontend
if "%choice%"=="5" goto install_deps
if "%choice%"=="6" goto view_docs
if "%choice%"=="7" goto docker
if "%choice%"=="8" goto exit_script

echo.
echo ❌ Invalid choice. Please select 1-8.
pause
goto end

:fresh_install
echo.
echo 📦 Installing dependencies...
echo.

echo 🔧 Installing backend dependencies...
cd backend
call npm install
cd ..

echo.
echo 🔧 Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo ✅ Installation complete!
echo.
echo Next steps:
echo 1. Configure MongoDB in backend\.env
echo 2. Run the application using option 2
echo.
pause
goto end

:start_app
echo.
echo 🚀 Starting StockPulse Application...
echo.

REM Check if ports are in use
netstat -ano | findstr :5000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Backend port 5000 is already in use
)

netstat -ano | findstr :3000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Frontend port 3000 is already in use
)

echo.
echo 📍 Backend will run on: http://localhost:5000
echo 📍 Frontend will run on: http://localhost:3000
echo.

echo Starting backend in new window...
cd backend
start cmd /k npm run dev
cd ..

timeout /t 3 /nobreak

echo Starting frontend in new window...
cd frontend
start cmd /k npm run dev
cd ..

echo.
echo ✅ Application started!
echo.
echo 📖 Open your browser and go to: http://localhost:3000
echo.
pause
goto end

:start_backend
echo.
echo 🚀 Starting Backend Server...
echo.

REM Check if .env exists
if not exist "backend\.env" (
    echo ❌ .env file not found in backend directory
    echo 📝 Please create .env file using .env.example as template
    echo.
    echo Run: copy backend\.env.example backend\.env
    echo Then edit backend\.env with your MongoDB URI
    echo.
    pause
    exit /b 1
)

cd backend
echo 📍 Backend running on: http://localhost:5000
echo 📍 API available at: http://localhost:5000/api
echo.
echo 💡 Press Ctrl+C to stop the server
echo.
call npm run dev
cd ..
goto end

:start_frontend
echo.
echo 🚀 Starting Frontend Server...
echo.

cd frontend
echo 📍 Frontend running on: http://localhost:3000
echo.
echo 💡 Press Ctrl+C to stop the server
echo.
echo ⚠️  Make sure backend is running on http://localhost:5000
echo.
call npm run dev
cd ..
goto end

:install_deps
echo.
echo 📦 Installing dependencies...
echo.

echo 🔧 Installing backend dependencies...
cd backend
call npm install
echo ✅ Backend dependencies installed
cd ..

echo.
echo 🔧 Installing frontend dependencies...
cd frontend
call npm install
echo ✅ Frontend dependencies installed
cd ..

echo.
echo ✅ All dependencies installed!
echo.
pause
goto end

:view_docs
echo.
echo 📚 StockPulse Documentation
echo.
echo Quick Navigation:
echo - QUICK_START.md              - Get started in 5 minutes
echo - SETUP_GUIDE.md              - Detailed setup instructions
echo - INSTALLATION_DEPLOYMENT.md  - Complete guide
echo - API_DOCUMENTATION.md        - API reference
echo - FEATURES_OVERVIEW.md        - Features and design
echo - PROJECT_SUMMARY.md          - Project overview
echo - README.md                   - Main documentation
echo.
echo Open any of these files in your text editor to read them.
echo.
pause
goto end

:docker
echo.
echo 🐳 Starting with Docker Compose...
echo.

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker is not installed.
    echo 📥 Download from: https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker Compose is not installed.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('docker --version') do echo ✅ %%i

echo.
echo 🚀 Starting services...
echo.
echo 📍 Frontend:  http://localhost:3000
echo 📍 Backend:   http://localhost:5000
echo 📍 MongoDB:   localhost:27017
echo.
echo 💡 This may take 1-2 minutes on first run
echo.

docker-compose up --build
goto end

:exit_script
echo.
echo 👋 Goodbye!
exit /b 0

:end
endlocal
