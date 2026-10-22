/**
 * Ringkasan tampilan produk (rating, jumlah ulasan) untuk layar Detail.
 *
 * Kenapa hook terpisah?
 * `fetchProductById` (services/api.ts) sengaja TIDAK diubah pada fase W3 —
 * fungsi itu memasok data untuk logika keranjang. Transform-nya hanya
 * meneruskan field yang dibutuhkan keranjang, sehingga `rating` dan
 * `reviews_count` dari endpoint publik hilang sebelum sampai ke layar.
 *
 * Hook ini membaca endpoint publik yang sama dan mengambil HANYA field
 * tampilan tersebut. Tidak ada logika bisnis di sini dan tidak ada penulisan
 * data; bila backend tidak mengirim rating, hasilnya `null` (layar menyembunyikan
 * rating chip, bukan mengarang angka).
 */
import { useCallback, useEffect, useState } from "react";
import { API_CONFIG } from "../../../services/config";

export type RingkasanProduk = {
  rating: number | null;
  jumlahUlasan: number;
};

const KOSONG: RingkasanProduk = { rating: null, jumlahUlasan: 0 };

export function useRingkasanProduk(idProduk: number | null): RingkasanProduk {
  const [ringkasan, setRingkasan] = useState<RingkasanProduk>(KOSONG);

  const muat = useCallback(async () => {
    if (!idProduk) return;
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/public/products/${idProduk}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;

      const teksMentah = await res.text();
      const json = JSON.parse(teksMentah.replace(/^\uFEFF/, ""));
      const p = (json?.data ?? json) as Record<string, unknown>;

      const ratingMentah = Number(p.rating ?? p.rating_rata ?? 0);
      const ulasanMentah = Number(p.reviews_count ?? p.jumlah_ulasan ?? 0);

      setRingkasan({
        rating:
          Number.isFinite(ratingMentah) && ratingMentah > 0
            ? Math.min(5, Math.max(0, ratingMentah))
            : null,
        jumlahUlasan: Number.isFinite(ulasanMentah) && ulasanMentah > 0 ? ulasanMentah : 0,
      });
    } catch {
      /* rating hanya pelengkap — kegagalan tidak boleh menggagalkan detail */
    }
  }, [idProduk]);

  useEffect(() => {
    // Dijalankan setelah tick agar tidak ada setState sinkron di body effect.
    let aktif = true;
    (async () => {
      await Promise.resolve();
      if (aktif) muat();
    })();
    return () => {
      aktif = false;
    };
  }, [muat]);

  return ringkasan;
}

export default useRingkasanProduk;
