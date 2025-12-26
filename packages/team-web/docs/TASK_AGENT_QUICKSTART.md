# Task Agent Tab - Quick Start Guide

## Overview

The Task Agent tab integrates the full Qwen Code chat interface into the Team Workspace, allowing team members to use AI assistance while managing team files and projects.

## Getting Started

### 1. Start the Servers

#### Web-UI Server (for chat functionality)

```bash
cd packages/web-ui/server
npm install
npm run dev
```

Server runs on: `http://localhost:3000`

#### Backend Server (for team workspace)

```bash
cd packages/team-storage
npm install
npm run dev
```

Server runs on: `http://localhost:3001`

#### Web-UI Client

```bash
cd packages/web-ui/client
npm install
npm run dev
```

Client runs on: `http://localhost:5173`

### 2. Access Team Workspace

1. Navigate to `http://localhost:5173/team.html`
2. Sign up or log in
3. You'll see the Team Dashboard with two tabs:
   - **Workspace**: Team and file management
   - **Task Agent**: AI chat interface

### 3. Using the Task Agent Tab

1. Click on the **Task Agent** tab
2. Wait for the chat session to initialize
3. Start chatting with the AI assistant
4. Use all standard chat features:
   - Send messages
   - Attach files
   - Execute tools
   - View file contents
   - Access settings

### 4. Switching Between Tabs

- Click **Workspace** to manage teams and files
- Click **Task Agent** to use the AI chat
- Your chat session persists when switching tabs
- File uploads in Workspace are separate from chat attachments

## Features Available in Task Agent Tab

### Chat Features

- ✅ Real-time streaming responses
- ✅ Message history
- ✅ Session management
- ✅ File attachments
- ✅ Tool execution with approval
- ✅ Code syntax highlighting
- ✅ Markdown rendering

### Settings

- Model selection
- Temperature control
- Max tokens
- System prompts
- Tool execution preferences

### File Operations

- View file contents inline
- Syntax highlighting
- Download files
- Multiple file support

## Architecture

```
┌─────────────────────────────────────┐
│      Team Workspace Dashboard       │
│  ┌───────────┬──────────────────┐  │
│  │ Workspace │   Task Agent     │  │
│  └───────────┴──────────────────┘  │
│                                     │
│  ┌─────────────────────────────┐  │
│  │  [Active Tab Content]       │  │
│  │                             │  │
│  │  Workspace: Team & Files    │  │
│  │  Task Agent: Chat Interface │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Troubleshooting

### Chat not loading

- Ensure web-ui server is running on port 3000
- Check browser console for errors
- Verify WebSocket connection

### Session initialization fails

- Check `/api/sessions` endpoint is accessible
- Verify authentication cookies
- Clear browser cache and retry

### Files not showing in Workspace

- Ensure backend server is running on port 3001
- Check authentication token
- Verify team membership

## Development

### Adding Features

1. **Modify TaskAgent Component**
   - Location: `packages/web-ui/client/src/pages/team/TaskAgent.tsx`
   - Add initialization logic
   - Handle loading states

2. **Update TeamDashboard**
   - Location: `packages/web-ui/client/src/pages/team/TeamDashboard.tsx`
   - Add new tabs
   - Modify navigation

3. **Extend ChatContainer**
   - Location: `packages/web-ui/client/src/components/ChatContainer.tsx`
   - Add team-specific features
   - Integrate with team API

### Testing

```bash
# Build client
cd packages/web-ui/client
npm run build

# Run tests (if available)
npm test
```

## Next Steps

1. **Team Context Integration**
   - Pass team ID to chat sessions
   - Access team files in chat context
   - Team-specific chat history

2. **Collaborative Features**
   - Shared chat sessions
   - Real-time collaboration
   - Team member presence

3. **Enhanced File Integration**
   - Reference team files in chat
   - Upload chat outputs to workspace
   - Bidirectional file sync

## Support

For issues or questions:

- Check the main README.md
- Review TASK_AGENT_ARCHITECTURE.md
- Open an issue on GitHub
