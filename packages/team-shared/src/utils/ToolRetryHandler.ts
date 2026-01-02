/**
 * Retry logic for failed tool executions
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'Container not running'
  ]
};

export class ToolRetryHandler {
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { toolName: string; callId: string }
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryable(error as Error)) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === this.config.maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1),
          this.config.maxDelayMs
        );
        
        console.log(
          `[ToolRetry] ${context.toolName} (${context.callId}) failed, ` +
          `attempt ${attempt}/${this.config.maxAttempts}, ` +
          `retrying in ${delay}ms: ${lastError.message}`
        );
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  private isRetryable(error: Error): boolean {
    const errorMessage = error.message;
    return this.config.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
