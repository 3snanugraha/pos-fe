/**
 * State & data beranda (W3).
 *
 * Semua pemanggilan jaringan untuk Home dikumpulkan di satu hook agar layar
 * hanya berurusan dengan render. Logika bisnis (cart/wishlist/services) tidak
 * diubah — hook ini hanya membaca endpoint publik yang sudah ada.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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

export function useBeranda() {
  const [data, setData] = useState<DataBeranda>(KOSONG);
  const [status, setStatus] = useState<StatusBeranda>("memuat");
  const [pesanGalat, setPesanGalat] = useState<string | null>(null);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const sudahDimuat = useRef(false);

  const muat = useCallback(async (mode: "awal" | "segarkan" = "awal") => {
    if (mode === "awal") setStatus("memuat");
    setPesanGalat(null);

    try {
      const [banners, kategori] = await Promise.all([
        apiService.getBanners().catch(() => [] as Banner[]),
        apiService.getProductCategories().catch(() => [] as ProductCategory[]),
      ]);

      // Unggulan: pakai endpoint featured, fallback ke produk terbaru.
      let unggulan: Product[] = [];
      try {
        unggulan = await apiService.getFeaturedProducts(8);
      } catch {
        /* endpoint featured opsional — jangan gagalkan seluruh beranda */
      }

      let grid: Product[] = [];
      try {
        const hasil = await apiService.searchProducts({
          per_page: 20,
          sort_by: "created_at",
          sort_direction: "desc",
        });
        grid = hasil.data ?? [];
      } catch {
        grid = [];
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

      // Tanpa produk sama sekali = backend menjawab tapi kosong; itu keadaan
      // "kosong", bukan galat.
      setStatus("siap");
    } catch (e) {
      setPesanGalat(
        e instanceof Error && e.message
          ? e.message
          : "Koneksi internet bermasalah. Periksa jaringan Anda.",
      );
      setStatus("galat");
    } finally {
      sudahDimuat.current = true;
      setMenyegarkan(false);
    }
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
