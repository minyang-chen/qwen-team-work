import { Logger } from './logger';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  service: string;
  operation: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export class StandardizedError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity,
    context: ErrorContext,
    cause?: Error
  ) {
    super(message);
    this.name = 'StandardizedError';
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.cause = cause;
  }
}

export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // Handle errors that should be logged and continue execution
  handleNonCritical(error: Error, context: ErrorContext): void {
    this.logger.warn('Non-critical error occurred', {
      error: error.message,
      stack: error.stack,
      ...context
    });
  }

  // Handle errors that should be logged and re-thrown
  handleCritical(error: Error, context: ErrorContext): never {
    this.logger.error('Critical error occurred', {
      error: error.message,
      stack: error.stack,
      ...context
    });
    throw new StandardizedError(
      error.message,
      'CRITICAL_ERROR',
      ErrorSeverity.CRITICAL,
      context,
      error
    );
  }

  // Handle errors with fallback behavior
  handleWithFallback<T>(
    error: Error,
    context: ErrorContext,
    fallbackValue: T,
    fallbackMessage?: string
  ): T {
    this.logger.info(fallbackMessage || 'Operation failed, using fallback', {
      error: error.message,
      fallback: typeof fallbackValue,
      ...context
    });
    return fallbackValue;
  }

  // Wrap async operations with standardized error handling
  async wrapAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: {
      fallback?: T;
      rethrow?: boolean;
    } = {}
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (options.fallback !== undefined) {
        return this.handleWithFallback(
          error as Error,
          context,
          options.fallback
        );
      }
      
      if (options.rethrow) {
        this.handleCritical(error as Error, context);
      }
      
      this.handleNonCritical(error as Error, context);
      throw error;
    }
  }
}
