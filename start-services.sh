#!/bin/bash

# Team services startup script with proper shutdown handling and health checks

set -e

# Disable telemetry for all services
export OTEL_SDK_DISABLED=true
export OTEL_TRACES_EXPORTER=none
export OTEL_METRICS_EXPORTER=none
export OTEL_LOGS_EXPORTER=none

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Process IDs
STORAGE_PID=""
AI_AGENT_PID=""
SERVICE_PID=""
WEB_PID=""

# Health check function
check_service_health() {
    local service_name=$1
    local health_url=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    echo -e "${BLUE}Checking $service_name health...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$health_url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Waiting for $service_name (attempt $attempt/$max_attempts)${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name failed to start${NC}"
    return 1
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    
    # Send SIGTERM to all processes in reverse order
    if [ ! -z "$WEB_PID" ]; then
        echo "Stopping team-web (PID: $WEB_PID)"
        kill -TERM $WEB_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$SERVICE_PID" ]; then
        echo "Stopping team-service (PID: $SERVICE_PID)"
        kill -TERM $SERVICE_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$AI_AGENT_PID" ]; then
        echo "Stopping team-ai-agent (PID: $AI_AGENT_PID)"
        kill -TERM $AI_AGENT_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$STORAGE_PID" ]; then
        echo "Stopping team-storage (PID: $STORAGE_PID)"
        kill -TERM $STORAGE_PID 2>/dev/null || true
    fi
    
    # Wait for graceful shutdown
    echo "Waiting for graceful shutdown..."
    sleep 3
    
    # Clean up Docker sandboxes
    echo -e "${BLUE}Cleaning up Docker sandboxes...${NC}"
    docker ps -q --filter "name=qwen-sandbox-" | xargs -r docker stop
    docker ps -aq --filter "name=qwen-sandbox-" | xargs -r docker rm
    echo -e "${GREEN}Docker sandboxes cleaned up${NC}"
    
    # Force kill if still running
    for pid in $WEB_PID $SERVICE_PID $AI_AGENT_PID $STORAGE_PID; do
        if [ ! -z "$pid" ] && kill -0 $pid 2>/dev/null; then
            echo "Force killing process $pid"
            kill -KILL $pid 2>/dev/null || true
        fi
    done
    
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}Starting team services in dependency order...${NC}"

# Create logs directory and clean old logs
mkdir -p packages/logs
echo -e "${BLUE}Cleaning old log files...${NC}"
rm -f packages/logs/team-storage.log 
rm -f packages/logs/team-ai-agent.log 
rm -f packages/logs/team-service.log 
rm -f packages/logs/team-web.log

# Check if MongoDB is running
echo -e "${BLUE}Checking MongoDB dependency...${NC}"
if ! curl -s -f "http://localhost:27017" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  MongoDB not detected - team-storage may fail to start${NC}"
fi

# 1. Start team-storage (Data Layer)
echo -e "${YELLOW}1/4 Starting team-storage...${NC}"
cd packages/team-storage
npm run dev > ../logs/team-storage.log 2>&1 &
STORAGE_PID=$!
cd ../..

# Wait for team-storage to be healthy
if ! check_service_health "team-storage" "http://localhost:8000/health" 15; then
    echo -e "${RED}Failed to start team-storage${NC}"
    cleanup
    exit 1
fi

# 2. Start team-ai-agent (ACP Protocol Layer)
echo -e "${YELLOW}2/4 Starting team-ai-agent...${NC}"
cd packages/team-ai-agent
npm run dev > ../logs/team-ai-agent.log 2>&1 &
AI_AGENT_PID=$!
cd ../..

# Wait for team-ai-agent to be healthy
if ! check_service_health "team-ai-agent" "http://localhost:8001/health" 15; then
    echo -e "${RED}Failed to start team-ai-agent${NC}"
    cleanup
    exit 1
fi

# 3. Start team-service (API Gateway)
echo -e "${YELLOW}3/4 Starting team-service...${NC}"
cd packages/team-service
npm run dev > ../logs/team-service.log 2>&1 &
SERVICE_PID=$!
cd ../..

# Wait for team-service to be healthy
if ! check_service_health "team-service" "http://localhost:8002/health" 15; then
    echo -e "${RED}Failed to start team-service${NC}"
    cleanup
    exit 1
fi

# 4. Start team-web (Frontend)
echo -e "${YELLOW}4/4 Starting team-web...${NC}"
cd packages/team-web
npm run dev > ../logs/team-web.log 2>&1 &
WEB_PID=$!
cd ../..

# Wait a bit for frontend to start
sleep 3

echo -e "${GREEN}🚀 All services started successfully!${NC}"
echo -e "${BLUE}Service URLs:${NC}"
echo -e "  • Frontend:    http://localhost:8003"
echo -e "  • API Gateway: http://localhost:8002"
echo -e "  • ACP Agent:   http://localhost:8001"
echo -e "  • Storage:     http://localhost:8000"
echo ""
echo -e "${BLUE}Process IDs:${NC}"
echo -e "  • team-storage:  $STORAGE_PID"
echo -e "  • team-ai-agent: $AI_AGENT_PID"
echo -e "  • team-service:  $SERVICE_PID"
echo -e "  • team-web:      $WEB_PID"
echo ""
echo -e "${BLUE}Log files:${NC}"
echo -e "  • tail -f packages/logs/team-storage.log"
echo -e "  • tail -f packages/logs/team-ai-agent.log"
echo -e "  • tail -f packages/logs/team-service.log"
echo -e "  • tail -f packages/logs/team-web.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for all processes
wait
