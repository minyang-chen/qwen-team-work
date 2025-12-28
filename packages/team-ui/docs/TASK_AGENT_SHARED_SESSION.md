# Task Agent Shared Session with OpenAI Config

## Overview

Task Agent now automatically authenticates using OpenAI configuration from the `.env.team` file, allowing team members to share the same chat session without additional authentication.

## How It Works

### Authentication Flow

```
User logs into Team Workspace
         ↓
Clicks "Task Agent" tab
         ↓
TaskAgent fetches OpenAI config from backend
         ↓
Auto-authenticates with web-ui server
         ↓
Creates/loads shared session
         ↓
Chat interface ready
```

### Configuration Source

OpenAI credentials are read from **workspace root** `.env.team` file:

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=http://your-endpoint/v1
OPENAI_MODEL=gpt3.5-turbo
```

## Implementation Details

### Backend Changes

**File**: `packages/team-backend/src/routes/index.ts`

Added new endpoint:

```typescript
router.get('/api/team/openai-config', authenticate, (req, res) => {
  res.json({
    apiKey: config.openai.apiKey,
    baseUrl: config.openai.baseUrl,
    model: config.openai.model,
  });
});
```

### Frontend Changes

**File**: `packages/web-ui/client/src/pages/team/TaskAgent.tsx`

1. Fetches OpenAI config from backend using team auth token
2. Authenticates with web-ui server using OpenAI credentials
3. Creates or loads existing session
4. All team members share the same configuration

## Benefits

✅ **No Additional Auth**: Users already authenticated in team workspace  
✅ **Shared Configuration**: All team members use same OpenAI endpoint  
✅ **Centralized Management**: Update config in one place (.env.team)  
✅ **Session Sharing**: Team members can share session IDs  
✅ **Seamless Experience**: No login prompts when switching to Task Agent tab

## Usage

### For Users

1. Log into Team Workspace
2. Click "Task Agent" tab
3. Chat interface loads automatically
4. Start chatting immediately

### For Administrators

1. Configure OpenAI credentials in `.env.team`:

   ```env
   OPENAI_API_KEY=sk-...
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=gpt-4
   ```

2. Restart backend server:

   ```bash
   cd packages/team-backend
   npm run dev
   ```

3. All team members will use these credentials

## Session Sharing

Team members can share session IDs to collaborate:

1. User A creates a session in Task Agent
2. Session ID is visible in the UI
3. User A shares session ID with User B
4. User B can load the same session
5. Both see the same conversation history

## Security Considerations

⚠️ **API Key Exposure**: Backend exposes OpenAI credentials to authenticated users  
⚠️ **Shared Sessions**: All team members can access shared sessions  
⚠️ **Rate Limits**: Shared API key means shared rate limits

### Recommendations

- Use dedicated API keys for team workspaces
- Implement usage quotas per team
- Monitor API usage
- Rotate keys regularly
- Consider team-specific rate limiting

## Troubleshooting

### "Failed to get OpenAI config"

- Verify backend server is running
- Check team authentication token is valid
- Ensure OpenAI config is set in `.env.team`

### "Failed to authenticate"

- Check web-ui server is running
- Verify OpenAI credentials are valid
- Check CORS settings allow requests

### Session not loading

- Clear browser cookies
- Check WebSocket connection
- Verify session exists in database

## API Endpoints

### Backend (Port 3001)

- `GET /api/team/openai-config` - Returns OpenAI configuration
  - Requires: Team authentication token
  - Returns: `{ apiKey, baseUrl, model }`

### Web-UI Server (Port 3000)

- `POST /api/auth/login/openai` - Authenticate with OpenAI credentials
  - Body: `{ apiKey, baseUrl, model }`
  - Sets: `auth_token` cookie
  - Returns: `{ userId, token }`

- `GET /api/sessions` - List chat sessions
- `POST /api/sessions` - Create new session

## Future Enhancements

1. **Team-Specific Sessions**
   - Separate sessions per team
   - Team-scoped conversation history

2. **Usage Tracking**
   - Monitor API usage per team
   - Implement quotas and limits

3. **Multi-Model Support**
   - Allow teams to configure multiple models
   - Switch models per conversation

4. **Audit Logging**
   - Track who accessed which sessions
   - Log API usage per user
