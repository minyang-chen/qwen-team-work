import { ServerClient } from '@qwen-team/server-sdk';
import { ToolRegistry, ToolCallRequestInfo, ToolCallResponseInfo } from '@qwen-code/core';
import { DockerSandbox } from '@qwen-team/shared';

export class ToolCoordinator {
  private toolRegistry: ToolRegistry;
  private activeTasks = new Map<string, AbortController>();

  constructor(private client: ServerClient) {
    this.toolRegistry = client.getToolRegistry();
  }

  async coordinateToolExecution(
    requests: ToolCallRequestInfo[],
    sessionId: string,
    signal?: AbortSignal
  ): Promise<ToolCallResponseInfo[]> {
    console.log(`[ToolCoordinator] Coordinating ${requests.length} tools for session ${sessionId}`);

    // Create task controller for this execution
    const taskController = new AbortController();
    const taskId = `${sessionId}-${Date.now()}`;
    this.activeTasks.set(taskId, taskController);

    // Combine signals
    const combinedSignal = this.combineSignals([signal, taskController.signal].filter(Boolean) as AbortSignal[]);

    try {
      // Group tools by execution strategy
      const { parallelTools, sequentialTools, sandboxTools } = this.groupTools(requests);

      const results: ToolCallResponseInfo[] = [];

      // Execute sandbox tools first (shell commands)
      if (sandboxTools.length > 0) {
        console.log(`[ToolCoordinator] Executing ${sandboxTools.length} sandbox tools`);
        const sandboxResults = await this.client.executeTools(sandboxTools, combinedSignal);
        results.push(...sandboxResults);
      }

      // Execute parallel tools
      if (parallelTools.length > 0) {
        console.log(`[ToolCoordinator] Executing ${parallelTools.length} parallel tools`);
        const parallelResults = await Promise.all(
          parallelTools.map(tool => this.client.executeTools([tool], combinedSignal))
        );
        results.push(...parallelResults.flat());
      }

      // Execute sequential tools
      for (const tool of sequentialTools) {
        console.log(`[ToolCoordinator] Executing sequential tool: ${tool.name}`);
        const sequentialResults = await this.client.executeTools([tool], combinedSignal);
        results.push(...sequentialResults);
      }

      console.log(`[ToolCoordinator] Completed ${results.length} tool executions`);
      return results;

    } catch (error) {
      console.error(`[ToolCoordinator] Tool coordination failed:`, error);
      throw error;
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  private groupTools(requests: ToolCallRequestInfo[]): {
    parallelTools: ToolCallRequestInfo[];
    sequentialTools: ToolCallRequestInfo[];
    sandboxTools: ToolCallRequestInfo[];
  } {
    const parallelTools: ToolCallRequestInfo[] = [];
    const sequentialTools: ToolCallRequestInfo[] = [];
    const sandboxTools: ToolCallRequestInfo[] = [];

    for (const request of requests) {
      if (this.isSandboxTool(request.name)) {
        sandboxTools.push(request);
      } else if (this.isParallelSafe(request.name)) {
        parallelTools.push(request);
      } else {
        sequentialTools.push(request);
      }
    }

    return { parallelTools, sequentialTools, sandboxTools };
  }

  private isSandboxTool(toolName: string): boolean {
    return ['run_shell_command', 'execute_bash', 'shell'].includes(toolName);
  }

  private isParallelSafe(toolName: string): boolean {
    // Tools that can be executed in parallel
    const parallelSafeTools = [
      'read_file',
      'ls',
      'grep',
      'web_fetch',
      'web_search'
    ];
    return parallelSafeTools.includes(toolName);
  }

  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }
    
    return controller.signal;
  }

  async cancelAllTasks(): Promise<void> {
    console.log(`[ToolCoordinator] Cancelling ${this.activeTasks.size} active tasks`);
    
    for (const [taskId, controller] of this.activeTasks) {
      controller.abort();
      console.log(`[ToolCoordinator] Cancelled task: ${taskId}`);
    }
    
    this.activeTasks.clear();
  }

  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }

  getAvailableTools(): string[] {
    return this.toolRegistry.getAllTools().map(tool => tool.displayName);
  }
}
