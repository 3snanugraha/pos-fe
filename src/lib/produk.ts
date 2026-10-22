/**
 * Normalisasi data produk untuk tampilan commerce.
 *
 * Backend publik (`/public/products`) mengirim harga sebagai string desimal
 * (`"33000.00"`), `harga_range` sebagai teks terformat, dan harga flash sale
 * terpisah. Modul ini menyatukan bentuknya supaya komponen kartu tidak perlu
 * menebak-nebak, dan TIDAK mengarang harga coret: harga coret hanya muncul
 * bila backend benar-benar memberi pembanding (flash sale atau rentang varian).
 */

/** Bentuk longgar produk dari API publik (harga bisa string desimal). */
export type ProdukApi = {
  id: number;
  nama_produk: string;
  deskripsi?: string | null;
  gambar_url?: string | null;
  harga?: number | string | null;
  harga_jual_min?: number | string | null;
  harga_jual_max?: number | string | null;
  harga_flash_sale?: number | string | null;
  is_flash_sale?: boolean;
  stok?: number | string | null;
  total_stok?: number | string | null;
  kategori_id?: number;
  kategori_nama?: string | null;
  has_variants?: boolean;
  variants_count?: number;
  rating?: number | string | null;
  reviews_count?: number | null;
};

const angkaDari = (nilai: unknown): number | null => {
  if (nilai == null) return null;
  const n = typeof nilai === "number" ? nilai : Number(String(nilai).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Harga jual yang ditampilkan (harga flash sale menang bila ada). */
export function hargaTampil(produk: ProdukApi): number {
  const flash = angkaDari(produk.harga_flash_sale);
  const dasar = angkaDari(produk.harga) ?? angkaDari(produk.harga_jual_min) ?? 0;
  if (produk.is_flash_sale && flash != null && flash > 0 && flash < dasar) return flash;
  return dasar;
}

/**
 * Harga coret — hanya bila backend memberi pembanding nyata:
 * 1. flash sale: harga normal > harga flash sale;
 * 2. produk bervarian dengan harga berbeda: harga_jual_max > harga tampil.
 */
export function hargaCoret(produk: ProdukApi): number | null {
  const tampil = hargaTampil(produk);
  const flash = angkaDari(produk.harga_flash_sale);
  if (produk.is_flash_sale && flash != null && flash > 0) {
    const normal = angkaDari(produk.harga) ?? 0;
    return normal > tampil ? normal : null;
  }
  const maks = angkaDari(produk.harga_jual_max);
  if (maks != null && maks > tampil) return maks;
  return null;
}

/** Persentase diskon bulat (0 bila tidak ada harga coret). */
export function diskonPersen(produk: ProdukApi): number {
  const coret = hargaCoret(produk);
  if (!coret) return 0;
  const tampil = hargaTampil(produk);
  if (tampil <= 0 || coret <= tampil) return 0;
  return Math.round(((coret - tampil) / coret) * 100);
}

/** Stok efektif untuk badge ketersediaan. */
export function stokTampil(produk: ProdukApi): number {
  return angkaDari(produk.stok) ?? angkaDari(produk.total_stok) ?? 0;
}

/** Rating rata-rata bila backend menyediakannya (tidak dikarang bila kosong). */
export function ratingTampil(produk: ProdukApi): number | null {
  const r = angkaDari(produk.rating);
  if (r == null || r <= 0) return null;
  return Math.min(5, Math.max(0, r));
}

/** Jumlah ulasan bila backend menyediakannya. */
export function jumlahUlasan(produk: ProdukApi): number {
  return angkaDari(produk.reviews_count) ?? 0;
}

/** "4,5" — satu desimal, locale Indonesia. */
export function formatRating(nilai: number): string {
  return nilai.toFixed(1).replace(".", ",");
}
