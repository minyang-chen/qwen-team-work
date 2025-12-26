import { AcpMessage, AcpResponse } from '@qwen-team/shared';
import { ResponseBuilder } from '../protocol/ResponseBuilder.js';
import { ErrorHandler } from '../protocol/ErrorHandler.js';

export class ToolHandler {
  constructor(
    private responseBuilder: ResponseBuilder,
    private errorHandler: ErrorHandler
  ) {}

  async handleToolExecution(message: AcpMessage): Promise<AcpResponse> {
    try {
      const { toolName, parameters } = message.data;
      
      // Minimal tool execution - replace with actual tool integration
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
    // Placeholder tool execution
    return { toolName, parameters, executed: true };
  }
}
