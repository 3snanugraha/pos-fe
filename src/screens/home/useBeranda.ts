/**
 * State & data beranda (W3).
 *
 * Semua pemanggilan jaringan untuk Home dikumpulkan di satu hook agar layar
 * hanya berurusan dengan render. Logika bisnis (cart/wishlist/services) tidak
 * diubah — hook ini hanya membaca endpoint publik yang sudah ada.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { teks } from "../../lib/i18n";
import { apiService } from "../../../services/apiService";
import type { Banner, Product, ProductCategory } from "../../../services/types";

export type DataBeranda = {
  banners: Banner[];
  kategori: ProductCategory[];
  /** Produk untuk baris horizontal "Unggulan". */
  unggulan: Product[];
  /** Produk untuk grid 2 kolom. */
  grid: Product[];
  /** Produk flash sale / diskon (bila backend menyediakannya). */
  flashSale: Product[];
};

const KOSONG: DataBeranda = {
  banners: [],
  kategori: [],
  unggulan: [],
  grid: [],
  flashSale: [],
};

export type StatusBeranda = "memuat" | "siap" | "galat";

/** Ambil pesan manusiawi dari error apa pun (Error, string, objek respons). */
function pesanDari(e: unknown): string {
  const mentah = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  // Pesan teknis browser/klien (Inggris) diganti copy jaringan Indonesia.
  if (!mentah || /failed to fetch|network request failed|network error|aborted|timeout/i.test(mentah)) {
    return teks.empty.jaringan.deskripsi;
  }
  return mentah;
}

export function useBeranda() {
  const [data, setData] = useState<DataBeranda>(KOSONG);
  const [status, setStatus] = useState<StatusBeranda>("memuat");
  const [pesanGalat, setPesanGalat] = useState<string | null>(null);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const sudahDimuat = useRef(false);

  const muat = useCallback(async (mode: "awal" | "segarkan" = "awal") => {
    if (mode === "awal") setStatus("memuat");
    setPesanGalat(null);

    /**
     * Kumpulkan kegagalan per sumber, bukan membuang semuanya.
     *
     * Banners dan featured memang opsional (backend bisa belum mengisinya),
     * tetapi daftar produk adalah isi utama beranda: bila permintaan produk
     * GAGAL, layar harus menampilkan pola galat §5 dengan tombol "Coba Lagi",
     * bukan grid kosong yang terlihat seperti "tidak ada produk".
     */
    const galatTerkumpul: string[] = [];

    const [banners, kategori] = await Promise.all([
      apiService.getBanners().catch((e) => {
        galatTerkumpul.push(pesanDari(e));
        return [] as Banner[];
      }),
      apiService.getProductCategories().catch((e) => {
        galatTerkumpul.push(pesanDari(e));
        return [] as ProductCategory[];
      }),
    ]);

    // Unggulan: pakai endpoint featured, fallback ke produk terbaru.
    let unggulan: Product[] = [];
    try {
      unggulan = await apiService.getFeaturedProducts(8);
    } catch {
      /* endpoint featured opsional — bukan alasan menggagalkan beranda */
    }

    let grid: Product[] = [];
    let produkGagal = false;
    try {
      const hasil = await apiService.searchProducts({
        per_page: 20,
        sort_by: "created_at",
        sort_direction: "desc",
      });
      grid = hasil.data ?? [];
    } catch (e) {
      produkGagal = true;
      galatTerkumpul.push(pesanDari(e));
    }

    if (unggulan.length === 0) unggulan = grid.slice(0, 8);

    const flashSale = grid.filter((p) => p.is_flash_sale).slice(0, 10);

    setData({
      banners,
      kategori,
      unggulan,
      grid,
      flashSale,
    });

    /*
     * Galat hanya ditampilkan bila isi utama gagal, atau SEMUA sumber gagal.
     * Kegagalan tunggal pada banner/kategori tidak menghalangi belanja.
     */
    const semuaGagal =
      galatTerkumpul.length > 0 &&
      banners.length === 0 &&
      kategori.length === 0 &&
      grid.length === 0;

    if (produkGagal || semuaGagal) {
      setPesanGalat(galatTerkumpul[0] ?? null);
      setStatus("galat");
    } else {
      setStatus("siap");
    }

    sudahDimuat.current = true;
    setMenyegarkan(false);
  }, []);

  useEffect(() => {
    if (!sudahDimuat.current) muat("awal");
  }, [muat]);

  const segarkan = useCallback(() => {
    setMenyegarkan(true);
    return muat("segarkan");
  }, [muat]);

  const cobaLagi = useCallback(() => muat("awal"), [muat]);

  return { data, status, pesanGalat, menyegarkan, segarkan, cobaLagi };
}

export default useBeranda;
