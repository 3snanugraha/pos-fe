# Public API Documentation

Public endpoints that can be accessed without authentication. These are primarily used for product browsing and general information retrieval.

## 📋 **Endpoints Overview**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | API health check |
| GET | `/api/public/banners` | Get promotional banners |
| GET | `/api/public/products` | Get product list |
| GET | `/api/public/products/{id}` | Get product details |
| GET | `/api/public/product-categories` | Get product categories |

---

## 🚀 **Endpoints**

### 1. API Status Check

Check if the API is running and accessible.

**Endpoint:** `GET /api/status`

**Response:**
```json
{
  "status": "success",
  "message": "API service is running",
  "timestamp": "2025-09-22T16:03:52.000000Z",
  "version": "1.0.0"
}
```

---

### 2. Get Promotional Banners

Retrieve active promotional banners for the homepage.

**Endpoint:** `GET /api/public/banners`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "judul_banner": "Flash Sale Weekend",
      "deskripsi": "Diskon hingga 50% untuk semua produk elektronik",
      "gambar_url": "http://localhost:8000/storage/banners/banner1.jpg",
      "link_tujuan": "https://example.com/flash-sale"
    },
    {
      "id": 2,
      "judul_banner": "New Product Launch",
      "deskripsi": "Introducing our latest smartphone collection",
      "gambar_url": "http://localhost:8000/storage/banners/banner2.jpg",
      "link_tujuan": "https://example.com/new-products"
    }
  ]
}
```

**Response Fields:**
- `id`: Banner unique identifier
- `judul_banner`: Banner title/headline
- `deskripsi`: Banner description
- `gambar_url`: Full URL to banner image
- `link_tujuan`: Target URL when banner is clicked

---

### 3. Get Product List

Retrieve paginated list of active products.

**Endpoint:** `GET /api/public/products`

**Query Parameters:**
- `search` (optional): Search products by name
- `kategori_id` (optional): Filter by category ID
- `per_page` (optional): Items per page (default: 15)
- `page` (optional): Page number (default: 1)

**Example Request:**
```bash
GET /api/public/products?search=smartphone&kategori_id=1&per_page=10&page=1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama_produk": "Samsung Galaxy S24",
      "deskripsi": "Flagship smartphone with advanced camera system",
      "harga": 12999000,
      "harga_beli": 11500000,
      "stok": 25,
      "kategori_id": 1,
      "kategori_nama": "Smartphones",
      "gambar_url": "http://localhost:8000/storage/products/samsung-s24.jpg",
      "barcode": "8901234567890",
      "kode_produk": "SAMS24-001",
      "has_variants": true,
      "variants_count": 3,
      "status": "aktif"
    }
  ],
  "meta": {
    "total": 150,
    "per_page": 10,
    "current_page": 1,
    "last_page": 15
  }
}
```

**Response Fields:**
- `id`: Product unique identifier
- `nama_produk`: Product name
- `deskripsi`: Product description
- `harga`: Selling price (in smallest currency unit)
- `harga_beli`: Purchase price
- `stok`: Available stock quantity
- `kategori_id`: Category ID
- `kategori_nama`: Category name
- `gambar_url`: Main product image URL
- `barcode`: Product barcode
- `kode_produk`: Internal product code
- `has_variants`: Whether product has variants
- `variants_count`: Number of variants available
- `status`: Product status (aktif/nonaktif)

---

### 4. Get Product Details

Retrieve detailed information about a specific product including variants and images.

**Endpoint:** `GET /api/public/products/{id}`

**Parameters:**
- `id`: Product ID

**Example Request:**
```bash
GET /api/public/products/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nama_produk": "Samsung Galaxy S24",
    "deskripsi": "Flagship smartphone with advanced camera system and AI features",
    "harga": 12999000,
    "harga_beli": 11500000,
    "stok": 25,
    "kategori_id": 1,
    "kategori_nama": "Smartphones",
    "gambar_url": "http://localhost:8000/storage/products/samsung-s24.jpg",
    "barcode": "8901234567890",
    "kode_produk": "SAMS24-001",
    "has_variants": true,
    "variants_count": 3,
    "status": "aktif",
    "kategori": {
      "id": 1,
      "nama_kategori": "Smartphones"
    },
    "varian": [
      {
        "id": 1,
        "nama_varian": "128GB - Black",
        "harga_beli": 11500000,
        "harga_jual": 12999000,
        "stok": 10
      },
      {
        "id": 2,
        "nama_varian": "256GB - Black",
        "harga_beli": 12500000,
        "harga_jual": 13999000,
        "stok": 8
      },
      {
        "id": 3,
        "nama_varian": "128GB - White",
        "harga_beli": 11500000,
        "harga_jual": 12999000,
        "stok": 7
      }
    ],
    "gambar": [
      {
        "id": 1,
        "path_gambar": "products/samsung-s24-front.jpg",
        "gambar_utama": true,
        "url": "http://localhost:8000/storage/products/samsung-s24-front.jpg"
      },
      {
        "id": 2,
        "path_gambar": "products/samsung-s24-back.jpg",
        "gambar_utama": false,
        "url": "http://localhost:8000/storage/products/samsung-s24-back.jpg"
      }
    ]
  }
}
```

**Additional Response Fields:**
- `kategori`: Category object with details
- `varian`: Array of product variants with individual pricing and stock
- `gambar`: Array of product images with URLs

---

### 5. Get Product Categories

Retrieve list of all active product categories.

**Endpoint:** `GET /api/public/product-categories`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama_kategori": "Smartphones",
      "deskripsi": "Mobile phones and accessories",
      "gambar_kategori": "http://localhost:8000/storage/categories/smartphones.jpg",
      "ikon_kategori": "bi-phone",
      "kategori_induk_id": null,
      "urutan_tampil": 1,
      "status": "aktif"
    },
    {
      "id": 2,
      "nama_kategori": "Laptops",
      "deskripsi": "Computers and laptop accessories",
      "gambar_kategori": "http://localhost:8000/storage/categories/laptops.jpg",
      "ikon_kategori": "bi-laptop",
      "kategori_induk_id": null,
      "urutan_tampil": 2,
      "status": "aktif"
    },
    {
      "id": 3,
      "nama_kategori": "iPhone Cases",
      "deskripsi": "Protective cases for iPhone",
      "gambar_kategori": null,
      "ikon_kategori": "bi-shield-check",
      "kategori_induk_id": 1,
      "urutan_tampil": 1,
      "status": "aktif"
    }
  ]
}
```

**Response Fields:**
- `id`: Category unique identifier
- `nama_kategori`: Category name
- `deskripsi`: Category description
- `gambar_kategori`: Category image URL (nullable)
- `ikon_kategori`: Bootstrap icon class for UI
- `kategori_induk_id`: Parent category ID (null for root categories)
- `urutan_tampil`: Display order
- `status`: Category status (aktif/nonaktif)

---

## 🚫 **Error Responses**

### 404 - Not Found
```json
{
  "success": false,
  "message": "Product not found"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 💡 **Usage Tips**

1. **Pagination**: Always handle pagination in product lists for better performance
2. **Image Caching**: Cache image URLs on the client side for better user experience
3. **Search Debouncing**: Implement search debouncing to reduce API calls
4. **Error Handling**: Always check the `success` field before processing data

## 📱 **Mobile Implementation Example**

### React Native Example
```javascript
// Fetch products with search and category filter
const fetchProducts = async (searchTerm = '', categoryId = null, page = 1) => {
  try {
    const params = new URLSearchParams({
      ...(searchTerm && { search: searchTerm }),
      ...(categoryId && { kategori_id: categoryId }),
      page: page.toString(),
      per_page: '20'
    });
    
    const response = await fetch(`${API_URL}/public/products?${params}`);
    const data = await response.json();
    
    if (data.success) {
      return {
        products: data.data,
        pagination: data.meta
      };
    }
    throw new Error(data.message);
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};
```

---

**Last Updated**: September 22, 2025
