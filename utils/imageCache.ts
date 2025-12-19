import { indexedDBService, type CacheEntry } from '@/services/indexedDBService';
import { imageDownloadUrlToBase64 } from '@/utils';
import { ImageData } from '@/types';

/**
 * Hybrid cache system for storing converted base64 images:
 * 1. In-memory cache (fast, lost on page refresh)
 * 2. IndexedDB cache (persistent, survives page refresh)
 * 3. Firebase Storage (source of truth, slowest)
 */

const MAX_MEMORY_CACHE = 20; // Max images in memory
const CACHE_EXPIRY_TIME = 1000 * 60 * 60 * 24 * 30; // 30 days

class ImageCache {
  private memoryCache: Map<string, CacheEntry> = new Map();

  /**
   * Get cached base64 from storagePath URL.
   * Checks memory cache first, then IndexedDB
   */
  async get(cacheKey: string): Promise<string | null> {
    // Check memory cache first (fastest)
    const memCached = this.memoryCache.get(cacheKey);
    if (memCached && !this.isExpired(memCached)) {
      console.log('[Cache] Memory hit:', cacheKey);
      return memCached.base64;
    }

    // Check IndexedDB (persistent)
    try {
      const entry = await indexedDBService.get(cacheKey);
      if (entry && !this.isExpired(entry)) {
        console.log('[Cache] IndexedDB hit:', cacheKey.substring(0, 50));
        // Restore to memory cache for faster access
        this.memoryCache.set(cacheKey, entry);
        if (this.memoryCache.size > MAX_MEMORY_CACHE) {
          const firstKey = this.memoryCache.keys().next().value;
          if (firstKey) {
            this.memoryCache.delete(firstKey);
          }
        }
        return entry.base64;
      }
    } catch (error) {
      console.warn('[Cache] IndexedDB read failed:', error);
    }

    console.log('[Cache] Cache miss:', cacheKey.substring(0, 50));
    return null;
  }

  /**
   * Store base64 in both memory and IndexedDB
   */
  async set(cacheKey: string, base64: string, mimeType: string): Promise<void> {
    const entry: CacheEntry = {
      base64,
      timestamp: Date.now(),
      mimeType,
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, entry);
    if (this.memoryCache.size > MAX_MEMORY_CACHE) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    // Store in IndexedDB
    try {
      await indexedDBService.set(cacheKey, entry);
      console.log('[Cache] Stored in IndexedDB, memory cache size:', this.memoryCache.size);
    } catch (error) {
      console.warn('[Cache] IndexedDB write failed:', error);
    }
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > CACHE_EXPIRY_TIME;
  }

  /**
   * Clear memory cache
   */
  clearMemory(): void {
    this.memoryCache.clear();
    console.log('[Cache] Memory cache cleared');
  }

  /**
   * Clear IndexedDB
   */
  async clearDB(): Promise<void> {
    await indexedDBService.clear();
  }

  /**
   * Clear all caches (memory + IndexedDB)
   */
  // TODO: clear cache when logout
  async clearAll(): Promise<void> {
    this.clearMemory();
    await this.clearDB();
  }
}

/**
 * Cache base64 data for an array of images
 * This runs in the background without blocking the Redux state update
 */
export async function cacheImageBase64s(images: ImageData[]): Promise<void> {
  const totalImages = images.length;

  if (totalImages === 0) {
    console.log('[Cache] No images to cache');
    return;
  }

  let cachedCount = 0;
  let skippedCount = 0;

  for (const image of images) {
    try {
      // Check if already cached before attempting to cache
      const existingCache = await imageCache.get(image.imageDownloadUrl);
      if (existingCache) {
        skippedCount++;
        console.log(`[Cache] Skipped (already cached): ${image.id}`);
        continue;
      }

      // Fire and forget - we don't need to wait for each one sequentially
      // But we'll track progress
      imageDownloadUrlToBase64(image.imageDownloadUrl)
        .then(() => {
          cachedCount++;
          if (cachedCount % 5 === 0 || cachedCount === totalImages - skippedCount) {
            console.log(
              `[Cache] Progress: ${cachedCount}/${
                totalImages - skippedCount
              } images cached (${skippedCount} skipped)`
            );
          }
        })
        .catch((error) => {
          console.warn(`[Cache] Failed to cache image ${image.id}:`, error);
        });
    } catch (error) {
      console.warn(`[Cache] Error caching image ${image.id}:`, error);
    }
  }

  console.log(
    `[Cache] Queued ${
      totalImages - skippedCount
    } images for caching (${skippedCount} already cached)`
  );
}

// Export singleton instance
export const imageCache = new ImageCache();
