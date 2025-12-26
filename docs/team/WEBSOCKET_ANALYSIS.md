# WebSocket Implementation Analysis

## Executive Summary

This analysis reveals **critical architectural inconsistencies** in the WebSocket implementation across the team packages. The current design has fundamental protocol mismatches and port conflicts that prevent proper communication between components.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ team-web  │    │ team-service  │    │  team-storage   │    │ team-ai-agent │    │      LLM        │
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
- **team-web connects to port 8001** expecting Socket.IO server
- **team-service connects to port 8001** expecting native WebSocket server  
- **team-storage connects to port 8001** expecting native WebSocket server
- **team-ai-agent runs on port 8001** as native WebSocket server
- **team-service runs on port 8002** but client tries to connect to 8001
- **Result**: Multiple connection failures and architectural chaos

### 2. **Protocol Mismatch Cascade (CRITICAL)**
- **team-web**: Uses Socket.IO client with events like `message:chunk`, `message:complete`
- **team-service**: Provides Socket.IO server but connects to core-agent via native WebSocket
- **team-storage**: Uses native WebSocket client with JSON message protocol
- **team-ai-agent**: Expects native WebSocket with ACP message format
- **Result**: Messages cannot be properly exchanged between any components

### 3. **Architectural Bypass (CRITICAL)**
- **team-service bypasses team-storage entirely**
- **Both team-service and team-storage connect directly to team-ai-agent**
- **team-storage's REST API, MongoDB, and session management are unused**
- **Result**: Duplicate functionality and wasted resources

### 4. **Streaming Implementation Chaos (HIGH)**
- **team-storage**: Implements Server-Sent Events (SSE) for streaming to UI
- **team-service**: Implements Socket.IO events for streaming to client
- **team-web**: Expects Socket.IO events but connects to wrong port
- **Result**: No working streaming functionality anywhere in the system

## Detailed Component Analysis

### team-web
**WebSocket Implementation**: Socket.IO Client
- **File**: `packages/team-web/src/hooks/useWebSocket.ts`
- **Connection**: `io('http://localhost:8001')` ❌ **WRONG PORT**
- **Events**: `message:chunk`, `message:complete`, `tool:call`, etc.
- **Issues**: 
  - Connects to port 8001 expecting Socket.IO server (but core-agent is native WebSocket)
  - Should connect to port 8002 where team-service Socket.IO runs
  - Event-based communication incompatible with native WebSocket

### team-service
**WebSocket Implementation**: Socket.IO Server + Native WebSocket Client
- **File**: `packages/team-service/src/websocket.ts` (Socket.IO server)
- **File**: `packages/team-service/src/session/UserSessionManager.js` (WebSocket client)
- **Port**: 8002 (Socket.IO server for client)
- **Connection**: `new WebSocket('ws://localhost:8001')` (to core-agent)
- **Events**: Handles `chat:message` events from client
- **Issues**:
  - Client connects to wrong port (8001 instead of 8002)
  - Bypasses team-storage entirely
  - Duplicates session management functionality

### team-storage
**WebSocket Implementation**: Native WebSocket Client + SSE
- **File**: `packages/team-storage/src/services/acpConnectionManager.ts`
- **Connection**: `new WebSocket('ws://localhost:8001')`
- **Protocol**: ACP message format with JSON
- **Streaming**: Server-Sent Events for UI communication
- **Issues**:
  - Connects to same port as team-service (resource competition)
  - SSE streaming has no client (team-web uses Socket.IO)
  - Completely isolated from UI flow

### team-ai-agent
**WebSocket Implementation**: Native WebSocket Server
- **File**: `packages/team-ai-agent/src/server/AcpServer.ts`
- **Port**: 8001
- **Protocol**: ACP message format with validation
- **Issues**:
  - Cannot handle Socket.IO connections from team-web
  - Receives duplicate connections from both team-service and team-storage
  - Expects pure WebSocket connections only

## Defects and Bugs

### 1. **Connection Failures**
- **team-web cannot establish Socket.IO connection** to core-agent's native WebSocket server
- **team-web connects to wrong port** (8001 instead of 8002)
- **Multiple clients competing** for same port (team-service and team-storage both connect to 8001)
- **team-service Socket.IO server has no clients** (client connects elsewhere)

### 2. **Message Routing Failures**
- **team-web messages never reach team-service** due to port mismatch
- **team-service messages reach core-agent** but bypass team-storage
- **team-storage messages reach core-agent** but are isolated from UI
- **Streaming responses fail** between all components

### 3. **Session Management Chaos**
- **team-web session management broken** due to connection failures
- **team-service implements own session management** (duplicates team-storage)
- **team-storage session management unused** by UI components
- **Inconsistent session state** across all services

### 4. **Resource Waste and Competition**
- **Duplicate WebSocket connections** to core-agent from two services
- **Unused team-storage infrastructure** (MongoDB, REST API, SSE)
- **Duplicate session management implementations**
- **team-storage completely bypassed** despite being most feature-complete

### 5. **Error Handling Gaps**
- **No fallback mechanisms** for connection failures
- **Silent failures** in message routing between components
- **Poor error reporting** to end users
- **No coordination** between competing services

## Recommended Architecture Fix

### Option 1: Proper Layered Architecture (RECOMMENDED)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ team-web  │    │ team-service  │    │  team-storage   │    │ team-ai-agent │    │      LLM        │
│                 │    │                 │    │                 │    │                 │    │                 │
│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ HTTP/REST API   │◄──►│ Native WebSocket│◄──►│ qwen-code       │
│ Client          │    │ Server          │    │ + WebSocket     │    │ Server          │    │ Client          │
│ (Port 8003)     │    │ (Port 8002)     │    │ (Port 8000)     │    │ (Port 8001)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Changes Required:**
- Fix team-web to connect to port 8002 (team-service)
- Make team-service communicate with team-storage via HTTP/REST API
- Remove duplicate WebSocket connection from team-service to core-agent
- Use team-storage as single point of communication with core-agent

### Option 2: Unified Socket.IO Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ team-web  │    │ team-service  │    │  team-storage   │    │ team-ai-agent │    │      LLM        │
│                 │    │                 │    │                 │    │                 │    │                 │
│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ qwen-code       │
│ Client          │    │ Client/Server   │    │ Client/Server   │    │ Server          │    │ Client          │
│ (Port 8003)     │    │ (Port 8002)     │    │ (Port 8000)     │    │ (Port 8001)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Option 3: Direct UI Architecture (Simplified)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ team-web  │    │ team-service  │    │ team-ai-agent │    │      LLM        │
│                 │    │                 │    │                 │    │                 │
│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ Socket.IO       │◄──►│ qwen-code       │
│ Client          │    │ Server          │    │ Server          │    │ Client          │
│ (Port 8003)     │    │ (Port 8002)     │    │ (Port 8001)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```
**Note:** This option removes team-storage entirely

## Implementation Priorities

### Immediate Fixes (P0) - CRITICAL
1. **Fix team-web connection** - Change from port 8001 to 8002
2. **Fix port configuration** - Ensure team-service runs on 8002 consistently  
3. **Remove duplicate core-agent connections** - Choose single service to connect
4. **Fix team-web to team-service Socket.IO communication**

### Short-term Improvements (P1) - HIGH
1. **Implement proper layered architecture** - team-service → team-storage → team-ai-agent
2. **Remove duplicate session management** from team-service
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

1. **Multiple Port Conflicts**: team-web, team-service, and team-storage all compete for port 8001
2. **Protocol Mismatches**: Mixed use of Socket.IO and native WebSocket protocols creates incompatibility
3. **Architectural Bypass**: team-service bypasses team-storage, wasting resources and creating duplication
4. **Resource Competition**: Multiple services connect to core-agent simultaneously
5. **Broken Communication Chains**: No component can properly communicate with others

**Current System Status**: ❌ **COMPLETELY NON-FUNCTIONAL**
- team-web ↔ team-service: ❌ Broken (port mismatch)
- team-service ↔ team-storage: ❌ No communication (bypass)
- team-storage → team-ai-agent: ✅ Works but isolated
- team-service → team-ai-agent: ✅ Works but competes with backend
- Overall: ❌ System cannot function

**Immediate action required** to implement proper layered architecture and fix critical port/protocol issues before the system can be considered functional for any use case.
