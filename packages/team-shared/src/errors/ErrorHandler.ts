/**
 * Error handling system for team packages
 * Adapted from CLI's error patterns
 */

export class TeamError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TeamError';
  }
}

export class ConfigurationError extends TeamError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends TeamError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class NetworkError extends TeamError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends TeamError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export interface ErrorHandler {
  handleError(error: Error): void;
}

export class TeamErrorHandler implements ErrorHandler {
  private listeners: ((error: Error) => void)[] = [];

  handleError(error: Error): void {
    console.error('Team Error:', error);
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    // Show user-friendly message
    this.showUserMessage(error);
  }

  subscribe(listener: (error: Error) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private showUserMessage(error: Error): void {
    let message = 'An unexpected error occurred';
    
    if (error instanceof ConfigurationError) {
      message = 'Configuration error: ' + error.message;
    } else if (error instanceof AuthenticationError) {
      message = 'Authentication failed: ' + error.message;
    } else if (error instanceof NetworkError) {
      message = 'Network error: ' + error.message;
    } else if (error instanceof ValidationError) {
      message = 'Validation error: ' + error.message;
    }

    // In a real app, this would show a toast/notification
    console.warn('User message:', message);
  }
}

export const errorHandler = new TeamErrorHandler();

// Utility functions
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function isRetryableError(error: Error): boolean {
  return error instanceof NetworkError || 
         (!!error.message && error.message.includes('timeout'));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries || !isRetryableError(lastError)) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw lastError!;
}
