# Quick Start - Team Test Suite

## 1. Install Dependencies

```bash
cd packages/team-test
npm install
```

## 2. Start All Services

Open 4 terminals:

**Terminal 1 - Storage (Port 8000):**
```bash
cd packages/team-storage
npm run dev
```

**Terminal 2 - AI Agent (Port 8001):**
```bash
cd packages/team-ai-agent
npm run dev
```

**Terminal 3 - Service (Port 8002):**
```bash
cd packages/team-service
npm run dev
```

**Terminal 4 - Web (Port 8003):**
```bash
cd packages/team-web
npm run dev
```

## 3. Run Tests

**Terminal 5 - Tests:**
```bash
cd packages/team-test
npm test
```

## Expected Output

```
═══════════════════════════════════════
  Team Layer E2E Test Suite
═══════════════════════════════════════

▶ Running storage.test.js...
✓ storage.test.js passed

▶ Running ai-agent.test.js...
✓ ai-agent.test.js passed

▶ Running service.test.js...
✓ service.test.js passed

▶ Running web.test.js...
✓ web.test.js passed

═══════════════════════════════════════
  Test Summary
═══════════════════════════════════════

✓ storage.test.js
✓ ai-agent.test.js
✓ service.test.js
✓ web.test.js

Total: 4 | Passed: 4 | Failed: 0

✅ All tests passed!
```

## Run Individual Tests

```bash
npm run test:storage    # Test team-storage only
npm run test:ai-agent   # Test team-ai-agent only
npm run test:service    # Test team-service only
npm run test:web        # Test team-web only
```

## Troubleshooting

### "Service not ready" Error

1. Check all services are running
2. Verify correct ports: 8000, 8001, 8002, 8003
3. Check service logs for errors

### "Connection refused" Error

1. Ensure MongoDB is running (for storage)
2. Check environment variables are set
3. Verify no port conflicts

### Tests Timeout

Increase timeout in jest.config.js:
```javascript
testTimeout: 30000  // 30 seconds
```

## What Gets Tested

- ✅ HTTP endpoints
- ✅ WebSocket connections
- ✅ Authentication flows
- ✅ Session management
- ✅ File operations
- ✅ AI chat functionality
- ✅ Proxy routing
- ✅ Error handling

## Next Steps

1. Run tests to verify setup
2. Check test output for failures
3. Fix any failing tests
4. Add more test cases as needed
5. Integrate into CI/CD pipeline
