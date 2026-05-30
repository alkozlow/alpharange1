interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, expiresInMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  size(): number {
    return this.cache.size;
  }
}

export const apiCache = new SimpleCache();

// Helper function to create cache keys
export const createCacheKey = (...parts: string[]): string => {
  return parts.join(':');
};

// Cache duration constants
export const CACHE_DURATIONS = {
  POOL_INFO: 10 * 60 * 1000, // 10 minutes
  PRICE_DATA: 5 * 60 * 1000,  // 5 minutes
  CURRENT_PRICE: 2 * 60 * 1000, // 2 minutes
  SENTIMENT: 15 * 60 * 1000,   // 15 minutes
} as const;