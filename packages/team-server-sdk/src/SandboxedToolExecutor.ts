import { spawn } from 'child_process';
import type { ToolCallRequestInfo, ToolCallResponseInfo } from '@qwen-code/core';
import { ToolErrorType } from '@qwen-code/core';

export interface DockerSandboxConfig {
  image: string;
  workspaceDir: string;
  userId: string;
  network?: string;
  memory?: string;
  cpus?: number;
}

export class SandboxedToolExecutor {
  private config: DockerSandboxConfig;
  private containerName: string;

  constructor(config: DockerSandboxConfig) {
    this.config = config;
    this.containerName = `qwen-sandbox-${config.userId}`;
  }

  async executeTools(
    toolRequests: ToolCallRequestInfo[],
    signal: AbortSignal,
  ): Promise<ToolCallResponseInfo[]> {
    console.log('🐳 [SandboxedToolExecutor] Tool requests:', JSON.stringify(toolRequests, null, 2));

    const results: ToolCallResponseInfo[] = [];

    for (const request of toolRequests) {
      // Intercept shell commands for Docker execution
      if (
        request.name === 'run_shell_command' ||
        request.name === 'execute_bash'
      ) {
        const command = (request as any).args?.command;

        if (!command) {
          console.log('🐳 No command found in request:', request);
          continue;
        }

        console.log('🐳 Executing in Docker sandbox:', command);

        try {
          const result = await this.executeInDocker(command, signal);
          
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
          results.push({
            callId: request.callId,
            responseParts: [
              {
                functionResponse: {
                  id: request.callId,
                  name: request.name,
                  response: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                  },
                },
              },
            ],
            resultDisplay: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error: error instanceof Error ? error : new Error('Unknown error'),
            errorType: ToolErrorType.SHELL_EXECUTE_ERROR,
          });
        }
      }
    }

    console.log('🐳 [SandboxedToolExecutor] Returning results:', JSON.stringify(results, null, 2));
    return results;
  }

  private async executeInDocker(
    command: string,
    signal?: AbortSignal,
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(
        'docker',
        [
          'run', '--rm',
          '-v', `${this.config.workspaceDir}:/workspace`,
          '-w', '/workspace',
          '--network', this.config.network || 'bridge',
          '--memory', this.config.memory || '1g',
          '--cpus', this.config.cpus?.toString() || '2',
          '--security-opt', 'no-new-privileges',
          '--cap-drop', 'ALL',
          this.config.image,
          '/bin/bash', '-c', command,
        ],
        { stdio: 'pipe' }
      );

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        console.log(`🐳 Docker command completed with exit code: ${code}`);
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
        });
      });

      proc.on('error', (error) => {
        console.error('🐳 Docker process error:', error);
        reject(error);
      });

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          proc.kill('SIGTERM');
          reject(new Error('Command aborted'));
        });
      }
    });
  }
}
