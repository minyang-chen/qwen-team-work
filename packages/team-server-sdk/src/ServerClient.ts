import { GeminiClient, Config, ApprovalMode, AuthType, CoreToolScheduler } from '@qwen-code/core';
import type { ServerConfig, QueryResult, StreamChunk } from './types.js';
import { RetryHandler, isRetryableError } from './RetryHandler.js';
import { CircuitBreaker } from './CircuitBreaker.js';

export class ServerClient {
  private client: GeminiClient;
  private config: Config;
  private retryHandler: RetryHandler;
  private circuitBreaker: CircuitBreaker;
  private toolScheduler: CoreToolScheduler;

  constructor(config: ServerConfig) {
    this.config = new Config({
      sessionId: config.sessionId || `server-${Date.now()}`,
      targetDir: config.workingDirectory || process.cwd(),
      cwd: config.workingDirectory || process.cwd(),
      debugMode: false,
      approvalMode: ApprovalMode.YOLO, // Enable automatic tool execution
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

    // Initialize tool scheduler for tool execution
    this.toolScheduler = new CoreToolScheduler({
      config: this.config,
      chatRecordingService: this.config.getChatRecordingService(),
      outputUpdateHandler: () => {}, // No live output for server
      onAllToolCallsComplete: async () => {},
      onToolCallsUpdate: () => {},
      getPreferredEditor: () => undefined,
      onEditorClose: () => {},
    });

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
        console.log('[ServerClient] Starting initialization...');
        await this.config.initialize();
        console.log('[ServerClient] Config initialized');
        
        await this.config.refreshAuth(AuthType.USE_OPENAI, true);
        console.log('[ServerClient] Auth refreshed');
        
        await this.client.initialize();
        console.log('[ServerClient] GeminiClient initialized');
        
        // Log available tools before setting them
        const toolRegistry = this.config.getToolRegistry();
        const allTools = toolRegistry.getAllTools();
        console.log(`[ServerClient] Available tools (${allTools.length}):`, allTools.map(t => t.displayName));
        
        const toolDeclarations = toolRegistry.getFunctionDeclarations();
        console.log(`[ServerClient] Tool declarations (${toolDeclarations.length}):`, toolDeclarations.map(t => t.name));
        
        // Enable tools for the LLM
        await this.client.setTools();
        console.log('[ServerClient] Tools set on GeminiClient');
        
        // Verify tools are set
        const chat = this.client.getChat();
        const generationConfig = (chat as any).generationConfig;
        console.log('[ServerClient] Generation config tools:', generationConfig?.tools?.length || 0);
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

    console.log(`[ServerClient] Executing query: "${prompt.substring(0, 100)}..."`);
    
    // Log tool availability before sending
    const toolRegistry = this.config.getToolRegistry();
    const allTools = toolRegistry.getAllTools();
    console.log(`[ServerClient] Query execution - Available tools: ${allTools.length}`);
    
    // Send message - tools are automatically available through Config
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
      } else if (chunk.type === 'tool_call_request') {
        console.log('[ServerClient] Tool call requested:', chunk);
      } else if (chunk.type === 'tool_call_response') {
        console.log('[ServerClient] Tool call response:', chunk);
      }
    }

    console.log(`[ServerClient] Query completed, response length: ${response.length}`);
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

    // Send message - tools are automatically available through Config
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

  async executeTool(toolName: string, parameters: any): Promise<any> {
    return await this.circuitBreaker.execute(async () => {
      return await this.retryHandler.execute(
        async () => {
          // Use the query method to execute tools through the LLM
          const toolPrompt = this.formatToolPrompt(toolName, parameters);
          const result = await this.executeQuery(toolPrompt);
          return { output: result.text, toolName, parameters };
        },
        isRetryableError
      );
    });
  }

  private formatToolPrompt(toolName: string, parameters: any): string {
    switch (toolName) {
      case 'shell':
      case 'run_shell_command':
        return `Execute this shell command: ${parameters.command}`;
      case 'read_file':
        return `Read the contents of file: ${parameters.filePath}`;
      case 'write_file':
        return `Write the following content to file ${parameters.filePath}:\n${parameters.content}`;
      case 'list_directory':
        return `List the contents of directory: ${parameters.dirPath}`;
      default:
        return `Execute tool ${toolName} with parameters: ${JSON.stringify(parameters)}`;
    }
  }
}
