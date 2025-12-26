import { AcpResponse } from '@qwen-team/shared';

export class ResponseBuilder {
  createSuccessResponse(messageId: string, data: any): AcpResponse {
    return {
      id: messageId,
      success: true,
      data,
      timestamp: Date.now()
    };
  }
}
