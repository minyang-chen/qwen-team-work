import { 
  Config,
  ToolRegistry,
  CoreToolScheduler,
  ApprovalMode,
  AuthType,
  type ToolCallRequestInfo,
  type ToolCallResponseInfo
} from '@qwen-code/core';
import { DockerSandbox, SandboxedToolExecutor, type DockerSandboxConfig } from '@qwen-team/shared';
import type { EnhancedServerConfig, EnhancedQueryResult, EnhancedStreamChunk } from './types.js';
import { OpenAIClient } from './OpenAIClient.js';

export class ServerClient {
  private config: Config;
  private client: OpenAIClient | null = null;
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
    this.toolRegistry = this.config.getToolRegistry();
    
    // Initialize OpenAI client
    this.client = new OpenAIClient(this.config);
    
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
      const nfsBasePath = process.env.NFS_BASE_PATH || '../../infrastructure/nfs-data';
      const sandboxConfig: DockerSandboxConfig = {
        image: process.env.SANDBOX_IMAGE || 'node:20-bookworm',
        workspaceDir: `${nfsBasePath}/individual/${config.sessionId}`,
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
    
    console.log(`[ServerClient] Initialized with ${this.toolRegistry?.getAllTools()?.length || 0} tools`);
  }

  async query(prompt: string, options?: {
    sessionContext?: any[];
    mcpServers?: any;
    toolPreferences?: any;
  }): Promise<EnhancedQueryResult> {
    console.log('[ServerClient] Starting query with prompt:', prompt.substring(0, 100) + '...');
    
    let responseText = '';
    let toolResults: any[] = [];
    let tokenUsage = { input: 0, output: 0, total: 0 };

    // Collect all stream chunks
    for await (const chunk of this.queryStream(prompt, options)) {
      switch (chunk.type) {
        case 'content':
          responseText += chunk.text;
          break;
        case 'tool_result':
          toolResults.push({
            name: chunk.toolName,
            result: chunk.result
          });
          break;
        case 'finished':
          // Stream is complete
          break;
        case 'error':
          throw new Error(chunk.error || 'Unknown error');
      }
    }

    return {
      text: responseText,
      usage: {
        input: 0, // TODO: Extract from OpenAI response
        output: 0,
        total: 0
      },
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    };
  }

  async *queryStream(prompt: string, options?: {
    sessionContext?: any[];
    mcpServers?: any;
    toolPreferences?: any;
  }): AsyncGenerator<EnhancedStreamChunk> {
    const abortController = new AbortController();
    const promptId = `stream-${Date.now()}`;

    const stream = this.client!.sendMessageStream(
      [{ text: prompt }],
      abortController.signal,
      promptId,
      { isContinuation: false }
    );

    const toolRequests: ToolCallRequestInfo[] = [];

    // Process stream events (like CLI does)
    for await (const event of stream) {
      console.log('[ServerClient] Stream event:', event.type, 'value' in event ? 'has value' : 'no value');
      switch (event.type) {
        case 'content':
          yield { type: 'content', text: event.value };
          break;
        case 'tool_call_request':
          console.log('[ServerClient] Tool call request:', event.value);
          toolRequests.push(event.value);
          yield { type: 'tool', toolName: event.value.name };
          break;
        case 'finished':
          console.log('[ServerClient] Stream finished');
          break;
        default:
          console.log('[ServerClient] Unknown event type:', event.type);
          break;
      }
    }

    // Execute tools using CoreToolScheduler (like CLI does)
    if (toolRequests.length > 0) {
      // Use the scheduler to execute tools properly
      const toolResults = await new Promise<ToolCallResponseInfo[]>((resolve) => {
        const results: ToolCallResponseInfo[] = [];
        
        const scheduler = new CoreToolScheduler({
          config: this.config,
          chatRecordingService: this.config.getChatRecordingService(),
          outputUpdateHandler: () => {},
          onAllToolCallsComplete: async (completedCalls: any[]) => {
            // Extract responses from completed calls
            for (const call of completedCalls) {
              if (call.response) {
                results.push(call.response);
              }
            }
            resolve(results);
          },
          onToolCallsUpdate: () => {},
          getPreferredEditor: () => undefined,
          onEditorClose: () => {},
        });

        scheduler.schedule(toolRequests, abortController.signal);
      });
      
      // Emit tool results
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

      // Send tool results back to LLM for continuation (like CLI does)
      const responseParts = toolResults.flatMap((r) => r.responseParts);
      if (responseParts.length > 0) {
        const continuationStream = this.client!.sendMessageStream(
          responseParts as any,
          abortController.signal,
          `${promptId}-continuation`,
          { isContinuation: true }
        );

        for await (const event of continuationStream) {
          if (event.type === 'content') {
            yield { type: 'content', text: event.value };
          } else if (event.type === 'finished') {
            break;
          }
        }
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
    // ContentGenerator doesn't need explicit chat reset
    console.log('[ServerClient] Chat reset requested');
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
