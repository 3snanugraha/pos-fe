import { router } from 'expo-router';
import { getToken, logout } from './auth';

const API_URL = 'http://192.168.1.3:8000/api/';

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
  status: 'aktif' | 'nonaktif';
}

export interface PaymentMethod {
  id: number;
  nama_metode: string;
  jenis_pembayaran: string;
  biaya_admin: number;
  persentase_biaya: number;
  status: 'aktif' | 'nonaktif';
}

export interface Product {
  id: number;
  nama_produk: string;
  deskripsi: string;
  harga: number;
  stok: number;
  kategori_id: number;
  kategori_nama?: string;
  gambar_url?: string;
  status: 'aktif' | 'nonaktif';
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
  total_poin: number;
}

export interface CustomerAddress {
  id: number;
  label: string;
  nama_penerima: string;
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
    const result = await makeAuthenticatedRequest('/customer/banners');
    return result.data || [];
  } catch (error) {
    console.error('Error fetching banners:', error);
    throw error;
  }
};

// Payment Methods API
export const fetchPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
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
    
    const url = `/customer/products${queryParams.toString() ? `?${queryParams}` : ''}`;
    const result = await makeAuthenticatedRequest(url);
    
    return {
      data: result.data?.data || result.data || [],
      meta: result.data?.meta || result.meta
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const fetchProductById = async (id: number): Promise<Product> => {
  try {
    const result = await makeAuthenticatedRequest(`/customer/products/${id}`);
    return result.data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

export const fetchProductCategories = async (): Promise<ProductCategory[]> => {
  try {
    const result = await makeAuthenticatedRequest('/customer/product-categories');
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
    return result.data;
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
      body: JSON.stringify({ produk_id, varian_id }),
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
    return result.data;
  } catch (error) {
    console.error('Error validating promotion:', error);
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
