import { router } from 'expo-router';
import { getToken, logout } from './auth';

const API_URL = 'http://192.168.100.36:8000/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface Banner {
  id: number;
  judul_banner: string;
  deskripsi: string;
  gambar_url: string;
  link_tujuan: string;
  status?: 'aktif' | 'nonaktif';
}

export interface PaymentMethod {
  id: number;
  nama_metode: string;
  jenis_pembayaran: string;
  biaya_admin: number;
  persentase_biaya: number;
  status?: 'aktif' | 'nonaktif';
}

export interface Product {
  id: number;
  nama_produk: string;
  deskripsi: string;
  harga: number;
  harga_beli?: number;
  stok: number;
  kategori_id: number;
  kategori_nama?: string;
  gambar_url?: string;
  barcode?: string;
  kode_produk?: string;
  has_variants?: boolean;
  variants_count?: number;
  status: 'aktif' | 'nonaktif';
  // Full backend response properties (for detail view)
  kategori?: {
    id: number;
    nama_kategori: string;
  };
  stokProduk?: {
    stok_tersedia: number;
  };
  varian?: Array<{
    id: number;
    nama_varian: string;
    harga_beli: number;
    harga_jual: number;
  }>;
  gambar?: Array<{
    id: number;
    path_gambar: string;
    gambar_utama: boolean;
  }>;
}

export interface ProductCategory {
  id: number;
  nama_kategori: string;
  deskripsi?: string;
}

export interface CustomerProfile {
  id: number;
  nama_pelanggan: string;
  email: string;
  telepon: string;
  alamat: string;
  kode_pelanggan: string;
  total_poin: number;
  total_belanja: number;
  grup?: {
    id: number;
    nama_grup: string;
    diskon: number;
  };
}

export interface CustomerAddress {
  id: number;
  label: string;
  nama_penerima?: string;
  penerima?: string; // Backend uses 'penerima' instead of 'nama_penerima'
  telepon_penerima: string;
  alamat_lengkap: string;
  kota: string;
  provinsi: string;
  kode_pos: string;
  is_default: boolean;
}

export interface Transaction {
  id: number;
  tanggal_transaksi: string;
  total_harga: number;
  total_diskon: number;
  total_bayar: number;
  status: string;
  metode_pembayaran: string;
  items: TransactionItem[];
}

export interface TransactionItem {
  id: number;
  produk_id: number;
  nama_produk: string;
  jumlah: number;
  harga: number;
  subtotal: number;
}

export interface Promotion {
  id: number;
  kode_promo: string;
  nama_promo: string;
  jenis_diskon: 'persentase' | 'nominal';
  nilai_diskon: number;
  minimal_pembelian: number;
  maksimal_diskon: number;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  kuota: number;
  status: 'aktif' | 'nonaktif';
}

export interface Notification {
  id: number;
  judul: string;
  pesan: string;
  tanggal_kirim: string;
  is_read: boolean;
  tipe: string;
}

export interface WishlistItem {
  id: number;
  produk_id: number;
  nama_produk: string;
  harga: number;
  gambar_url?: string;
  created_at: string;
}

// Helper function to handle token expiry and logout
const handleTokenExpiry = async () => {
  // console.log('Token expired, clearing storage and redirecting to login');
  await logout();
  router.replace('/auth/login');
};

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  const fullUrl = `${API_URL}${url}`;
  
  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, handle logout and redirect
      await handleTokenExpiry();
      throw new Error('Token expired or invalid');
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Banner API
export const fetchBanners = async (): Promise<Banner[]> => {
  try {
    // Banners are public endpoints according to API documentation
    const response = await fetch(`${API_URL}/public/banners`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching banners:', error);
    throw error;
  }
};

// Payment Methods API  
export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    // Payment methods for customers - documented as available via customer dashboard
    // But based on backend routes, it's also available directly
    const result = await makeAuthenticatedRequest('/customer/payment-methods');
    return result.data || [];
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }
};

// Products API
export const fetchProducts = async (params?: {
  kategori_id?: number;
  search?: string;
  per_page?: number;
  page?: number;
}): Promise<{ data: Product[], meta?: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.kategori_id) queryParams.append('kategori_id', params.kategori_id.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    
    // Use public products endpoint for browsing products
    const url = `${API_URL}/public/products${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Debug logging for products list
    console.log('📋 Products List API Response:');
    console.log('Result structure:', Object.keys(result));
    console.log('Data structure:', Object.keys(result.data || {}));
    if (result.data?.length > 0) {
      console.log('First product fields:', Object.keys(result.data[0]));
      console.log('First product sample:', result.data[0]);
    }
    
    // Public products API returns different structure - direct array in data
    return {
      data: result.data || [],
      meta: result.meta
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const fetchProductById = async (id: number): Promise<Product> => {
  try {
    // Use public product detail endpoint
    const response = await fetch(`${API_URL}/public/products/${id}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    const product = result.data;
    
    // Debug logging to understand backend response structure
    console.log('🔍 Public Product Detail Response:');
    console.log('Product ID:', product.id);
    console.log('Product Name:', product.nama_produk);
    console.log('Available fields:', Object.keys(product));
    console.log('Price range:', product.harga_jual_min, '-', product.harga_jual_max);
    console.log('Varian array length:', product.varian?.length || 0);
    console.log('Gambar array length:', product.gambar?.length || 0);
    
    if (product.varian?.length > 0) {
      console.log('First variant:', product.varian[0]);
    }
    
    // Transform public API response to match frontend interface
    // Public API has different structure with variants containing individual stock
    const firstVariant = product.varian && product.varian.length > 0 ? product.varian[0] : null;
    
    return {
      id: product.id,
      nama_produk: product.nama_produk,
      deskripsi: product.deskripsi,
      harga: firstVariant?.harga_jual || product.harga_jual_min || 0,
      harga_beli: firstVariant?.harga_beli || 0,
      stok: firstVariant?.stok || 0, // Variant stock from public API
      kategori_id: product.kategori?.id,
      kategori_nama: product.kategori?.nama_kategori,
      gambar_url: product.gambar && product.gambar.length > 0 
        ? product.gambar.find(g => g.gambar_utama)?.url || product.gambar[0]?.url
        : null,
      barcode: product.barcode,
      kode_produk: product.kode_produk,
      has_variants: product.varian && product.varian.length > 0,
      variants_count: product.varian?.length || 0,
      status: product.status,
      // Include full backend response for advanced usage
      kategori: product.kategori,
      varian: product.varian,
      gambar: product.gambar,
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

export const fetchProductCategories = async (): Promise<ProductCategory[]> => {
  try {
    // Product categories are public endpoints according to API documentation
    const response = await fetch(`${API_URL}/public/product-categories`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching product categories:', error);
    throw error;
  }
};

// Customer Profile API
export const fetchCustomerProfile = async (): Promise<CustomerProfile> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/profile');
    return result.data.customer;
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    throw error;
  }
};

export const updateCustomerProfile = async (data: Partial<CustomerProfile>): Promise<CustomerProfile> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.data;
  } catch (error) {
    console.error('Error updating customer profile:', error);
    throw error;
  }
};

// Customer Dashboard API
export const fetchCustomerDashboard = async (): Promise<any> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/dashboard');
    return result.data;
  } catch (error) {
    console.error('Error fetching customer dashboard:', error);
    throw error;
  }
};

// Customer Addresses API
export const fetchCustomerAddresses = async (): Promise<CustomerAddress[]> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/addresses');
    return result.data || [];
  } catch (error) {
    console.error('Error fetching customer addresses:', error);
    throw error;
  }
};

export const addCustomerAddress = async (data: Omit<CustomerAddress, 'id'>): Promise<CustomerAddress> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.data;
  } catch (error) {
    console.error('Error adding customer address:', error);
    throw error;
  }
};

export const updateCustomerAddress = async (id: number, data: Partial<CustomerAddress>): Promise<CustomerAddress> => {
  try {
    const result = await makeAuthenticatedRequest(`/customer/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result.data;
  } catch (error) {
    console.error('Error updating customer address:', error);
    throw error;
  }
};

export const deleteCustomerAddress = async (id: number): Promise<void> => {
  try {
    await makeAuthenticatedRequest(`/customer/addresses/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting customer address:', error);
    throw error;
  }
};

// Customer Transactions API
export const fetchCustomerTransactions = async (params?: {
  status?: string;
  start_date?: string;
  end_date?: string;
  per_page?: number;
  page?: number;
}): Promise<{ data: Transaction[], meta?: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    
    const url = `/customer/transactions${queryParams.toString() ? `?${queryParams}` : ''}`;
    const result = await makeAuthenticatedRequest(url);
    
    return {
      data: result.data?.data || result.data || [],
      meta: result.data?.meta || result.meta
    };
  } catch (error) {
    console.error('Error fetching customer transactions:', error);
    throw error;
  }
};

export const fetchCustomerTransactionById = async (id: number): Promise<Transaction> => {
  try {
    const result = await makeAuthenticatedRequest(`/customer/transactions/${id}`);
    return result.data;
  } catch (error) {
    console.error('Error fetching customer transaction:', error);
    throw error;
  }
};

// Customer Points History API
export const fetchCustomerPointsHistory = async (params?: {
  per_page?: number;
  page?: number;
}): Promise<{ data: any[], meta?: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    
    const url = `/customer/points-history${queryParams.toString() ? `?${queryParams}` : ''}`;
    const result = await makeAuthenticatedRequest(url);
    
    return {
      data: result.data?.data || result.data || [],
      meta: result.data?.meta || result.meta
    };
  } catch (error) {
    console.error('Error fetching customer points history:', error);
    throw error;
  }
};

// Customer Wishlist API
export const fetchCustomerWishlist = async (params?: {
  per_page?: number;
  page?: number;
}): Promise<{ data: WishlistItem[], meta?: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    
    const url = `/customer/wishlist${queryParams.toString() ? `?${queryParams}` : ''}`;
    const result = await makeAuthenticatedRequest(url);
    
    return {
      data: result.data?.data || result.data || [],
      meta: result.data?.meta || result.meta
    };
  } catch (error) {
    console.error('Error fetching customer wishlist:', error);
    throw error;
  }
};

export const addToWishlist = async (produk_id: number, varian_id?: number): Promise<WishlistItem> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/wishlist', {
      method: 'POST',
      body: JSON.stringify({ produk_id: produk_id, varian_id }),
    });
    return result.data;
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
};

export const removeFromWishlist = async (productId: number): Promise<void> => {
  try {
    await makeAuthenticatedRequest(`/customer/wishlist/${productId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    throw error;
  }
};

// Customer Promotions API
export const fetchCustomerPromotions = async (): Promise<Promotion[]> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/promotions');
    return result.data || [];
  } catch (error) {
    console.error('Error fetching customer promotions:', error);
    throw error;
  }
};

export const validatePromotion = async (kode_promo: string, total_belanja: number): Promise<any> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ kode_promo, total_belanja }),
    });
    return {
      nilai_diskon: result.data.total_diskon,
      promo: result.data.promo
    };
  } catch (error) {
    console.error('Error validating promotion:', error);
    throw error;
  }
};

// Customer Orders API
export const createCustomerOrder = async (orderData: {
  items: Array<{
    produk_id: number;
    varian_id?: number;
    jumlah: number;
  }>;
  metode_pembayaran_id: number;
  alamat_pengiriman: string;
  catatan?: string;
  promo_code?: string;
  poin_digunakan?: number;
}): Promise<any> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return result.data;
  } catch (error) {
    console.error('Error creating customer order:', error);
    throw error;
  }
};

export const fetchCustomerOrders = async (params?: {
  per_page?: number;
  page?: number;
}): Promise<{ data: any[], meta?: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    
    const url = `/customer/orders${queryParams.toString() ? `?${queryParams}` : ''}`;
    const result = await makeAuthenticatedRequest(url);
    
    return {
      data: result.data?.data || result.data || [],
      meta: result.data?.meta || result.meta
    };
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    throw error;
  }
};

export const fetchCustomerOrderById = async (id: number): Promise<any> => {
  try {
    const result = await makeAuthenticatedRequest(`/customer/orders/${id}`);
    return result.data;
  } catch (error) {
    console.error('Error fetching customer order:', error);
    throw error;
  }
};

export const cancelCustomerOrder = async (id: number): Promise<any> => {
  try {
    const result = await makeAuthenticatedRequest(`/customer/orders/${id}/cancel`, {
      method: 'POST',
    });
    return result.data;
  } catch (error) {
    console.error('Error cancelling customer order:', error);
    throw error;
  }
};

// Customer Notifications API
export const fetchCustomerNotifications = async (params?: {
  per_page?: number;
  page?: number;
}): Promise<{ data: Notification[], meta?: any }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    
    const url = `/customer/notifications${queryParams.toString() ? `?${queryParams}` : ''}`;
    const result = await makeAuthenticatedRequest(url);
    
    return {
      data: result.data?.data || result.data || [],
      meta: result.data?.meta || result.meta
    };
  } catch (error) {
    console.error('Error fetching customer notifications:', error);
    throw error;
  }
};
