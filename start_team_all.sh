#!/bin/bash

# Check for clean build flag
if [ "$1" = "--clean" ]; then
  echo "🧹 Performing clean build..."
  ./clean_build.sh
  echo ""
fi

# Kill processes using ports 8000-8003
echo "🔄 Cleaning up ports 8000-8003..."
for port in 8000 8001 8002 8003; do
  PID=$(lsof -ti:$port 2>/dev/null)
  if [ ! -z "$PID" ]; then
    echo "Killing process $PID on port $port"
    kill -9 $PID 2>/dev/null || true
  fi
done
sleep 2

echo ""
echo "🚀 Starting all services with unified API gateway..."

# Start services in correct order with dependencies
echo "🤖 Starting Core Agent..."
./start_team_core_agent.sh &
AGENT_PID=$!
sleep 3

echo "📦 Starting Backend..."
./start_team_backend.sh &
BACKEND_PID=$!
sleep 3

echo "🌐 Starting UI Server (API Gateway)..."
./start_team_ui_server.sh &
WEBUI_SERVER_PID=$!
sleep 3

echo "💻 Starting UI Client..."
./start_team_ui_client.sh &
WEBUI_CLIENT_PID=$!

echo ""
echo "✅ All services started!"
echo "Core Agent PID: $AGENT_PID"
echo "Backend PID: $BACKEND_PID"
echo "UI Server PID: $WEBUI_SERVER_PID" 
echo "UI Client PID: $WEBUI_CLIENT_PID"
echo ""
echo "🌐 Unified API Gateway Architecture:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💻 UI Client (Frontend):"
echo "   URL: http://localhost:8003"
echo "   → Routes ALL requests to UI Server"
echo ""
echo "🌐 UI Server (API Gateway):"
echo "   URL: http://localhost:8002"
echo "   WebSocket: ws://localhost:8002"
echo "   Health: http://localhost:8002/health"
echo "   Metrics: http://localhost:8002/metrics"
echo "   → Proxies API calls to Backend"
echo "   → Handles WebSocket connections"
echo ""
echo "📦 Backend (Internal API):"
echo "   URL: http://localhost:8000 (internal only)"
echo "   Health: http://localhost:8000/health"
echo "   → Processes business logic"
echo "   → Routes to Core Agent"
echo ""
echo "🤖 Core Agent (ACP Server):"
echo "   WebSocket: ws://localhost:8001 (internal only)"
echo "   → Handles LLM communication"
echo "   → Manages agent sessions"
echo ""
echo "🔗 Communication Flow:"
echo "   Client → UI Server → Backend → Core Agent → LLM"
echo ""
echo "⚙️  Configuration:"
echo "   Each service uses its own .env file"
echo "   Development environment active"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "Stopping all services..."; kill $AGENT_PID $BACKEND_PID $WEBUI_SERVER_PID $WEBUI_CLIENT_PID 2>/dev/null; exit' INT
wait
