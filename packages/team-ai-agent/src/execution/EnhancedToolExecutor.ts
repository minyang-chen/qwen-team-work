import type { Config, EditorType } from '@qwen-code/qwen-code-core';
import {
  CoreToolScheduler,
  type ToolCallRequestInfo,
  type ToolCallResponseInfo,
  type CompletedToolCall,
} from '@qwen-code/qwen-code-core';
import { ToolCoordinator } from '../handlers/ToolCoordinator.js';
import { ServerClient } from '../server/ServerClient.js';

export class EnhancedToolExecutor {
  private scheduler: CoreToolScheduler;
  private coordinator: ToolCoordinator;

  constructor(private serverClient: ServerClient) {
    const config = serverClient.getConfig();
    
    this.scheduler = new CoreToolScheduler({
      config,
      chatRecordingService: config.getChatRecordingService(),
      outputUpdateHandler: () => {}, // Handled by coordinator
      onAllToolCallsComplete: async () => {}, // Handled via promise
      onToolCallsUpdate: () => {},
      getPreferredEditor: (): EditorType | undefined => undefined,
      onEditorClose: () => {},
    });

    this.coordinator = new ToolCoordinator(serverClient);
  }

  async executeTools(
    toolRequests: ToolCallRequestInfo[],
    signal: AbortSignal,
    sessionId: string,
  ): Promise<ToolCallResponseInfo[]> {
    // Use the enhanced coordinator for better tool orchestration
    return this.coordinator.coordinateToolExecution(toolRequests, sessionId, signal);
  }

  async executeToolsWithScheduler(
    toolRequests: ToolCallRequestInfo[],
    signal: AbortSignal,
  ): Promise<ToolCallResponseInfo[]> {
    return new Promise((resolve) => {
      const completedResults: ToolCallResponseInfo[] = [];

      const schedulerWithHandler = new CoreToolScheduler({
        config: this.serverClient.getConfig(),
        chatRecordingService: this.serverClient.getConfig().getChatRecordingService(),
        outputUpdateHandler: () => {},
        onAllToolCallsComplete: async (completedCalls: CompletedToolCall[]) => {
          for (const call of completedCalls) {
            completedResults.push(call.response);
          }
          resolve(completedResults);
        },
        onToolCallsUpdate: () => {},
        getPreferredEditor: (): EditorType | undefined => undefined,
        onEditorClose: () => {},
      });

      schedulerWithHandler.schedule(toolRequests, signal);
    });
  }

  getAvailableTools(): string[] {
    return this.coordinator.getAvailableTools();
  }

  getActiveTaskCount(): number {
    return this.coordinator.getActiveTaskCount();
  }

  async cancelAllTasks(): Promise<void> {
    return this.coordinator.cancelAllTasks();
  }
}
