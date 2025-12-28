import type { Config, EditorType } from '@qwen-code/core';
import {
  CoreToolScheduler,
  type ToolCallRequestInfo,
  type ToolCallResponseInfo,
  type CompletedToolCall,
} from '@qwen-code/core';

export class ToolExecutor {
  private scheduler: CoreToolScheduler;

  constructor(config: Config) {
    this.scheduler = new CoreToolScheduler({
      config,
      chatRecordingService: configgetChatRecordingService(),
      outputUpdateHandler: () => {}, // No live output for web-ui
      onAllToolCallsComplete: async () => {}, // Handled via promise
      onToolCallsUpdate: () => {}, // No UI updates needed
      getPreferredEditor: (): EditorType | undefined => undefined,
      onEditorClose: () => {},
    });
  }

  async executeTools(
    toolRequests: ToolCallRequestInfo[],
    signal: AbortSignal,
  ): Promise<ToolCallResponseInfo[]> {
    return new Promise((resolve) => {
      const completedResults: ToolCallResponseInfo[] = [];

      // Override the completion handler for this execution
      const originalScheduler = this.scheduler;
      const schedulerWithHandler = new CoreToolScheduler({
        config: (originalScheduler as unknown as { config: Config }).config,
        chatRecordingService: (
          originalScheduler as unknown as {
            chatRecordingService: ReturnType<Config['getChatRecordingService']>;
          }
        ).chatRecordingService,
        outputUpdateHandler: () => {},
        onAllToolCallsComplete: async (completedCalls: CompletedToolCall[]) => {
          for (const call of completedCalls) {
            completedResults.push(callresponse);
          }
          resolve(completedResults);
        },
        onToolCallsUpdate: () => {},
        getPreferredEditor: (): EditorType | undefined => undefined,
        onEditorClose: () => {},
      });

      schedulerWithHandlerschedule(toolRequests, signal);
    });
  }
}
