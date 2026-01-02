// Local types to avoid heavy dependencies
interface ToolCallRequestInfo {
  id: string;
  callId: string;
  name: string;
  parameters: any;
}

interface ToolCallResponseInfo {
  id: string;
  callId: string;
  result?: any;
  error?: Error;
  errorType?: string;
  responseParts?: any[];
  resultDisplay?: string;
}

// Local enum to avoid heavy dependency
enum ToolErrorType {
  SHELL_EXECUTE_ERROR = 'shell_execute_error'
}
import { DockerSandbox } from './DockerSandbox.js';
import { ToolRequestAdapter } from '../utils/ToolRequestAdapter.js';
import { ToolOutputTruncator } from '../utils/ToolOutputTruncator.js';
import { getMetricsCollector } from '../utils/ToolMetricsCollector.js';
import { ToolRetryHandler } from '../utils/ToolRetryHandler.js';
import { ToolTimeoutHandler } from '../utils/ToolTimeoutHandler.js';
import { ToolErrorFormatter } from '../utils/ToolErrorFormatter.js';

export class SandboxedToolExecutor {
  private sandbox: DockerSandbox;
  private truncator: ToolOutputTruncator;
  private retryHandler: ToolRetryHandler;
  private timeoutHandler: ToolTimeoutHandler;
  private metricsCollector = getMetricsCollector();

  constructor(sandbox: DockerSandbox) {
    this.sandbox = sandbox;
    this.truncator = new ToolOutputTruncator({
      threshold: 10000,
      truncateLines: 100,
      outputDir: '/workspace/.tool-outputs'
    });
    this.retryHandler = new ToolRetryHandler();
    this.timeoutHandler = new ToolTimeoutHandler();
  }

  async executeTools(
    toolRequests: ToolCallRequestInfo[],
    signal: AbortSignal,
  ): Promise<ToolCallResponseInfo[]> {
    console.log('🐳 [SandboxedToolExecutor] Processing tool requests:', toolRequests.length);

    // Normalize requests to ensure both 'args' and 'parameters' are available
    const normalizedRequests = ToolRequestAdapter.normalizeBatch(toolRequests);
    const results: ToolCallResponseInfo[] = [];

    for (const request of normalizedRequests) {
      const startTime = Date.now();
      
      // Intercept shell commands for Docker execution
      if (this.isShellCommand(request.name)) {
        const command = this.extractCommand(request);

        if (!command) {
          console.log('🐳 No command found in request:', request);
          continue;
        }

        console.log('🐳 Executing in persistent container:', command);

        try {
          // Execute with retry, timeout, and metrics
          const result = await this.retryHandler.executeWithRetry(
            async () => {
              return await this.timeoutHandler.executeWithTimeout(
                () => this.sandbox.execute(command, signal),
                request.name,
                signal
              );
            },
            { toolName: request.name, callId: request.callId }
          );
          
          const executionTime = Date.now() - startTime;
          
          // Truncate output if needed
          const output = result.stdout || result.stderr || '';
          const { content, outputFile, truncated } = await this.truncator.truncateIfNeeded(
            output,
            request.callId
          );
          
          // Record metrics
          this.metricsCollector.record({
            toolName: request.name,
            executionTimeMs: executionTime,
            success: result.exitCode === 0,
            outputSize: output.length,
            truncated,
            timestamp: new Date()
          });
          
          console.log(ToolErrorFormatter.formatSuccess(
            { toolName: request.name, callId: request.callId, args: request.args },
            executionTime
          ));
          
          results.push({
            id: request.id,
            callId: request.callId,
            responseParts: [
              {
                functionResponse: {
                  id: request.callId,
                  name: request.name,
                  response: {
                    output: content,
                    exitCode: result.exitCode,
                    truncated,
                    fullOutputFile: outputFile,
                    executionTimeMs: executionTime
                  },
                },
              },
            ],
            resultDisplay: content,
            error: result.exitCode !== 0 ? new Error(result.stderr) : undefined,
            errorType: result.exitCode !== 0 ? ToolErrorType.SHELL_EXECUTE_ERROR : undefined,
          });
        } catch (error) {
          const executionTime = Date.now() - startTime;
          
          // Record failed metrics
          this.metricsCollector.record({
            toolName: request.name,
            executionTimeMs: executionTime,
            success: false,
            outputSize: 0,
            truncated: false,
            timestamp: new Date(),
            error: (error as Error).message
          });
          
          // Format error with context
          const formattedError = ToolErrorFormatter.formatError(
            error as Error,
            { toolName: request.name, callId: request.callId, args: request.args }
          );
          
          console.error(formattedError);
          results.push(this.createErrorResponse(request, error));
        }
      }
    }

    console.log('🐳 [SandboxedToolExecutor] Returning results:', results.length);
    return results;
  }

  private isShellCommand(toolName: string): boolean {
    return toolName === 'run_shell_command' || 
           toolName === 'execute_bash' || 
           toolName === 'shell';
  }

  private extractCommand(request: ToolCallRequestInfo): string | null {
    // Handle different tool request formats
    const args = (request as any).args;
    return args?.command || args?.cmd || null;
  }

  private createErrorResponse(request: ToolCallRequestInfo, error: unknown): ToolCallResponseInfo {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      id: request.id,
      callId: request.callId,
      responseParts: [
        {
          functionResponse: {
            id: request.callId,
            name: request.name,
            response: {
              error: errorMessage,
            },
          },
        },
      ],
      resultDisplay: `Error: ${errorMessage}`,
      error: error instanceof Error ? error : new Error(errorMessage),
      errorType: ToolErrorType.SHELL_EXECUTE_ERROR,
    };
  }

  /**
   * Get the underlying sandbox instance
   */
  getSandbox(): DockerSandbox {
    return this.sandbox;
  }

  /**
   * Cleanup sandbox on session end
   */
  async cleanup(): Promise<void> {
    await this.sandbox.cleanup();
  }
}
