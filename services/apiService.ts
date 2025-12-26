import { httpClient, ApiError } from './httpClient';
import { cacheManager, cacheHelpers } from './cacheManager';
import { API_ENDPOINTS, CACHE_CONFIG } from './config';
import * as Types from './types';

/**
 * Comprehensive API Service Layer
 * Provides typed methods for all API endpoints with caching support
 */
export class ApiService {
  private static instance: ApiService;

  private constructor() {}

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Check API status
   */
  async checkApiStatus(): Promise<Types.ApiStatus> {
    const response = await httpClient.get<Types.ApiStatus>(API_ENDPOINTS.public.status);
    return response.data;
  }

  /**
   * Get banners with caching
   */
  async getBanners(useCache = true): Promise<Types.Banner[]> {
    if (useCache) {
      return cacheManager.getOrSet(
        'banners',
        async () => {
          const response = await httpClient.get<Types.Banner[]>(API_ENDPOINTS.public.banners);
          return response.data;
        },
        CACHE_CONFIG.LONG
      );
    }

    const response = await httpClient.get<Types.Banner[]>(API_ENDPOINTS.public.banners);
    return response.data;
  }

  /**
   * Get product categories with caching
   */
  async getProductCategories(useCache = true): Promise<Types.ProductCategory[]> {
    if (useCache) {
      return cacheManager.getOrSet(
        'categories',
        async () => {
          const response = await httpClient.get<Types.ProductCategory[]>(API_ENDPOINTS.public.categories);
          return response.data;
        },
        CACHE_CONFIG.VERY_LONG
      );
    }

    const response = await httpClient.get<Types.ProductCategory[]>(API_ENDPOINTS.public.categories);
    return response.data;
  }

  /**
   * Search products with advanced filters and caching
   */
  async searchProducts(params: Types.ProductSearchParams = {}, useCache = true): Promise<{
    data: Types.Product[];
    meta: Types.PaginationMeta;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.kategori_id) queryParams.append('kategori_id', params.kategori_id.toString());
    if (params.min_harga) queryParams.append('min_harga', params.min_harga.toString());
    if (params.max_harga) queryParams.append('max_harga', params.max_harga.toString());
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params.page) queryParams.append('page', params.page.toString());

    const endpoint = `${API_ENDPOINTS.public.products}?${queryParams.toString()}`;

    if (useCache && !params.search) {
      // Only cache non-search results to avoid cache pollution
      return cacheManager.getOrSet(
        `products_${JSON.stringify(params)}`,
        async () => {
          const response = await httpClient.get<{
            data: Types.Product[];
            meta: Types.PaginationMeta;
          }>(endpoint);
          return response.data;
        },
        CACHE_CONFIG.MEDIUM
      );
    }

    const response = await httpClient.get<{
      data: Types.Product[];
      meta: Types.PaginationMeta;
    }>(endpoint);
    return response.data;
  }

  /**
   * Get product by ID with caching
   */
  async getProduct(id: number, useCache = true): Promise<Types.Product> {
    if (useCache) {
      return cacheManager.getOrSet(
        `product_${id}`,
        async () => {
          const response = await httpClient.get<Types.Product>(API_ENDPOINTS.public.productDetail(id));
          return response.data;
        },
        CACHE_CONFIG.LONG
      );
    }

    const response = await httpClient.get<Types.Product>(API_ENDPOINTS.public.productDetail(id));
    return response.data;
  }

  // ===== AUTHENTICATION METHODS =====

  /**
   * Customer login
   */
  async login(credentials: Types.LoginCredentials): Promise<Types.AuthResponse> {
    const response = await httpClient.post<Types.AuthResponse>(
      API_ENDPOINTS.auth.login,
      credentials
    );
    return response.data;
  }

  /**
   * Customer registration
   */
  async register(data: Types.RegisterData): Promise<Types.AuthResponse> {
    const response = await httpClient.post<Types.AuthResponse>(
      API_ENDPOINTS.auth.register,
      data
    );
    return response.data;
  }

  /**
   * Customer logout
   */
  async logout(): Promise<void> {
    try {
      await httpClient.post(API_ENDPOINTS.auth.logout, {}, true);
    } catch (error) {
      // Logout can fail if token is already invalid, but we should continue
      console.warn('Logout request failed:', error);
    }
    
    // Clear all user-related cache
    await cacheManager.clear('user');
    await cacheManager.clear('customer');
  }

  // ===== CUSTOMER PROFILE METHODS =====

  /**
   * Get customer profile with caching
   */
  async getCustomerProfile(useCache = true): Promise<Types.CustomerProfile> {
    if (useCache) {
      return cacheManager.getOrSet(
        'customer_profile',
        async () => {
          const response = await httpClient.get<Types.CustomerProfile>(API_ENDPOINTS.auth.profile, true);
          return response.data;
        },
        CACHE_CONFIG.MEDIUM
      );
    }

    const response = await httpClient.get<Types.CustomerProfile>(API_ENDPOINTS.auth.profile, true);
    return response.data;
  }

  /**
   * Update customer profile
   */
  async updateCustomerProfile(data: Partial<Types.CustomerProfile>): Promise<Types.CustomerProfile> {
    const response = await httpClient.put<Types.CustomerProfile>(
      API_ENDPOINTS.auth.profile,
      data,
      true
    );
    
    // Invalidate profile cache
    await cacheManager.delete('customer_profile');
    
    return response.data;
  }

  /**
   * Get customer dashboard with caching
   */
  async getCustomerDashboard(useCache = true): Promise<Types.CustomerDashboard> {
    if (useCache) {
      return cacheManager.getOrSet(
        'customer_dashboard',
        async () => {
          const response = await httpClient.get<Types.CustomerDashboard>(API_ENDPOINTS.auth.dashboard, true);
          return response.data;
        },
        CACHE_CONFIG.SHORT
      );
    }

    const response = await httpClient.get<Types.CustomerDashboard>(API_ENDPOINTS.auth.dashboard, true);
    return response.data;
  }

  // ===== ADDRESS MANAGEMENT METHODS =====

  /**
   * Get customer addresses
   */
  async getCustomerAddresses(): Promise<Types.CustomerAddress[]> {
    const response = await httpClient.get<Types.CustomerAddress[]>(
      API_ENDPOINTS.customer.addresses,
      true
    );
    return response.data;
  }

  /**
   * Add customer address
   */
  async addCustomerAddress(data: Types.AddressCreateData): Promise<Types.CustomerAddress> {
    const response = await httpClient.post<Types.CustomerAddress>(
      API_ENDPOINTS.customer.addresses,
      data,
      true
    );
    return response.data;
  }

  /**
   * Update customer address
   */
  async updateCustomerAddress(id: number, data: Partial<Types.AddressCreateData>): Promise<Types.CustomerAddress> {
    const response = await httpClient.put<Types.CustomerAddress>(
      API_ENDPOINTS.customer.addressDetail(id),
      data,
      true
    );
    return response.data;
  }

  /**
   * Delete customer address
   */
  async deleteCustomerAddress(id: number): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.customer.addressDetail(id), true);
  }

  // ===== ORDER MANAGEMENT METHODS =====

  /**
   * Create customer order
   */
  async createOrder(data: Types.OrderCreateData): Promise<Types.Order> {
    const response = await httpClient.post<Types.Order>(
      API_ENDPOINTS.customer.orders,
      data,
      true
    );
    
    // Invalidate related caches
    await cacheManager.invalidatePattern('customer_orders');
    await cacheManager.delete('customer_dashboard');
    
    return response.data;
  }

  /**
   * Get customer orders with pagination
   */
  async getCustomerOrders(params: Types.PaginationParams = {}): Promise<{
    data: Types.Order[];
    meta: Types.PaginationMeta;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());

    const endpoint = `${API_ENDPOINTS.customer.orders}?${queryParams.toString()}`;
    const response = await httpClient.get<{
      data: Types.Order[];
      meta: Types.PaginationMeta;
    }>(endpoint, true);
    
    return response.data;
  }

  /**
   * Get order details by ID
   */
  async getOrderDetails(id: number): Promise<Types.Order> {
    const response = await httpClient.get<Types.Order>(
      API_ENDPOINTS.customer.orderDetail(id),
      true
    );
    return response.data;
  }

  /**
   * Cancel order
   */
  async cancelOrder(id: number): Promise<Types.Order> {
    const response = await httpClient.post<Types.Order>(
      API_ENDPOINTS.customer.cancelOrder(id),
      {},
      true
    );
    
    // Invalidate related caches
    await cacheManager.invalidatePattern('customer_orders');
    await cacheManager.delete('customer_dashboard');
    
    return response.data;
  }

  // ===== TRANSACTION METHODS =====

  /**
   * Get customer transactions with filters
   */
  async getCustomerTransactions(params: Types.DateFilter & Types.PaginationParams & {
    status?: string;
  } = {}): Promise<{
    data: Types.Transaction[];
    meta: Types.PaginationMeta;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());

    const endpoint = `${API_ENDPOINTS.customer.transactions}?${queryParams.toString()}`;
    const response = await httpClient.get<{
      data: Types.Transaction[];
      meta: Types.PaginationMeta;
    }>(endpoint, true);
    
    return response.data;
  }

  /**
   * Get transaction details by ID
   */
  async getTransactionDetails(id: number): Promise<Types.Transaction> {
    const response = await httpClient.get<Types.Transaction>(
      API_ENDPOINTS.customer.transactionDetail(id),
      true
    );
    return response.data;
  }

  // ===== POINTS METHODS =====

  /**
   * Get points history
   */
  async getPointsHistory(params: Types.PaginationParams = {}): Promise<{
    data: Types.PointHistory[];
    meta: Types.PaginationMeta;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());

    const endpoint = `${API_ENDPOINTS.customer.pointsHistory}?${queryParams.toString()}`;
    const response = await httpClient.get<{
      data: Types.PointHistory[];
      meta: Types.PaginationMeta;
    }>(endpoint, true);
    
    return response.data;
  }

  // ===== WISHLIST METHODS =====

  /**
   * Get customer wishlist
   */
  async getWishlist(params: Types.PaginationParams = {}): Promise<{
    data: Types.WishlistItem[];
    meta: Types.PaginationMeta;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());

    const endpoint = `${API_ENDPOINTS.customer.wishlist}?${queryParams.toString()}`;
    const response = await httpClient.get<{
      data: Types.WishlistItem[];
      meta: Types.PaginationMeta;
    }>(endpoint, true);
    
    return response.data;
  }

  /**
   * Add item to wishlist
   */
  async addToWishlist(produk_id: number, varian_id?: number): Promise<Types.WishlistItem> {
    const response = await httpClient.post<Types.WishlistItem>(
      API_ENDPOINTS.customer.wishlist,
      { produk_id, varian_id },
      true
    );
    return response.data;
  }

  /**
   * Remove item from wishlist
   */
  async removeFromWishlist(id: number): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.customer.removeWishlist(id), true);
  }

  // ===== PROMOTION METHODS =====

  /**
   * Get available promotions
   */
  async getPromotions(): Promise<Types.Promotion[]> {
    const response = await httpClient.get<Types.Promotion[]>(
      API_ENDPOINTS.customer.promotions,
      true
    );
    return response.data;
  }

  /**
   * Validate promotion code
   */
  async validatePromoCode(kode_promo: string, total_belanja: number): Promise<Types.PromoValidation> {
    const response = await httpClient.post<Types.PromoValidation>(
      API_ENDPOINTS.customer.validatePromo,
      { kode_promo, total_belanja },
      true
    );
    return response.data;
  }

  // ===== PAYMENT METHODS =====

  /**
   * Get available payment methods with caching
   */
  async getPaymentMethods(useCache = true): Promise<Types.PaymentMethod[]> {
    if (useCache) {
      return cacheManager.getOrSet(
        'payment_methods',
        async () => {
          const response = await httpClient.get<Types.PaymentMethod[]>(
            API_ENDPOINTS.customer.paymentMethods,
            true
          );
          return response.data;
        },
        CACHE_CONFIG.LONG
      );
    }

    const response = await httpClient.get<Types.PaymentMethod[]>(
      API_ENDPOINTS.customer.paymentMethods,
      true
    );
    return response.data;
  }

  // ===== NOTIFICATION METHODS =====

  /**
   * Get customer notifications
   */
  async getNotifications(params: Types.PaginationParams = {}): Promise<{
    data: Types.Notification[];
    meta: Types.PaginationMeta;
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());

    const endpoint = `${API_ENDPOINTS.customer.notifications}?${queryParams.toString()}`;
    const response = await httpClient.get<{
      data: Types.Notification[];
      meta: Types.PaginationMeta;
    }>(endpoint, true);
    
    return response.data;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: number): Promise<void> {
    await httpClient.post(
      API_ENDPOINTS.customer.markNotificationRead(id),
      {},
      true
    );
  }

  // ===== UTILITY METHODS =====

  /**
   * Upload file (for profile picture, etc.)
   */
  async uploadFile(endpoint: string, formData: FormData): Promise<{ url: string }> {
    const response = await httpClient.upload<{ url: string }>(endpoint, formData, true);
    return response.data;
  }

  /**
   * Clear all caches
   */
  async clearAllCache(): Promise<void> {
    await cacheManager.clear();
  }

  /**
   * Get cache statistics
   */
  async getCacheInfo(): Promise<{
    totalItems: number;
    expiredItems: number;
    totalSize: number;
  }> {
    return cacheManager.getInfo();
  }

  /**
   * Cleanup expired cache
   */
  async cleanupCache(): Promise<number> {
    return cacheManager.cleanup();
  }

  /**
   * Prefetch common data
   */
  async prefetchCommonData(): Promise<void> {
    try {
      // Prefetch banners, categories, and payment methods in parallel
      await Promise.all([
        cacheManager.prefetch('banners', () => this.getBanners(false), CACHE_CONFIG.LONG),
        cacheManager.prefetch('categories', () => this.getProductCategories(false), CACHE_CONFIG.VERY_LONG),
        cacheManager.prefetch('payment_methods', () => this.getPaymentMethods(false), CACHE_CONFIG.LONG),
      ]);
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.checkApiStatus();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Batch update cart items with latest product data
   */
  async syncCartWithLatestData(cartItems: Array<{
    produk_id: number;
    varian_id?: number;
  }>): Promise<Array<{
    produk_id: number;
    varian_id?: number;
    harga: number;
    stok_tersedia: number;
    nama_produk: string;
    nama_varian?: string;
    gambar_url?: string;
  }>> {
    // Get unique product IDs
    const productIds = [...new Set(cartItems.map(item => item.produk_id))];
    
    // Fetch all products in parallel
    const products = await Promise.all(
      productIds.map(id => this.getProduct(id, true))
    );
    
    // Map cart items to updated product data
    return cartItems.map(cartItem => {
      const product = products.find(p => p.id === cartItem.produk_id);
      if (!product) {
        throw new Error(`Product ${cartItem.produk_id} not found`);
      }
      
      let variant = null;
      if (cartItem.varian_id && product.varian) {
        variant = product.varian.find(v => v.id === cartItem.varian_id);
      }
      
      return {
        produk_id: cartItem.produk_id,
        varian_id: cartItem.varian_id,
        harga: variant?.harga_jual || product.harga_jual_min,
        stok_tersedia: variant?.stok || product.total_stok || 0,
        nama_produk: product.nama_produk,
        nama_varian: variant?.nama_varian,
        gambar_url: product.gambar?.find(g => g.gambar_utama)?.url || product.gambar?.[0]?.url,
      };
    });
  }
}

// Singleton instance
export const apiService = ApiService.getInstance();

// Helper functions for common operations
export const apiHelpers = {
  // Product helpers
  formatPrice: (price: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  },

  formatDate: (date: string): string => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  },

  formatDateTime: (date: string): string => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  },

  // Status formatters
  formatOrderStatus: (status: string): { text: string; color: string } => {
    const statusMap = {
      pending: { text: 'Menunggu', color: '#FFA500' },
      confirmed: { text: 'Dikonfirmasi', color: '#32CD32' },
      processing: { text: 'Diproses', color: '#1E90FF' },
      shipped: { text: 'Dikirim', color: '#FF6347' },
      delivered: { text: 'Selesai', color: '#228B22' },
      cancelled: { text: 'Dibatalkan', color: '#DC143C' },
    };
    return statusMap[status as keyof typeof statusMap] || { text: status, color: '#666666' };
  },

  // Error handling
  handleApiError: (error: any): string => {
    if (error instanceof ApiError) {
      return error.getUserMessage();
    }
    return error.message || 'Terjadi kesalahan tidak terduga';
  },

  // URL helpers
  buildProductImageUrl: (imagePath?: string): string | null => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `${process.env.EXPO_PUBLIC_API_URL}/storage/${imagePath}`;
  },

  // Search helpers
  buildSearchParams: (params: Types.ProductSearchParams): URLSearchParams => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    return searchParams;
  },
};
