# Qwen Code Web UI - Quick Start Guide

## Installation

```bash
# From project root
cd /workdisk/hosting/qwen-code

# Install dependencies
npm install
```

## Running the Web UI

### Option 1: Run Both (Recommended)

```bash
npm run web-ui:dev
```

This starts both server (port 3000) and client (port 5173).

### Option 2: Run Separately

**Terminal 1 - Server:**

```bash
npm run web-ui:server
# Server runs on http://localhost:3000
```

**Terminal 2 - Client:**

```bash
npm run web-ui:client
# Client runs on http://localhost:5173
```

## Access the Application

Open your browser to: **http://localhost:5173**

## First Use

1. **Auto-Login**: The app automatically logs you in (dev mode)
2. **Session Created**: A new session is created automatically
3. **Start Chatting**: Type your message and press Enter or click Send

## Example Interactions

### Basic Chat

```
You: Hello, what can you help me with?
Assistant: I can help you with code understanding, file operations,
shell commands, and more. What would you like to do?
```

### File Operations

```
You: List files in the current directory
Assistant: [Tool execution will be triggered]
```

### Code Questions

```
You: Explain the SessionManager class
Assistant: [Provides explanation based on code]
```

## Features Available

✅ Real-time streaming responses  
✅ Code syntax highlighting  
✅ Markdown rendering  
✅ Multi-line input (Shift+Enter)  
✅ Session persistence  
✅ Tool execution (when implemented)

## Configuration

### Server Configuration

Create `.env` in `packages/web-ui/server/`:

```env
PORT=3000
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Client Configuration

Edit `packages/web-ui/client/vite.config.ts` to change proxy settings.

## Troubleshooting

### Port Already in Use

Change ports in:

- Server: `packages/web-ui/server/src/index.ts` (PORT constant)
- Client: `packages/web-ui/client/vite.config.ts` (server.port)

### WebSocket Connection Failed

1. Ensure server is running
2. Check CORS settings
3. Verify ports are correct

### Session Not Found

Refresh the page to create a new session.

## Development Tips

### Hot Reload

Both server and client support hot reload:

- Server: Uses `tsx watch`
- Client: Uses Vite HMR

### Debugging

**Server:**

```bash
cd packages/web-ui/server
npm run dev
# Add breakpoints in your IDE
```

**Client:**
Use browser DevTools (F12) to debug React components.

### Adding Features

1. **New API Endpoint**: Edit `server/src/index.ts`
2. **New WebSocket Event**: Edit `server/src/websocket.ts`
3. **New UI Component**: Add to `client/src/components/`
4. **State Management**: Update `client/src/store/chatStore.ts`

## Next Steps

- [ ] Add tool approval UI
- [ ] Implement file viewer
- [ ] Add settings panel
- [ ] Support multiple sessions
- [ ] Add OAuth authentication
- [ ] Implement history compression UI

## Production Deployment

See `README.md` for production deployment instructions.

## Getting Help

- Check `README.md` for detailed documentation
- Review `WEB_UI_DESIGN.md` for architecture details
- Open an issue on GitHub

## License

Same as main Qwen Code project.
