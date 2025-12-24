# WebSocket Implementation Analysis

## Executive Summary

This analysis reveals **critical architectural inconsistencies** in the WebSocket implementation across the team packages. The current design has fundamental protocol mismatches and port conflicts that prevent proper communication between components.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ team-ui/client  │    │ team-ui/server  │    │  team-backend   │    │ team-core-agent │    │      LLM        │
│                 │    │                 │    │                 │    │                 │    │                 │
│ React + Vite    │◄──►│ Fastify +       │    │ Express + SSE   │    │ Native WebSocket│◄──►│ qwen-code       │
│ Socket.IO       │    │ Socket.IO       │    │ + WebSocket     │    │ Server          │    │ Client          │
│ (Port 8003)     │    │ (Port 8002)     │    │ Client          │    │ (Port 8001)     │    │                 │
│ ❌→Port 8001    │    │ ❌→Port 8001    │    │ (Port 8001)     │    │                 │    │                 │
│                 │    │ ❌ NO BACKEND   │    │ ❌ ISOLATED     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Critical Issues Identified

### 1. **Multiple Port Conflicts (CRITICAL)**
- **team-ui/client connects to port 8001** expecting Socket.IO server
- **team-ui/server connects to port 8001** expecting native WebSocket server  
- **team-backend connects to port 8001** expecting native WebSocket server
- **team-core-agent runs on port 8001** as native WebSocket server
- **team-ui/server runs on port 8002** but client tries to connect to 8001
- **Result**: Multiple connection failures and architectural chaos

### 2. **Protocol Mismatch Cascade (CRITICAL)**
- **team-ui/client**: Uses Socket.IO client with events like `message:chunk`, `message:complete`
- **team-ui/server**: Provides Socket.IO server but connects to core-agent via native WebSocket
- **team-backend**: Uses native WebSocket client with JSON message protocol
- **team-core-agent**: Expects native WebSocket with ACP message format
- **Result**: Messages cannot be properly exchanged between any components

### 3. **Architectural Bypass (CRITICAL)**
- **team-ui/server bypasses team-backend entirely**
- **Both team-ui/server and team-backend connect directly to team-core-agent**
- **team-backend's REST API, MongoDB, and session management are unused**
- **Result**: Duplicate functionality and wasted resources

### 4. **Streaming Implementation Chaos (HIGH)**
- **team-backend**: Implements Server-Sent Events (SSE) for streaming to UI
- **team-ui/server**: Implements Socket.IO events for streaming to client
- **team-ui/client**: Expects Socket.IO events but connects to wrong port
- **Result**: No working streaming functionality anywhere in the system

## Detailed Component Analysis

### team-ui/client
**WebSocket Implementation**: Socket.IO Client
- **File**: `packages/team-ui/client/src/hooks/useWebSocket.ts`
- **Connection**: `io('http://localhost:8001')` ❌ **WRONG PORT**
- **Events**: `message:chunk`, `message:complete`, `tool:call`, etc.
- **Issues**: 
  - Connects to port 8001 expecting Socket.IO server (but core-agent is native WebSocket)
  - Should connect to port 8002 where team-ui/server Socket.IO runs
  - Event-based communication incompatible with native WebSocket

### team-ui/server
**WebSocket Implementation**: Socket.IO Server + Native WebSocket Client
- **File**: `packages/team-ui/server/src/websocket.ts` (Socket.IO server)
- **File**: `packages/team-ui/server/src/session/UserSessionManager.js` (WebSocket client)
- **Port**: 8002 (Socket.IO server for client)
- **Connection**: `new WebSocket('ws://localhost:8001')` (to core-agent)
- **Events**: Handles `chat:message` events from client
- **Issues**:
  - Client connects to wrong port (8001 instead of 8002)
  - Bypasses team-backend entirely
  - Duplicates session management functionality

### team-backend
**WebSocket Implementation**: Native WebSocket Client + SSE
- **File**: `packages/team-backend/src/services/acpConnectionManager.ts`
- **Connection**: `new WebSocket('ws://localhost:8001')`
- **Protocol**: ACP message format with JSON
- **Streaming**: Server-Sent Events for UI communication
- **Issues**:
  - Connects to same port as team-ui/server (resource competition)
  - SSE streaming has no client (team-ui/client uses Socket.IO)
  - Completely isolated from UI flow

### team-core-agent
**WebSocket Implementation**: Native WebSocket Server
- **File**: `packages/team-core-agent/src/server/AcpServer.ts`
- **Port**: 8001
- **Protocol**: ACP message format with validation
- **Issues**:
  - Cannot handle Socket.IO connections from team-ui/client
  - Receives duplicate connections from both team-ui/server and team-backend
  - Expects pure WebSocket connections only

## Defects and Bugs

### 1. **Connection Failures**
- **team-ui/client cannot establish Socket.IO connection** to core-agent's native WebSocket server
- **team-ui/client connects to wrong port** (8001 instead of 8002)
- **Multiple clients competing** for same port (team-ui/server and team-backend both connect to 8001)
- **team-ui/server Socket.IO server has no clients** (client connects elsewhere)

### 2. **Message Routing Failures**
- **team-ui/client messages never reach team-ui/server** due to port mismatch
- **team-ui/server messages reach core-agent** but bypass team-backend
- **team-backend messages reach core-agent** but are isolated from UI
- **Streaming responses fail** between all components

### 3. **Session Management Chaos**
- **team-ui/client session management broken** due to connection failures
- **team-ui/server implements own session management** (duplicates team-backend)
- **team-backend session management unused** by UI components
- **Inconsistent session state** across all services

### 4. **Resource Waste and Competition**
- **Duplicate WebSocket connections** to core-agent from two services
- **Unused team-backend infrastructure** (MongoDB, REST API, SSE)
- **Duplicate session management implementations**
- **team-backend completely bypassed** despite being most feature-complete

### 5. **Error Handling Gaps**
- **No fallback mechanisms** for connection failures
- **Silent failures** in message routing between components
- **Poor error reporting** to end users
- **No coordination** between competing services

## Recommended Architecture Fix

### Option 1: Proper Layered Architecture (RECOMMENDED)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ team-ui/client  │    │ team-ui/server  │    │  team-backend   │    │ team-core-agent │    │      LLM        │
│                 │    │                 │    │                 │    │                 │    │                 │
│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ HTTP/REST API   │◄──►│ Native WebSocket│◄──►│ qwen-code       │
│ Client          │    │ Server          │    │ + WebSocket     │    │ Server          │    │ Client          │
│ (Port 8003)     │    │ (Port 8002)     │    │ (Port 8000)     │    │ (Port 8001)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Changes Required:**
- Fix team-ui/client to connect to port 8002 (team-ui/server)
- Make team-ui/server communicate with team-backend via HTTP/REST API
- Remove duplicate WebSocket connection from team-ui/server to core-agent
- Use team-backend as single point of communication with core-agent

### Option 2: Unified Socket.IO Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ team-ui/client  │    │ team-ui/server  │    │  team-backend   │    │ team-core-agent │    │      LLM        │
│                 │    │                 │    │                 │    │                 │    │                 │
│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ qwen-code       │
│ Client          │    │ Client/Server   │    │ Client/Server   │    │ Server          │    │ Client          │
│ (Port 8003)     │    │ (Port 8002)     │    │ (Port 8000)     │    │ (Port 8001)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Option 3: Direct UI Architecture (Simplified)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ team-ui/client  │    │ team-ui/server  │    │ team-core-agent │    │      LLM        │
│                 │    │                 │    │                 │    │                 │
│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ qwen-code       │
│ Client          │    │ Server          │    │ Server          │    │ Client          │
│ (Port 8003)     │    │ (Port 8002)     │    │ (Port 8001)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```
**Note:** This option removes team-backend entirely

## Implementation Priorities

### Immediate Fixes (P0) - CRITICAL
1. **Fix team-ui/client connection** - Change from port 8001 to 8002
2. **Fix port configuration** - Ensure team-ui/server runs on 8002 consistently  
3. **Remove duplicate core-agent connections** - Choose single service to connect
4. **Fix team-ui/client to team-ui/server Socket.IO communication**

### Short-term Improvements (P1) - HIGH
1. **Implement proper layered architecture** - team-ui/server → team-backend → team-core-agent
2. **Remove duplicate session management** from team-ui/server
3. **Fix streaming implementation** for real-time responses
4. **Add connection error handling** and retry logic
5. **Consolidate authentication** across all services

### Long-term Enhancements (P2) - MEDIUM
1. **Implement load balancing** for multiple core-agent instances
2. **Add connection pooling** for better resource management
3. **Implement message queuing** for reliability
4. **Add comprehensive monitoring** and logging
5. **Optimize resource usage** and eliminate waste

## Testing Recommendations

### Unit Tests
- WebSocket connection establishment
- Message format validation
- Protocol compatibility

### Integration Tests
- End-to-end message flow
- Streaming functionality
- Error handling scenarios

### Load Tests
- Multiple concurrent connections
- Message throughput
- Connection stability

## Conclusion

The current WebSocket implementation has **catastrophic architectural flaws** that prevent proper communication between components:

1. **Multiple Port Conflicts**: team-ui/client, team-ui/server, and team-backend all compete for port 8001
2. **Protocol Mismatches**: Mixed use of Socket.IO and native WebSocket protocols creates incompatibility
3. **Architectural Bypass**: team-ui/server bypasses team-backend, wasting resources and creating duplication
4. **Resource Competition**: Multiple services connect to core-agent simultaneously
5. **Broken Communication Chains**: No component can properly communicate with others

**Current System Status**: ❌ **COMPLETELY NON-FUNCTIONAL**
- team-ui/client ↔ team-ui/server: ❌ Broken (port mismatch)
- team-ui/server ↔ team-backend: ❌ No communication (bypass)
- team-backend → team-core-agent: ✅ Works but isolated
- team-ui/server → team-core-agent: ✅ Works but competes with backend
- Overall: ❌ System cannot function

**Immediate action required** to implement proper layered architecture and fix critical port/protocol issues before the system can be considered functional for any use case.
