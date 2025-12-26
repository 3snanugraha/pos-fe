// Base API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
  errors?: ValidationErrors;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
  path?: string;
  next_page_url?: string;
  prev_page_url?: string;
}

export interface ValidationErrors {
  [key: string]: string[];
}

// API Status Response
export interface ApiStatus {
  status: 'success' | 'error';
  message: string;
  timestamp: string;
  version: string;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
  device_name?: string;
}

export interface RegisterData {
  nama_pelanggan: string;
  email: string;
  telepon: string;
  password: string;
  password_confirmation: string;
  alamat: string;
}

export interface AuthResponse {
  customer: CustomerProfile;
  token: string;
}

// Customer Types
export interface CustomerProfile {
  id: number;
  nama_pelanggan: string;
  email: string;
  telepon: string;
  alamat: string;
  kode_pelanggan: string;
  tanggal_bergabung: string;
  total_poin: number;
  total_belanja: number;
  status: 'aktif' | 'nonaktif' | 'suspended';
  grup?: CustomerGroup;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerGroup {
  id: number;
  nama_grup: string;
  diskon: number;
  minimal_belanja: number;
  deskripsi?: string;
}

export interface CustomerDashboard {
  customer: CustomerProfile;
  summary: {
    total_orders: number;
    pending_orders: number;
    completed_orders: number;
    total_points: number;
    total_spent: number;
  };
  recent_orders: Order[];
  available_promotions: Promotion[];
  notifications_count: number;
}

// Address Types
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
  created_at: string;
  updated_at: string;
}

export interface AddressCreateData {
  label: string;
  nama_penerima: string;
  telepon_penerima: string;
  alamat_lengkap: string;
  kota: string;
  provinsi: string;
  kode_pos: string;
  is_default?: boolean;
}

// Product Types
export interface Product {
  id: number;
  nama_produk: string;
  deskripsi: string;
  kode_produk: string;
  barcode?: string;
  harga_jual_min: number;
  harga_jual_max: number;
  kategori_id: number;
  status: 'aktif' | 'nonaktif';
  created_at: string;
  updated_at: string;
  
  // Relations
  kategori?: ProductCategory;
  varian?: ProductVariant[];
  gambar?: ProductImage[];
  
  // Additional computed fields
  total_stok?: number;
  is_favorite?: boolean;
  rating?: number;
  reviews_count?: number;
}

export interface ProductVariant {
  id: number;
  nama_varian: string;
  harga_beli: number;
  harga_jual: number;
  stok: number;
  sku?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: number;
  path_gambar: string;
  url: string;
  gambar_utama: boolean;
  urutan: number;
}

export interface ProductCategory {
  id: number;
  nama_kategori: string;
  deskripsi?: string;
  gambar_url?: string;
  status: 'aktif' | 'nonaktif';
  parent_id?: number;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  products_count?: number;
}

// Search and Filter Types
export interface ProductSearchParams {
  search?: string;
  kategori_id?: number;
  min_harga?: number;
  max_harga?: number;
  sort_by?: 'nama' | 'harga_asc' | 'harga_desc' | 'terbaru';
  per_page?: number;
  page?: number;
}

// Banner Types
export interface Banner {
  id: number;
  judul_banner: string;
  deskripsi: string;
  gambar_url: string;
  link_tujuan?: string;
  status: 'aktif' | 'nonaktif';
  tanggal_mulai: string;
  tanggal_berakhir: string;
  urutan: number;
  created_at: string;
  updated_at: string;
}

// Order Types
export interface Order {
  id: number;
  nomor_order: string;
  tanggal_order: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_harga: number;
  total_diskon: number;
  biaya_pengiriman: number;
  total_bayar: number;
  metode_pembayaran_id: number;
  alamat_pengiriman: string;
  catatan?: string;
  poin_digunakan: number;
  poin_didapat: number;
  promo_code?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  items: OrderItem[];
  metode_pembayaran?: PaymentMethod;
  customer?: CustomerProfile;
  
  // Status tracking
  status_history?: OrderStatusHistory[];
}

export interface OrderItem {
  id: number;
  produk_id: number;
  varian_id?: number;
  nama_produk: string;
  nama_varian?: string;
  jumlah: number;
  harga: number;
  subtotal: number;
  
  // Product details
  produk?: Product;
  varian?: ProductVariant;
}

export interface OrderStatusHistory {
  id: number;
  status: string;
  tanggal_status: string;
  catatan?: string;
}

export interface OrderCreateData {
  items: {
    produk_id: number;
    varian_id?: number;
    jumlah: number;
  }[];
  metode_pembayaran_id: number;
  alamat_pengiriman: string;
  catatan?: string;
  promo_code?: string;
  poin_digunakan?: number;
  address_id?: number; // If using saved address
}

// Payment Types
export interface PaymentMethod {
  id: number;
  nama_metode: string;
  jenis_pembayaran: 'tunai' | 'transfer' | 'kartu' | 'ewallet' | 'cicilan';
  provider?: string;
  nomor_rekening?: string;
  atas_nama?: string;
  biaya_admin: number;
  persentase_biaya: number;
  minimal_transaksi: number;
  maksimal_transaksi: number;
  logo_url?: string;
  instruksi?: string;
  status: 'aktif' | 'nonaktif';
  created_at: string;
  updated_at: string;
}

// Transaction Types
export interface Transaction {
  id: number;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  jenis_transaksi: 'pembelian' | 'refund' | 'poin_reward';
  total_harga: number;
  total_diskon: number;
  total_bayar: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  metode_pembayaran: string;
  catatan?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  items?: TransactionItem[];
  order?: Order;
}

export interface TransactionItem {
  id: number;
  produk_id: number;
  nama_produk: string;
  jumlah: number;
  harga: number;
  subtotal: number;
  diskon: number;
}

// Points Types
export interface PointHistory {
  id: number;
  jenis_poin: 'earned' | 'used' | 'expired' | 'bonus';
  jumlah_poin: number;
  saldo_sebelum: number;
  saldo_sesudah: number;
  keterangan: string;
  referensi_id?: number;
  referensi_type?: string;
  tanggal_kedaluwarsa?: string;
  created_at: string;
}

// Promotion Types
export interface Promotion {
  id: number;
  kode_promo: string;
  nama_promo: string;
  deskripsi: string;
  jenis_diskon: 'persentase' | 'nominal';
  nilai_diskon: number;
  minimal_pembelian: number;
  maksimal_diskon: number;
  kuota: number;
  kuota_terpakai: number;
  tanggal_mulai: string;
  tanggal_berakhir: string;
  status: 'aktif' | 'nonaktif';
  syarat_ketentuan?: string;
  created_at: string;
  updated_at: string;
  
  // Usage info
  is_used?: boolean;
  can_use?: boolean;
  remaining_quota?: number;
}

export interface PromoValidation {
  is_valid: boolean;
  promo?: Promotion;
  total_diskon: number;
  message?: string;
}

// Wishlist Types
export interface WishlistItem {
  id: number;
  produk_id: number;
  varian_id?: number;
  created_at: string;
  
  // Product details
  produk: Product;
  varian?: ProductVariant;
}

// Notification Types
export interface Notification {
  id: number;
  judul: string;
  pesan: string;
  tipe: 'order' | 'promo' | 'system' | 'info';
  is_read: boolean;
  data?: any; // Additional notification data
  tanggal_kirim: string;
  created_at: string;
  updated_at: string;
}

// Cart Types (for local storage)
export interface CartItem {
  id: string;
  produk_id: number;
  varian_id?: number;
  nama_produk: string;
  nama_varian?: string;
  harga: number;
  jumlah: number;
  gambar_url?: string;
  stok_tersedia: number;
  catatan?: string;
}

export interface Cart {
  items: CartItem[];
  total_items: number;
  total_harga: number;
  updated_at: string;
}

// Common Filter Types
export interface DateFilter {
  start_date?: string;
  end_date?: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// API Error Types
export interface ApiErrorResponse {
  message: string;
  status?: number;
  errors?: ValidationErrors;
  code?: string;
}

// Network Types
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

// Cache Types
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// Form Types
export interface FormField {
  value: string;
  error?: string;
  touched?: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

// Component Types
export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}

// Search History Types
export interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
  results_count: number;
}
