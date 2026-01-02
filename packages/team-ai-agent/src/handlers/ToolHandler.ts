import { AcpMessage, AcpResponse } from '@qwen-team/shared';
import { ServerClient } from '../server/index.js';
import { ResponseBuilder } from '../protocol/ResponseBuilder.js';
import { ErrorHandler } from '../protocol/ErrorHandler.js';

export class ToolHandler {
  constructor(
    private responseBuilder: ResponseBuilder,
    private errorHandler: ErrorHandler,
    private serverClient?: ServerClient
  ) {}

  async handleToolExecution(message: AcpMessage): Promise<AcpResponse> {
    try {
      const { toolName, parameters } = message.data;
      
      if (!this.serverClient) {
        return this.errorHandler.createErrorResponse(
          message.id,
          'NO_SERVER_CLIENT',
          'ServerClient not available for tool execution'
        );
      }
      
      const result = await this.executeTool(toolName, parameters);
      
      return this.responseBuilder.createSuccessResponse(message.id, { result });
    } catch (error) {
      return this.errorHandler.createErrorResponse(
        message.id,
        'TOOL_EXECUTION_ERROR',
        'Failed to execute tool',
        error
      );
    }
  }

  private async executeTool(toolName: string, parameters: any): Promise<any> {
    const toolRequest = {
      callId: `tool-${Date.now()}`,
      name: toolName,
      args: parameters,
      isClientInitiated: false,
      prompt_id: `prompt-${Date.now()}`
    };
    const results = await this.serverClient!.executeTools([toolRequest], new AbortController().signal);
    return results[0];
  }
}
