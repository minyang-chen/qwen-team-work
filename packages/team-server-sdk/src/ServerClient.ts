import { GeminiClient, Config, ApprovalMode, AuthType } from '@qwen-code/core';
import type { ServerConfig, QueryResult, StreamChunk } from './types.js';
import { RetryHandler, isRetryableError } from './RetryHandler.js';
import { CircuitBreaker } from './CircuitBreaker.js';

export class ServerClient {
  private client: GeminiClient;
  private config: Config;
  private retryHandler: RetryHandler;
  private circuitBreaker: CircuitBreaker;

  constructor(config: ServerConfig) {
    this.config = new Config({
      sessionId: config.sessionId || `server-${Date.now()}`,
      targetDir: config.workingDirectory || process.cwd(),
      cwd: config.workingDirectory || process.cwd(),
      debugMode: false,
      approvalMode: config.approvalMode === 'yolo' ? ApprovalMode.YOLO : ApprovalMode.DEFAULT,
      mcpServers: {},
      includeDirectories: [],
      model: config.model || process.env.OPENAI_MODEL || 'qwen-coder-plus',
    });

    // Set credentials
    this.config.updateCredentials({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || process.env.OPENAI_BASE_URL,
      model: this.config.getModel(),
    });

    this.client = new GeminiClient(this.config);

    // Initialize retry handler
    this.retryHandler = new RetryHandler({
      maxAttempts: config.retryConfig?.maxAttempts || 3,
      initialDelay: config.retryConfig?.initialDelay || 1000,
      maxDelay: config.retryConfig?.maxDelay || 10000,
      backoffMultiplier: config.retryConfig?.backoffMultiplier || 2,
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreakerConfig?.failureThreshold || 5,
      successThreshold: config.circuitBreakerConfig?.successThreshold || 2,
      timeout: config.circuitBreakerConfig?.timeout || 60000,
    });
  }

  async initialize(): Promise<void> {
    await this.retryHandler.execute(
      async () => {
        await this.config.initialize();
        await this.config.refreshAuth(AuthType.USE_OPENAI, true);
        await this.client.initialize();
      },
      isRetryableError
    );
  }

  async query(prompt: string): Promise<QueryResult> {
    return await this.circuitBreaker.execute(async () => {
      return await this.retryHandler.execute(
        async () => this.executeQuery(prompt),
        isRetryableError
      );
    });
  }

  private async executeQuery(prompt: string): Promise<QueryResult> {
    const abortController = new AbortController();
    const promptId = `query-${Date.now()}`;

    const stream = this.client.sendMessageStream(
      [{ text: prompt }],
      abortController.signal,
      promptId,
      { isContinuation: false }
    );

    let response = '';

    for await (const chunk of stream) {
      if (chunk.type === 'content' && 'value' in chunk) {
        response += (chunk as any).value;
      }
    }

    return {
      text: response,
      usage: {
        input: 0,
        output: 0,
        total: 0,
      },
    };
  }

  async *queryStream(prompt: string): AsyncGenerator<StreamChunk> {
    const abortController = new AbortController();
    const promptId = `query-${Date.now()}`;

    const stream = this.client.sendMessageStream(
      [{ text: prompt }],
      abortController.signal,
      promptId,
      { isContinuation: false }
    );

    for await (const chunk of stream) {
      if (chunk.type === 'content' && 'value' in chunk) {
        yield { type: 'content', text: (chunk as any).value };
      } else if (chunk.type === 'tool_call_request' && 'value' in chunk) {
        yield { type: 'tool', toolName: (chunk as any).value.name };
      } else if (chunk.type === 'finished') {
        yield { type: 'finished' };
      }
    }
  }

  async dispose(): Promise<void> {
    // Cleanup if needed
  }
}
