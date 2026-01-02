/**
 * Timeout handler for tool execution
 */

export interface TimeoutConfig {
  defaultTimeoutMs: number;
  toolTimeouts: Map<string, number>;
}

export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  defaultTimeoutMs: 30000, // 30 seconds
  toolTimeouts: new Map([
    ['run_shell_command', 60000], // 60 seconds for shell commands
    ['execute_bash', 60000],
    ['read_file', 10000],
    ['write_file', 10000],
    ['list_directory', 5000]
  ])
};

export class ToolTimeoutHandler {
  constructor(private config: TimeoutConfig = DEFAULT_TIMEOUT_CONFIG) {}

  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    toolName: string,
    signal?: AbortSignal
  ): Promise<T> {
    const timeoutMs = this.config.toolTimeouts.get(toolName) || this.config.defaultTimeoutMs;
    
    return Promise.race<T>([
      operation(),
      this.createTimeout<T>(timeoutMs, toolName, signal)
    ]);
  }

  private createTimeout<T>(
    timeoutMs: number,
    toolName: string,
    signal?: AbortSignal
  ): Promise<T> {
    return new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(
          `Tool execution timeout: ${toolName} exceeded ${timeoutMs}ms limit`
        ));
      }, timeoutMs);

      // Clear timeout if signal is aborted
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error(`Tool execution aborted: ${toolName}`));
        });
      }
    });
  }

  getTimeout(toolName: string): number {
    return this.config.toolTimeouts.get(toolName) || this.config.defaultTimeoutMs;
  }

  setTimeout(toolName: string, timeoutMs: number): void {
    this.config.toolTimeouts.set(toolName, timeoutMs);
  }
}
