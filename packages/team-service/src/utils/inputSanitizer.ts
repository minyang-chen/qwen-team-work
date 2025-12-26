// Simple input sanitizer for UI server
class InputSanitizer {
  sanitizeMessage(message: string): string {
    // Basic sanitization - remove potential XSS
    return message
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  validateMessageData(data: any): boolean {
    return (
      data &&
      typeof data.message === 'string' &&
      data.message.length > 0 &&
      data.message.length < 10000
    );
  }

  validateMessageStructure(data: any): boolean {
    return this.validateMessageData(data);
  }
}

export const inputSanitizer = new InputSanitizer();
