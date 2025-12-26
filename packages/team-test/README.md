# Team Layer E2E Tests

End-to-end functional tests for all team packages.

## Test Coverage

### team-storage (Port 8000)
- Health checks
- User authentication (signup/login)
- Team management (create/join)
- Session management
- File operations
- Vector search

### team-ai-agent (Port 8001)
- WebSocket connection
- ACP protocol (ping/pong)
- Session management
- Chat handler
- Error handling

### team-service (Port 8002)
- Health checks
- WebSocket connection
- Session management
- AI service integration
- Proxy endpoints
- Configuration

### team-web (Port 8003)
- Static file serving
- API proxy
- WebSocket proxy
- SPA routing
- Performance

## Running Tests

### Prerequisites

All services must be running:

```bash
# Terminal 1: team-storage
cd packages/team-storage
npm run dev

# Terminal 2: team-ai-agent
cd packages/team-ai-agent
npm run dev

# Terminal 3: team-service
cd packages/team-service
npm run dev

# Terminal 4: team-web
cd packages/team-web
npm run dev
```

### Run All Tests

```bash
cd packages/team-test
npm test
```

### Run Individual Tests

```bash
npm run test:storage    # Test team-storage
npm run test:ai-agent   # Test team-ai-agent
npm run test:service    # Test team-service
npm run test:web        # Test team-web
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage

```bash
npm run test:coverage
```

## Test Structure

```
team-test/
├── tests/
│   ├── storage.test.js      # team-storage tests
│   ├── ai-agent.test.js     # team-ai-agent tests
│   ├── service.test.js      # team-service tests
│   └── web.test.js          # team-web tests
├── fixtures/
│   └── mockData.js          # Test data
├── utils/
│   └── helpers.js           # Test utilities
├── run-tests.js             # Test runner
└── jest.config.js           # Jest configuration
```

## Writing Tests

### Example Test

```javascript
import axios from 'axios';
import { URLS, waitForService } from '../utils/helpers.js';

describe('My Feature', () => {
  beforeAll(async () => {
    await waitForService(URLS.STORAGE);
  });

  test('should work', async () => {
    const response = await axios.get(`${URLS.STORAGE}/api/endpoint`);
    expect(response.status).toBe(200);
  });
});
```

### Utilities

- `URLS` - Service URLs
- `PORTS` - Service ports
- `waitForService(url)` - Wait for service to be ready
- `sleep(ms)` - Async sleep
- `generateTestUser()` - Generate test user data
- `generateTestTeam()` - Generate test team data
- `TestCleanup` - Resource cleanup helper

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Start services
        run: |
          npm run dev:storage &
          npm run dev:ai-agent &
          npm run dev:service &
          npm run dev:web &
          sleep 10
      
      - name: Run tests
        run: npm test -w @qwen-team/test
```

## Troubleshooting

### Service Not Ready

If tests fail with "Service not ready":

1. Check all services are running
2. Verify ports are correct (8000, 8001, 8002, 8003)
3. Check service logs for errors
4. Increase timeout in `waitForService()`

### WebSocket Connection Failed

1. Ensure WebSocket server is running
2. Check firewall settings
3. Verify WebSocket URL is correct

### Test Timeout

1. Increase Jest timeout in test file:
   ```javascript
   jest.setTimeout(30000); // 30 seconds
   ```

2. Or in jest.config.js:
   ```javascript
   testTimeout: 30000
   ```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up resources after tests
3. **Timeouts**: Set reasonable timeouts for async operations
4. **Mocking**: Mock external dependencies when possible
5. **Assertions**: Use specific assertions, not just truthy checks

## License

Same as main Qwen Code project
