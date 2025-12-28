# Qwen Code Web UI

Web-based interface for Qwen Code with full CLI functionality and real-time tool execution.

## Architecture

```
Browser (React) ←→ WebSocket/HTTP ←→ Server (Fastify) ←→ Core Package
```

## Features

- **Real-time Chat**: WebSocket streaming for instant responses
- **Authentication**: Qwen OAuth and OpenAI-compatible API support
- **Tool Execution**: Automatic tool execution in YOLO mode with continuation loop
- **Session Management**: Multiple concurrent sessions with history
- **Code Highlighting**: Syntax highlighting for code blocks
- **Status Bar**: Display login type and API endpoint
- **Auto-focus**: Input automatically focuses after agent responses
- **History Compression**: Compress conversation history to manage token limits
- **90%+ Code Reuse**: Shares core logic with CLI

## Quick Start

### Development

```bash
# From project root
npm install

# Start both server and client
npm run web-ui:dev

# Or start separately:
# Terminal 1: Server
npm run web-ui:server

# Terminal 2: Client
npm run web-ui:client
```

Access at: http://localhost:5173

### Production Build

```bash
# Build server
cd packages/web-ui/server
npm run build

# Build client
cd packages/web-ui/client
npm run build

# Start server
cd packages/web-ui/server
npm start
```

## Authentication

### Qwen OAuth (Recommended)

1. Click "Login with Qwen OAuth"
2. Authenticate in browser popup
3. Credentials are automatically cached

**Benefits:**

- 2,000 requests/day free
- 60 requests/minute rate limit
- Automatic token refresh

### OpenAI-Compatible API

1. Click "Login with OpenAI API"
2. Enter:
   - API Key
   - Base URL (e.g., `https://api.openai.com/v1`)
   - Model name (e.g., `gpt-4`)
3. Credentials stored in session

**Supported Providers:**

- OpenAI
- Alibaba Cloud (Bailian/ModelStudio)
- ModelScope
- OpenRouter
- Any OpenAI-compatible endpoint

## Project Structure

```
web-ui/
├── server/              # Backend (Fastify + Socket.io)
│   ├── src/
│   │   ├── SessionManager.ts    # Session lifecycle & auth
│   │   ├── ClientAdapter.ts     # Core client wrapper with tool loop
│   │   ├── ToolExecutor.ts      # Tool execution in YOLO mode
│   │   ├── websocket.ts         # WebSocket handlers
│   │   └── index.ts             # Server entry & auth endpoints
│   └── package.json
└── client/              # Frontend (React + Vite)
    ├── src/
    │   ├── components/          # UI components
    │   │   ├── ChatContainer.tsx
    │   │   ├── MessageInput.tsx
    │   │   ├── MessageList.tsx
    │   │   ├── Login.tsx
    │   │   ├── Settings.tsx
    │   │   ├── StatusBar.tsx
    │   │   └── SessionSidebar.tsx
    │   ├── hooks/               # React hooks
    │   ├── store/               # Zustand state
    │   ├── App.tsx
    │   └── main.tsx
    └── package.json
```

## Configuration

### Server Environment Variables

```bash
# Server
PORT=3000                    # Server port
JWT_SECRET=your-secret       # JWT signing secret
CORS_ORIGIN=http://localhost:5173  # Allowed CORS origin

# Qwen OAuth (optional)
QWEN_CLIENT_ID=your-client-id
QWEN_CLIENT_SECRET=your-client-secret

# OpenAI Fallback (optional)
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
```

### Client Configuration

Vite proxy configured to forward `/api` requests to server (port 3000).

## API Endpoints

### REST API

**Authentication:**

- `GET /api/auth/qwen` - Initiate Qwen OAuth flow
- `GET /api/auth/qwen/callback` - OAuth callback handler
- `POST /api/auth/openai` - Login with OpenAI-compatible API
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/info` - Get current auth info

**Sessions:**

- `POST /api/sessions` - Create new session
- `GET /api/sessions` - List user sessions
- `GET /api/sessions/:id/stats` - Get session statistics
- `POST /api/sessions/:id/compress` - Compress session history
- `DELETE /api/sessions/:id` - Delete session

### WebSocket Events

**Client → Server:**

- `chat:message` - Send chat message
- `chat:cancel` - Cancel ongoing request
- `session:history` - Get session history
- `session:compress` - Compress session history

**Server → Client:**

- `message:chunk` - Streaming message chunk
- `message:complete` - Message complete
- `message:error` - Error occurred
- `tool:call` - Tool execution started
- `tool:response` - Tool execution result
- `session:history` - Session history data
- `session:compressed` - Compression complete

## Tool Execution

The web-ui implements automatic tool execution with a continuation loop:

1. **Detection**: Tool calls are detected from LLM response
2. **Execution**: Tools execute automatically in YOLO mode via `CoreToolScheduler`
3. **Display**: Tool execution and results shown in real-time
4. **Continuation**: Results fed back to LLM to continue conversation
5. **Loop**: Process repeats until no more tools needed

**Implementation:**

- `ToolExecutor.ts` - Wraps CoreToolScheduler for YOLO mode
- `ClientAdapter.ts` - Collects tool requests and manages continuation loop
- Tool results formatted as `responseParts` and submitted back to LLM

## Development

### Adding Features

1. **Backend**: Add handlers in `server/src/websocket.ts`
2. **Frontend**: Add components in `client/src/components/`
3. **State**: Update store in `client/src/store/chatStore.ts`

### Code Reuse

The server reuses the entire `@qwen-code/core` package:

- Client logic
- Tool system (CoreToolScheduler)
- API integration
- Authentication
- Services

Example:

```typescript
import { Client, Config, CoreToolScheduler } from '@qwen-code/core';

const config = new Config({ ... });
const client = new Client(config);
const toolExecutor = new ToolExecutor(config);

const stream = client.sendMessageStream(message);
const results = await toolExecutor.executeTools(toolRequests);
```

## Testing

```bash
# Server tests
cd packages/web-ui/server
npm test

# Client tests
cd packages/web-ui/client
npm test
```

## Deployment

### Docker

```bash
# Build images
docker build -t qwen-code-server ./packages/web-ui/server
docker build -t qwen-code-client ./packages/web-ui/client

# Run with docker-compose
docker-compose up
```

### Manual

1. Build both packages
2. Serve client static files with nginx
3. Run server with PM2 or systemd
4. Configure reverse proxy
5. Set environment variables

## Security

- JWT authentication with httpOnly cookies
- Cookie expiration with `expires: new Date(0)` for proper logout
- CSRF protection
- Rate limiting
- Session isolation per user
- Tool execution in YOLO mode (auto-approved)
- Credentials cached in `~/.qwen/oauth_creds.json` for OAuth

## Troubleshooting

### WebSocket Connection Failed

Check CORS settings and ensure server is running on correct port.

### Session Not Found

Session may have expired. Refresh page to create new session.

### Tool Execution Hangs

Ensure `ToolExecutor` is properly initialized with session config. Check server logs for errors.

### Auth Info Shows Stale Data

Browser may be caching responses. The app now uses `cache: 'no-store'` to prevent this.

### Build Errors

Ensure all dependencies are installed:

```bash
npm install
```

## Recent Updates (v1.0.0)

- ✅ Implemented full tool execution and continuation loop
- ✅ Added Qwen OAuth authentication support
- ✅ Added OpenAI-compatible API authentication
- ✅ Fixed cookie expiration for proper logout
- ✅ Added status bar showing login type and API endpoint
- ✅ Added settings modal with connection information
- ✅ Added auto-focus to input after agent responses
- ✅ Fixed tool execution hanging issue
- ✅ Added cache busting for auth info endpoints
- ✅ Implemented history compression support

## Documentation

- [Tool Execution Implementation](./TOOL_EXECUTION_IMPLEMENTATION.md)
- [Tool Call Fix Details](./TOOL_CALL_FIX.md)
- [Web UI Design](./WEB_UI_DESIGN.md)

## License

Same as main Qwen Code project.
