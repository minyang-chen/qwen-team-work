# Streaming Truncation Issue - Unsolved

## Problem Summary
After the 3rd user prompt, the task agent chat UI stops displaying responses, even though the LLM generates complete responses. The issue is in our application's streaming implementation, not the model server.

## Evidence

### Model Server Works Correctly
Direct API calls to the model server generate complete responses:
```bash
curl -X POST http://10.0.0.139:8080/v1/chat/completions \
  -d '{"model": "gpt-3.5-turbo", "messages": [{"role": "user", "content": "hello"}], "stream": false}' \
  | jq -r '.choices[0].message.content'

# Returns: <|channel|>analysis<|message|>...<|end|>Hello! How can I help you today?
```

### Application Streaming Fails
Our application receives incomplete responses after 3rd message:
```
Message 1-2: ✅ Works - content after <|end|>
Message 3+:  ❌ Fails - no content after <|end|>
```

## Observed Pattern

### Successful Response (Messages 1-2)
```
Stream chunk received: content string <|channel|>analysis<|message|>...
Stream chunk received: content string <|end|>...
Stream chunk received: content string Hello! How can I help you today?
Final response: <|channel|>analysis<|message|>...<|end|>Hello! How can I help you today?
Content after <|end|>: Hello! How can I help you today?
```

### Failed Response (Messages 3+)
```
Stream chunk received: content string <|channel|>analysis<|message|>...
Stream chunk received: content string <|end|>...
Stream chunk received: finished object [object Object]...
Final response: <|channel|>analysis<|message|>...<|end|>
Content after <|end|>: NONE
```

## Root Cause Analysis

### Confirmed NOT the Issue
- ❌ Model server configuration - direct API calls work
- ❌ Stop tokens - already filtered out in pipeline.ts
- ❌ Max tokens - set to 8192, plenty for responses
- ❌ Parsing logic - works correctly for first 2 messages

### Suspected Root Cause
**Conversation History Poisoning**: The model sees incomplete conversation history after the 2nd message and switches to analysis-only mode.

### Streaming Flow
```
User → Backend → ACP WebSocket → qwen-core-agent → CoreAdapter → OpenAI Pipeline → Model Server
                                                                                    ↓
UI  ← Backend ← ACP WebSocket ← qwen-core-agent ← CoreAdapter ← OpenAI Pipeline ← Model Server
```

## Investigation Attempts

### 1. ACP WebSocket Streaming Fix
**Issue**: ACP was doing "fake streaming" - waiting for complete responses
**Fix Applied**: Updated to handle `type: 'chunk'` and `type: 'complete'` messages
**Result**: Issue persists

### 2. Conversation History Management
**Issue**: Adding user messages to client history but not assistant responses
**Attempts**:
- Remove `addHistory()` calls - caused loss of context
- Add assistant responses to history - caused infinite loops
- Clear history after each message - `clearHistory()` doesn't exist

### 3. Request Logging
**Added**: Full request logging in pipeline.ts
**Status**: Logs not appearing, need to verify configuration

## Current State

### What Works
- Direct API calls to model server
- First 2 messages in application
- Non-streaming responses (when they work)

### What Fails
- Messages 3+ in streaming mode
- UI displays empty responses
- Model generates analysis-only responses

## Technical Details

### Key Files
- `/packages/qwen-core-agent/src/adapters/CoreAdapter.ts` - Message processing
- `/packages/backend/src/services/acpConnectionManager.ts` - WebSocket streaming
- `/packages/core/src/core/openaiContentGenerator/pipeline.ts` - OpenAI client
- `/packages/backend/src/controllers/chatController.ts` - Response parsing

### Error Pattern
```javascript
// This works for messages 1-2
response = "<|channel|>analysis<|message|>...<|end|>Hello! How can I help you today?"

// This fails for messages 3+
response = "<|channel|>analysis<|message|>...<|end|>"
```

## Next Steps for Investigation

1. **Verify Request Logging**: Check if full request logging is working
2. **Compare Requests**: Compare successful vs failed requests to model server
3. **Conversation Context**: Investigate how conversation history affects model behavior
4. **Streaming Pipeline**: Deep dive into OpenAI streaming implementation
5. **WebSocket Messages**: Log all ACP WebSocket messages to trace data flow

## Workaround
Currently no reliable workaround. The issue makes the chat interface unusable after 2 messages.

## Impact
- **Severity**: High - Chat interface becomes unusable
- **Scope**: Task agent chat UI only
- **Frequency**: 100% reproducible after 3rd message

---
*Issue documented: 2025-12-20*
*Status: Unsolved*
