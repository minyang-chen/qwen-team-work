import { AcpMessage, AcpResponse } from '@qwen-team/shared';
import { AIExecutionEngine } from '../execution/AIExecutionEngine.js';
import { ResponseBuilder } from '../protocol/ResponseBuilder.js';
import { ErrorHandler } from '../protocol/ErrorHandler.js';

export class EnhancedChatHandler {
  constructor(
    private aiEngine: AIExecutionEngine,
    private responseBuilder: ResponseBuilder,
    private errorHandler: ErrorHandler
  ) {}

  async handleChatMessage(message: AcpMessage): Promise<AcpResponse> {
    console.log('[EnhancedChatHandler] Received chat message:', JSON.stringify(message, null, 2));
    try {
      const { message: userMessage, sessionId, userId, teamId, projectId, workingDirectory } = message.data;
      
      console.log('[EnhancedChatHandler] Executing message with aiEngine');
      const context = {
        sessionId,
        userId,
        teamId,
        projectId,
        workingDirectory
      };

      const result = await this.aiEngine.executeMessage(userMessage, context);
      
      return this.responseBuilder.createSuccessResponse(message.id, { 
        text: result.text,
        usage: result.usage,
        toolResults: result.toolResults
      });
    } catch (error) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'CHAT_EXECUTION_ERROR',
        'Failed to execute chat message',
        error
      );
    }
  }

  async *handleChatStream(message: AcpMessage): AsyncGenerator<any> {
    try {
      const { message: userMessage, sessionId, userId, teamId, projectId, workingDirectory } = message.data;
      
      const context = {
        sessionId,
        userId,
        teamId,
        projectId,
        workingDirectory
      };

      for await (const chunk of this.aiEngine.executeMessageStream(userMessage, context)) {
        yield {
          id: message.id,
          type: 'stream_chunk',
          data: chunk
        };
      }

      yield {
        id: message.id,
        type: 'stream_complete',
        data: { finished: true }
      };
    } catch (error) {
      yield {
        id: message.id,
        type: 'stream_error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  async handleToolExecution(message: AcpMessage): Promise<AcpResponse> {
    try {
      const { toolName, parameters, sessionId, userId, teamId, projectId } = message.data;
      
      const context = { sessionId, userId, teamId, projectId };
      const executor = await this.aiEngine.getToolExecutor(context);
      
      const toolRequest = {
        callId: `tool-${Date.now()}`,
        name: toolName,
        args: parameters,
        isClientInitiated: false,
        prompt_id: `prompt-${Date.now()}`
      };

      const results = await executor.executeTools([toolRequest], new AbortController().signal, sessionId);
      
      return this.responseBuilder.createSuccessResponse(message.id, { 
        results: results.map(r => ({
          callId: r.callId,
          result: r.resultDisplay,
          error: r.error?.message
        }))
      });
    } catch (error) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'TOOL_EXECUTION_ERROR',
        'Failed to execute tool',
        error
      );
    }
  }

  async cleanup(): Promise<void> {
    await this.aiEngine.cleanupAll();
  }
}
