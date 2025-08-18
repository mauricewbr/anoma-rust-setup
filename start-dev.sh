#!/bin/bash

# Development startup script for Anoma Counter dApp
echo "🚀 Starting Anoma Counter dApp Development Environment"
echo

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "cargo run" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Start backend
echo "🦀 Starting Rust backend (port 3000)..."
cargo run &
BACKEND_PID=$!
sleep 2

# Start frontend
echo "⚛️  Starting TypeScript frontend (port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo
echo "✅ Development servers started!"
echo "📱 Frontend: http://localhost:5173"
echo "🔗 Backend:  http://127.0.0.1:3000"
echo "📄 API Doc:  http://127.0.0.1:3000/static/index.html"
echo
echo "Press Ctrl+C to stop all servers"

# Function to handle cleanup
cleanup() {
    echo
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "cargo run" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
