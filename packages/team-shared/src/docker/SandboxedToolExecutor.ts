import type { ToolCallRequestInfo, ToolCallResponseInfo } from '@qwen-code/core';
import { ToolErrorType } from '@qwen-code/core';
import { DockerSandbox } from './DockerSandbox.js';

export class SandboxedToolExecutor {
  private sandbox: DockerSandbox;

  constructor(sandbox: DockerSandbox) {
    this.sandbox = sandbox;
  }

  async executeTools(
    toolRequests: ToolCallRequestInfo[],
    signal: AbortSignal,
  ): Promise<ToolCallResponseInfo[]> {
    console.log('🐳 [SandboxedToolExecutor] Processing tool requests:', toolRequests.length);

    const results: ToolCallResponseInfo[] = [];

    for (const request of toolRequests) {
      // Intercept shell commands for Docker execution
      if (this.isShellCommand(request.name)) {
        const command = this.extractCommand(request);

        if (!command) {
          console.log('🐳 No command found in request:', request);
          continue;
        }

        console.log('🐳 Executing in persistent container:', command);

        try {
          const result = await this.sandbox.execute(command, signal);
          
          results.push({
            callId: request.callId,
            responseParts: [
              {
                functionResponse: {
                  id: request.callId,
                  name: request.name,
                  response: {
                    output: result.stdout || result.stderr,
                    exitCode: result.exitCode,
                  },
                },
              },
            ],
            resultDisplay: result.stdout || result.stderr || 'Command executed',
            error: result.exitCode !== 0 ? new Error(result.stderr) : undefined,
            errorType: result.exitCode !== 0 ? ToolErrorType.SHELL_EXECUTE_ERROR : undefined,
          });
        } catch (error) {
          console.error('🐳 Docker execution error:', error);
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
