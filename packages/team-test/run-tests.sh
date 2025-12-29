#!/bin/bash

# Test runner script for team collaboration architecture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Team Collaboration Test Suite${NC}"
echo -e "${BLUE}==============================${NC}"

# Check if services are running
check_service() {
    local service_name=$1
    local health_url=$2
    
    if curl -s -f "$health_url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not running${NC}"
        return 1
    fi
}

# Start services if not running
start_services_if_needed() {
    echo -e "${YELLOW}Checking service status...${NC}"
    
    local services_needed=false
    
    if ! check_service "team-storage" "http://localhost:8000/health"; then
        services_needed=true
    fi
    
    if ! check_service "team-ai-agent" "http://localhost:8001/health"; then
        services_needed=true
    fi
    
    if ! check_service "team-service" "http://localhost:8002/health"; then
        services_needed=true
    fi
    
    if [ "$services_needed" = true ]; then
        echo -e "${YELLOW}Starting services...${NC}"
        ./start-services.sh &
        SERVICES_PID=$!
        
        # Wait for services to be ready
        echo -e "${YELLOW}Waiting for services to start...${NC}"
        sleep 10
        
        # Verify services are running
        for i in {1..30}; do
            if check_service "team-storage" "http://localhost:8000/health" && \
               check_service "team-ai-agent" "http://localhost:8001/health" && \
               check_service "team-service" "http://localhost:8002/health"; then
                echo -e "${GREEN}All services are ready${NC}"
                break
            fi
            
            if [ $i -eq 30 ]; then
                echo -e "${RED}Services failed to start${NC}"
                exit 1
            fi
            
            sleep 2
        done
    else
        echo -e "${GREEN}All services are already running${NC}"
    fi
}

# Cleanup function
cleanup() {
    if [ ! -z "$SERVICES_PID" ]; then
        echo -e "${YELLOW}Stopping test services...${NC}"
        kill -TERM $SERVICES_PID 2>/dev/null || true
        wait $SERVICES_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Install test dependencies
echo -e "${YELLOW}Installing test dependencies...${NC}"
cd packages/team-test
npm install

# Start services if needed
cd ../..
start_services_if_needed

# Run tests
cd packages/team-test

echo -e "${BLUE}Running Unit Tests...${NC}"
npm run test:unit

echo -e "${BLUE}Running Integration Tests...${NC}"
npm run test:integration

echo -e "${BLUE}Running E2E Tests...${NC}"
npm run test:e2e

echo -e "${BLUE}Generating Coverage Report...${NC}"
npm run test:coverage

echo -e "${GREEN}All tests completed successfully!${NC}"
echo -e "${BLUE}Coverage report available at: packages/team-test/coverage/index.html${NC}"
