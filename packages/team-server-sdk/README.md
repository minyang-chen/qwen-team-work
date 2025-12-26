# @qwen-team/server-sdk

Server-friendly SDK for wrapping `@qwen-code/core` without subprocess overhead.

## Features

- ✅ No subprocess overhead (unlike @qwen-code/sdk)
- ✅ Built-in retry logic with exponential backoff
- ✅ Circuit breaker pattern for fault tolerance
- ✅ Session management
- ✅ Streaming support
- ✅ TypeScript support

## Installation

```bash
npm install @qwen-team/server-sdk
```

## Usage

### Basic Query

```typescript
import { ServerClient } from '@qwen-team/server-sdk';

const client = new ServerClient({
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: process.env.OPENAI_BASE_URL,
  model: 'qwen-coder-plus',
  workingDirectory: '/path/to/workspace',
});

await client.initialize();

const result = await client.query('Explain this code');
console.log(result.text);
console.log(result.usage); // { input: 10, output: 20, total: 30 }
```

### With Retry and Circuit Breaker

```typescript
const client = new ServerClient({
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: process.env.OPENAI_BASE_URL,
  model: 'qwen-coder-plus',
  
  // Retry configuration
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  
  // Circuit breaker configuration
  circuitBreakerConfig: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  },
});
```

### Streaming Query

```typescript
for await (const chunk of client.queryStream('Write a function')) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.text);
  } else if (chunk.type === 'tool') {
    console.log(`\nExecuting tool: ${chunk.toolName}`);
  }
}
```

### With Session Management

```typescript
class AIService {
  private clients = new Map<string, ServerClient>();

  async getClient(userId: string): Promise<ServerClient> {
    if (!this.clients.has(userId)) {
      const client = new ServerClient({
        apiKey: process.env.OPENAI_API_KEY!,
        sessionId: userId,
        workingDirectory: `/workspace/${userId}`,
      });
      await client.initialize();
      this.clients.set(userId, client);
    }
    return this.clients.get(userId)!;
  }

  async processMessage(userId: string, message: string) {
    const client = await this.getClient(userId);
    return await client.query(message);
  }
}
```

## API

### `ServerClient`

#### Constructor

```typescript
new ServerClient(config: ServerConfig)
```

**ServerConfig:**
- `apiKey: string` - OpenAI API key (required)
- `baseUrl?: string` - API base URL (optional)
- `model?: string` - Model name (optional, default: 'qwen-coder-plus')
- `sessionId?: string` - Session identifier (optional)
- `workingDirectory?: string` - Working directory (optional, default: cwd)
- `approvalMode?: 'yolo' | 'default'` - Tool approval mode (optional)

#### Methods

**`initialize(): Promise<void>`**
Initialize the client (must be called before queries)

**`query(prompt: string): Promise<QueryResult>`**
Execute a query and return the complete result

**`queryStream(prompt: string): AsyncIterator<StreamChunk>`**
Execute a query with streaming response

**`dispose(): Promise<void>`**
Cleanup resources

## Types

### `QueryResult`

```typescript
interface QueryResult {
  text: string;
  usage?: {
    input: number;
    output: number;
    total: number;
  };
}
```

### `StreamChunk`

```typescript
interface StreamChunk {
  type: 'content' | 'tool' | 'finished';
  text?: string;
  toolName?: string;
}
```

## Differences from @qwen-code/sdk

| Feature | @qwen-code/sdk | @qwen-team/server-sdk |
|---------|----------------|----------------------|
| Subprocess | ✅ Spawns CLI | ❌ No subprocess |
| Server-friendly | ❌ | ✅ |
| Direct core access | ❌ | ✅ |
| Latency | Higher | Lower |
| Use case | External tools | Server applications |
