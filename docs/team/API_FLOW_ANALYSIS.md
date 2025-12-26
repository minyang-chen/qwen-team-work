# API Call Flow Analysis

## Current Architecture Issues

### 🚨 **Critical Problem: Dual Communication Paths**

The current implementation has **inconsistent communication patterns**:

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│  team-ui-client │◄────────────────►│ team-ui-server  │
│                 │                  │                 │
│                 │    HTTP API      │                 │
│                 │◄─────────────────┼─────────────────┤
│                 │                  │                 │
└─────────────────┘                  │ team-storage    │
                                     │                 │
                                     └─────────────────┘
```

### **Current API Call Flow:**

1. **HTTP API Calls** (Login, Settings, etc.):
   ```
   team-ui-client → team-storage → team-ai-agent → LLM
   ```

2. **WebSocket Chat Messages**:
   ```
   team-ui-client → team-ui-server → team-ai-agent → LLM
   ```

### **Problems:**

1. **Dual Authentication**: Client needs to authenticate with both services
2. **Inconsistent Routing**: Some requests bypass team-ui-server
3. **Complex State Management**: Session state split across services
4. **Security Gaps**: Multiple attack surfaces
5. **Maintenance Overhead**: Two different communication patterns

## Recommended Solutions

### **Option 1: Unified Gateway (Recommended)**

Route ALL requests through team-ui-server:

```
team-ui-client → team-ui-server → team-storage → team-ai-agent → LLM
```

**Implementation:**
- Add HTTP API proxy routes to team-ui-server
- Forward all `/api/*` requests to team-storage
- Single authentication point
- Consistent error handling

### **Option 2: Direct Backend (Alternative)**

Route ALL requests through team-storage:

```
team-ui-client → team-storage → team-ai-agent → LLM
```

**Implementation:**
- Move WebSocket handling to team-storage
- Remove team-ui-server WebSocket functionality
- Consolidate all communication in team-storage

### **Option 3: Microservices (Complex)**

Keep separate services but add proper API gateway:

```
team-ui-client → API Gateway → {team-ui-server, team-storage} → team-ai-agent → LLM
```

## Detailed Flow Analysis

### **Current HTTP API Endpoints (team-storage):**

```typescript
// Authentication
POST /api/auth/signup
POST /api/auth/login

// User Management  
GET /api/user/me
GET /api/user/profile
PUT /api/user/profile

// Team Management
POST /api/teams/create
GET /api/teams/my-teams
POST /api/teams/join

// Chat (HTTP - Server-Sent Events)
POST /api/chat/message  // ← Streams response
GET /api/chat/history

// File Management
GET /api/files/list
POST /api/files/upload
DELETE /api/files/delete

// Project Management
GET /api/teams/:teamId/projects
POST /api/teams/:teamId/projects
// ... many more project endpoints
```

### **Current WebSocket Events (team-ui-server):**

```typescript
// Chat Communication
socket.emit('chat:message', { userId, sessionId, message })
socket.on('message:chunk', { type, data })
socket.on('message:complete')
socket.on('error', { message })
```

### **LLM Integration Points:**

1. **team-ai-agent → LLM**:
   ```typescript
   // Direct HTTP calls to LLM API
   fetch(OPENAI_BASE_URL + '/chat/completions', {
     headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
     body: JSON.stringify({ model: OPENAI_MODEL, messages })
   })
   ```

2. **team-storage → LLM** (via team-ai-agent):
   ```typescript
   // WebSocket ACP protocol
   acpConnectionManager.sendMessage(userId, message, workspacePath)
   ```

## Implementation Plan

### **Phase 1: Unified Gateway Implementation**

1. **Add HTTP Proxy to team-ui-server**:
   ```typescript
   // Forward all /api/* requests to team-storage
   app.all('/api/*', async (request, reply) => {
     const response = await fetch(`${BACKEND_URL}${request.url}`, {
       method: request.method,
       headers: request.headers,
       body: request.body
     });
     return response;
   });
   ```

2. **Update Client Configuration**:
   ```typescript
   // Change all API calls to go through team-ui-server
   const API_BASE_URL = 'http://localhost:8002'; // team-ui-server
   ```

3. **Consolidate Authentication**:
   ```typescript
   // Single JWT validation in team-ui-server
   // Forward authenticated requests to team-storage
   ```

### **Phase 2: Optimize Communication**

1. **Eliminate Redundant WebSocket Connection**:
   - team-storage no longer needs Socket.IO client
   - Direct HTTP calls to team-ui-server for chat

2. **Streamline Message Flow**:
   ```
   Client WebSocket → UI Server → Backend HTTP → Core Agent WebSocket → LLM HTTP
   ```

3. **Unified Error Handling**:
   - Consistent error format across all endpoints
   - Proper error propagation through the chain

### **Phase 3: Performance Optimization**

1. **Connection Pooling**:
   - Reuse HTTP connections between services
   - WebSocket connection management

2. **Caching Layer**:
   - Cache frequent API responses
   - Session state caching

3. **Load Balancing**:
   - Multiple instances of each service
   - Proper health checks

## Security Considerations

### **Current Security Issues:**

1. **Multiple Auth Points**: Client authenticates with multiple services
2. **Token Propagation**: JWT tokens passed through multiple hops
3. **CORS Configuration**: Multiple CORS configurations to maintain

### **Recommended Security Model:**

1. **Single Authentication Point**: team-ui-server only
2. **Service-to-Service Auth**: Internal JWT tokens for backend communication
3. **Rate Limiting**: Centralized rate limiting in team-ui-server
4. **Input Validation**: Validate at gateway, trust internal services

## Migration Strategy

### **Step 1: Add Proxy Routes** (Low Risk)
- Add HTTP proxy to team-ui-server
- Keep existing direct backend calls as fallback

### **Step 2: Update Client** (Medium Risk)  
- Change client API base URL
- Test all endpoints work through proxy

### **Step 3: Remove Direct Access** (High Risk)
- Block direct client-to-backend communication
- Remove redundant authentication

### **Step 4: Optimize** (Low Risk)
- Remove unnecessary WebSocket connections
- Implement caching and pooling

## Testing Strategy

1. **API Compatibility Tests**: Ensure all endpoints work through proxy
2. **Performance Tests**: Measure latency impact of additional hop
3. **Security Tests**: Verify authentication and authorization
4. **Load Tests**: Test under realistic traffic patterns

## Conclusion

The current dual-path architecture creates unnecessary complexity and security risks. **Option 1 (Unified Gateway)** is recommended as it:

- ✅ Maintains existing functionality
- ✅ Simplifies client implementation  
- ✅ Centralizes security and monitoring
- ✅ Enables future optimizations
- ✅ Minimal migration risk
