import { Logger } from '../utils/Logger';

export class RetryHandler {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          Logger.error(`Operation failed after ${maxRetries} attempts`, error);
          throw error;
        }
        
        Logger.info(`Attempt ${attempt} failed, retrying in ${delay}ms`);
        await this.sleep(delay);
        delay *= 2; // Exponential backoff
      }
    }
    
    throw new Error('Retry logic error');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
