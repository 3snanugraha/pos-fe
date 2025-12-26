import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_CONFIG, DEBUG_MODE } from './config';
import { CacheItem } from './types';

export class CacheManager {
  private static instance: CacheManager;

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Generate cache key with prefix
  private generateKey(key: string): string {
    return `cache_${key}`;
  }

  // Set cache item with expiry
  async set<T>(key: string, data: T, duration: number = CACHE_CONFIG.MEDIUM): Promise<void> {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + duration,
      };

      await AsyncStorage.setItem(
        this.generateKey(key),
        JSON.stringify(cacheItem)
      );

      if (DEBUG_MODE) {
        console.log(`💾 Cache SET: ${key} (expires in ${Math.round(duration / 60000)}min)`);
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn(`Failed to set cache for ${key}:`, error);
      }
    }
  }

  // Get cache item if not expired
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(this.generateKey(key));
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if expired
      if (now > cacheItem.expiry) {
        await this.delete(key);
        if (DEBUG_MODE) {
          console.log(`🗑️ Cache EXPIRED: ${key}`);
        }
        return null;
      }

      if (DEBUG_MODE) {
        const remainingMin = Math.round((cacheItem.expiry - now) / 60000);
        console.log(`📖 Cache HIT: ${key} (${remainingMin}min remaining)`);
      }

      return cacheItem.data;
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn(`Failed to get cache for ${key}:`, error);
      }
      return null;
    }
  }

  // Check if cache exists and not expired
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  // Delete specific cache item
  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.generateKey(key));
      if (DEBUG_MODE) {
        console.log(`🗑️ Cache DELETE: ${key}`);
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn(`Failed to delete cache for ${key}:`, error);
      }
    }
  }

  // Clear all cache with specific prefix
  async clear(prefix?: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => {
        if (!key.startsWith('cache_')) return false;
        if (prefix) return key.startsWith(`cache_${prefix}`);
        return true;
      });

      await AsyncStorage.multiRemove(cacheKeys);

      if (DEBUG_MODE) {
        console.log(`🧹 Cache CLEAR: ${cacheKeys.length} items removed`);
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to clear cache:', error);
      }
    }
  }

  // Get cache info (size, count, etc.)
  async getInfo(): Promise<{
    totalItems: number;
    expiredItems: number;
    totalSize: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      let expiredCount = 0;
      let totalSize = 0;
      const now = Date.now();

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          totalSize += cached.length;
          try {
            const cacheItem = JSON.parse(cached);
            if (now > cacheItem.expiry) {
              expiredCount++;
            }
          } catch {
            // Invalid cache item, count as expired
            expiredCount++;
          }
        }
      }

      return {
        totalItems: cacheKeys.length,
        expiredItems: expiredCount,
        totalSize,
      };
    } catch (error) {
      return {
        totalItems: 0,
        expiredItems: 0,
        totalSize: 0,
      };
    }
  }

  // Clean up expired cache items
  async cleanup(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      const expiredKeys: string[] = [];
      const now = Date.now();

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          try {
            const cacheItem = JSON.parse(cached);
            if (now > cacheItem.expiry) {
              expiredKeys.push(key);
            }
          } catch {
            // Invalid cache item, remove it
            expiredKeys.push(key);
          }
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }

      if (DEBUG_MODE && expiredKeys.length > 0) {
        console.log(`🧹 Cache CLEANUP: ${expiredKeys.length} expired items removed`);
      }

      return expiredKeys.length;
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to cleanup cache:', error);
      }
      return 0;
    }
  }

  // Get cache with fallback function
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    duration: number = CACHE_CONFIG.MEDIUM
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss, fetch from fallback
    if (DEBUG_MODE) {
      console.log(`📡 Cache MISS: ${key} - fetching from source`);
    }

    const data = await fallback();
    await this.set(key, data, duration);
    return data;
  }

  // Invalidate cache by pattern
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchingKeys = keys.filter(key => 
        key.startsWith('cache_') && key.includes(pattern)
      );

      if (matchingKeys.length > 0) {
        await AsyncStorage.multiRemove(matchingKeys);
      }

      if (DEBUG_MODE && matchingKeys.length > 0) {
        console.log(`🗑️ Cache INVALIDATE: ${matchingKeys.length} items matching '${pattern}'`);
      }

      return matchingKeys.length;
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn(`Failed to invalidate cache pattern ${pattern}:`, error);
      }
      return 0;
    }
  }

  // Prefetch data and cache it
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    duration: number = CACHE_CONFIG.MEDIUM
  ): Promise<void> {
    try {
      // Only prefetch if not already cached
      if (!(await this.has(key))) {
        const data = await fetcher();
        await this.set(key, data, duration);
        
        if (DEBUG_MODE) {
          console.log(`📡 Cache PREFETCH: ${key}`);
        }
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn(`Failed to prefetch ${key}:`, error);
      }
    }
  }

  // Batch operations
  async setMany<T>(items: Array<{ key: string; data: T; duration?: number }>): Promise<void> {
    try {
      const pairs = items.map(item => [
        this.generateKey(item.key),
        JSON.stringify({
          data: item.data,
          timestamp: Date.now(),
          expiry: Date.now() + (item.duration || CACHE_CONFIG.MEDIUM),
        }),
      ]);

      await AsyncStorage.multiSet(pairs as [string, string][]);

      if (DEBUG_MODE) {
        console.log(`💾 Cache SET MANY: ${items.length} items`);
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to set many cache items:', error);
      }
    }
  }

  async getMany<T>(keys: string[]): Promise<Array<{ key: string; data: T | null }>> {
    try {
      const cacheKeys = keys.map(key => this.generateKey(key));
      const cached = await AsyncStorage.multiGet(cacheKeys);
      const now = Date.now();

      return cached.map(([cacheKey, value], index) => {
        const originalKey = keys[index];
        
        if (!value) {
          return { key: originalKey, data: null };
        }

        try {
          const cacheItem: CacheItem<T> = JSON.parse(value);
          
          // Check if expired
          if (now > cacheItem.expiry) {
            // Don't await this, just fire and forget
            this.delete(originalKey);
            return { key: originalKey, data: null };
          }

          return { key: originalKey, data: cacheItem.data };
        } catch {
          return { key: originalKey, data: null };
        }
      });
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to get many cache items:', error);
      }
      return keys.map(key => ({ key, data: null }));
    }
  }
}

// Singleton instance
export const cacheManager = CacheManager.getInstance();

// Helper functions for common cache operations
export const cacheHelpers = {
  // Cache products list
  cacheProducts: (params: any, data: any, duration = CACHE_CONFIG.MEDIUM) => {
    const key = `products_${JSON.stringify(params)}`;
    return cacheManager.set(key, data, duration);
  },

  // Get cached products
  getCachedProducts: (params: any) => {
    const key = `products_${JSON.stringify(params)}`;
    return cacheManager.get(key);
  },

  // Cache single product
  cacheProduct: (id: number, data: any, duration = CACHE_CONFIG.LONG) => {
    return cacheManager.set(`product_${id}`, data, duration);
  },

  // Get cached product
  getCachedProduct: (id: number) => {
    return cacheManager.get(`product_${id}`);
  },

  // Cache categories
  cacheCategories: (data: any, duration = CACHE_CONFIG.VERY_LONG) => {
    return cacheManager.set('categories', data, duration);
  },

  // Get cached categories
  getCachedCategories: () => {
    return cacheManager.get('categories');
  },

  // Cache banners
  cacheBanners: (data: any, duration = CACHE_CONFIG.LONG) => {
    return cacheManager.set('banners', data, duration);
  },

  // Get cached banners
  getCachedBanners: () => {
    return cacheManager.get('banners');
  },

  // Clear product-related cache
  clearProductCache: () => {
    return cacheManager.invalidatePattern('product');
  },

  // Clear all cache when user logs out
  clearUserCache: () => {
    return cacheManager.clear('user');
  },
};
