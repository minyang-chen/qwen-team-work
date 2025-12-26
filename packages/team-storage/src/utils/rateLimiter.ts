// @ts-nocheck
interface RateLimit {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimit>();
  private maxRequests = 60; // per minute
  private windowMs = 60000; // 1 minute

  isAllowed(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.limits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.limits.set(userId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (userLimit.count >= this.maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  getRemainingRequests(userId: string): number {
    const userLimit = this.limits.get(userId);
    if (!userLimit || Date.now() > userLimit.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - userLimit.count);
  }

  getResetTime(userId: string): number {
    const userLimit = this.limits.get(userId);
    return userLimit?.resetTime || Date.now() + this.windowMs;
  }
}

export const rateLimiter = new RateLimiter();
