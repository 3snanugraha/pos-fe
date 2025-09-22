/**
 * Utility functions untuk memformat data dengan aman
 * Menghindari masalah NaN dan null/undefined
 */

/**
 * Format harga dengan validasi yang aman
 */
export const formatPrice = (price: number | string | null | undefined): string => {
  // Konversi ke number dan handle edge cases
  const numPrice = price ? Number(price) : 0;
  
  // Jika masih NaN setelah konversi, return fallback
  if (isNaN(numPrice)) {
    return 'Harga tidak tersedia';
  }
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numPrice);
};

/**
 * Format angka stok dengan validasi yang aman
 */
export const formatStock = (stock: number | string | null | undefined): number => {
  const numStock = stock ? Number(stock) : 0;
  return isNaN(numStock) ? 0 : numStock;
};

/**
 * Validasi dan format URL gambar
 */
export const formatImageUrl = (
  imageUrl: string | null | undefined, 
  fallbackUrl?: string
): string => {
  if (!imageUrl || imageUrl.trim() === '') {
    return fallbackUrl || 'https://via.placeholder.com/400x300/E5E7EB/9CA3AF?text=No+Image';
  }
  
  // Validasi basic URL format
  try {
    new URL(imageUrl);
    return imageUrl;
  } catch {
    return fallbackUrl || 'https://via.placeholder.com/400x300/E5E7EB/9CA3AF?text=No+Image';
  }
};

/**
 * Validasi dan format nama produk
 */
export const formatProductName = (name: string | null | undefined): string => {
  return name && name.trim() !== '' ? name.trim() : 'Nama produk tidak tersedia';
};

/**
 * Validasi dan format kategori
 */
export const formatCategoryName = (category: string | null | undefined): string => {
  return category && category.trim() !== '' ? category.trim() : 'Kategori tidak tersedia';
};

/**
 * Hitung subtotal dengan validasi yang aman
 */
export const calculateSubtotal = (
  price: number | string | null | undefined, 
  quantity: number | string | null | undefined
): number => {
  const numPrice = price ? Number(price) : 0;
  const numQuantity = quantity ? Number(quantity) : 0;
  
  if (isNaN(numPrice) || isNaN(numQuantity)) {
    return 0;
  }
  
  return numPrice * numQuantity;
};

/**
 * Debug helper untuk log data produk
 */
export const debugProductData = (product: any, context?: string) => {
  if (__DEV__) {
    console.log(`🔍 Debug Product ${context || ''}:`, {
      id: product?.id,
      nama: product?.nama_produk || product?.product_name,
      harga: product?.harga || product?.price,
      harga_type: typeof (product?.harga || product?.price),
      stok: product?.stok || product?.stock,
      stok_type: typeof (product?.stok || product?.stock),
      gambar: product?.gambar_url || product?.image_url,
      kategori: product?.kategori_nama || product?.category_name,
    });
  }
};
