// Base API Response Types
import type { BarisHargaSatuan, GrosirRingkas } from "../src/lib/hargaGrosir";

export type { BarisHargaSatuan, GrosirRingkas, GrosirTier } from "../src/lib/hargaGrosir";

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
  penerima?: string; // Backend lama memakai 'penerima'
  created_at?: string;
  updated_at?: string;
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
  
  // Additional computed fields (hasil transform ProdukController::transformProduct)
  harga?: number;
  harga_beli?: number;
  stok?: number;
  kategori_nama?: string;
  gambar_url?: string | null;
  has_variants?: boolean;
  variants_count?: number;
  harga_range?: { min: number; max: number } | null;
  is_flash_sale?: boolean;
  harga_flash_sale?: number | null;
  total_stok?: number;
  is_favorite?: boolean;
  rating?: number;
  reviews_count?: number;

  /**
   * Harga grosir (dari `harga_varian_satuan` lewat `/public/products`).
   * null/kosong = produk belum dikonfigurasi → tampilan memakai harga ecer
   * seperti sebelumnya. Bentuk detail: `src/lib/hargaGrosir.ts`.
   */
  grosir?: GrosirRingkas | null;
  harga_grosir_min?: number | string | null;
  /** Matriks harga varian × satuan + tier (hanya endpoint detail). */
  harga_jual_satuan?: BarisHargaSatuan[];

  /** Fitur Naikkan Produk: produk sedang didorong ke atas hasil pencarian. */
  boost?: boolean;
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
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

// Banner Types
/** Identitas toko dari `GET /api/public/store-info` (kop struk/faktur PDF). */
export interface StoreInfo {
  nama_toko: string;
  alamat: string;
  telepon: string;
  email?: string;
  website?: string;
  npwp?: string;
  logo_url: string | null;
}

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

/**
 * Bentuk `metode_pembayaran` pada respons order pelanggan (create/show/list).
 * Sumbernya tabel `metode_pembayaran`; `nomor_rekening`/`atas_nama` null untuk
 * metode tanpa nomor tujuan (mis. Tunai).
 */
export interface MetodePembayaranOrder {
  id: number | null;
  nama: string;
  jenis: string | null;
  nomor_rekening?: string | null;
  atas_nama?: string | null;
  instruksi?: string | null;
}

export interface Order {
  id: number;
  nomor_order?: string;
  nomor_transaksi?: string;
  tanggal_order?: string;
  tanggal_transaksi?: string;
  status: OrderStatus;
  /** Backend mengirim status_transaksi (pending/selesai/dibatalkan/retur). */
  status_transaksi?: string;
  status_pembayaran?: string;
  order_expires_at?: string | null;
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
  /**
   * `POST/GET /api/customer/orders` sekarang mengirim objek
   * `{ id, nama, jenis, nomor_rekening, atas_nama }`; respons lama/endpoint lain
   * masih bisa mengirim string nama metode. Keduanya diterima, dinormalisasi
   * lewat `normalisasiMetodePembayaran()` (utils/payment).
   */
  metode_pembayaran?: MetodePembayaranOrder | PaymentMethod | string | null;
  /** Nama metode sebagai string — selalu ada, untuk konsumen lama. */
  metode_pembayaran_nama?: string | null;
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
  /** Satuan jual ("pcs"/"box") bila backend mengirimkannya. */
  satuan?: string | null;
  jumlah: number;
  harga: number;
  subtotal: number;
  gambar_url?: string | null;

  // Product details
  produk?: Product;
  varian?: ProductVariant;
}

/**
 * Bentuk order dari `CustomerOrderController@show` — satu-satunya sumber
 * `order_expires_at`, `status_pembayaran`, dan objek `metode_pembayaran`.
 */
export interface OrderDetail {
  id: number;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  total_harga: number | string;
  total_diskon: number | string;
  total_bayar: number | string;
  status: OrderStatus;
  status_transaksi?: string;
  status_pembayaran?: string;
  order_expires_at?: string | null;
  metode_pembayaran?: MetodePembayaranOrder;
  alamat_pengiriman?: string | null;
  catatan?: string | null;
  created_at: string;
  updated_at?: string;
  items: OrderItem[];
}

/** Status yang benar-benar dipakai `TransaksiPenjualan` di backend. */
export type OrderStatus =
  | 'pending'
  | 'selesai'
  | 'dibatalkan'
  | 'retur'
  // Status lama (backend versi sebelumnya) — dipertahankan agar data lama tetap tampil
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'completed';

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
  /**
   * Uang tunai yang diserahkan pelanggan (opsional, aditif). Server baru
   * menyimpannya ke kolom `jumlah_dibayar` dan menghitung `kembalian` sendiri;
   * server lama mengabaikannya karena angkanya juga ada di penanda
   * `[Tunai: …]` pada `catatan`.
   */
  uang_diterima?: number;
  address_id?: number; // If using saved address
}

// Payment Types
export interface PaymentMethod {
  id: number;
  nama_metode: string;
  jenis_pembayaran: 'tunai' | 'transfer' | 'kartu' | 'ewallet' | 'kredit' | 'cicilan';
  provider?: string;
  /**
   * Rekening tujuan transfer. Hanya dikirim endpoint staff
   * (`GET /api/payment-methods`) — endpoint customer menyembunyikannya,
   * jadi UI memakai fallback dari endpoint staff.
   */
  nomor_rekening?: string | null;
  atas_nama?: string | null;
  biaya_admin: number;
  persentase_biaya: number;
  minimal_transaksi?: number;
  maksimal_transaksi?: number;
  logo_url?: string;
  /**
   * Backend TIDAK punya kolom `instruksi`. Field ini opsional; bila kosong
   * UI menyusun instruksi sendiri berdasarkan `jenis_pembayaran`
   * (lihat `utils/payment.ts`).
   */
  instruksi?: string | null;
  status?: 'aktif' | 'nonaktif';
  created_at?: string;
  updated_at?: string;
}

/**
 * Satu baris pembayaran pada split payment (`payments[]` di
 * `TransaksiController@store`).
 */
export interface PaymentSplit {
  metode_pembayaran_id: number;
  nama_metode: string;
  jenis_pembayaran: PaymentMethod['jenis_pembayaran'];
  nominal: number;
}

/** Payload pembayaran yang diterima backend (DetailPembayaran). */
export interface PaymentPayload {
  metode_pembayaran_id: number;
  nominal: number;
}

// Transaction Types
export interface Transaction {
  id: number;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  /** `online` = order dari app, `offline` = transaksi kasir. */
  jenis_transaksi: 'online' | 'offline' | 'pembelian' | 'refund' | 'poin_reward';
  total_harga: number;
  /** Subtotal sebelum diskon (dipakai `transformTransaksi`). */
  subtotal?: number;
  total_diskon: number;
  total_bayar: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'selesai' | 'dibatalkan' | 'retur';
  /** Backend mengirim status_transaksi (dibatalkan/selesai/pending) */
  status_transaksi?: string;
  status_pembayaran?: string;
  order_expires_at?: string | null;
  alamat_pengiriman?: string | null;
  metode_pembayaran: string;
  metode_pembayaran_id?: number;
  /** Ada bila transaksi memakai pembayaran campuran. */
  pembayaran_campuran?: boolean;
  jumlah_dibayar?: number;
  kembalian?: number;
  pelanggan_id?: number | null;
  pelanggan?: {
    id: number;
    nama_pelanggan: string;
    telepon?: string;
  } | null;
  items_count?: number;
  /** Jumlah baris item dari `withCount('detailTransaksi')` (API staf). */
  jumlah_item?: number;
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
  is_valid?: boolean;
  promo?: Promotion;
  total_diskon?: number;
  /** Backend mengirim diskon pada level atas data */
  nilai_diskon?: number;
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
  tipe: 'order' | 'promo' | 'system' | 'info' | 'payment' | 'shipping';
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
