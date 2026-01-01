export class RateLimiter {
  private lastRequest = new Map<string, number>();
  private requestCounts = new Map<string, number[]>();

  /**
   * Throttle requests to a provider with a minimum delay between requests
   */
  async throttle(provider: string, delayMs: number = 2000): Promise<void> {
    const last = this.lastRequest.get(provider) || 0;
    const elapsed = Date.now() - last;

    if (elapsed < delayMs) {
      const waitTime = delayMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest.set(provider, Date.now());
  }

  /**
   * Check if provider has exceeded rate limit (requests per time window)
   */
  checkRateLimit(provider: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requestCounts.get(provider) || [];

    // Remove requests outside the time window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);

    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }

    validRequests.push(now);
    this.requestCounts.set(provider, validRequests);
    return true;
  }

  /**
   * Reset rate limiter for a provider
   */
  reset(provider: string): void {
    this.lastRequest.delete(provider);
    this.requestCounts.delete(provider);
  }

  /**
   * Get time until next allowed request
   */
  getTimeUntilNextRequest(provider: string, delayMs: number = 2000): number {
    const last = this.lastRequest.get(provider) || 0;
    const elapsed = Date.now() - last;
    return Math.max(0, delayMs - elapsed);
  }
}

export const globalRateLimiter = new RateLimiter();
