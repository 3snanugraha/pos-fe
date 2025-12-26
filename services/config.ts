import Constants from "expo-constants";

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Environment-specific configurations
const environments = {
  development: {
    baseUrl: "https://gudangperabot.com/api",
    timeout: 15000, // 15 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },
  staging: {
    baseUrl: "https://gudangperabot.com/api",
    timeout: 10000, // 10 seconds
    retryAttempts: 2,
    retryDelay: 1500,
  },
  production: {
    baseUrl: "https://gudangperabot.com/api",
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

// Export current configuration
export const API_CONFIG: ApiConfig = environments[getCurrentEnvironment()];

// Debug configuration
export const DEBUG_MODE = getCurrentEnvironment() === "development";

// API Endpoints
export const API_ENDPOINTS = {
  // Public endpoints
  public: {
    status: "/status",
    banners: "/public/banners",
    products: "/public/products",
    productDetail: (id: number) => `/public/products/${id}`,
    categories: "/public/product-categories",
  },

  // Customer Authentication
  auth: {
    login: "/customer/login",
    register: "/customer/register",
    logout: "/customer/logout",
    profile: "/customer/profile",
    dashboard: "/customer/dashboard",
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
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
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
