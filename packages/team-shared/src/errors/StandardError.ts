export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Business logic errors
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: number;
}

export class StandardError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'StandardError';
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: Date.now(),
    };
  }

  static rateLimit(message: string, details?: any): StandardError {
    return new StandardError(ErrorCode.RATE_LIMIT_EXCEEDED, message, details);
  }

  static validation(message: string, details?: any): StandardError {
    return new StandardError(ErrorCode.VALIDATION_ERROR, message, details);
  }

  static forbidden(message: string, details?: any): StandardError {
    return new StandardError(ErrorCode.FORBIDDEN, message, details);
  }

  static internal(message: string, details?: any): StandardError {
    return new StandardError(ErrorCode.INTERNAL_ERROR, message, details);
  }

  toResponse() {
    return this.toJSON();
  }
}

export function isRetryableError(error: Error): boolean {
  if (error instanceof StandardError) {
    return [
      ErrorCode.TIMEOUT,
      ErrorCode.SERVICE_UNAVAILABLE,
    ].includes(error.code);
  }
  return error.name === 'AbortError' || error.message.includes('ECONNREFUSED');
}

export function mapErrorToStandard(error: unknown): StandardError {
  if (error instanceof StandardError) return error;
  
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new StandardError(ErrorCode.TIMEOUT, 'Request timeout');
    }
    if (error.message.includes('quota')) {
      return new StandardError(ErrorCode.QUOTA_EXCEEDED, error.message);
    }
    if (error.message.includes('tool')) {
      return new StandardError(ErrorCode.TOOL_EXECUTION_FAILED, error.message);
    }
    return new StandardError(ErrorCode.INTERNAL_ERROR, error.message);
  }
  
  return new StandardError(ErrorCode.INTERNAL_ERROR, 'Unknown error');
}
