#!/bin/bash

# Team services startup script with proper shutdown handling

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Process IDs
STORAGE_PID=""
AI_AGENT_PID=""
SERVICE_PID=""
WEB_PID=""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down all services...${NC}"
    
    # Send SIGTERM to all processes
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
    sleep 2
    
    # Force kill if still running
    if [ ! -z "$WEB_PID" ] && kill -0 $WEB_PID 2>/dev/null; then
        echo "Force killing team-web"
        kill -KILL $WEB_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$SERVICE_PID" ] && kill -0 $SERVICE_PID 2>/dev/null; then
        echo "Force killing team-service"
        kill -KILL $SERVICE_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$AI_AGENT_PID" ] && kill -0 $AI_AGENT_PID 2>/dev/null; then
        echo "Force killing team-ai-agent"
        kill -KILL $AI_AGENT_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$STORAGE_PID" ] && kill -0 $STORAGE_PID 2>/dev/null; then
        echo "Force killing team-storage"
        kill -KILL $STORAGE_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}Starting team services...${NC}"

# Start team-storage
echo -e "${YELLOW}Starting team-storage...${NC}"
cd packages/team-storage
npm run dev &
STORAGE_PID=$!
cd ../..

# Wait a bit for storage to start
sleep 2

# Start team-ai-agent
echo -e "${YELLOW}Starting team-ai-agent...${NC}"
cd packages/team-ai-agent
npm run dev &
AI_AGENT_PID=$!
cd ../..

# Wait a bit for ai-agent to start
sleep 2

# Start team-service
echo -e "${YELLOW}Starting team-service...${NC}"
cd packages/team-service
npm run dev &
SERVICE_PID=$!
cd ../..

# Wait a bit for service to start
sleep 2

# Start team-web
echo -e "${YELLOW}Starting team-web...${NC}"
cd packages/team-web
npm run dev &
WEB_PID=$!
cd ../..

echo -e "${GREEN}All services started!${NC}"
echo -e "PIDs: Storage=$STORAGE_PID, AI-Agent=$AI_AGENT_PID, Service=$SERVICE_PID, Web=$WEB_PID"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for all processes
wait
