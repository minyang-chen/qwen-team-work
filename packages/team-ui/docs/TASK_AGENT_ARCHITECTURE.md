# Task Agent Tab Architecture

## Component Hierarchy

```
TeamDashboard
├── Tab Navigation
│   ├── Workspace Tab (default)
│   └── Task Agent Tab
│
├── Workspace Tab Content
│   ├── Create Team Section
│   ├── Join Team Section
│   ├── My Teams Section
│   ├── Files Section
│   └── Semantic Search Section
│
└── Task Agent Tab Content
    └── TaskAgent Component
        └── ChatContainer
            ├── SessionSidebar
            ├── MessageList
            ├── MessageInput
            ├── ToolApproval
            ├── FileViewer
            ├── Settings
            └── StatusBar
```

## Data Flow

```
User Interaction
      ↓
Tab Navigation (TeamDashboard)
      ↓
   [Switch Tab]
      ↓
┌─────────────────┬──────────────────┐
│  Workspace Tab  │  Task Agent Tab  │
└─────────────────┴──────────────────┘
         ↓                  ↓
    Team Backend      TaskAgent Init
         ↓                  ↓
   Team API Calls    Session Creation
         ↓                  ↓
   File Operations    ChatContainer
         ↓                  ↓
   Search/Upload      WebSocket Chat
```

## API Endpoints

### Workspace Tab (Team Backend - Port 3001)

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/teams/create` - Create team
- `POST /api/teams/join` - Join team
- `GET /api/files/list` - List files
- `POST /api/files/upload` - Upload file
- `GET /api/files/download` - Download file
- `DELETE /api/files/delete` - Delete file
- `POST /api/files/search` - Semantic search

### Task Agent Tab (Web-UI Server)

- `GET /api/sessions` - Get chat sessions
- `POST /api/sessions` - Create new session
- `WebSocket` - Real-time chat communication

## State Management

### TeamDashboard State

- `activeTab`: Current tab selection
- `showCreateTeam`: Create team modal state
- `showJoinTeam`: Join team modal state
- `teamName`, `teamId`: Form inputs
- `message`: Status messages
- `files`: File list
- `searchQuery`, `searchResults`: Search state
- `workspaceType`: Private/Team workspace
- `selectedTeamId`: Current team context

### TaskAgent State (via useChatStore)

- `sessionId`: Current chat session
- `sessions`: Available sessions
- `messages`: Chat history
- `isStreaming`: Streaming status
- `currentMessage`: Message being typed
- `pendingToolCalls`: Tool execution queue
- `currentFile`: File viewer state
- `isSettingsOpen`: Settings panel state
- `sessionStats`: Token usage stats

## Styling

- Tailwind CSS for all components
- Responsive design
- Tab navigation with active state indicators
- Full-height chat container
- Consistent color scheme with team workspace

## Future Enhancements

1. **Team Context in Chat**
   - Pass team ID to chat sessions
   - Access team files in chat
   - Team-specific chat history

2. **Shared Chat Sessions**
   - Multiple team members in same chat
   - Collaborative problem solving
   - Shared tool execution

3. **File Integration**
   - Reference team files in chat
   - Upload chat outputs to team workspace
   - Semantic search integration

4. **Permissions**
   - Role-based access to chat features
   - Team admin controls
   - Usage quotas per team
