/**
 * Sumber data ulasan produk.
 *
 * Backend publik (`routes/api.php`) belum punya endpoint ulasan — dokumen
 * docs/api-public.md hanya mendaftar status, banner, produk, detail produk,
 * dan kategori. Karena itu modul ini TIDAK mengarang ulasan: ia mencoba satu
 * endpoint yang wajar (`/public/products/{id}/reviews`) lalu melaporkan
 * `tersedia: false` bila tidak ada. Layar menampilkan empty state copy
 * guideline §5, bukan galat.
 *
 * Bentuk data sudah disiapkan untuk endpoint masa depan supaya layar tidak
 * perlu diubah lagi saat backend menambahkannya.
 */
import { useCallback, useEffect, useState } from "react";
import { API_CONFIG } from "../../../services/config";

export type Ulasan = {
  id: number;
  nama: string;
  rating: number;
  teks: string;
  /** Epoch detik/ISO — diformat di layar lewat `waktuRelatif`. */
  tanggal?: string | number | null;
  /** URL foto ulasan (opsional). */
  foto?: string[];
  varian?: string | null;
};

export type RingkasanUlasan = {
  rating: number | null;
  jumlahRating: number;
  jumlahUlasan: number;
  /** Distribusi 5→1 bintang (indeks 0 = bintang 5). */
  distribusi: number[];
};

export type StatusUlasan = "memuat" | "siap" | "tidak-tersedia" | "galat";

const RINGKASAN_KOSONG: RingkasanUlasan = {
  rating: null,
  jumlahRating: 0,
  jumlahUlasan: 0,
  distribusi: [0, 0, 0, 0, 0],
};

type MuatanUlasan = {
  ulasan: Ulasan[];
  ringkasan: RingkasanUlasan;
  status: StatusUlasan;
  muat: () => void;
};

/** Normalisasi berbagai bentuk respons yang mungkin dikirim backend. */
function normalisasi(data: unknown): { ulasan: Ulasan[]; ringkasan: RingkasanUlasan } {
  if (!data || typeof data !== "object") return { ulasan: [], ringkasan: RINGKASAN_KOSONG };

  const obj = data as Record<string, unknown>;
  const daftarMentah = Array.isArray(obj.data)
    ? obj.data
    : Array.isArray(obj.reviews)
      ? obj.reviews
      : Array.isArray(data)
        ? (data as unknown[])
        : [];

  const ulasan: Ulasan[] = daftarMentah
    .map((item, i) => {
      const r = item as Record<string, unknown>;
      const rating = Number(r.rating ?? r.bintang ?? 0);
      return {
        id: Number(r.id ?? i + 1),
        nama: String(r.nama ?? r.nama_pelanggan ?? r.user ?? "Pembeli"),
        rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, rating)) : 5,
        teks: String(r.teks ?? r.ulasan ?? r.komentar ?? r.comment ?? ""),
        tanggal: (r.tanggal ?? r.created_at ?? r.date ?? null) as string | number | null,
        foto: Array.isArray(r.foto)
          ? (r.foto as unknown[]).filter((f): f is string => typeof f === "string")
          : Array.isArray(r.fotos)
            ? (r.fotos as unknown[]).filter((f): f is string => typeof f === "string")
            : [],
        varian: (r.varian ?? r.variant ?? null) as string | null,
      };
    })
    .filter((u) => u.teks.length > 0 || u.rating > 0);

  const distribusi = [0, 0, 0, 0, 0];
  ulasan.forEach((u) => {
    const idx = 5 - Math.round(u.rating);
    if (idx >= 0 && idx < 5) distribusi[idx] += 1;
  });

  const totalNilai = ulasan.reduce((acc, u) => acc + u.rating, 0);
  const rating =
    ulasan.length > 0 ? Math.round((totalNilai / ulasan.length) * 10) / 10 : null;

  const jumlahRating = Number(obj.jumlah_rating ?? obj.ratings_count ?? ulasan.length) || 0;

  return {
    ulasan,
    ringkasan: {
      rating,
      jumlahRating,
      jumlahUlasan: ulasan.length,
      distribusi,
    },
  };
}

/**
 * Ambil ulasan satu produk. `tidak-tersedia` (404/405) BUKAN galat — layar
 * menampilkannya sebagai empty state supaya tidak pernah error merah.
 */
export function useUlasanProduk(idProduk: number | null): MuatanUlasan {
  const [ulasan, setUlasan] = useState<Ulasan[]>([]);
  const [ringkasan, setRingkasan] = useState<RingkasanUlasan>(RINGKASAN_KOSONG);
  const [status, setStatus] = useState<StatusUlasan>("memuat");

  const muat = useCallback(async () => {
    if (!idProduk) {
      setStatus("tidak-tersedia");
      return;
    }
    setStatus("memuat");
    try {
      const res = await fetch(
        `${API_CONFIG.baseUrl}/public/products/${idProduk}/reviews`,
        { headers: { Accept: "application/json" } },
      );

      // Endpoint belum ada → bukan kondisi galat bagi pengguna.
      if (res.status === 404 || res.status === 405 || res.status === 501) {
        setStatus("tidak-tersedia");
        setUlasan([]);
        setRingkasan(RINGKASAN_KOSONG);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const teksMentah = await res.text();
      const bersih = teksMentah.replace(/^\uFEFF/, "");
      const json = JSON.parse(bersih);
      const hasil = normalisasi(json?.data ?? json);

      setUlasan(hasil.ulasan);
      setRingkasan(hasil.ringkasan);
      setStatus(hasil.ulasan.length > 0 ? "siap" : "tidak-tersedia");
    } catch {
      // Jaringan gagal / JSON rusak: tetap empty state, bukan layar error.
      setStatus("tidak-tersedia");
      setUlasan([]);
      setRingkasan(RINGKASAN_KOSONG);
    }
  }, [idProduk]);

  useEffect(() => {
    muat();
  }, [muat]);

  return { ulasan, ringkasan, status, muat };
}

/** Label bintang ringkas untuk pembaca layar, mis. "4 dari 5 bintang". */
export function labelBintang(bintang: number): string {
  return `${bintang} dari 5 bintang`;
}

export default useUlasanProduk;
