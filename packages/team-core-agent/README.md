# Qwen Core Agent - ACP Server

ACP (Agent Communication Protocol) server for qwen-code core integration.

## Installation

```bash
npm install
npm run build
```

## Running the Server

```bash
npm start
```

The server will start on port 8080 by default. Configure with environment variable:

```bash
PORT=9000 npm start
```

## Testing

Run integration tests:

```bash
npm test
```

Tests include:
- WebSocket connection and ping/pong
- Session management (create, get, delete)
- Chat functionality with message processing

## Architecture

- **AcpServer**: WebSocket server for ACP protocol
- **MessageRouter**: Routes messages to appropriate handlers
- **Handlers**: ChatHandler, SessionHandler, ToolHandler
- **Discovery**: Configuration-based agent discovery with health monitoring
- **Protocol**: Error handling, retry logic, message validation

## Message Types

- `ping`: Health check
- `session`: Session management (create/get/delete)
- `chat`: Chat message processing
- `tool`: Tool execution

## Configuration

Agent configuration in `src/index.ts`:

```javascript
const agents = [
  {
    id: 'qwen-core-1',
    name: 'Qwen Core Agent 1',
    host: 'localhost',
    port: 8081,
    priority: 1,
    capabilities: ['chat', 'code']
  }
];
```
