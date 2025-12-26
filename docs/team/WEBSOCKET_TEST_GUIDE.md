# WebSocket Communication Flow Test

## Overview

This document provides instructions for testing the end-to-end WebSocket communication flow after implementing the fixes from WEBSOCKET_FIX_PLAN.md.

## Test Architecture

The test verifies the complete communication chain:
```
Client → UI Server → Backend → Core Agent
  ↓         ↓          ↓         ↓
Port 8003  Port 8002  Port 8000  Port 8001
```

## Prerequisites

1. **All services must be running:**
   - team-ai-agent (port 8001)
   - team-ui-server (port 8002)  
   - team-storage (port 8000)
   - MongoDB (port 27017)

2. **Environment variables configured:**
   - JWT_SECRET (same across all services)
   - Service URLs properly configured
   - Database connections working

## Running the Test

### Option 1: Automated Test Script

```bash
# Install test dependencies
cd /workdisk/hosting/my_qwen_code/qwen-team-work
npm install --package-lock-only socket.io-client jsonwebtoken node-fetch

# Run the test
node test-websocket-flow.js
```

### Option 2: Manual Testing Steps

1. **Start all services:**
   ```bash
   # Start with Docker Compose
   cd infrastructure
   docker-compose --env-file ../.env.production up -d
   
   # Or start individually for development
   cd packages/team-ai-agent && npm start &
   cd packages/team-service && npm start &
   cd packages/team-storage && npm start &
   cd packages/team-web && npm run dev &
   ```

2. **Test WebSocket connection:**
   - Open browser to http://localhost:8003
   - Open browser developer tools (Network tab)
   - Look for WebSocket connection to localhost:8002
   - Send a test message
   - Verify streaming response chunks

3. **Verify service logs:**
   ```bash
   # Check each service for proper message routing
   docker logs team-ai-agent
   docker logs team-ui-server  
   docker logs team-storage
   ```

## Expected Test Results

### ✅ Success Indicators

1. **WebSocket Connection:**
   - Client connects to UI Server on port 8002
   - Authentication successful with JWT token
   - No connection errors in logs

2. **Message Flow:**
   - UI Server receives message from client
   - UI Server routes to Backend via Socket.IO
   - Backend connects to Core Agent via WebSocket
   - Response streams back through the chain

3. **Streaming Response:**
   - Multiple `message:chunk` events received
   - `message:complete` event fired
   - Full response assembled correctly

### ❌ Failure Indicators

1. **Connection Issues:**
   - Client tries to connect to wrong port (8001 instead of 8002)
   - Authentication failures
   - Service unavailable errors

2. **Protocol Mismatches:**
   - Socket.IO client connecting to native WebSocket server
   - Missing authentication tokens
   - Malformed message formats

3. **Architectural Bypasses:**
   - Direct connections to core-agent
   - Services not using proper layered routing

## Troubleshooting

### Common Issues

1. **Port Conflicts:**
   ```bash
   # Check what's running on each port
   netstat -tulpn | grep -E ':(8000|8001|8002|8003)'
   ```

2. **JWT Token Issues:**
   ```bash
   # Verify JWT_SECRET is consistent
   grep JWT_SECRET .env.production packages/*/src/config.*
   ```

3. **Service Dependencies:**
   ```bash
   # Check service startup order
   docker-compose ps
   docker-compose logs --tail=50
   ```

### Debug Commands

```bash
# Test individual service health
curl http://localhost:8001/health  # Core Agent
curl http://localhost:8002/health  # UI Server  
curl http://localhost:8000/health  # Backend

# Test WebSocket connections
wscat -c ws://localhost:8001  # Core Agent (should work)
wscat -c ws://localhost:8002  # UI Server (should fail - Socket.IO)

# Check network connectivity
docker network ls
docker network inspect qwen-network
```

## Test Validation Checklist

- [ ] Client connects to UI Server (port 8002) ✓
- [ ] JWT authentication works ✓
- [ ] UI Server routes to Backend ✓
- [ ] Backend connects to Core Agent ✓
- [ ] Streaming response works ✓
- [ ] No direct client-to-core-agent connections ✓
- [ ] All services use proper protocols ✓
- [ ] Error handling works correctly ✓

## Performance Metrics

Monitor these during testing:

- **Connection Time:** < 2 seconds
- **First Response:** < 5 seconds  
- **Streaming Latency:** < 100ms per chunk
- **Memory Usage:** Stable, no leaks
- **CPU Usage:** < 50% under normal load

## Security Validation

- [ ] JWT tokens required for all connections
- [ ] User authorization enforced
- [ ] No sensitive data in logs
- [ ] CORS properly configured
- [ ] Rate limiting active

## Next Steps

After successful testing:

1. **Production Deployment:**
   - Use .env.production configuration
   - Deploy with Docker Compose
   - Configure load balancers/reverse proxy
   - Set up monitoring and logging

2. **Performance Optimization:**
   - Implement connection pooling
   - Add caching layers
   - Optimize message serialization
   - Monitor resource usage

3. **Monitoring Setup:**
   - Health check endpoints
   - Metrics collection
   - Error tracking
   - Performance monitoring
