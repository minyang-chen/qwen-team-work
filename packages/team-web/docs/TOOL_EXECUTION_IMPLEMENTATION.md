# Tool Execution and Continuation Loop Implementation

## Problem

The web-ui was hanging after tool calls because it only forwarded tool events to the frontend but never:

1. Executed the tools
2. Fed tool results back to the LLM to continue the conversation

The core client's `sendMessageStream()` stops after yielding `tool_call_request` events and expects the caller to handle tool execution and continuation.

## Solution Architecture

### 1. ToolExecutor Class (`ToolExecutor.ts`)

Wraps `CoreToolScheduler` to execute tools in YOLO mode (auto-approval):

```typescript
class ToolExecutor {
  - Creates CoreToolScheduler with config
  - executeTools(): Schedules tools and returns results via Promise
  - Handles completion callback to collect ToolCallResponseInfo
}
```

### 2. ClientAdapter Updates (`ClientAdapter.ts`)

Implements the full tool execution and continuation loop:

**Flow:**

1. Collect `tool_call_request` events during stream processing
2. After stream completes, if tools were requested:
   - Execute tools via `ToolExecutor.executeTools()`
   - Emit tool results to frontend
   - Create continuation message with `functionResponse` parts
   - Recursively call `sendMessage()` with `isContinuation: true`
3. Loop continues until no more tools are needed

**Key Changes:**

- Added `toolRequests` array to collect tool call requests
- Added `isContinuation` parameter to `sendMessage()`
- After stream, execute tools and continue conversation
- Pass continuation flag to `client.sendMessageStream()`

### 3. SessionManager Updates (`SessionManager.ts`)

- Added `config: Config` to Session interface
- Store config alongside client for ToolExecutor creation

### 4. WebSocket Handler Updates (`websocket.ts`)

- Create `ToolExecutor` instance per request using session config
- Pass ToolExecutor to ClientAdapter constructor
- Fixed `compressHistory` to use `client.tryCompressChat()`

## How It Works

### Message Flow

```
User sends message
  ↓
ClientAdapter.sendMessage()
  ↓
client.sendMessageStream() yields events
  ↓
Collect tool_call_request events
  ↓
Stream completes
  ↓
If tools requested:
  ├─ ToolExecutor.executeTools()
  ├─ CoreToolScheduler executes in YOLO mode
  ├─ Collect ToolCallResponseInfo results
  ├─ Emit tool:response to frontend
  ├─ Create functionResponse parts
  └─ sendMessage(results, isContinuation=true) ← RECURSIVE
       ↓
     Repeat until no more tools
  ↓
Emit message:complete to frontend
```

### Continuation Message Format

```typescript
[
  {
    functionResponse: {
      name: 'tool_name',
      response: toolResult.responseParts[0],
    },
  },
];
```

## Files Modified

1. **ToolExecutor.ts** (new) - Tool execution wrapper
2. **ClientAdapter.ts** - Tool collection and continuation loop
3. **SessionManager.ts** - Store config in session
4. **websocket.ts** - Create ToolExecutor and pass to adapter

## Testing

The implementation should now:

- ✅ Execute tools automatically in YOLO mode
- ✅ Display tool execution in real-time
- ✅ Feed tool results back to LLM
- ✅ Continue conversation until complete
- ✅ Handle multiple tool calls in sequence
- ✅ Support recursive tool execution

## Comparison with CLI

The web-ui now follows the same pattern as the CLI:

- CLI: `processGeminiStreamEvents()` → `scheduleToolCalls()` → `handleCompletedTools()` → `submitQuery(isContinuation=true)`
- Web-UI: `sendMessage()` → collect tools → `executeTools()` → `sendMessage(isContinuation=true)`

Both implement the same continuation loop, just adapted for their respective architectures.
