# 🚀 POS System Android Services

Comprehensive service layer for the POS System Android application built with React Native and TypeScript.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Quick Start](#quick-start)
- [API Usage Examples](#api-usage-examples)
- [Error Handling](#error-handling)
- [Caching Strategy](#caching-strategy)
- [Offline Support](#offline-support)
- [TypeScript Support](#typescript-support)
- [Testing](#testing)

## 🎯 Overview

This services layer provides a robust, type-safe, and feature-rich interface for interacting with the POS System backend API. It includes comprehensive error handling, offline support, caching, and real-time network monitoring.

### ✨ Key Features

- 🌐 **Comprehensive API Coverage** - All backend endpoints implemented
- 🔄 **Automatic Retry Logic** - Smart retry with exponential backoff
- 💾 **Intelligent Caching** - Multi-level caching with TTL support
- 📱 **Offline Support** - Queue requests when offline, sync when online
- 🛡️ **Error Handling** - Graceful error handling with user-friendly messages
- 🔍 **Search Management** - Search history and suggestions
- 🛒 **Cart Management** - Persistent shopping cart with validation
- 🌐 **Network Monitoring** - Real-time connectivity status
- 📊 **TypeScript Support** - Full type safety and intellisense
- 🧪 **Testing Ready** - Built-in health checks and debugging tools

## 🏗️ Architecture

```
services/
├── 📁 Core Services
│   ├── config.ts           # Configuration and constants
│   ├── types.ts            # TypeScript interfaces
│   ├── httpClient.ts       # HTTP client with retry logic
│   └── cacheManager.ts     # Caching layer
│
├── 📁 API Services
│   ├── apiService.ts       # Main API service (new)
│   ├── api.ts              # Legacy API service
│   └── auth.ts             # Authentication service
│
├── 📁 Feature Services
│   ├── cartService.ts      # Shopping cart management
│   ├── searchService.ts    # Search history and suggestions
│   └── networkService.ts   # Network monitoring and offline queue
│
├── 📁 Utilities
│   ├── index.ts            # Main exports and initialization
│   └── README.md           # This documentation
```

## 🛠️ Services

### 1. **API Service** (`apiService.ts`)
Main service for all API interactions with caching and error handling.

**Features:**
- All API endpoints covered
- Intelligent caching
- Automatic error handling
- TypeScript support

### 2. **HTTP Client** (`httpClient.ts`)
Low-level HTTP client with advanced features.

**Features:**
- Automatic retries
- Request/response logging
- Authentication handling
- Timeout management

### 3. **Cache Manager** (`cacheManager.ts`)
Intelligent caching system for performance optimization.

**Features:**
- TTL-based expiration
- Memory-efficient storage
- Automatic cleanup
- Batch operations

### 4. **Cart Service** (`cartService.ts`)
Complete shopping cart management.

**Features:**
- Persistent storage
- Stock validation
- Real-time updates
- Order conversion

### 5. **Search Service** (`searchService.ts`)
Search history and suggestion management.

**Features:**
- Search history tracking
- Smart suggestions
- Popular searches
- Export/import capabilities

### 6. **Network Service** (`networkService.ts`)
Network monitoring and offline support.

**Features:**
- Real-time connectivity monitoring
- Offline request queueing
- Automatic synchronization
- Network state management

## 🚀 Quick Start

### 1. Installation

The services are already included in your project. Just import what you need:

```typescript
import { 
  initializeServices,
  apiService,
  cartService,
  searchService 
} from './services';
```

### 2. Initialization

In your `App.tsx` or main entry point:

```typescript
import { initializeServices } from './services';

export default function App() {
  useEffect(() => {
    const init = async () => {
      try {
        const result = await initializeServices();
        console.log('Services initialized:', result);
      } catch (error) {
        console.error('Service initialization failed:', error);
      }
    };
    
    init();
  }, []);
  
  // ... rest of your app
}
```

### 3. Basic Usage

```typescript
import { apiService, cartService } from './services';

// Fetch products
const products = await apiService.searchProducts({ 
  kategori_id: 1, 
  per_page: 20 
});

// Add to cart
await cartService.addItem({
  produk_id: 1,
  nama_produk: 'Product Name',
  harga: 50000,
  jumlah: 1,
  stok_tersedia: 10
});

// Get cart total
const total = await cartService.getCartTotal();
```

## 📖 API Usage Examples

### Authentication

```typescript
import { apiService } from './services';

// Login
const loginResult = await apiService.login({
  email: 'user@example.com',
  password: 'password',
  device_name: 'React Native App'
});

// Register
const registerResult = await apiService.register({
  nama_pelanggan: 'John Doe',
  email: 'john@example.com',
  telepon: '08123456789',
  password: 'password123',
  password_confirmation: 'password123',
  alamat: 'Jl. Contoh No. 123'
});

// Logout
await apiService.logout();
```

### Product Management

```typescript
// Search products with filters
const productResults = await apiService.searchProducts({
  search: 'laptop',
  kategori_id: 1,
  min_harga: 1000000,
  max_harga: 5000000,
  sort_by: 'harga_asc',
  per_page: 20,
  page: 1
});

// Get single product
const product = await apiService.getProduct(123);

// Get categories
const categories = await apiService.getProductCategories();
```

### Customer Management

```typescript
// Get profile
const profile = await apiService.getCustomerProfile();

// Update profile
const updatedProfile = await apiService.updateCustomerProfile({
  nama_pelanggan: 'Updated Name',
  telepon: '08123456790'
});

// Get dashboard
const dashboard = await apiService.getCustomerDashboard();
```

### Address Management

```typescript
// Get addresses
const addresses = await apiService.getCustomerAddresses();

// Add address
const newAddress = await apiService.addCustomerAddress({
  label: 'Home',
  penerima: 'John Doe',
  telepon_penerima: '08123456789',
  alamat_lengkap: 'Jl. Contoh No. 123',
  kota: 'Jakarta',
  provinsi: 'DKI Jakarta',
  kode_pos: '12345',
  is_default: true
});

// Update address
await apiService.updateCustomerAddress(1, { label: 'Office' });

// Delete address
await apiService.deleteCustomerAddress(1);
```

### Order Management

```typescript
// Create order
const order = await apiService.createOrder({
  items: [
    { produk_id: 1, jumlah: 2 },
    { produk_id: 2, varian_id: 1, jumlah: 1 }
  ],
  metode_pembayaran_id: 1,
  alamat_pengiriman: 'Jl. Contoh No. 123',
  catatan: 'Please deliver in the evening',
  address_id: 1
});

// Get orders
const orders = await apiService.getCustomerOrders({ page: 1, per_page: 10 });

// Get order details
const orderDetail = await apiService.getOrderDetails(123);

// Cancel order
await apiService.cancelOrder(123);
```

### Shopping Cart

```typescript
import { cartService } from './services';

// Add item to cart
await cartService.addItem({
  produk_id: 1,
  varian_id: 2,
  nama_produk: 'Laptop Gaming',
  nama_varian: '16GB RAM',
  harga: 15000000,
  jumlah: 1,
  gambar_url: 'https://example.com/image.jpg',
  stok_tersedia: 5
});

// Update quantity
await cartService.updateItemQuantity('1_2', 2);

// Remove item
await cartService.removeItem('1_2');

// Get cart
const cart = await cartService.getCart();

// Validate cart
const validation = await cartService.validateCart();

// Convert to order
const orderData = await cartService.convertToOrderData();

// Clear cart
await cartService.clearCart();
```

### Search Management

```typescript
import { searchService, searchHelpers } from './services';

// Add search to history
await searchService.addSearchQuery('laptop gaming', 25);

// Get search suggestions
const suggestions = await searchService.getSearchSuggestions('lap');

// Get popular searches
const popular = await searchService.getPopularSearches(10);

// Get search statistics
const stats = await searchService.getSearchStats();

// Format results count
const formattedCount = searchHelpers.formatResultsCount(150);
// Result: "150 hasil"
```

## 🛡️ Error Handling

The services include comprehensive error handling:

```typescript
import { apiService, apiHelpers } from './services';

try {
  const products = await apiService.searchProducts();
} catch (error) {
  // Get user-friendly error message
  const userMessage = apiHelpers.handleApiError(error);
  console.error('Error:', userMessage);
  
  // Check if error is retryable
  if (error.isRetryable && error.isRetryable()) {
    // Retry the request
    setTimeout(() => {
      // Retry logic
    }, 2000);
  }
}
```

### Error Types

- **Network Errors**: Connection issues, timeouts
- **Authentication Errors**: Invalid tokens, expired sessions
- **Validation Errors**: Invalid input data
- **Server Errors**: Internal server errors
- **Not Found Errors**: Resource not found

## 💾 Caching Strategy

### Cache Levels

1. **Very Long** (24 hours): Static data like categories
2. **Long** (2 hours): Product details, banners
3. **Medium** (30 minutes): Product lists, user profile
4. **Short** (5 minutes): Dashboard data, dynamic content

### Cache Usage

```typescript
import { cacheManager, apiService } from './services';

// Use cache (default behavior)
const categories = await apiService.getProductCategories(); // Will use cache

// Force fresh data
const freshCategories = await apiService.getProductCategories(false);

// Manual cache management
await cacheManager.set('custom_data', data, 30 * 60 * 1000); // 30 minutes
const cachedData = await cacheManager.get('custom_data');
await cacheManager.delete('custom_data');

// Clear all cache
await cacheManager.clear();

// Cache cleanup
const cleanedItems = await cacheManager.cleanup();
```

## 📱 Offline Support

### Offline Queue

Automatically queues write operations when offline:

```typescript
import { networkService, offlineQueueService } from './services';

// Check connectivity
const isOnline = networkService.isOnline();

// Listen to connectivity changes
const unsubscribe = networkService.addListener((networkState) => {
  if (networkState.isConnected) {
    console.log('Back online! Processing queued requests...');
  } else {
    console.log('Gone offline. Requests will be queued.');
  }
});

// Get queue status
const queueStatus = offlineQueueService.getQueueStatus();
console.log('Queued requests:', queueStatus.count);

// Manual queue processing
await offlineQueueService.processQueue();
```

### Offline-First Patterns

```typescript
import { networkHelpers } from './services';

// Offline-aware requests
try {
  const result = await networkHelpers.createOfflineAwareRequest(
    'POST',
    '/customer/orders',
    orderData
  );
  
  if (result.queued) {
    // Request was queued for later
    showMessage('Order queued. Will be processed when online.');
  } else {
    // Request was successful
    showMessage('Order placed successfully!');
  }
} catch (error) {
  // Handle other errors
}
```

## 🧪 TypeScript Support

Full TypeScript support with detailed interfaces:

```typescript
import type { 
  Product,
  ProductSearchParams,
  Order,
  CustomerProfile,
  ApiResponse 
} from './services';

// Type-safe API calls
const searchProducts = async (
  params: ProductSearchParams
): Promise<ApiResponse<Product[]>> => {
  return await apiService.searchProducts(params);
};

// Type-safe error handling
const handleError = (error: ApiError): string => {
  return error.getUserMessage();
};
```

## 🧪 Testing

### Health Checks

```typescript
import { healthCheck, getServiceStatus } from './services';

// Complete health check
const health = await healthCheck();
if (!health.healthy) {
  console.error('Service health check failed:', health);
}

// Detailed service status
const status = await getServiceStatus();
console.log('Service status:', status);
```

### Development Helpers

```typescript
import { 
  setDebugMode, 
  resetServices,
  exportServiceData,
  clearAllServiceData 
} from './services';

// Enable debug mode
setDebugMode(true);

// Reset all services (useful for testing)
await resetServices();

// Export service data for debugging
const debugData = await exportServiceData();

// Clear all data (useful for logout)
await clearAllServiceData();
```

### Service Statistics

```typescript
import { cacheManager, searchService } from './services';

// Cache statistics
const cacheInfo = await cacheManager.getInfo();
console.log('Cache items:', cacheInfo.totalItems);
console.log('Cache size:', cacheInfo.totalSize, 'bytes');

// Search statistics
const searchStats = await searchService.getSearchStats();
console.log('Total searches:', searchStats.totalSearches);
console.log('Most searched:', searchStats.mostSearchedQuery);
```

## 📚 Best Practices

### 1. Error Handling
Always handle errors gracefully and provide user-friendly messages.

```typescript
try {
  const result = await apiService.someMethod();
} catch (error) {
  const message = apiHelpers.handleApiError(error);
  showErrorToUser(message);
}
```

### 2. Loading States
Use loading states for better UX:

```typescript
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await apiService.getData();
    setData(data);
  } catch (error) {
    handleError(error);
  } finally {
    setLoading(false);
  }
};
```

### 3. Cache Invalidation
Invalidate cache when data changes:

```typescript
// After updating data
await apiService.updateProfile(newData);
await cacheManager.delete('customer_profile');
```

### 4. Offline Feedback
Provide offline feedback to users:

```typescript
const networkState = networkService.getNetworkState();
if (!networkState.isConnected) {
  showOfflineMessage();
}
```

## 🔧 Configuration

### Environment Configuration

Update `config.ts` for different environments:

```typescript
// Development
const environments = {
  development: {
    baseUrl: 'http://localhost:8000/api',
    timeout: 15000,
  },
  production: {
    baseUrl: 'https://api.yourpos.com/api',
    timeout: 8000,
  }
};
```

### Cache Configuration

Adjust cache settings in `config.ts`:

```typescript
export const CACHE_CONFIG = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,    // 30 minutes
  LONG: 2 * 60 * 60 * 1000,  // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
};
```

## 🤝 Contributing

When adding new services or modifying existing ones:

1. Follow TypeScript best practices
2. Add proper error handling
3. Include JSDoc comments
4. Update this documentation
5. Add appropriate tests
6. Consider caching implications
7. Handle offline scenarios

---

**Happy Coding! 🎉**

For more information, check the individual service files or the API documentation.
