import { 
  Config,
  ToolRegistry, 
  CoreToolScheduler, 
  ApprovalMode, 
  AuthType,
  ToolCallRequestInfo,
  ToolCallResponseInfo
} from '@qwen-code/qwen-code-core';
import { DockerSandbox, SandboxedToolExecutor, type DockerSandboxConfig } from '@qwen-team/shared';
import type { EnhancedServerConfig, EnhancedQueryResult, EnhancedStreamChunk } from './types.js';
import { OpenAIClient } from './OpenAIClient.js';

export class ServerClient {
  private config: Config;

  // Export the types that handlers need
  static EnhancedServerConfig = {} as any;
  static EnhancedQueryResult = {} as any;
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
    
    let beforeToolsText = '';
    let afterToolsText = '';
    let toolResults: any[] = [];
    let hasTools = false;

    // Collect all stream chunks
    for await (const chunk of this.queryStream(prompt, options)) {
      console.log('[ServerClient] Query received chunk type:', chunk.type);
      switch (chunk.type) {
        case 'content':
          if (hasTools) {
            // Content after tools (continuation response)
            afterToolsText += chunk.text;
          } else {
            // Content before tools
            beforeToolsText += chunk.text;
          }
          break;
        case 'tool':
          hasTools = true;
          break;
        case 'tool_result':
          console.log('[ServerClient] Tool result:', chunk.toolName);
          toolResults.push({
            name: chunk.toolName,
            result: chunk.result
          });
          break;
        case 'finished':
          console.log('[ServerClient] Query stream finished');
          break;
        case 'error':
          throw new Error(chunk.error || 'Unknown error');
      }
    }

    // Build final response: strip <tool_call> tags from both before and after
    let responseText = beforeToolsText.replace(/<tool_call>.*$/s, '').trim();
    if (afterToolsText) {
      const cleanAfterText = afterToolsText.replace(/<tool_call>.*$/s, '').trim();
      if (cleanAfterText) {
        responseText += (responseText ? '\n\n' : '') + cleanAfterText;
      }
    }

    console.log('[ServerClient] Query complete. Response length:', responseText.length, 'Tool results:', toolResults.length);
    return {
      text: responseText,
      usage: {
        input: 0,
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
      promptId
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
        const toolRequest = toolRequests.find(r => r.callId === result.callId);
        const resultText = typeof result.resultDisplay === 'string' 
          ? result.resultDisplay 
          : result.error?.message || 'Tool completed';
          
        yield {
          type: 'tool_result',
          toolName: toolRequest?.name || 'unknown',
          result: resultText
        };
        
        // For write_file, also show the written content
        if (toolRequest?.name === 'write_file' && toolRequest.args?.content) {
          yield {
            type: 'content',
            text: `\n\nCreated file with the following content:\n\`\`\`\n${toolRequest.args.content}\n\`\`\`\n`
          };
        }
      }

      // Send tool results back to LLM for continuation (like CLI does)
      const responseParts = toolResults.flatMap((r) => r.responseParts);
      if (responseParts.length > 0) {
        const continuationStream = this.client!.sendMessageStream(
          responseParts as any,
          abortController.signal,
          `${promptId}-continuation`
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
      const sandboxResults = await this.sandboxedToolExecutor.executeTools(shellRequests as any, signal);
      results.push(...(sandboxResults as any));
    }

    // Execute other tools with core scheduler
    if (otherRequests.length > 0) {
      const coreResults = await this.executeWithScheduler(otherRequests, signal);
      results.push(...(coreResults as any));
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

  async executeShellCommand(command: string): Promise<string> {
    console.log('[ServerClient] executeShellCommand called:', command);
    
    // Use sandboxed executor directly if available
    if (this.sandboxedToolExecutor) {
      const callId = `shell-${Date.now()}`;
      const toolRequest = {
        id: callId,
        callId: callId,
        name: 'run_shell_command',
        parameters: { command, is_background: false },
        args: { command, is_background: false } // SandboxedToolExecutor looks for args
      } as any;
      
      const abortController = new AbortController();
      const results = await this.sandboxedToolExecutor.executeTools([toolRequest], abortController.signal);
      console.log('[ServerClient] Sandbox execution complete:', results);
      
      if (results && results.length > 0) {
        const result = results[0];
        if (result) {
          if (result.error) {
            throw new Error(result.error.message);
          }
          if (result.resultDisplay) {
            return result.resultDisplay;
          }
        }
      }
    }
    
    throw new Error('Sandbox not available or command failed');
  }
}
