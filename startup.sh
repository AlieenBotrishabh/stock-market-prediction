#!/bin/bash

# StockPulse Startup Script
# This script helps you quickly start the application

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Welcome to StockPulse - Stock Market App          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    echo "📥 Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm $(npm --version) detected"
echo ""

# Ask user for setup preference
echo "What would you like to do?"
echo ""
echo "1) Fresh Installation (npm install in both directories)"
echo "2) Start Application (run both servers)"
echo "3) Start Backend Only"
echo "4) Start Frontend Only"
echo "5) Install Dependencies Only"
echo "6) View Documentation"
echo "7) Run with Docker"
echo "8) Exit"
echo ""

read -p "Enter your choice (1-8): " choice

case $choice in
    1)
        echo ""
        echo "📦 Installing dependencies..."
        echo ""
        
        # Install backend
        echo "🔧 Installing backend dependencies..."
        cd backend
        npm install
        cd ..
        
        # Install frontend
        echo "🔧 Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        
        echo ""
        echo "✅ Installation complete!"
        echo ""
        echo "Next steps:"
        echo "1. Configure MongoDB in backend/.env"
        echo "2. Run the application using option 2"
        ;;
    
    2)
        echo ""
        echo "🚀 Starting StockPulse Application..."
        echo ""
        echo "⚠️  This will open two terminals (one for backend, one for frontend)"
        echo ""
        
        # Check if backend is already running
        if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "⚠️  Backend port 5000 is already in use"
            read -p "Continue anyway? (y/n): " continue_choice
            if [[ $continue_choice != "y" ]]; then
                exit 1
            fi
        fi
        
        # Check if frontend is already running
        if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "⚠️  Frontend port 3000 is already in use"
            read -p "Continue anyway? (y/n): " continue_choice
            if [[ $continue_choice != "y" ]]; then
                exit 1
            fi
        fi
        
        echo ""
        echo "📍 Backend will run on: http://localhost:5000"
        echo "📍 Frontend will run on: http://localhost:3000"
        echo ""
        
        # Start backend in background
        echo "🔴 Starting backend..."
        cd backend
        npm run dev &
        BACKEND_PID=$!
        cd ..
        
        sleep 3
        
        # Start frontend in background
        echo "🔵 Starting frontend..."
        cd frontend
        npm run dev &
        FRONTEND_PID=$!
        cd ..
        
        echo ""
        echo "✅ Application started!"
        echo ""
        echo "📊 Backend PID: $BACKEND_PID"
        echo "📊 Frontend PID: $FRONTEND_PID"
        echo ""
        echo "📖 Open your browser and go to: http://localhost:3000"
        echo ""
        echo "💡 Press Ctrl+C to stop both servers"
        echo ""
        
        # Wait for user interruption
        wait $BACKEND_PID $FRONTEND_PID
        ;;
    
    3)
        echo ""
        echo "🚀 Starting Backend Server..."
        echo ""
        
        # Check MongoDB connection
        echo "Checking MongoDB connection..."
        if ! command -v mongosh &> /dev/null; then
            echo "⚠️  MongoDB shell not found. Make sure MongoDB is running."
        fi
        
        cd backend
        
        # Check if .env exists
        if [ ! -f ".env" ]; then
            echo "❌ .env file not found in backend directory"
            echo "📝 Please create .env file using .env.example as template"
            echo ""
            echo "Run: cp .env.example .env"
            echo "Then edit .env with your MongoDB URI"
            exit 1
        fi
        
        echo "📍 Backend running on: http://localhost:5000"
        echo "📍 API available at: http://localhost:5000/api"
        echo ""
        echo "💡 Press Ctrl+C to stop the server"
        echo ""
        
        npm run dev
        ;;
    
    4)
        echo ""
        echo "🚀 Starting Frontend Server..."
        echo ""
        
        cd frontend
        
        echo "📍 Frontend running on: http://localhost:3000"
        echo ""
        echo "💡 Press Ctrl+C to stop the server"
        echo ""
        echo "⚠️  Make sure backend is running on http://localhost:5000"
        echo ""
        
        npm run dev
        ;;
    
    5)
        echo ""
        echo "📦 Installing dependencies..."
        echo ""
        
        # Install backend
        echo "🔧 Installing backend dependencies..."
        cd backend
        npm install
        echo "✅ Backend dependencies installed"
        cd ..
        
        echo ""
        
        # Install frontend
        echo "🔧 Installing frontend dependencies..."
        cd frontend
        npm install
        echo "✅ Frontend dependencies installed"
        cd ..
        
        echo ""
        echo "✅ All dependencies installed!"
        ;;
    
    6)
        echo ""
        echo "📚 StockPulse Documentation"
        echo ""
        echo "Quick Navigation:"
        echo "1. QUICK_START.md        - Get started in 5 minutes"
        echo "2. SETUP_GUIDE.md        - Detailed setup instructions"
        echo "3. INSTALLATION_DEPLOYMENT.md - Complete guide"
        echo "4. API_DOCUMENTATION.md  - API reference"
        echo "5. FEATURES_OVERVIEW.md  - Features and design"
        echo "6. PROJECT_SUMMARY.md    - Project overview"
        echo "7. README.md             - Main documentation"
        echo ""
        echo "Open any of these files in your text editor to read them."
        ;;
    
    7)
        echo ""
        echo "🐳 Starting with Docker Compose..."
        echo ""
        
        # Check if Docker is installed
        if ! command -v docker &> /dev/null; then
            echo "❌ Docker is not installed."
            echo "📥 Download from: https://www.docker.com/products/docker-desktop"
            exit 1
        fi
        
        echo "✅ Docker detected: $(docker --version)"
        
        if ! command -v docker-compose &> /dev/null; then
            echo "❌ Docker Compose is not installed."
            exit 1
        fi
        
        echo "✅ Docker Compose detected"
        echo ""
        echo "🚀 Starting services..."
        echo ""
        echo "📍 Frontend:  http://localhost:3000"
        echo "📍 Backend:   http://localhost:5000"
        echo "📍 MongoDB:   localhost:27017"
        echo ""
        echo "💡 This may take 1-2 minutes on first run"
        echo ""
        
        docker-compose up --build
        ;;
    
    8)
        echo ""
        echo "👋 Goodbye!"
        exit 0
        ;;
    
    *)
        echo ""
        echo "❌ Invalid choice. Please select 1-8."
        exit 1
        ;;
esac
