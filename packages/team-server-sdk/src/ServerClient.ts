import { GeminiClient, Config, ApprovalMode, AuthType, CoreToolScheduler, type ToolCallRequestInfo, type ToolCallResponseInfo, type CompletedToolCall } from '@qwen-code/core';
import type { ServerConfig, QueryResult, StreamChunk } from './types.js';
import { RetryHandler, isRetryableError } from './RetryHandler.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { SandboxedToolExecutor, type DockerSandboxConfig } from './SandboxedToolExecutor.js';
import { TeamToolInjector } from './TeamToolInjector.js';
import { spawn } from 'child_process';

export class ServerClient {
  private client: GeminiClient;
  private config: Config;
  private retryHandler: RetryHandler;
  private circuitBreaker: CircuitBreaker;
  private sandboxedToolExecutor?: SandboxedToolExecutor;
  private toolScheduler: CoreToolScheduler;
  private toolInjector: TeamToolInjector;

  constructor(config: ServerConfig) {
    // Set user workspace directory (mapped to user session docker instance)
    const userWorkspaceDir = config.workingDirectory || '/workspace';
    
    this.config = new Config({
      sessionId: config.sessionId || `server-${Date.now()}`,
      targetDir: userWorkspaceDir,
      cwd: userWorkspaceDir,
      debugMode: false,
      approvalMode: ApprovalMode.YOLO, // Enable automatic tool execution
      mcpServers: {},
      includeDirectories: [],
      model: config.model || process.env.OPENAI_MODEL || 'qwen-coder-plus',
      // Completely disable all telemetry
      usageStatisticsEnabled: false,
      // Enable sandbox for tool execution in user docker containers
      sandbox: {
        command: 'docker' as const,
        image: process.env.SANDBOX_IMAGE || 'node:20-bookworm',
        network: process.env.SANDBOX_NETWORK || 'bridge',
        memory: process.env.SANDBOX_MEMORY || '1g',
        cpus: process.env.SANDBOX_CPUS || '2',
        workingDirectory: userWorkspaceDir
      }
    });

    console.log(`[ServerClient] Config created with full sandbox support:`, {
      command: 'docker',
      image: process.env.SANDBOX_IMAGE || 'node:20-bookworm',
      network: process.env.SANDBOX_NETWORK || 'bridge',
      memory: process.env.SANDBOX_MEMORY || '1g',
      cpus: process.env.SANDBOX_CPUS || '2',
      workingDirectory: userWorkspaceDir
    });

    // Set credentials
    this.config.updateCredentials({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || process.env.OPENAI_BASE_URL,
      model: this.config.getModel(),
    });

    this.client = new GeminiClient(this.config);

    // Initialize team-specific tool injector
    this.toolInjector = new TeamToolInjector(this.config);
    console.log('[ServerClient] Initialized TeamToolInjector for proper tool handling');

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

    // Override shell execution to use docker
    // Initialize sandboxed tool executor if sandbox is configured
    const sandboxConfig = this.config.getSandbox();
    if (sandboxConfig && sandboxConfig.command === 'docker') {
      const dockerConfig: DockerSandboxConfig = {
        image: sandboxConfig.image,
        workspaceDir: this.config.getWorkingDir(),
        userId: config.sessionId || 'default',
        network: sandboxConfig.network || 'bridge',
        memory: sandboxConfig.memory || '1g',
        cpus: typeof sandboxConfig.cpus === 'string' ? parseInt(sandboxConfig.cpus) : sandboxConfig.cpus || 2,
      };
      
      this.sandboxedToolExecutor = new SandboxedToolExecutor(dockerConfig);
      console.log('[ServerClient] Initialized sandboxed tool executor:', dockerConfig);
    }

    this.setupDockerExecution();

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

  private setupDockerExecution() {
    // Override the shell execution to use docker
    const originalShellExecute = (global as any).shellExecute;
    (global as any).shellExecute = async (command: string, cwd: string) => {
      const sandboxConfig = this.config.getSandbox();
      if (sandboxConfig && sandboxConfig.command === 'docker') {
        return this.executeInDocker(command, cwd, sandboxConfig);
      }
      return originalShellExecute ? originalShellExecute(command, cwd) : null;
    };
  }

  private async executeInDocker(command: string, cwd: string, sandboxConfig: any): Promise<any> {
    console.log(`[ServerClient] Executing in docker: ${command} in ${cwd}`);
    
    const dockerArgs = [
      'run', '--rm',
      '--network', sandboxConfig.network || 'bridge',
      '--memory', sandboxConfig.memory || '1g',
      '--cpus', sandboxConfig.cpus || '2',
      '--workdir', sandboxConfig.workingDirectory || '/workspace',
      '-v', `${cwd}:${sandboxConfig.workingDirectory || '/workspace'}`,
      sandboxConfig.image,
      'bash', '-c', command
    ];

    return new Promise((resolve, reject) => {
      const dockerProcess = spawn('docker', dockerArgs, { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      dockerProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      dockerProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      dockerProcess.on('close', (code) => {
        console.log(`[ServerClient] Docker execution completed with code: ${code}`);
        resolve({
          output: stdout,
          error: stderr ? new Error(stderr) : null,
          exitCode: code,
          signal: null,
          aborted: false,
          pid: dockerProcess.pid,
          executionMethod: 'docker'
        });
      });
      
      dockerProcess.on('error', (error) => {
        console.error(`[ServerClient] Docker execution error:`, error);
        reject(error);
      });
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
    return await this.executeQueryInternal([{ text: prompt }], false);
  }

  private async executeQueryInternal(message: any[], isContinuation: boolean): Promise<QueryResult> {
    const abortController = new AbortController();
    const promptId = `query-${Date.now()}`;

    console.log(`[ServerClient] Executing query (continuation: ${isContinuation})`);
    
    // Log tool availability before sending
    const toolRegistry = this.config.getToolRegistry();
    const allTools = toolRegistry.getAllTools();
    console.log(`[ServerClient] Query execution - Available tools: ${allTools.length}`);
    
    // CRITICAL FIX: Ensure tools are properly configured for OpenAI API
    // The core issue is that tools aren't being passed to the OpenAI API request
    // This causes the LLM to generate XML-style tool calls instead of proper JSON tool calls
    await this.client.setTools();
    console.log(`[ServerClient] Tools explicitly set on GeminiClient before query`);
    
    // Send message - tools are automatically available through Config
    const stream = this.client.sendMessageStream(
      message,
      abortController.signal,
      promptId,
      { isContinuation }
    );

    let response = '';
    const toolRequests: any[] = [];
    let tokenUsage = { inputTokens: 0, outputTokens: 0 };

    for await (const chunk of stream) {
      if (chunk.type === 'content' && 'value' in chunk) {
        response += (chunk as any).value;
      } else if (chunk.type === 'tool_call_request') {
        console.log('[ServerClient] Tool call requested:', chunk);
        toolRequests.push((chunk as any).value);
      } else if (chunk.type === 'tool_call_response') {
        console.log('[ServerClient] Tool call response:', chunk);
      } else if (chunk.type === 'finished' && (chunk as any).value?.usageMetadata) {
        tokenUsage = {
          inputTokens: (chunk as any).value.usageMetadata.promptTokenCount || 0,
          outputTokens: (chunk as any).value.usageMetadata.candidatesTokenCount || 0,
        };
        console.log('[ServerClient] Stream finished with token usage:', tokenUsage);
      } else {
        console.log('[ServerClient] Unknown chunk type:', chunk.type, chunk);
      }
    }

    // CHAT-ONLY MODE: Disable tool execution to prevent infinite loops from XML tool calls
    console.log(`[ServerClient] Chat-only mode - ignoring ${toolRequests.length} tool requests`);
    
    /*
    // Execute tools if any were requested (following reference implementation pattern)
    if (toolRequests.length > 0 && !abortController.signal.aborted) {
      console.log('🔧 [ServerClient] Executing tools:', toolRequests.length);
      
      try {
        // Check if we have shell commands that should be executed in sandbox
        const shellRequests = toolRequests.filter(r => 
          r.name === 'run_shell_command' || r.name === 'execute_bash'
        );
        
        let toolResults: ToolCallResponseInfo[] = [];
        
        if (shellRequests.length > 0 && this.sandboxedToolExecutor) {
          console.log('🐳 [ServerClient] Executing shell commands in sandbox:', shellRequests.length);
          const sandboxResults = await this.sandboxedToolExecutor.executeTools(shellRequests, abortController.signal);
          toolResults.push(...sandboxResults);
          
          // Execute remaining non-shell tools with regular scheduler
          const nonShellRequests = toolRequests.filter(r => 
            r.name !== 'run_shell_command' && r.name !== 'execute_bash'
          );
          
          if (nonShellRequests.length > 0) {
            const regularResults = await this.executeToolsWithScheduler(
              new CoreToolScheduler({
                config: this.config,
                chatRecordingService: this.config.getChatRecordingService(),
                outputUpdateHandler: () => {},
                onAllToolCallsComplete: async () => {},
                onToolCallsUpdate: () => {},
                getPreferredEditor: () => undefined,
                onEditorClose: () => {},
              }),
              nonShellRequests,
              abortController.signal
            );
            toolResults.push(...regularResults);
          }
        } else {
          // No sandbox or no shell commands - use regular scheduler
          toolResults = await this.executeToolsWithScheduler(
            new CoreToolScheduler({
              config: this.config,
              chatRecordingService: this.config.getChatRecordingService(),
              outputUpdateHandler: () => {},
              onAllToolCallsComplete: async () => {},
              onToolCallsUpdate: () => {},
              getPreferredEditor: () => undefined,
              onEditorClose: () => {},
            }),
            toolRequests,
            abortController.signal
          );
        }
        
        console.log('🔧 [ServerClient] Tool results received:', JSON.stringify(toolResults, null, 2));

        // Submit tool responses back to continue conversation (like reference implementation)
        const responseParts = toolResults.flatMap((r: any) => r.responseParts);
        console.log('🔧 [ServerClient] Sending response parts back to model:', JSON.stringify(responseParts, null, 2));

        // Recursive call with continuation=true to get final response
        const continuationResult = await this.executeQueryInternal(responseParts, true);
        
        return {
          text: response + continuationResult.text,
          usage: {
            input: tokenUsage.inputTokens + (continuationResult.usage?.input || 0),
            output: tokenUsage.outputTokens + (continuationResult.usage?.output || 0),
            total: tokenUsage.inputTokens + tokenUsage.outputTokens + (continuationResult.usage?.total || 0),
          },
        };
      } catch (error) {
        console.error('🔧 [ServerClient] Tool execution failed:', error);
        // Return partial response even if tools fail
        return {
          text: response + '\n\n❌ Tool execution failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
          usage: {
            input: tokenUsage.inputTokens,
            output: tokenUsage.outputTokens,
            total: tokenUsage.inputTokens + tokenUsage.outputTokens,
          },
        };
      }
    }
    */ // End of disabled tool execution block

    console.log(`[ServerClient] Query completed, response length: ${response.length}`);
    return {
      text: response,
      usage: {
        input: tokenUsage.inputTokens,
        output: tokenUsage.outputTokens,
        total: tokenUsage.inputTokens + tokenUsage.outputTokens,
      },
    };
  }

  async *queryStream(prompt: string): AsyncGenerator<StreamChunk> {
    yield* this.queryStreamInternal([{ text: prompt }], false);
  }

  private async *queryStreamInternal(message: any[], isContinuation: boolean): AsyncGenerator<StreamChunk> {
    const abortController = new AbortController();
    const promptId = `query-${Date.now()}`;

    console.log(`[ServerClient] Starting stream query (continuation: ${isContinuation})`);

    // Send message - tools are automatically available through Config
    const stream = this.client.sendMessageStream(
      message,
      abortController.signal,
      promptId,
      { isContinuation }
    );

    const toolRequests: any[] = [];
    let tokenUsage = { inputTokens: 0, outputTokens: 0 };

    for await (const chunk of stream) {
      if (chunk.type === 'content' && 'value' in chunk) {
        yield { type: 'content', text: (chunk as any).value };
      } else if (chunk.type === 'tool_call_request' && 'value' in chunk) {
        const toolRequest = (chunk as any).value;
        toolRequests.push(toolRequest);
        yield { type: 'tool', toolName: toolRequest.name };
      } else if (chunk.type === 'tool_call_response') {
        console.log('[ServerClient] Tool call response in stream:', chunk);
      } else if (chunk.type === 'finished' && (chunk as any).value?.usageMetadata) {
        tokenUsage = {
          inputTokens: (chunk as any).value.usageMetadata.promptTokenCount || 0,
          outputTokens: (chunk as any).value.usageMetadata.candidatesTokenCount || 0,
        };
        console.log('[ServerClient] Stream finished with token usage:', tokenUsage);
      }
    }

    // Execute tools if any were requested (following reference implementation pattern)
    if (toolRequests.length > 0 && !abortController.signal.aborted) {
      console.log('🔧 [ServerClient] Executing tools in stream:', toolRequests.length);
      
      try {
        // Check if we have shell commands that should be executed in sandbox
        const shellRequests = toolRequests.filter(r => 
          r.name === 'run_shell_command' || r.name === 'execute_bash'
        );
        
        let toolResults: ToolCallResponseInfo[] = [];
        
        if (shellRequests.length > 0 && this.sandboxedToolExecutor) {
          console.log('🐳 [ServerClient] Executing shell commands in sandbox (stream):', shellRequests.length);
          const sandboxResults = await this.sandboxedToolExecutor.executeTools(shellRequests, abortController.signal);
          toolResults.push(...sandboxResults);
          
          // Execute remaining non-shell tools with regular scheduler
          const nonShellRequests = toolRequests.filter(r => 
            r.name !== 'run_shell_command' && r.name !== 'execute_bash'
          );
          
          if (nonShellRequests.length > 0) {
            const regularResults = await this.executeToolsWithScheduler(
              new CoreToolScheduler({
                config: this.config,
                chatRecordingService: this.config.getChatRecordingService(),
                outputUpdateHandler: () => {},
                onAllToolCallsComplete: async () => {},
                onToolCallsUpdate: () => {},
                getPreferredEditor: () => undefined,
                onEditorClose: () => {},
              }),
              nonShellRequests,
              abortController.signal
            );
            toolResults.push(...regularResults);
          }
        } else {
          // No sandbox or no shell commands - use regular scheduler
          toolResults = await this.executeToolsWithScheduler(
            new CoreToolScheduler({
              config: this.config,
              chatRecordingService: this.config.getChatRecordingService(),
              outputUpdateHandler: () => {},
              onAllToolCallsComplete: async () => {},
              onToolCallsUpdate: () => {},
              getPreferredEditor: () => undefined,
              onEditorClose: () => {},
            }),
            toolRequests,
            abortController.signal
          );
        }
        
        console.log('🔧 [ServerClient] Tool results received in stream:', JSON.stringify(toolResults, null, 2));

        // Emit tool results
        for (const result of toolResults) {
          const resultText = result.resultDisplay
            ? typeof result.resultDisplay === 'string'
              ? result.resultDisplay
              : JSON.stringify(result.resultDisplay)
            : result.error?.message || 'Tool execution completed';

          yield { 
            type: 'tool_result', 
            toolName: toolRequests.find(r => r.callId === result.callId)?.name || 'unknown',
            result: resultText
          };
        }

        // Submit tool responses back to continue conversation (like reference implementation)
        const responseParts = toolResults.flatMap((r: any) => r.responseParts);
        console.log('🔧 [ServerClient] Sending response parts back to model in stream:', JSON.stringify(responseParts, null, 2));

        // Recursive call with continuation=true to get final response
        yield* this.queryStreamInternal(responseParts, true);
        return;
      } catch (error) {
        console.error('🔧 [ServerClient] Tool execution failed in stream:', error);
        yield { 
          type: 'error', 
          text: '❌ Tool execution failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        };
      }
    }

    yield { type: 'finished' };
  }

  private async executeToolsWithScheduler(
    scheduler: CoreToolScheduler, 
    toolRequests: ToolCallRequestInfo[], 
    signal: AbortSignal
  ): Promise<ToolCallResponseInfo[]> {
    return new Promise((resolve) => {
      const completedResults: ToolCallResponseInfo[] = [];

      // Create a new scheduler with completion handler for this execution
      const schedulerWithHandler = new CoreToolScheduler({
        config: this.config,
        chatRecordingService: this.config.getChatRecordingService(),
        outputUpdateHandler: () => {},
        onAllToolCallsComplete: async (completedCalls: CompletedToolCall[]) => {
          for (const call of completedCalls) {
            completedResults.push(call.response);
          }
          resolve(completedResults);
        },
        onToolCallsUpdate: () => {},
        getPreferredEditor: () => undefined,
        onEditorClose: () => {},
      });

      schedulerWithHandler.schedule(toolRequests, signal);
    });
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
