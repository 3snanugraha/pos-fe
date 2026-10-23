import Constants from "expo-constants";
import { Platform } from "react-native";

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Nilai default per environment.
 *
 * PENTING: host produksi lama (gudangperabot.com) sudah mati — jangan dipakai.
 * Produksi sekarang: gudangperabot.my.id.
 *
 * Override selalu bisa dilakukan lewat env `EXPO_PUBLIC_API_URL`
 * (mis. `EXPO_PUBLIC_API_URL=http://127.0.0.1:8124/api npx expo start --web`).
 */
const DEV_HOST = Platform.select({
  // Emulator Android tidak bisa menjangkau localhost mesin host.
  android: "http://10.0.2.2:8000/api",
  // Web & iOS simulator berbagi loopback dengan mesin host.
  default: "http://127.0.0.1:8000/api",
}) as string;

const environments = {
  development: {
    baseUrl: DEV_HOST,
    timeout: 15000, // 15 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },
  staging: {
    baseUrl: "https://gudangperabot.my.id/api",
    timeout: 10000, // 10 seconds
    retryAttempts: 2,
    retryDelay: 1500,
  },
  production: {
    baseUrl: "https://gudangperabot.my.id/api",
    timeout: 8000, // 8 seconds
    retryAttempts: 2,
    retryDelay: 2000,
  },
};

// Detect current environment
const getCurrentEnvironment = (): keyof typeof environments => {
  // Expo Constants.expoConfig doesn't always have releaseChannel typed directly in some versions
  // or it might be in extra. Fallback to 'development' if not found.
  const releaseChannel =
    (Constants.expoConfig as any)?.releaseChannel ||
    Constants.manifest?.releaseChannel;

  if (releaseChannel === "staging") {
    return "staging";
  } else if (releaseChannel === "production") {
    return "production";
  }

  return "development";
};

/** Buang trailing slash supaya penggabungan `${baseUrl}${endpoint}` tidak dobel. */
const normalisasiUrl = (url: string): string => url.replace(/\/+$/, "");

/**
 * EXPO_PUBLIC_* di-inline oleh Metro saat build, jadi akses harus statis
 * (`process.env.EXPO_PUBLIC_API_URL`, bukan hasil destructuring/dinamis).
 */
const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const currentEnvironment = getCurrentEnvironment();
const baseConfig = environments[currentEnvironment];

// Export current configuration
export const API_CONFIG: ApiConfig = {
  ...baseConfig,
  baseUrl: normalisasiUrl(ENV_BASE_URL || baseConfig.baseUrl),
};

/**
 * Origin backend tanpa prefix `/api`.
 * Dipakai untuk aset (`/storage/...`) dan halaman web back-office
 * (mis. verifikasi pesanan online oleh kasir).
 */
export const API_ORIGIN = API_CONFIG.baseUrl.replace(/\/api$/, "");

/** True bila base URL diarahkan ke backend lokal (dev). */
export const IS_LOCAL_API = /^https?:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2)/.test(
  API_CONFIG.baseUrl
);

// Debug configuration
export const DEBUG_MODE = currentEnvironment === "development";

// API Endpoints
export const API_ENDPOINTS = {
  // Public endpoints
  public: {
    status: "/status",
    banners: "/public/banners",
    products: "/public/products",
    productDetail: (id: number) => `/public/products/${id}`,
    categories: "/public/product-categories",
    featuredProducts: "/public/featured-products",
  },

  // Customer Authentication
  auth: {
    login: "/customer/login",
    register: "/customer/register",
    logout: "/customer/logout",
    profile: "/customer/profile",
    dashboard: "/customer/dashboard",
  },

  // Staff (admin/kasir) authentication — dipakai untuk penerimaan order online
  staff: {
    login: "/login",
    user: "/user",
    logout: "/logout",
  },

  /**
   * Notifikasi realtime (Pusher).
   * `config` hanya mengembalikan key + cluster + nama channel (tanpa secret);
   * `auth` memberi tanda tangan untuk channel privat.
   */
  realtime: {
    config: "/notification-config",
    auth: "/notification-auth",
  },

  // Customer Management
  customer: {
    addresses: "/customer/addresses",
    addressDetail: (id: number) => `/customer/addresses/${id}`,
    orders: "/customer/orders",
    orderDetail: (id: number) => `/customer/orders/${id}`,
    cancelOrder: (id: number) => `/customer/orders/${id}/cancel`,
    transactions: "/customer/transactions",
    transactionDetail: (id: number) => `/customer/transactions/${id}`,
    pointsHistory: "/customer/points-history",
    wishlist: "/customer/wishlist",
    removeWishlist: (id: number) => `/customer/wishlist/${id}`,
    promotions: "/customer/promotions",
    validatePromo: "/customer/promotions/validate",
    paymentMethods: "/customer/payment-methods",
    notifications: "/customer/notifications",
    markNotificationRead: (id: number) => `/customer/notifications/${id}/read`,
  },

  // Staff / kasir endpoints (butuh token staff dari /login)
  kasir: {
    /** Daftar transaksi (dipakai untuk memantau order online `pending`). */
    transactions: "/transactions",
    transactionDetail: (id: number) => `/transactions/${id}`,
    /** Buat transaksi kasir — satu-satunya endpoint yang menerima `payments[]`. */
    createTransaction: "/transactions",
    /** Daftar metode pembayaran lengkap (termasuk nomor rekening). */
    paymentMethods: "/payment-methods",
    products: "/products",
    productDetail: (id: number) => `/products/${id}`,
  },
} as const;

/**
 * Endpoint web (session + CSRF) untuk verifikasi/penolakan pesanan online.
 * Backend: `routes/web.php` → `OnlineOrderController@verify|reject`.
 * Rute ini BUKAN API route sehingga tidak menerima Bearer token; lihat
 * catatan di `services/apiService.ts` (verifyOnlineOrder).
 */
export const WEB_ENDPOINTS = {
  onlineOrdersPage: "/kasir/online-orders",
  verifyOnlineOrder: (id: number) => `/kasir/online-orders/${id}/verify`,
  rejectOnlineOrder: (id: number) => `/kasir/online-orders/${id}/reject`,
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CSRF_EXPIRED: 419,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
} as const;

// Cache settings
export const CACHE_CONFIG = {
  // Cache durations in milliseconds
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours

  // Cache keys
  keys: {
    banners: "cache_banners",
    categories: "cache_categories",
    products: "cache_products",
    profile: "cache_profile",
    dashboard: "cache_dashboard",
    paymentMethods: "cache_payment_methods",
    featuredProducts: "cache_featured_products",
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  UNAUTHORIZED: "Your session has expired. Please login again.",
  SERVER_ERROR: "Server error. Please try again later.",
  VALIDATION_ERROR: "Please check your input and try again.",
  NOT_FOUND: "Requested resource not found.",
  TIMEOUT: "Request timeout. Please try again.",
  UNKNOWN: "An unexpected error occurred.",
} as const;

/**
 * Aturan poin pelanggan — mengikuti `CustomerOrderController@hitungPoin`:
 * 1 poin = Rp 1 dan poin tidak boleh melebihi saldo.
 */
export const POIN_CONFIG = {
  RUPIAH_PER_POIN: 1,
} as const;
