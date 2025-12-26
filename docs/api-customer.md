# Customer API Documentation

Customer-facing endpoints that require authentication. These endpoints provide complete functionality for the mobile application including account management, shopping, orders, and loyalty features.

## 🔐 **Authentication Required**

All customer endpoints require a valid Sanctum authentication token in the `Authorization` header:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

## 📋 **Endpoints Overview**

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/customer/register` | Customer registration |
| POST | `/api/customer/login` | Customer login |
| POST | `/api/customer/logout` | Customer logout |
| GET | `/api/customer/profile` | Get customer profile |
| PUT | `/api/customer/profile` | Update customer profile |

### Shopping & Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customer/products` | Get products (authenticated) |
| GET | `/api/customer/products/{id}` | Get product details |
| GET | `/api/customer/product-categories` | Get categories |
| GET | `/api/customer/banners` | Get banners (authenticated) |

### Customer Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customer/dashboard` | Get dashboard data |
| GET | `/api/customer/addresses` | Get customer addresses |
| POST | `/api/customer/addresses` | Add new address |
| PUT | `/api/customer/addresses/{id}` | Update address |
| DELETE | `/api/customer/addresses/{id}` | Delete address |

### Wishlist & Favorites
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customer/wishlist` | Get wishlist items |
| POST | `/api/customer/wishlist` | Add to wishlist |
| DELETE | `/api/customer/wishlist/{productId}` | Remove from wishlist |

### Orders & Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customer/orders` | Get customer orders |
| POST | `/api/customer/orders` | Create new order |
| GET | `/api/customer/orders/{id}` | Get order details |
| POST | `/api/customer/orders/{id}/cancel` | Cancel order |
| PUT | `/api/customer/orders/{id}/status` | Update order status |
| GET | `/api/customer/transactions` | Get transaction history |
| GET | `/api/customer/transactions/{id}` | Get transaction details |

### Loyalty & Promotions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customer/points-history` | Get points history |
| GET | `/api/customer/promotions` | Get available promotions |
| POST | `/api/customer/promotions/validate` | Validate promo code |

### Other Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customer/payment-methods` | Get payment methods |
| GET | `/api/customer/notifications` | Get notifications |

---

## 🔐 **Authentication Endpoints**

### 1. Customer Registration

Register a new customer account.

**Endpoint:** `POST /api/customer/register`

**Request Body:**
```json
{
  "nama_pelanggan": "John Doe",
  "email": "john@example.com",
  "telepon": "08123456789",
  "password": "password123",
  "password_confirmation": "password123",
  "alamat": "Jl. Contoh No. 123, Jakarta"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "customer": {
      "id": 1,
      "nama_pelanggan": "John Doe",
      "email": "john@example.com",
      "telepon": "08123456789",
      "alamat": "Jl. Contoh No. 123, Jakarta",
      "total_poin": 0,
      "total_belanja": 0,
      "status": "aktif"
    },
    "token": "1|abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
  }
}
```

### 2. Customer Login

Authenticate customer and get access token.

**Endpoint:** `POST /api/customer/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123",
  "device_name": "iPhone 14 Pro"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "customer": {
      "id": 1,
      "nama_pelanggan": "John Doe",
      "email": "john@example.com",
      "telepon": "08123456789",
      "total_poin": 1250,
      "total_belanja": 2500000,
      "grup": {
        "nama_grup": "Silver Member",
        "diskon_persen": 5
      }
    },
    "token": "2|def456ghi789jkl012mno345pqr678stu901vwx234yz567abc"
  }
}
```

### 3. Customer Logout

Revoke current access token.

**Endpoint:** `POST /api/customer/logout`

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 4. Get Customer Profile

Get current customer profile information.

**Endpoint:** `GET /api/customer/profile`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "nama_pelanggan": "John Doe",
      "email": "john@example.com",
      "telepon": "08123456789",
      "alamat": "Jl. Contoh No. 123, Jakarta",
      "tanggal_lahir": "1990-05-15",
      "jenis_kelamin": "L",
      "total_poin": 1250,
      "total_belanja": 2500000,
      "status": "aktif",
      "grup": {
        "id": 2,
        "nama_grup": "Silver Member",
        "diskon_persen": 5
      }
    }
  }
}
```

### 5. Update Customer Profile

Update customer profile information.

**Endpoint:** `PUT /api/customer/profile`

**Request Body:**
```json
{
  "nama_pelanggan": "John Smith",
  "telepon": "08123456790",
  "alamat": "Jl. Baru No. 456, Jakarta",
  "tanggal_lahir": "1990-05-15",
  "jenis_kelamin": "L"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "customer": {
      "id": 1,
      "nama_pelanggan": "John Smith",
      "email": "john@example.com",
      "telepon": "08123456790",
      "alamat": "Jl. Baru No. 456, Jakarta",
      "tanggal_lahir": "1990-05-15",
      "jenis_kelamin": "L",
      "total_poin": 1250,
      "total_belanja": 2500000
    }
  }
}
```

---

## 🏠 **Customer Dashboard**

### Get Dashboard Data

Get comprehensive dashboard information including recent transactions, points, promotions, and recommendations.

**Endpoint:** `GET /api/customer/dashboard`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "nama_pelanggan": "John Doe",
      "total_poin": 1250,
      "total_belanja": 2500000,
      "grup": {
        "nama_grup": "Silver Member",
        "diskon_persen": 5
      }
    },
    "recent_transactions": [
      {
        "id": 10,
        "nomor_transaksi": "TXN-20250922-001",
        "tanggal_transaksi": "2025-09-22",
        "total_bayar": 150000,
        "status_transaksi": "selesai"
      }
    ],
    "points_history": [
      {
        "id": 5,
        "jumlah_poin": 75,
        "jenis_transaksi": "pembelian",
        "keterangan": "Pembelian produk senilai Rp 150.000",
        "tanggal": "2025-09-22T10:30:00.000000Z"
      }
    ],
    "active_promotions": [
      {
        "id": 3,
        "kode_promo": "WEEKEND50",
        "nama_promo": "Weekend Sale",
        "jenis_promo": "diskon_persen",
        "nilai_diskon": 50,
        "tanggal_selesai": "2025-09-24"
      }
    ],
    "recommended_products": [
      {
        "id": 1,
        "nama_produk": "Samsung Galaxy S24",
        "harga_jual": 12999000,
        "gambar": "http://localhost:8000/storage/products/samsung-s24.jpg",
        "kategori": "Smartphones"
      }
    ],
    "banners": [
      {
        "id": 1,
        "judul_banner": "Flash Sale",
        "deskripsi": "Diskon hingga 70%",
        "gambar_url": "http://localhost:8000/storage/banners/flash-sale.jpg",
        "link_tujuan": "https://example.com/flash-sale"
      }
    ]
  }
}
```

---

## 📍 **Address Management**

### 1. Get Customer Addresses

Get all customer addresses.

**Endpoint:** `GET /api/customer/addresses`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "label": "Home",
      "penerima": "John Doe",
      "telepon_penerima": "08123456789",
      "alamat_lengkap": "Jl. Contoh No. 123, RT 01/RW 02",
      "kota": "Jakarta",
      "provinsi": "DKI Jakarta",
      "kode_pos": "12345",
      "is_default": true
    },
    {
      "id": 2,
      "label": "Office",
      "penerima": "John Doe",
      "telepon_penerima": "08123456789",
      "alamat_lengkap": "Jl. Sudirman No. 456, Lantai 10",
      "kota": "Jakarta",
      "provinsi": "DKI Jakarta",
      "kode_pos": "12190",
      "is_default": false
    }
  ]
}
```

### 2. Add New Address

Add a new delivery address.

**Endpoint:** `POST /api/customer/addresses`

**Request Body:**
```json
{
  "label": "Home",
  "penerima": "John Doe",
  "telepon_penerima": "08123456789",
  "alamat_lengkap": "Jl. Contoh No. 123, RT 01/RW 02",
  "kota": "Jakarta",
  "provinsi": "DKI Jakarta",
  "kode_pos": "12345",
  "is_default": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Alamat berhasil ditambahkan",
  "data": {
    "id": 3,
    "label": "Home",
    "penerima": "John Doe",
    "telepon_penerima": "08123456789",
    "alamat_lengkap": "Jl. Contoh No. 123, RT 01/RW 02",
    "kota": "Jakarta",
    "provinsi": "DKI Jakarta",
    "kode_pos": "12345",
    "is_default": true
  }
}
```

### 3. Update Address

Update existing address.

**Endpoint:** `PUT /api/customer/addresses/{id}`

**Request Body:**
```json
{
  "label": "New Home",
  "alamat_lengkap": "Jl. Baru No. 789, RT 03/RW 04",
  "is_default": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Alamat berhasil diperbarui",
  "data": {
    "id": 1,
    "label": "New Home",
    "penerima": "John Doe",
    "telepon_penerima": "08123456789",
    "alamat_lengkap": "Jl. Baru No. 789, RT 03/RW 04",
    "kota": "Jakarta",
    "provinsi": "DKI Jakarta",
    "kode_pos": "12345",
    "is_default": false
  }
}
```

### 4. Delete Address

Delete an address.

**Endpoint:** `DELETE /api/customer/addresses/{id}`

**Response (200):**
```json
{
  "success": true,
  "message": "Alamat berhasil dihapus"
}
```

---

## ❤️ **Wishlist Management**

### 1. Get Wishlist

Get all items in customer's wishlist.

**Endpoint:** `GET /api/customer/wishlist`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama_produk": "Samsung Galaxy S24",
      "harga_jual": 12999000,
      "gambar": "http://localhost:8000/storage/products/samsung-s24.jpg",
      "kategori": "Smartphones",
      "flash_sale": false,
      "harga_flash_sale": null
    },
    {
      "id": 5,
      "nama_produk": "MacBook Pro M3",
      "harga_jual": 25999000,
      "gambar": "http://localhost:8000/storage/products/macbook-pro.jpg",
      "kategori": "Laptops",
      "flash_sale": true,
      "harga_flash_sale": 23999000
    }
  ]
}
```

### 2. Add to Wishlist

Add product to wishlist.

**Endpoint:** `POST /api/customer/wishlist`

**Request Body:**
```json
{
  "product_id": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Produk berhasil ditambahkan ke wishlist"
}
```

### 3. Remove from Wishlist

Remove product from wishlist.

**Endpoint:** `DELETE /api/customer/wishlist/{productId}`

**Response (200):**
```json
{
  "success": true,
  "message": "Produk berhasil dihapus dari wishlist"
}
```

---

## 🛒 **Order Management**

### 1. Get Customer Orders

Get paginated list of customer orders.

**Endpoint:** `GET /api/customer/orders`

**Query Parameters:**
- `status` (optional): Filter by order status
- `start_date` (optional): Filter from date (YYYY-MM-DD)
- `end_date` (optional): Filter to date (YYYY-MM-DD)
- `per_page` (optional): Items per page (default: 15)
- `page` (optional): Page number (default: 1)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 15,
        "nomor_transaksi": "ORD-20250922-ABC123",
        "tanggal_transaksi": "2025-09-22T10:30:00.000000Z",
        "total_harga": 13999000,
        "total_diskon": 700000,
        "total_bayar": 13299000,
        "status": "pending",
        "status_transaksi": "pending",
        "metode_pembayaran": "Transfer Bank",
        "catatan": "Mohon kirim sore hari",
        "items_count": 2,
        "items": [
          {
            "id": 25,
            "produk_id": 1,
            "varian_id": 1,
            "nama_produk": "Samsung Galaxy S24",
            "nama_varian": "128GB - Black",
            "jumlah": 1,
            "harga": 12999000,
            "subtotal": 12999000
          },
          {
            "id": 26,
            "produk_id": 3,
            "varian_id": null,
            "nama_produk": "iPhone Case",
            "nama_varian": null,
            "jumlah": 2,
            "harga": 500000,
            "subtotal": 1000000
          }
        ]
      }
    ],
    "current_page": 1,
    "per_page": 15,
    "total": 25,
    "last_page": 2
  },
  "meta": {
    "total": 25,
    "per_page": 15,
    "current_page": 1,
    "last_page": 2
  }
}
```

### 2. Create New Order

Create a new order with multiple items.

**Endpoint:** `POST /api/customer/orders`

**Request Body:**
```json
{
  "items": [
    {
      "produk_id": 1,
      "varian_id": 1,
      "jumlah": 1
    },
    {
      "produk_id": 3,
      "jumlah": 2
    }
  ],
  "metode_pembayaran_id": 2,
  "alamat_pengiriman": "Jl. Contoh No. 123, RT 01/RW 02, Jakarta 12345",
  "catatan": "Mohon kirim sore hari",
  "promo_code": "WEEKEND50",
  "poin_digunakan": 100
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order berhasil dibuat",
  "data": {
    "id": 16,
    "nomor_transaksi": "ORD-20250922-DEF456",
    "total_bayar": 12399000,
    "status": "pending",
    "metode_pembayaran": "Transfer Bank"
  }
}
```

### 3. Get Order Details

Get detailed information about a specific order.

**Endpoint:** `GET /api/customer/orders/{id}`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "nomor_transaksi": "ORD-20250922-ABC123",
    "tanggal_transaksi": "2025-09-22T10:30:00.000000Z",
    "total_harga": 13999000,
    "total_diskon": 700000,
    "total_bayar": 13299000,
    "status": "pending",
    "status_transaksi": "pending",
    "metode_pembayaran": {
      "id": 2,
      "nama": "Transfer Bank",
      "jenis": "bank_transfer"
    },
    "alamat_pengiriman": "Jl. Contoh No. 123, RT 01/RW 02, Jakarta 12345",
    "catatan": "Mohon kirim sore hari",
    "created_at": "2025-09-22T10:30:00.000000Z",
    "updated_at": "2025-09-22T10:30:00.000000Z",
    "items": [
      {
        "id": 25,
        "produk_id": 1,
        "varian_id": 1,
        "nama_produk": "Samsung Galaxy S24",
        "nama_varian": "128GB - Black",
        "jumlah": 1,
        "harga": 12999000,
        "subtotal": 12999000,
        "gambar_url": "http://localhost:8000/storage/products/samsung-s24.jpg"
      },
      {
        "id": 26,
        "produk_id": 3,
        "varian_id": null,
        "nama_produk": "iPhone Case",
        "nama_varian": null,
        "jumlah": 2,
        "harga": 500000,
        "subtotal": 1000000,
        "gambar_url": "http://localhost:8000/storage/products/iphone-case.jpg"
      }
    ]
  }
}
```

### 4. Cancel Order

Cancel a pending or confirmed order.

**Endpoint:** `POST /api/customer/orders/{id}/cancel`

**Response (200):**
```json
{
  "success": true,
  "message": "Order berhasil dibatalkan",
  "data": {
    "id": 15,
    "status": "cancelled"
  }
}
```

---

## 🎁 **Points & Promotions**

### 1. Get Points History

Get customer's points transaction history.

**Endpoint:** `GET /api/customer/points-history`

**Query Parameters:**
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter to date
- `jenis_transaksi` (optional): Filter by transaction type
- `per_page` (optional): Items per page (default: 15)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 10,
        "jumlah_poin": 75,
        "jenis_transaksi": "pembelian",
        "keterangan": "Pembelian produk senilai Rp 150.000",
        "saldo_sebelum": 1175,
        "saldo_sesudah": 1250,
        "tanggal_kadaluarsa": "2026-09-22",
        "tanggal": "2025-09-22T10:30:00.000000Z",
        "dibuat_pada": "2025-09-22T10:30:00.000000Z",
        "transaksi": {
          "id": 20,
          "nomor_transaksi": "TXN-20250922-001",
          "total_bayar": 150000
        }
      },
      {
        "id": 9,
        "jumlah_poin": -100,
        "jenis_transaksi": "penggunaan",
        "keterangan": "Penggunaan poin untuk diskon",
        "saldo_sebelum": 1275,
        "saldo_sesudah": 1175,
        "tanggal_kadaluarsa": null,
        "tanggal": "2025-09-20T14:15:00.000000Z",
        "dibuat_pada": "2025-09-20T14:15:00.000000Z",
        "transaksi": {
          "id": 19,
          "nomor_transaksi": "ORD-20250920-XYZ789",
          "total_bayar": 250000
        }
      }
    ],
    "current_page": 1,
    "per_page": 15,
    "total": 45,
    "last_page": 3
  },
  "meta": {
    "total": 45,
    "per_page": 15,
    "current_page": 1,
    "last_page": 3,
    "total_points": 1250,
    "customer_id": 1
  }
}
```

### 2. Get Available Promotions

Get active promotions available for the customer.

**Endpoint:** `GET /api/customer/promotions`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "kode_promo": "WEEKEND50",
      "nama_promo": "Weekend Sale",
      "deskripsi": "Diskon spesial untuk weekend",
      "jenis_promo": "diskon_persen",
      "nilai_diskon": 50,
      "minimal_belanja": 100000,
      "maksimal_diskon": 500000,
      "tanggal_mulai": "2025-09-21",
      "tanggal_selesai": "2025-09-24"
    },
    {
      "id": 5,
      "kode_promo": "NEWUSER",
      "nama_promo": "New User Discount",
      "deskripsi": "Diskon untuk pengguna baru",
      "jenis_promo": "diskon_nominal",
      "nilai_diskon": 50000,
      "minimal_belanja": 200000,
      "maksimal_diskon": 50000,
      "tanggal_mulai": "2025-09-01",
      "tanggal_selesai": "2025-12-31"
    }
  ]
}
```

### 3. Validate Promotion Code

Validate a promotion code for a specific purchase amount.

**Endpoint:** `POST /api/customer/promotions/validate`

**Request Body:**
```json
{
  "kode_promo": "WEEKEND50",
  "total_belanja": 500000
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Kode promo valid",
  "data": {
    "promo": {
      "id": 3,
      "kode_promo": "WEEKEND50",
      "nama_promo": "Weekend Sale",
      "jenis_promo": "diskon_persen",
      "nilai_diskon": 50,
      "minimal_belanja": 100000,
      "maksimal_diskon": 500000
    },
    "total_diskon": 250000
  }
}
```

---

## 💳 **Payment & Other Services**

### 1. Get Payment Methods

Get available payment methods for the customer.

**Endpoint:** `GET /api/customer/payment-methods`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama_metode": "Cash",
      "jenis_pembayaran": "tunai",
      "biaya_admin": 0,
      "persentase_biaya": 0
    },
    {
      "id": 2,
      "nama_metode": "Transfer Bank",
      "jenis_pembayaran": "bank_transfer",
      "biaya_admin": 5000,
      "persentase_biaya": 0
    },
    {
      "id": 3,
      "nama_metode": "Credit Card",
      "jenis_pembayaran": "kartu_kredit",
      "biaya_admin": 0,
      "persentase_biaya": 2.5
    }
  ]
}
```

### 2. Get Notifications

Get customer notifications.

**Endpoint:** `GET /api/customer/notifications`

**Query Parameters:**
- `per_page` (optional): Items per page (default: 15)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "judul": "Order Confirmed",
      "pesan": "Pesanan Anda dengan nomor ORD-20250922-ABC123 telah dikonfirmasi",
      "tanggal_kirim": "2025-09-22T11:00:00.000000Z",
      "is_read": false,
      "tipe": "order_update"
    },
    {
      "id": 11,
      "judul": "New Promotion Available",
      "pesan": "Dapatkan diskon hingga 50% untuk produk pilihan",
      "tanggal_kirim": "2025-09-21T09:00:00.000000Z",
      "is_read": true,
      "tipe": "promotion"
    }
  ],
  "meta": {
    "total": 25,
    "per_page": 15,
    "current_page": 1,
    "last_page": 2
  }
}
```

---

## 🚫 **Error Responses**

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Unauthenticated."
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "This action is unauthorized."
}
```

### 422 - Validation Error
```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password field is required."]
  }
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Order tidak ditemukan"
}
```

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Order tidak dapat dibatalkan karena sudah diproses"
}
```

---

**Last Updated**: September 22, 2025
