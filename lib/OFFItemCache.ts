// Simple in-memory cache for OFF items from search results
// This avoids passing large JSON objects through URL params

interface CachedOFFItem {
  id: string;
  name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  protein_per_100cals?: number;
  allergens?: string[];
  ingredients?: string;
  [key: string]: any;
}

class OFFItemCache {
  private cache: Map<string, CachedOFFItem> = new Map();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private timestamps: Map<string, number> = new Map();

  set(itemId: string, item: CachedOFFItem): void {
    // Clean up old entries if cache is too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup();
    }

    this.cache.set(itemId, item);
    this.timestamps.set(itemId, Date.now());
  }

  get(itemId: string): CachedOFFItem | null {
    const item = this.cache.get(itemId);
    if (!item) {
      return null;
    }

    // Check if item has expired
    const timestamp = this.timestamps.get(itemId);
    if (timestamp && Date.now() - timestamp > this.CACHE_TTL) {
      this.cache.delete(itemId);
      this.timestamps.delete(itemId);
      return null;
    }

    return item;
  }

  has(itemId: string): boolean {
    return this.get(itemId) !== null;
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    // Remove expired items
    this.timestamps.forEach((timestamp, itemId) => {
      if (now - timestamp > this.CACHE_TTL) {
        toDelete.push(itemId);
      }
    });

    toDelete.forEach(itemId => {
      this.cache.delete(itemId);
      this.timestamps.delete(itemId);
    });

    // If still too large, remove oldest entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.timestamps.entries())
        .sort((a, b) => a[1] - b[1]);
      
      const toRemove = sortedEntries.slice(0, this.cache.size - this.MAX_CACHE_SIZE + 10);
      toRemove.forEach(([itemId]) => {
        this.cache.delete(itemId);
        this.timestamps.delete(itemId);
      });
    }
  }
}

export const offItemCache = new OFFItemCache();

