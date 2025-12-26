// ===== CONFIGURATION AND TYPES =====
export * from './config';
export * from './types';

// ===== CORE SERVICES =====
export * from './httpClient';
export * from './cacheManager';
export * from './apiService';

// ===== FEATURE SERVICES =====
export * from './auth';
export * from './cartService';
export * from './searchService';
export * from './networkService';

// ===== LEGACY API (for backward compatibility) =====
export * from './api';

// ===== SERVICE INITIALIZATION =====
import { apiService } from './apiService';
import { cartService } from './cartService';
import { searchService } from './searchService';
import { networkService, offlineQueueService } from './networkService';
import { cacheManager } from './cacheManager';
import { httpClient } from './httpClient';

/**
 * Initialize all services
 * Call this in your app's entry point (App.tsx)
 */
export const initializeServices = async () => {
  try {
    console.log('🚀 Initializing POS System Services...');
    
    // Test API connectivity
    const isConnected = await apiService.testConnection();
    console.log('🌐 API Connection:', isConnected ? 'Connected' : 'Offline');
    
    // Clean up expired cache
    const cleanedItems = await cacheManager.cleanup();
    if (cleanedItems > 0) {
      console.log('🧹 Cleaned', cleanedItems, 'expired cache items');
    }
    
    // Clean old search history
    const cleanedSearches = await searchService.cleanOldHistory();
    if (cleanedSearches > 0) {
      console.log('🔍 Cleaned', cleanedSearches, 'old search history items');
    }
    
    // Prefetch common data if connected
    if (isConnected) {
      await apiService.prefetchCommonData();
      console.log('📦 Common data prefetched');
    }
    
    console.log('✅ Services initialized successfully');
    
    return {
      apiConnected: isConnected,
      cacheCleanedItems: cleanedItems,
      searchCleanedItems: cleanedSearches,
    };
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
};

/**
 * Get service status information
 */
export const getServiceStatus = async () => {
  try {
    const [
      apiStatus,
      networkState,
      cacheInfo,
      queueStatus,
      searchStats,
      cartItemCount,
    ] = await Promise.all([
      apiService.testConnection(),
      networkService.getNetworkState(),
      cacheManager.getInfo(),
      offlineQueueService.getQueueStatus(),
      searchService.getSearchStats(),
      cartService.getItemCount(),
    ]);

    return {
      api: {
        connected: apiStatus,
        lastCheck: Date.now(),
      },
      network: networkState,
      cache: cacheInfo,
      offlineQueue: queueStatus,
      search: searchStats,
      cart: {
        itemCount: cartItemCount,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Failed to get service status:', error);
    return {
      error: error.message,
      timestamp: Date.now(),
    };
  }
};

/**
 * Clear all service data (useful for logout or reset)
 */
export const clearAllServiceData = async () => {
  try {
    console.log('🧹 Clearing all service data...');
    
    await Promise.all([
      cacheManager.clear(),
      cartService.clearCart(),
      searchService.clearSearchHistory(),
      offlineQueueService.clearQueue(),
    ]);
    
    console.log('✅ All service data cleared');
  } catch (error) {
    console.error('❌ Failed to clear service data:', error);
    throw error;
  }
};

/**
 * Export service statistics for debugging/monitoring
 */
export const exportServiceData = async () => {
  try {
    const [
      serviceStatus,
      cacheInfo,
      searchHistory,
      cart,
    ] = await Promise.all([
      getServiceStatus(),
      cacheManager.getInfo(),
      searchService.exportSearchHistory(),
      cartService.getCart(),
    ]);

    return {
      exportDate: new Date().toISOString(),
      status: serviceStatus,
      cache: cacheInfo,
      searchHistory: JSON.parse(searchHistory),
      cart: cart,
      version: '1.0.0',
    };
  } catch (error) {
    console.error('Failed to export service data:', error);
    throw error;
  }
};

// ===== CONVENIENCE EXPORTS =====

// Main service instances
export const services = {
  api: apiService,
  cart: cartService,
  search: searchService,
  network: networkService,
  offlineQueue: offlineQueueService,
  cache: cacheManager,
  http: httpClient,
} as const;

// Helper collections
export { apiHelpers } from './apiService';
export { searchHelpers } from './searchService';
export { networkHelpers } from './networkService';
export { cacheHelpers } from './cacheManager';

// Type exports for convenience
export type {
  // API Types
  ApiResponse,
  ApiStatus,
  ApiErrorResponse,
  
  // Product Types
  Product,
  ProductCategory,
  ProductVariant,
  ProductImage,
  ProductSearchParams,
  
  // Customer Types
  CustomerProfile,
  CustomerAddress,
  CustomerDashboard,
  AddressCreateData,
  
  // Order Types
  Order,
  OrderItem,
  OrderCreateData,
  OrderStatusHistory,
  
  // Transaction Types
  Transaction,
  TransactionItem,
  
  // Authentication Types
  LoginCredentials,
  RegisterData,
  AuthResponse,
  
  // Other Types
  Banner,
  PaymentMethod,
  Promotion,
  PromoValidation,
  WishlistItem,
  Notification,
  PointHistory,
  Cart,
  CartItem,
  SearchHistory,
  NetworkState,
  
  // Utility Types
  PaginationMeta,
  PaginationParams,
  DateFilter,
  SortParams,
  ValidationErrors,
  CacheItem,
} from './types';

// ===== DEVELOPMENT HELPERS =====

/**
 * Enable or disable debug mode for all services
 */
export const setDebugMode = (enabled: boolean) => {
  // This would typically set a global debug flag
  console.log('🔧 Debug mode:', enabled ? 'Enabled' : 'Disabled');
  
  // In a real implementation, you might update the config
  // (config as any).DEBUG_MODE = enabled;
};

/**
 * Reset all services to initial state (useful for testing)
 */
export const resetServices = async () => {
  console.log('🔄 Resetting all services...');
  
  try {
    await clearAllServiceData();
    await initializeServices();
    console.log('✅ Services reset complete');
  } catch (error) {
    console.error('❌ Service reset failed:', error);
    throw error;
  }
};

/**
 * Health check for all services
 */
export const healthCheck = async () => {
  const startTime = Date.now();
  
  try {
    const status = await getServiceStatus();
    const duration = Date.now() - startTime;
    
    const health = {
      healthy: true,
      duration,
      checks: {
        api: status.api?.connected || false,
        network: status.network?.isConnected || false,
        cache: (status.cache?.totalItems || 0) >= 0,
        cart: (status.cart?.itemCount || 0) >= 0,
      },
      timestamp: startTime,
    };
    
    const failedChecks = Object.entries(health.checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    
    if (failedChecks.length > 0) {
      health.healthy = false;
      console.warn('⚠️ Health check failed for:', failedChecks.join(', '));
    } else {
      console.log('✅ Health check passed in', duration, 'ms');
    }
    
    return health;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return {
      healthy: false,
      error: error.message,
      duration: Date.now() - startTime,
      timestamp: startTime,
    };
  }
};
