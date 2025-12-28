# ACP Deployment Guide

## Overview

This guide covers deploying the complete ACP (Agent Communication Protocol) implementation for Qwen Code.

## Prerequisites

- Node.js 20+
- MongoDB 6.0+
- PostgreSQL 13+ (for migration source)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build packages
npm run build

# 3. Run migration
node scripts/migrate-postgresql-to-mongodb.js

# 4. Deploy services
./scripts/deploy-acp.sh
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web UI        │    │   Backend       │    │ qwen-core-agent │
│ (UserSession    │◄──►│  (MongoDB)      │◄──►│   (ACP Server)  │
│  Manager)       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │    MongoDB      │
                    │  (Vector Search)│
                    └─────────────────┘
```

## Services

### 1. Backend Service
- **Port**: 3000
- **Database**: MongoDB
- **Features**: Unified models, session service

### 2. Web UI Service  
- **Port**: 3001
- **Features**: UserSessionManager, ACP client integration

### 3. ACP Agent Service
- **Port**: 8080 (WebSocket)
- **Features**: Message routing, agent discovery, protocol handling

## Configuration

### Environment Variables

```bash
# MongoDB
MONGO_URL=mongodb://localhost:27017
MONGO_DATABASE=qwen_code

# ACP Server
ACP_PORT=8080
ACP_HOST=0.0.0.0

# Backend
BACKEND_PORT=3000

# Web UI
WEB_UI_PORT=3001
```

### Agent Configuration

Edit `packages/web-ui/server/config/agents.json`:

```json
[
  {
    "id": "qwen-core-1",
    "name": "Qwen Core Agent 1", 
    "host": "localhost",
    "port": 8080,
    "priority": 1,
    "capabilities": ["chat", "code", "tools"]
  }
]
```

## Production Deployment

### 1. Database Setup

```bash
# Install MongoDB
# Configure connection string
# Run migration script with actual databases
```

### 2. Service Deployment

```bash
# Build all packages
npm run build

# Start services in order
npm run start:backend
npm run start:web-ui  
npm run start:acp-agent
```

### 3. Health Checks

```bash
# Validate deployment
node scripts/validate-acp.cjs

# Test ACP connectivity
curl -I http://localhost:3000/health
curl -I http://localhost:3001/health
```

## Troubleshooting

### Common Issues

1. **ES Module Errors**: Ensure all scripts use proper ES module syntax
2. **Database Connection**: Verify MongoDB is running and accessible
3. **Port Conflicts**: Check no other services are using required ports
4. **Dependencies**: Run `npm install` in each package directory

### Logs

- Backend: Check console output for MongoDB connection status
- Web UI: Check browser console for ACP client errors  
- ACP Agent: Check WebSocket connection logs

## Monitoring

### Key Metrics
- WebSocket connections active
- Session count and cleanup
- Message routing success rate
- Agent discovery health status

### Health Endpoints
- Backend: `GET /health`
- Web UI: `GET /health`
- ACP Agent: WebSocket ping/pong

## Security

- Configure MongoDB authentication
- Use HTTPS in production
- Implement rate limiting
- Validate all ACP messages
- Secure WebSocket connections

## Scaling

- Multiple ACP agent instances
- MongoDB replica sets
- Load balancer for Web UI
- Session affinity for WebSocket connections
