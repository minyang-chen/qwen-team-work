export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    correlationId?: string;
    timestamp: string;
  };
}

export interface SuccessResponse<T = any> {
  data: T;
  correlationId?: string;
  timestamp: string;
}

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Business Logic
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  OPERATION_FAILED = 'OPERATION_FAILED',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Communication
  MESSAGE_VALIDATION_ERROR = 'MESSAGE_VALIDATION_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly correlationId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
    correlationId?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.correlationId = correlationId;
  }

  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        correlationId: this.correlationId,
        timestamp: new Date().toISOString()
      }
    };
  }

  static unauthorized(message = 'Unauthorized', correlationId?: string): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401, undefined, correlationId);
  }

  static forbidden(message = 'Forbidden', correlationId?: string): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, 403, undefined, correlationId);
  }

  static notFound(message = 'Resource not found', correlationId?: string): AppError {
    return new AppError(ErrorCode.RESOURCE_NOT_FOUND, message, 404, undefined, correlationId);
  }

  static validation(message: string, details?: any, correlationId?: string): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details, correlationId);
  }

  static internal(message = 'Internal server error', correlationId?: string): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500, undefined, correlationId);
  }

  static rateLimit(message = 'Rate limit exceeded', correlationId?: string): AppError {
    return new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429, undefined, correlationId);
  }
}

export function createSuccessResponse<T>(data: T, correlationId?: string): SuccessResponse<T> {
  return {
    data,
    correlationId,
    timestamp: new Date().toISOString()
  };
}

// Express error handler middleware
export function errorHandler(error: any, req: any, res: any, next: any): void {
  const correlationId = req.headers['x-correlation-id'] || req.body?.correlationId;
  
  if (error instanceof AppError) {
    res.status(error.statusCode).json(error.toResponse());
  } else {
    const appError = AppError.internal(error.message || 'Unknown error', correlationId);
    res.status(500).json(appError.toResponse());
  }
}

// Fastify error handler
export function fastifyErrorHandler(error: any, request: any, reply: any): void {
  const correlationId = request.headers['x-correlation-id'] || request.body?.correlationId;
  
  if (error instanceof AppError) {
    reply.status(error.statusCode).send(error.toResponse());
  } else {
    const appError = AppError.internal(error.message || 'Unknown error', correlationId);
    reply.status(500).send(appError.toResponse());
  }
}
