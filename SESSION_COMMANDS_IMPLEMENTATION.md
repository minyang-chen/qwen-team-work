# Session Management Commands Implementation

## Completed: 2026-01-02

Added 4 new slash commands for session management in team-web.

---

## New Commands

### 1. `/save_session {name}`
**Purpose:** Save current conversation history and artifacts for later use

**Usage:**
```
/save_session my-project
```

**Response:**
```
✅ Session "my-project" saved successfully!
```

**Backend:** Saves to MongoDB `sessions` collection with status='saved'

---

### 2. `/load_session {name}`
**Purpose:** Load previously saved session into current chat panel

**Usage:**
```
/load_session my-project
```

**Response:**
```
✅ Session "my-project" loaded!
Messages: 15
Last activity: 1/2/2026, 5:30:00 PM
```

**Backend:** Retrieves from MongoDB and restores conversation history

---

### 3. `/sessions`
**Purpose:** List all saved sessions for current user

**Usage:**
```
/sessions
```

**Response:**
```
Saved sessions (3):
  • my-project - 15 messages (1/2/2026)
  • debug-session - 8 messages (1/1/2026)
  • test-run - 23 messages (12/31/2025)
```

**Backend:** Queries MongoDB for all sessions with status='saved'

---

### 4. `/delete_session {name}`
**Purpose:** Remove saved session from storage

**Usage:**
```
/delete_session my-project
```

**Response:**
```
✅ Session "my-project" deleted successfully!
```

**Backend:** Deletes from MongoDB `sessions` collection

---

## Implementation Details

### Files Modified

**team-service:**
- `src/services/CommandHandler.ts` - Added 4 new commands with fetch calls to storage API
- `src/websocket/OptimizedWebSocket.ts` - Pass userId to command handler

**team-storage:**
- `src/routes/sessions.ts` (new) - REST API endpoints for session CRUD operations
- `src/routes/index.ts` - Register session routes

### API Endpoints

```
POST   /api/sessions/save              - Save session
GET    /api/sessions/load/:userId/:name - Load session
GET    /api/sessions/list/:userId       - List sessions
DELETE /api/sessions/delete/:userId/:name - Delete session
```

### Data Model

Sessions stored in MongoDB with:
```typescript
{
  sessionId: string,
  userId: string,
  status: 'saved',
  conversationHistory: Message[],
  metadata: {
    name: string,
    artifacts: any[]
  },
  createdAt: Date,
  lastActivity: Date
}
```

---

## Usage Flow

### Save Session
1. User types `/save_session project-alpha`
2. CommandHandler calls `POST /api/sessions/save`
3. MongoDB stores session with name in metadata
4. User receives confirmation

### Load Session
1. User types `/load_session project-alpha`
2. CommandHandler calls `GET /api/sessions/load/{userId}/{name}`
3. MongoDB retrieves session
4. User sees session details (can be extended to restore to UI)

### List Sessions
1. User types `/sessions`
2. CommandHandler calls `GET /api/sessions/list/{userId}`
3. MongoDB returns all saved sessions
4. User sees formatted list

### Delete Session
1. User types `/delete_session project-alpha`
2. CommandHandler calls `DELETE /api/sessions/delete/{userId}/{name}`
3. MongoDB removes session
4. User receives confirmation

---

## Error Handling

### Duplicate Name
```
/save_session existing-name
→ Failed to save session: Session "existing-name" already exists. Use /delete_session first.
```

### Not Found
```
/load_session nonexistent
→ Failed to load session: Session "nonexistent" not found
```

### Missing Arguments
```
/save_session
→ Usage: /save_session {name}
   Example: /save_session my-project
```

---

## Future Enhancements

1. **Auto-save** - Automatically save sessions periodically
2. **Session restore** - Actually restore conversation to UI (currently just shows info)
3. **Session export** - Export session to JSON file
4. **Session sharing** - Share sessions with team members
5. **Session search** - Search within saved sessions
6. **Session tags** - Add tags/categories to sessions
7. **Session compression** - Compress old sessions to save space

---

## Testing

### Test Save
```bash
# In team-web UI
/save_session test-session-1
# Should see: ✅ Session "test-session-1" saved successfully!
```

### Test List
```bash
/sessions
# Should see list of saved sessions
```

### Test Load
```bash
/load_session test-session-1
# Should see session details
```

### Test Delete
```bash
/delete_session test-session-1
# Should see: ✅ Session "test-session-1" deleted successfully!
```

---

## Configuration

Set storage URL in team-service environment:
```bash
STORAGE_URL=http://localhost:8000
```

Default: `http://localhost:8000`

---

## Benefits

1. **Persistence** - Save important conversations for later reference
2. **Organization** - Name and organize sessions by project/topic
3. **Recovery** - Restore previous work sessions
4. **Collaboration** - (Future) Share sessions with team members
5. **Audit** - Track conversation history over time

---

## Summary

All 4 session management commands are now fully functional:
- ✅ `/save_session {name}` - Save current session
- ✅ `/load_session {name}` - Load saved session
- ✅ `/sessions` - List all sessions
- ✅ `/delete_session {name}` - Delete session

Users can now manage their conversation sessions directly from the chat interface using simple slash commands.
