# ACP Production Deployment Checklist

## Pre-Deployment

### Dependencies
- [ ] Install Node.js 20+
- [ ] Install MongoDB 6.0+
- [ ] Install PostgreSQL 13+ (for migration)
- [ ] Install required npm packages: `npm install pg mongodb ws`

### Database Setup
- [ ] Configure MongoDB instance
- [ ] Set up MongoDB authentication
- [ ] Configure connection strings in environment variables
- [ ] Test MongoDB connectivity
- [ ] Prepare PostgreSQL source database (if migrating)

### Environment Configuration
- [ ] Set `MONGO_URL` environment variable
- [ ] Set `MONGO_DATABASE` environment variable  
- [ ] Configure `ACP_PORT` (default: 8080)
- [ ] Configure `BACKEND_PORT` (default: 3000)
- [ ] Configure `WEB_UI_PORT` (default: 3001)

## Deployment Steps

### 1. Build Packages
```bash
# Build shared package first
cd packages/shared && npm run build

# Build backend
cd ../backend && npm run build

# Build web-ui
cd ../web-ui && npm run build

# Build qwen-core-agent
cd ../qwen-core-agent && npm run build
```

### 2. Run Migration
```bash
# Execute database migration
node scripts/migrate-postgresql-to-mongodb.js
```

### 3. Deploy Services
```bash
# Use deployment script
./scripts/deploy-acp.sh

# Or start services manually:
npm run start:backend &
npm run start:web-ui &
npm run start:acp-agent &
```

## Post-Deployment Validation

### Service Health Checks
- [ ] Backend service responding on configured port
- [ ] Web UI service responding on configured port
- [ ] ACP agent WebSocket server accepting connections
- [ ] MongoDB connection established
- [ ] All services logging properly

### ACP Functionality Tests
- [ ] WebSocket connection to ACP server successful
- [ ] Ping/pong messages working
- [ ] Session creation and management working
- [ ] Chat message routing functional
- [ ] Agent discovery finding configured agents
- [ ] Error handling and retry logic working

### Validation Commands
```bash
# Run ACP validation
node scripts/validate-acp.cjs

# Test WebSocket connectivity
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');
ws.on('open', () => console.log('✅ ACP WebSocket connected'));
ws.on('error', (err) => console.log('❌ ACP WebSocket failed:', err.message));
"
```

## Security Checklist

### Database Security
- [ ] MongoDB authentication enabled
- [ ] Database access restricted to application servers
- [ ] Connection strings secured (not in code)
- [ ] Regular security updates applied

### Network Security
- [ ] HTTPS enabled for web services
- [ ] WebSocket connections secured (WSS in production)
- [ ] Firewall rules configured
- [ ] Rate limiting implemented

### Application Security
- [ ] Input validation on all ACP messages
- [ ] Session isolation verified
- [ ] Error messages don't leak sensitive information
- [ ] Logging configured appropriately

## Monitoring Setup

### Key Metrics to Monitor
- [ ] WebSocket connection count
- [ ] Active session count
- [ ] Message processing rate
- [ ] Error rate and types
- [ ] Database connection health
- [ ] Agent discovery success rate

### Alerting
- [ ] Service down alerts
- [ ] High error rate alerts
- [ ] Database connection failure alerts
- [ ] WebSocket connection limit alerts

## Backup and Recovery

### Database Backups
- [ ] MongoDB backup strategy configured
- [ ] Backup restoration tested
- [ ] Point-in-time recovery available

### Service Recovery
- [ ] Service restart procedures documented
- [ ] Rollback procedures prepared
- [ ] Health check endpoints configured

## Performance Optimization

### Database Performance
- [ ] MongoDB indexes created and optimized
- [ ] Query performance monitored
- [ ] Connection pooling configured
- [ ] Vector search performance validated

### Application Performance
- [ ] WebSocket connection pooling configured
- [ ] Session cleanup intervals optimized
- [ ] Message routing performance tested
- [ ] Memory usage monitored

## Documentation

### Operational Documentation
- [ ] Deployment procedures documented
- [ ] Troubleshooting guide created
- [ ] Configuration reference available
- [ ] API documentation updated

### Team Knowledge
- [ ] Team trained on ACP architecture
- [ ] Incident response procedures defined
- [ ] Escalation procedures documented
- [ ] Knowledge transfer completed

## Final Validation

### End-to-End Testing
- [ ] Complete user workflow tested
- [ ] Multi-user session isolation verified
- [ ] Agent failover tested
- [ ] Performance under load validated

### Sign-off
- [ ] Development team approval
- [ ] Operations team approval
- [ ] Security review completed
- [ ] Performance benchmarks met

## Go-Live

- [ ] All checklist items completed
- [ ] Monitoring active
- [ ] Support team notified
- [ ] Rollback plan ready
- [ ] **PRODUCTION DEPLOYMENT APPROVED** ✅
