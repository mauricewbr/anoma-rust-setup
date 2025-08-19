#!/bin/bash

# Production startup script for Anoma Counter dApp
echo "🚀 Starting Anoma Counter dApp with RISC0 Production Proving"
echo

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "cargo run" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

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

# Start frontend in background first (less verbose)
echo "⚛️  Starting TypeScript frontend (port 5173)..."
cd frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 2

echo
echo "✅ Frontend started in background (logs in /tmp/frontend.log)"
echo "📱 Frontend: http://localhost:5173"
echo "🔗 Backend:  http://127.0.0.1:3000"
echo "📄 API Doc:  http://127.0.0.1:3000/static/index.html"
echo
echo "🦀 Starting Rust backend with full output..."
echo "🔧 RISC0_DEV_MODE=false (using Bonsai proving service)"
echo "📄 All credentials and config: loaded from .env file"
echo "🔒 API keys safely excluded from Git repository"
echo "─────────────────────────────────────────────────"

# Start backend in foreground to see all output including prints
# Production environment with real RISC0 proving service (Bonsai)
# Bonsai credentials loaded from .env file
export RISC0_DEV_MODE=false
export RUST_BACKTRACE=1

cargo run
