import { AcpMessage } from '@qwen-code/shared';

export class MessageValidator {
  static validateMessage(message: any): message is AcpMessage {
    return (
      message &&
      typeof message.id === 'string' &&
      typeof message.type === 'string' &&
      message.data !== undefined &&
      typeof message.timestamp === 'number'
    );
  }

  static validateChatMessage(message: AcpMessage): boolean {
    return !!(message.data.content && message.data.sessionId);
  }

  static validateSessionMessage(message: AcpMessage): boolean {
    return !!(message.data.action && message.data.sessionId);
  }

  static validateToolMessage(message: AcpMessage): boolean {
    return !!(message.data.toolName);
  }
}
