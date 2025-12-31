import { 
  Config,
  GeminiClient,
  ToolRegistry,
  CoreToolScheduler,
  ApprovalMode,
  AuthType,
  type ToolCallRequestInfo,
  type ToolCallResponseInfo
} from '@qwen-code/core';
import { DockerSandbox, SandboxedToolExecutor, type DockerSandboxConfig } from '@qwen-team/shared';
import type { EnhancedServerConfig, EnhancedQueryResult, EnhancedStreamChunk } from './types.js';

export class ServerClient {
  private config: Config;
  private client: GeminiClient;
  private toolRegistry: ToolRegistry;
  private toolScheduler: CoreToolScheduler;
  private dockerSandbox?: DockerSandbox;
  private sandboxedToolExecutor?: SandboxedToolExecutor;

  constructor(config: EnhancedServerConfig) {
    // Initialize full Config with all core capabilities
    this.config = new Config({
      sessionId: config.sessionId || `server-${Date.now()}`,
      targetDir: config.workingDirectory || '/workspace',
      cwd: config.workingDirectory || '/workspace',
      model: config.model || 'qwen3-coder',
      approvalMode: ApprovalMode.YOLO,
      mcpServers: config.mcpServers || {},
      includeDirectories: [],
      usageStatisticsEnabled: false,
      debugMode: false,
    });

    // Initialize core services
    this.client = new GeminiClient(this.config);
    this.toolRegistry = this.config.getToolRegistry();
    
    // Setup tool scheduler
    this.toolScheduler = new CoreToolScheduler({
      config: this.config,
      chatRecordingService: this.config.getChatRecordingService(),
      outputUpdateHandler: () => {},
      onAllToolCallsComplete: async () => {},
      onToolCallsUpdate: () => {},
      getPreferredEditor: () => undefined,
      onEditorClose: () => {},
    });

    this.setupDockerSandbox(config);
  }

  private setupDockerSandbox(config: EnhancedServerConfig): void {
    if (config.enableSandbox !== false) {
      const sandboxConfig: DockerSandboxConfig = {
        image: process.env.SANDBOX_IMAGE || 'node:20-bookworm',
        workspaceDir: config.workingDirectory || '/workspace',
        userId: config.sessionId || `server-${Date.now()}`,
        network: process.env.SANDBOX_NETWORK || 'bridge',
        memory: process.env.SANDBOX_MEMORY || '1g',
        cpus: parseInt(process.env.SANDBOX_CPUS || '2'),
      };

      this.dockerSandbox = new DockerSandbox(sandboxConfig);
      this.sandboxedToolExecutor = new SandboxedToolExecutor(this.dockerSandbox);
    }
  }

  async initialize(): Promise<void> {
    // Initialize config and authentication only if not already initialized
    try {
      await this.config.initialize();
    } catch (error) {
      if (!(error as Error).message.includes('already initialized')) {
        throw error;
      }
      console.log('[ServerClient] Config already initialized, skipping');
    }
    
    await this.config.refreshAuth(AuthType.USE_OPENAI, true);
    
    // Initialize toolRegistry and toolScheduler after config is initialized
    this.toolRegistry = this.config.getToolRegistry();
    this.toolScheduler = new CoreToolScheduler({
      config: this.config,
      chatRecordingService: this.config.getChatRecordingService(),
      outputUpdateHandler: () => {},
      onAllToolCallsComplete: async () => {},
      onToolCallsUpdate: () => {},
      getPreferredEditor: () => undefined,
      onEditorClose: () => {},
    });
    
    // Initialize client and tools
    await this.client.initialize();
    
    console.log(`[ServerClient] Initialized with ${this.toolRegistry?.getAllTools()?.length || 0} tools`);
  }

  async query(prompt: string, options?: {
    sessionContext?: any[];
    mcpServers?: any;
    toolPreferences?: any;
  }): Promise<EnhancedQueryResult> {
    const abortController = new AbortController();
    const promptId = `query-${Date.now()}`;

    // Send message through full AI pipeline
    const stream = this.client.sendMessageStream(
      [{ text: prompt }],
      abortController.signal,
      promptId,
      { isContinuation: false }
    );

    let response = '';
    let tokenUsage = { inputTokens: 0, outputTokens: 0 };
    const toolRequests: ToolCallRequestInfo[] = [];

    // Process stream
    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        response += chunk.value;
      } else if (chunk.type === 'tool_call_request') {
        toolRequests.push(chunk.value);
      } else if (chunk.type === 'finished' && chunk.value?.usageMetadata) {
        tokenUsage = {
          inputTokens: chunk.value.usageMetadata.promptTokenCount || 0,
          outputTokens: chunk.value.usageMetadata.candidatesTokenCount || 0,
        };
      }
    }

    // Execute tools if requested
    if (toolRequests.length > 0) {
      const toolResults = await this.executeTools(toolRequests, abortController.signal);
      
      // Append tool results to response
      const toolOutput = toolResults
        .map(result => {
          if (typeof result.resultDisplay === 'string') {
            return result.resultDisplay;
          }
          return result.error?.message || '';
        })
        .filter(Boolean)
        .join('\n\n');
      
      if (toolOutput) {
        response += '\n\n' + toolOutput;
      }
    }

    return {
      text: response,
      usage: {
        input: tokenUsage.inputTokens,
        output: tokenUsage.outputTokens,
        total: tokenUsage.inputTokens + tokenUsage.outputTokens,
      },
      toolResults: toolRequests.length > 0 ? toolRequests : undefined,
    };
  }

  async *queryStream(prompt: string, options?: {
    sessionContext?: any[];
    mcpServers?: any;
    toolPreferences?: any;
  }): AsyncGenerator<EnhancedStreamChunk> {
    const abortController = new AbortController();
    const promptId = `stream-${Date.now()}`;

    const stream = this.client.sendMessageStream(
      [{ text: prompt }],
      abortController.signal,
      promptId,
      { isContinuation: false }
    );

    const toolRequests: ToolCallRequestInfo[] = [];

    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        yield { type: 'content', text: chunk.value };
      } else if (chunk.type === 'tool_call_request') {
        toolRequests.push(chunk.value);
        yield { type: 'tool', toolName: chunk.value.name };
      } else if (chunk.type === 'finished') {
        break;
      }
    }

    // Execute tools and stream results
    if (toolRequests.length > 0) {
      const toolResults = await this.executeTools(toolRequests, abortController.signal);
      
      for (const result of toolResults) {
        const resultText = typeof result.resultDisplay === 'string' 
          ? result.resultDisplay 
          : result.error?.message || 'Tool completed';
          
        yield {
          type: 'tool_result',
          toolName: toolRequests.find(r => r.callId === result.callId)?.name || 'unknown',
          result: resultText
        };
      }
    }

    yield { type: 'finished' };
  }

  async executeTools(
    requests: ToolCallRequestInfo[], 
    signal: AbortSignal
  ): Promise<ToolCallResponseInfo[]> {
    // Separate shell commands for sandbox execution
    const shellRequests = requests.filter(r => 
      r.name === 'run_shell_command' || r.name === 'execute_bash' || r.name === 'shell'
    );
    const otherRequests = requests.filter(r => 
      r.name !== 'run_shell_command' && r.name !== 'execute_bash' && r.name !== 'shell'
    );

    const results: ToolCallResponseInfo[] = [];

    // Execute shell commands in sandbox
    if (shellRequests.length > 0 && this.sandboxedToolExecutor) {
      const sandboxResults = await this.sandboxedToolExecutor.executeTools(shellRequests, signal);
      results.push(...sandboxResults);
    }

    // Execute other tools with core scheduler
    if (otherRequests.length > 0) {
      const coreResults = await this.executeWithScheduler(otherRequests, signal);
      results.push(...coreResults);
    }

    return results;
  }

  private async executeWithScheduler(
    requests: ToolCallRequestInfo[],
    signal: AbortSignal
  ): Promise<ToolCallResponseInfo[]> {
    return new Promise((resolve) => {
      const results: ToolCallResponseInfo[] = [];
      
      const scheduler = new CoreToolScheduler({
        config: this.config,
        chatRecordingService: this.config.getChatRecordingService(),
        outputUpdateHandler: () => {},
        onAllToolCallsComplete: async (completedCalls: any[]) => {
          for (const call of completedCalls) {
            results.push(call.response);
          }
          resolve(results);
        },
        onToolCallsUpdate: () => {},
        getPreferredEditor: () => undefined,
        onEditorClose: () => {},
      });

      scheduler.schedule(requests, signal);
    });
  }

  async resetChat(): Promise<void> {
    await this.client.resetChat();
  }

  async cleanup(): Promise<void> {
    if (this.sandboxedToolExecutor) {
      await this.sandboxedToolExecutor.cleanup();
    }
  }

  getConfig(): Config {
    return this.config;
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  async getSandboxStatus(): Promise<'running' | 'stopped' | 'not-found'> {
    if (this.dockerSandbox) {
      return this.dockerSandbox.getStatus();
    }
    return 'not-found';
  }
}
