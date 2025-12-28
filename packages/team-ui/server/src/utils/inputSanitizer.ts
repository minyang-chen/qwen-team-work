// Simple input sanitizer for UI server
class InputSanitizer {
  sanitizeMessage(message: string): string {
    // Basic sanitization - remove potential XSS
    return message
      replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      replace(/<[^>]*>/g, '')
      trim();
  }

  validateMessageData(data: any): boolean {
    return (
      data &&
      typeof datamessage === 'string' &&
      datamessage.length > 0 &&
      datamessage.length < 10000
    );
  }
}

export const inputSanitizer = new InputSanitizer();
