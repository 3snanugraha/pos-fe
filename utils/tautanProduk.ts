/**
 * Penyusun tautan produk versi WEB (ecommerce).
 *
 * Bebas dependensi (tanpa React Native/expo) supaya bisa diuji `node --test`.
 * Eksekusi berbagi ada di `utils/bagikanProduk.ts`.
 *
 * Alasan tautan dipisah dari URL aplikasi: aplikasi berjalan di Android/iOS
 * (skema `deadeastore://`) dan di web (http). Penerima tautan di WhatsApp/chat
 * tidak bisa membuka skema native, jadi yang dibagikan SELALU alamat web
 * ecommerce: `<origin>/product/<id>`.
 */

/** Path halaman detail produk di web ecommerce (`app/product/[id].tsx`). */
export const pathProdukWeb = (idProduk: number | string): string =>
  `/product/${String(idProduk).trim()}`;

/**
 * Normalisasi origin: buang garis miring akhir dan spasi. Nilai kosong → null.
 */
export const normalisasiOrigin = (nilai?: string | null): string | null => {
  const bersih = (nilai ?? "").trim().replace(/\/+$/, "");
  return bersih === "" ? null : bersih;
};

/**
 * Tentukan origin web untuk tautan bagikan. Urutan prioritas:
 * 1. `EXPO_PUBLIC_WEB_URL` — bila web ecommerce ada di domain terpisah.
 * 2. Origin halaman saat ini (saat aplikasi berjalan di web).
 * 3. Origin backend tanpa `/api` — pola deploy satu domain.
 * 4. Konstanta produksi sebagai jaring terakhir.
 */
export function tentukanOriginWeb(opsi: {
  envWebUrl?: string | null;
  originHalaman?: string | null;
  originApi?: string | null;
}): string {
  return (
    normalisasiOrigin(opsi.envWebUrl) ??
    normalisasiOrigin(opsi.originHalaman) ??
    normalisasiOrigin(opsi.originApi) ??
    "https://gudangperabot.my.id"
  );
}

/** URL absolut produk versi web — mis. `https://gudangperabot.my.id/product/4501`. */
export const susunUrlProduk = (origin: string, idProduk: number | string): string =>
  `${normalisasiOrigin(origin) ?? "https://gudangperabot.my.id"}${pathProdukWeb(idProduk)}`;

/** Teks pendamping tautan (share sheet & fallback salin). */
export const pesanBagikan = (namaProduk: string, url: string): string =>
  `${(namaProduk ?? "").trim() || "Produk"} — lihat & beli di toko online kami: ${url}`;
