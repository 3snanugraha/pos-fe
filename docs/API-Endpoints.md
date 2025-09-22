# 📚 API Documentation - POS System Deadeastore

## 📋 Base URL
```
Production: https://your-domain.com
Development: http://192.168.100.36:8000
```

## 🔑 Authentication
API menggunakan **Laravel Sanctum** untuk authentication dengan Bearer Token.

### Headers yang diperlukan:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}  // untuk protected routes
```

---

## 🌐 PUBLIC ENDPOINTS (No Auth Required)

### System Status
```http
GET /api/status
```
**Response:**
```json
{
    "status": "success",
    "message": "API service is running",
    "timestamp": "2025-09-22T13:35:00Z",
    "version": "1.0.0"
}
```

### Banner Sliders
```http
GET /api/public/banners
```
**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "judul_banner": "Promo Akhir Tahun",
            "deskripsi": "Diskon hingga 50%",
            "gambar_url": "http://domain.com/storage/banners/banner1.jpg",
            "link_tujuan": "https://promo-url.com"
        }
    ]
}
```

### Product Categories
```http
GET /api/public/product-categories
```
**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "nama_kategori": "Elektronik",
            "deskripsi": "Kategori elektronik",
            "status": "aktif"
        }
    ]
}
```

### Featured Products
```http
GET /api/public/featured-products?limit=10
```
**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "nama_produk": "iPhone 15",
            "deskripsi": "iPhone terbaru",
            "harga_jual_min": 15000000,
            "harga_jual_max": 20000000,
            "harga_range": "Rp 15.000.000 - 20.000.000",
            "kategori_nama": "Elektronik",
            "gambar_url": "http://domain.com/storage/products/iphone15.jpg",
            "has_variants": true,
            "variants_count": 3,
            "is_flash_sale": false,
            "harga_flash_sale": null
        }
    ]
}
```

### Public Products
```http
GET /api/public/products?kategori_id=1&search=iphone&harga_min=1000000&harga_max=5000000&sort_by=harga&sort_direction=asc&per_page=12
```
**Query Parameters:**
- `kategori_id` (optional): Filter by category ID
- `search` (optional): Search by product name or description
- `harga_min` & `harga_max` (optional): Price range filter
- `sort_by` (optional): Sort field (`created_at`, `harga`, `nama_produk`)
- `sort_direction` (optional): `asc` or `desc`
- `per_page` (optional): Items per page (default: 12)

### Public Product Detail
```http
GET /api/public/products/{id}
```
**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "nama_produk": "iPhone 15",
        "deskripsi": "iPhone terbaru dengan teknologi A17",
        "kategori": {
            "id": 1,
            "nama_kategori": "Elektronik"
        },
        "harga_jual_min": 15000000,
        "harga_jual_max": 20000000,
        "harga_range": "Rp 15.000.000 - 20.000.000",
        "berat": 171.0,
        "dimensi": {
            "panjang": 14.76,
            "lebar": 7.15,
            "tinggi": 0.78
        },
        "is_flash_sale": false,
        "harga_flash_sale": null,
        "produk_unggulan": true,
        "gambar": [
            {
                "id": 1,
                "url": "http://domain.com/storage/products/iphone15-1.jpg",
                "gambar_utama": true,
                "urutan_tampil": 1
            }
        ],
        "varian": [
            {
                "id": 1,
                "nama_varian": "128GB - Black",
                "harga_jual": 15000000,
                "stok": 50,
                "barcode_varian": "IP15-128-BLK"
            }
        ]
    }
}
```

### Public Promotions
```http
GET /api/public/promotions
```

### Store Profile
```http
GET /api/public/store-profile
```

---

## 👤 CUSTOMER AUTHENTICATION

### Customer Register
```http
POST /api/customer/register
```
**Request Body:**
```json
{
    "nama_pelanggan": "John Doe",
    "telepon": "081234567890",
    "email": "customer@example.com",
    "password": "password123",
    "alamat": "Jl. Example No. 123"
}
```

### Customer Login
```http
POST /api/customer/login
```
**Request Body:**
```json
{
    "email": "customer@example.com",
    "password": "password123",
    "device_name": "mobile-app"
}
```
**Response:**
```json
{
    "success": true,
    "message": "Login berhasil",
    "data": {
        "customer": {
            "id": 1,
            "nama_pelanggan": "John Doe",
            "email": "customer@example.com",
            "telepon": "081234567890",
            "kode_pelanggan": "CST000001",
            "total_poin": 1500,
            "grup": {
                "id": 1,
                "nama_grup": "Silver Member",
                "diskon_persen": 5
            }
        },
        "token": "1|laravel_sanctum_token_here"
    }
}
```

---

## 🛍️ CUSTOMER API (Auth Required)

### Customer Dashboard
```http
GET /api/customer/dashboard
Authorization: Bearer {customer_token}
```
**Response:**
```json
{
    "success": true,
    "data": {
        "customer": {
            "id": 1,
            "nama_pelanggan": "John Doe",
            "total_poin": 1500,
            "total_belanja": 5000000,
            "grup": {
                "id": 1,
                "nama_grup": "Silver Member",
                "diskon_persen": 5
            }
        },
        "recent_transactions": [],
        "points_history": [],
        "active_promotions": [],
        "recommended_products": [],
        "banners": []
    }
}
```

### Customer Profile
```http
GET /api/customer/profile
Authorization: Bearer {customer_token}
```

```http
PUT /api/customer/profile
Authorization: Bearer {customer_token}
```
**Request Body:**
```json
{
    "nama_pelanggan": "John Doe Updated",
    "telepon": "081234567890",
    "email": "updated@example.com",
    "alamat": "Updated Address",
    "password": "newpassword123"
}
```

### Customer Addresses
```http
GET /api/customer/addresses
Authorization: Bearer {customer_token}
```

```http
POST /api/customer/addresses
Authorization: Bearer {customer_token}
```
**Request Body:**
```json
{
    "label": "Rumah",
    "alamat_lengkap": "Jl. Example No. 123, RT 01/RW 02",
    "kota": "Jakarta",
    "provinsi": "DKI Jakarta",
    "kode_pos": "12345",
    "penerima": "John Doe",
    "telepon_penerima": "081234567890",
    "is_default": true
}
```

### Customer Wishlist
```http
GET /api/customer/wishlist
Authorization: Bearer {customer_token}
```

```http
POST /api/customer/wishlist
Authorization: Bearer {customer_token}
```
**Request Body:**
```json
{
    "produk_id": 1
}
```

```http
DELETE /api/customer/wishlist/{productId}
Authorization: Bearer {customer_token}
```

### Customer Orders
```http
POST /api/customer/orders
Authorization: Bearer {customer_token}
```
**Request Body:**
```json
{
    "items": [
        {
            "produk_id": 1,
            "varian_id": 1,
            "jumlah": 2
        }
    ],
    "metode_pembayaran_id": 1,
    "alamat_pengiriman": "Jl. Pengiriman No. 123",
    "catatan": "Harap hati-hati",
    "promo_code": "DISKON50",
    "poin_digunakan": 100
}
```
**Response:**
```json
{
    "success": true,
    "message": "Order berhasil dibuat",
    "data": {
        "order_id": 123,
        "nomor_transaksi": "TRX-20250922-0001",
        "total_bayar": 1500000,
        "status": "pending"
    }
}
```

```http
GET /api/customer/orders
Authorization: Bearer {customer_token}
```

```http
GET /api/customer/orders/{id}
Authorization: Bearer {customer_token}
```

```http
POST /api/customer/orders/{id}/cancel
Authorization: Bearer {customer_token}
```

### Points Management
```http
GET /api/customer/points-history
Authorization: Bearer {customer_token}
```

```http
POST /api/customer/points/redeem
Authorization: Bearer {customer_token}
```

### Customer Logout
```http
POST /api/customer/logout
Authorization: Bearer {customer_token}
```

---

## 🔐 STAFF/ADMIN API (Auth Required)

### Staff/Admin Login
```http
POST /api/login
```
**Request Body:**
```json
{
    "email": "admin@example.com",
    "password": "password",
    "device_name": "pos-terminal"
}
```
**Response:**
```json
{
    "success": true,
    "message": "Login berhasil",
    "data": {
        "user": {
            "id": 1,
            "kode_karyawan": "EMP001",
            "nama_lengkap": "Admin User",
            "email": "admin@example.com",
            "telepon": "081234567890",
            "role": "Super Admin",
            "foto_profil": "http://domain.com/storage/profiles/admin.jpg",
            "status_karyawan": "aktif"
        },
        "token": "2|laravel_sanctum_token_here"
    }
}
```

### Get Staff/Admin User
```http
GET /api/user
Authorization: Bearer {admin_token}
```

### Product Management
```http
GET /api/products?kategori_id=1&status=aktif&stok_tersedia=true&search=laptop&sort_by=created_at&sort_direction=desc&per_page=15
Authorization: Bearer {admin_token}
```

```http
GET /api/products/{id}
Authorization: Bearer {admin_token}
```

```http
POST /api/products/scan-barcode
Authorization: Bearer {admin_token}
```
**Request Body:**
```json
{
    "barcode": "1234567890123"
}
```
**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "nama_produk": "iPhone 15",
        "barcode": "1234567890123",
        "kode_produk": "IP15-001",
        "harga_jual": 15000000,
        "stok_tersedia": 50,
        "kategori": "Elektronik",
        "gambar_url": "http://domain.com/storage/products/iphone15.jpg",
        "has_multiple_variants": true,
        "selected_variant": {
            "id": 1,
            "nama_varian": "128GB - Black",
            "harga_jual": 15000000,
            "harga_beli": 12000000,
            "stok": 50,
            "barcode_varian": "IP15-128-BLK"
        },
        "varian": []
    }
}
```

### Customer Management
```http
GET /api/customers
Authorization: Bearer {admin_token}
```

```http
GET /api/customers/{id}
Authorization: Bearer {admin_token}
```

```http
POST /api/customers
Authorization: Bearer {admin_token}
```

```http
POST /api/customers/search-by-phone
Authorization: Bearer {admin_token}
```
**Request Body:**
```json
{
    "phone": "081234567890"
}
```

### Transaction Management
```http
GET /api/transactions?start_date=2025-09-01&end_date=2025-09-30&status=selesai&pelanggan_id=1&sort_by=tanggal_transaksi&sort_direction=desc&per_page=15
Authorization: Bearer {admin_token}
```

```http
GET /api/transactions/{id}
Authorization: Bearer {admin_token}
```

```http
POST /api/transactions
Authorization: Bearer {admin_token}
```
**Request Body:**
```json
{
    "pelanggan_id": 1,
    "metode_pembayaran_id": 1,
    "total_harga": 1500000,
    "total_diskon": 100000,
    "total_bayar": 1400000,
    "kembalian": 0,
    "items": [
        {
            "produk_id": 1,
            "varian_id": 1,
            "jumlah": 1,
            "harga": 1500000,
            "diskon": 100000,
            "subtotal": 1400000
        }
    ]
}
```

```http
GET /api/payment-methods
Authorization: Bearer {admin_token}
```

### Stock Management
```http
GET /api/stock/ringkasan
Authorization: Bearer {admin_token}
```
**Response:**
```json
{
    "success": true,
    "data": {
        "total_produk": 150,
        "produk_low_stock": 15,
        "stok_masuk_hari_ini": 100,
        "stok_keluar_hari_ini": 75
    }
}
```

```http
GET /api/stock/produk-low-stock
Authorization: Bearer {admin_token}
```

```http
GET /api/stock/produk/{produk_id}/stok
Authorization: Bearer {admin_token}
```

```http
GET /api/stock/laporan?tanggal_mulai=2025-09-01&tanggal_selesai=2025-09-30&produk_id=1&jenis_pergerakan=masuk&tipe_transaksi=pembelian&per_page=20
Authorization: Bearer {admin_token}
```

```http
POST /api/stock/masuk
Authorization: Bearer {admin_token}
```
**Request Body:**
```json
{
    "produk_id": 1,
    "varian_id": 1,
    "jumlah": 100,
    "harga_satuan": 10000,
    "nomor_referensi": "PO-001",
    "keterangan": "Pembelian dari supplier",
    "supplier_id": 1,
    "tanggal_pergerakan": "2025-09-22"
}
```

```http
POST /api/stock/keluar
Authorization: Bearer {admin_token}
```
**Request Body:**
```json
{
    "produk_id": 1,
    "varian_id": 1,
    "jumlah": 10,
    "harga_satuan": 15000,
    "tipe_transaksi": "penjualan",
    "nomor_referensi": "TRX-20250922-0001",
    "keterangan": "Penjualan retail",
    "pelanggan_id": 1
}
```

```http
POST /api/stock/penyesuaian
Authorization: Bearer {admin_token}
```
**Request Body:**
```json
{
    "produk_id": 1,
    "varian_id": 1,
    "stok_sesudah": 85,
    "alasan": "Stock opname - barang rusak",
    "tanggal_penyesuaian": "2025-09-22"
}
```

### Staff/Admin Logout
```http
POST /api/logout
Authorization: Bearer {admin_token}
```

---

## 🚨 Error Responses

### Validation Error (422)
```json
{
    "success": false,
    "message": "Validation error",
    "errors": {
        "email": ["The email field is required."]
    }
}
```

### Unauthorized (401)
```json
{
    "success": false,
    "message": "Email atau password salah"
}
```

### Forbidden (403)
```json
{
    "success": false,
    "message": "Anda tidak memiliki akses untuk aplikasi ini"
}
```

### Not Found (404)
```json
{
    "success": false,
    "message": "Produk tidak ditemukan"
}
```

### Server Error (500)
```json
{
    "success": false,
    "message": "Terjadi kesalahan: Database connection failed"
}
```

---

## 📝 Notes

### Point System
- **Earning**: 1 point per 1,000 rupiah belanja
- **Redemption**: 1 point = 1 rupiah discount
- **Types**: `kredit` (earned) atau `debit` (used)

### Transaction Status
- **Status Transaksi**: `pending`, `selesai`, `dibatalkan`, `retur`
- **Status Pembayaran**: `belum_bayar`, `sebagian`, `lunas`
- **Jenis Transaksi**: `offline` (kasir), `online` (customer app)

### Stock Movement Types
- **Jenis Pergerakan**: `masuk`, `keluar`, `penyesuaian`, `transfer`, `retur`
- **Tipe Transaksi**: `pembelian`, `penjualan`, `retur_pembelian`, `retur_penjualan`, `penyesuaian_manual`, `transfer_masuk`, `transfer_keluar`, `rusak`, `hilang`, `kadaluarsa`, `produksi`, `konsinyasi`

### Product Variants
- Products can have multiple variants (size, color, etc.)
- Each variant has individual pricing and stock
- Variants can have individual barcodes
- Stock is tracked per variant

### Image URLs
- All image URLs use storage link: `http://domain.com/storage/path/to/image.jpg`
- Images are stored in `storage/app/public/` and accessible via `/storage/` URL

---

## 🔧 Environment Variables
```env
APP_URL=http://192.168.100.36:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pos_system
```

## 📱 Mobile App Integration
API sudah siap untuk integrasi dengan:
- **Customer Mobile App**: Registration, login, product browsing, order creation, point management
- **Staff/Admin App**: Product management, transaction processing, stock management
- **Public Access**: Product catalog, promotions, store information

---

*Last Updated: 2025-09-22*
*API Version: 2.0.0*