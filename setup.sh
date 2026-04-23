#!/bin/bash
# setup.sh — run once to install everything and start both servers
# Usage: chmod +x setup.sh && ./setup.sh

set -e  # exit on first error

echo ""
echo "🌾  Rural Youth Pathways — Setup"
echo "================================"

# ── Backend ──────────────────────────────────────────
echo ""
echo "📦  Setting up backend..."
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt --quiet

# Copy .env if not present
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅  Created backend/.env — add your GEMINI_API_KEY to it"
fi

# Seed database
python -m data.seed

cd ..

# ── Frontend ─────────────────────────────────────────
echo ""
echo "📦  Setting up frontend..."
cd frontend
npm install --silent

# Copy .env.local if not present
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi
cd ..

# ── Launch both servers ───────────────────────────────
echo ""
echo "🚀  Starting servers..."
echo "   Backend:  http://localhost:8000  (API docs: http://localhost:8000/docs)"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Start backend in background
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Small delay so backend starts first
sleep 2

# Start frontend in foreground
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for Ctrl+C and clean up
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
