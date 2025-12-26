// Simple rate limiter for UI server
class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly maxRequests = 60;
  private readonly windowMs = 60000; // 1 minute

  isAllowed(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter((time: number) => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }
}

export const rateLimiter = new RateLimiter();
