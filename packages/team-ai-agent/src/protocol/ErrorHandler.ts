import { AcpResponse, AcpError } from '@qwen-team/shared';

export class ErrorHandler {
  createErrorResponse(
    messageId: string,
    code: string,
    message: string,
    error?: any
  ): AcpResponse {
    const acpError: AcpError = {
      code,
      message,
      details: error?.message || error
    };

    return {
      id: messageId,
      success: false,
      error: acpError,
      timestamp: Date.now()
    };
  }
}
