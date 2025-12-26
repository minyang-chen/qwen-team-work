# Start Script Usage Guide

## Quick Start

### Start All Services
```bash
./start_team_all.sh
```

### Start with Clean Build
```bash
./start_team_all.sh --clean
```

### Start and Run Tests
```bash
./start_team_all.sh --test
```

### Clean Build + Run Tests
```bash
./start_team_all.sh --clean --test
```

## What It Does

1. **Cleans ports** (8000-8003)
2. **Starts services** in order:
   - Core Agent (port 8001)
   - Backend (port 8000)
   - UI Server (port 8002)
   - UI Client (port 8003)
3. **Waits** for services to be ready (5 seconds)
4. **Runs tests** (if --test flag provided)
5. **Stops services** after tests complete

## Test Output

When using `--test` flag, you'll see:

```
🧪 Running E2E tests...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stopping all services...
```

## Exit Codes

- **0**: All tests passed (or no tests run)
- **1**: Tests failed

## Manual Testing

If you want to keep services running and test manually:

```bash
# Start services
./start_team_all.sh

# In another terminal, run tests
cd packages/team-test
npm test
```

## Troubleshooting

### Services Won't Start

1. Check if ports are in use: `lsof -i :8000-8003`
2. Kill processes manually: `kill -9 $(lsof -ti:8000)`
3. Try clean build: `./start_team_all.sh --clean`

### Tests Fail

1. Check service logs in terminal
2. Verify all services are running
3. Check environment variables in `.env` files
4. Run individual test suites:
   ```bash
   cd packages/team-test
   npm run test:storage
   npm run test:ai-agent
   npm run test:service
   npm run test:web
   ```

### Services Don't Stop

Press Ctrl+C again or manually kill:
```bash
pkill -f "team-storage"
pkill -f "team-ai-agent"
pkill -f "team-service"
pkill -f "team-web"
```
