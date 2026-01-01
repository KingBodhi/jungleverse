export interface CacheEntry<T> {
  data: T;
  expires: number;
}

export class ProviderCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTL: number;

  constructor(defaultTTLMs: number = 3600000) { // 1 hour default
    this.defaultTTL = defaultTTLMs;
  }

  /**
   * Get cached data if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data with optional TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const expires = Date.now() + (ttlMs || this.defaultTTL);
    this.cache.set(key, { data, expires });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; expired: number } {
    const now = Date.now();
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expires) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      expired
    };
  }

  /**
   * Generate cache key for provider data
   */
  static createKey(provider: string, dataType: 'tournaments' | 'cashGames', date?: Date): string {
    const dateStr = date ? date.toISOString().split('T')[0] : 'latest';
    return `${provider}:${dataType}:${dateStr}`;
  }
}

export const providerCache = new ProviderCache();

// Periodically clear expired entries (every 10 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    providerCache.clearExpired();
  }, 600000);
}
