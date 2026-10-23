/**
 * Paginasi produk untuk grid kategori (W6 lanjutan).
 *
 * Kenapa ada hook ini?
 * Sebelumnya layar kategori hanya memuat SATU halaman (`per_page: 20`) lalu
 * memakai `produk.length` sebagai jumlah total. Akibatnya "Semua" menampilkan
 * "20 produk" padahal backend punya 4.519 produk, dan tidak ada cara memuat
 * sisanya. Hook ini memisahkan tiga hal yang dulu tercampur:
 *
 * 1. `total` — angka dari `meta.total` respons API (bukan jumlah item di layar).
 * 2. `produk` — akumulasi halaman yang sudah dimuat, didedupe berdasarkan `id`
 *    (backend bisa menggeser item antar halaman saat ada produk baru).
 * 3. `habis` — berhenti di `meta.last_page`, sehingga `onEndReached` tidak
 *    meminta halaman kosong berulang kali.
 *
 * Perlindungan double-load: `sedangMuatRef` diset sinkron sebelum `await`,
 * jadi dua panggilan `muatLagi()` dalam satu frame tetap hanya menghasilkan
 * satu request. `generasiRef` membuang respons yang datang setelah pengguna
 * berganti kategori.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../../../services/apiService';
import type { Product } from '../../../services/types';
import { handleAuthError } from '../../../utils/auth';

/** Ukuran halaman grid kategori — dipakai konsisten di semua request. */
export const PER_PAGE_PRODUK = 20;

export type StatusProduk = 'memuat' | 'siap' | 'galat';

/**
 * `meta` dari backend bisa tidak lengkap. `null` berarti "tidak tahu", bukan
 * nol: pemanggil memakai `data.length < perPage` sebagai cadangan agar paginasi
 * tidak berhenti di halaman pertama saat `meta` hilang.
 */
function bacaMeta(meta: unknown): { total: number | null; lastPage: number | null } {
  const m = (meta ?? {}) as { total?: unknown; last_page?: unknown };
  const total = Number(m.total);
  const lastPage = Number(m.last_page);
  return {
    total: Number.isFinite(total) && total >= 0 ? total : null,
    lastPage: Number.isFinite(lastPage) && lastPage > 0 ? Math.floor(lastPage) : null,
  };
}

/** Gabungkan halaman baru tanpa duplikat id (item lama tetap di posisinya). */
function gabungUnik(lama: Product[], baru: Product[]): Product[] {
  const ada = new Set(lama.map((p) => p.id));
  const hasil = [...lama];
  for (const item of baru) {
    if (!ada.has(item.id)) {
      ada.add(item.id);
      hasil.push(item);
    }
  }
  return hasil;
}

export type GunakanProdukPaginasi = {
  produk: Product[];
  /** Jumlah produk di server (`meta.total`), 0 bila meta tidak tersedia. */
  total: number;
  status: StatusProduk;
  pesanGalat: string | null;
  /** Halaman berikutnya sedang dimuat (footer indikator). */
  memuatLagi: boolean;
  galatLagi: string | null;
  /** Semua halaman sudah dimuat — `onEndReached` tidak perlu request lagi. */
  habis: boolean;
  menyegarkan: boolean;
  kategoriId: number | null;
  pilihKategori: (kategoriId: number | null) => void;
  muatLagi: () => void;
  segarkan: () => void;
  cobaLagi: () => void;
};

export function useProdukPaginasi(
  kategoriAwal: number | null = null,
  perPage: number = PER_PAGE_PRODUK,
): GunakanProdukPaginasi {
  const [kategoriId, setKategoriId] = useState<number | null>(kategoriAwal);
  const [produk, setProduk] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<StatusProduk>('memuat');
  const [pesanGalat, setPesanGalat] = useState<string | null>(null);
  const [memuatLagi, setMemuatLagi] = useState(false);
  const [galatLagi, setGalatLagi] = useState<string | null>(null);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [habis, setHabis] = useState(false);

  /** Halaman terakhir yang berhasil dimuat (0 = belum ada). */
  const halamanRef = useRef(0);
  const lastPageRef = useRef<number | null>(1);
  const sedangMuatRef = useRef(false);
  const generasiRef = useRef(0);
  /** Kategori aktif versi ref: dipakai request yang ditunda/berikutnya. */
  const kategoriRef = useRef<number | null>(kategoriAwal);

  const mintaHalaman = useCallback(
    async (halaman: number, kategori: number | null, mode: 'awal' | 'lanjut' | 'segarkan') => {
      if (sedangMuatRef.current) return;

      const generasi = generasiRef.current;
      sedangMuatRef.current = true;

      if (mode === 'awal') {
        setStatus('memuat');
        setPesanGalat(null);
        setGalatLagi(null);
      } else if (mode === 'lanjut') {
        setMemuatLagi(true);
        setGalatLagi(null);
      } else {
        setMenyegarkan(true);
      }

      try {
        const hasil = await apiService.searchProducts(
          { kategori_id: kategori ?? undefined, per_page: perPage, page: halaman },
          // Tarik-untuk-segarkan harus menembus cache.
          mode !== 'segarkan',
        );
        // Pengguna sudah berganti kategori saat request ini berjalan → buang.
        if (generasi !== generasiRef.current) return;

        const meta = bacaMeta(hasil.meta);
        const data = Array.isArray(hasil.data) ? hasil.data : [];
        // Tanpa meta, halaman terakhir dikenali dari item yang kurang dari perPage.
        const batas =
          meta.lastPage ?? (data.length < perPage ? halaman : Number.POSITIVE_INFINITY);

        if (mode === 'lanjut') {
          halamanRef.current = halaman;
          lastPageRef.current = meta.lastPage;
          setProduk((lama) => gabungUnik(lama, data));
        } else {
          halamanRef.current = 1;
          lastPageRef.current = meta.lastPage;
          setProduk(data);
        }

        setHabis(halaman >= batas || data.length === 0);
        if (meta.total !== null) setTotal(meta.total);
        setStatus('siap');
        setPesanGalat(null);
      } catch (err: unknown) {
        if (generasi !== generasiRef.current) return;
        const authError = await handleAuthError(err);
        const pesan = authError ? null : err instanceof Error ? err.message : String(err);

        if (mode === 'lanjut') {
          // Halaman gagal tidak mengosongkan grid yang sudah tampil.
          setGalatLagi(pesan ?? 'Gagal memuat produk berikutnya');
        } else {
          setStatus('galat');
          setPesanGalat(pesan ?? 'Gagal memuat produk');
        }
      } finally {
        if (generasi === generasiRef.current) {
          sedangMuatRef.current = false;
          setMemuatLagi(false);
          setMenyegarkan(false);
        }
      }
    },
    [perPage],
  );

  useEffect(() => {
    // Async IIFE + await: state tidak diubah sinkron di body effect (aturan
    // React Compiler `set-state-in-effect`), sama seperti pola layar lain.
    let aktif = true;
    (async () => {
      await Promise.resolve();
      if (!aktif) return;
      void mintaHalaman(1, kategoriAwal, 'awal');
    })();
    return () => {
      aktif = false;
      generasiRef.current += 1; // buang respons bila layar ditinggalkan
    };
    // Hanya saat layar dibuka dengan kategori awal dari route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pilihKategori = useCallback(
    (baru: number | null) => {
      if (baru === kategoriRef.current) return;
      kategoriRef.current = baru;
      generasiRef.current += 1; // buang respons kategori sebelumnya
      sedangMuatRef.current = false;
      halamanRef.current = 0;
      lastPageRef.current = 1;
      setKategoriId(baru);
      setProduk([]);
      setTotal(0);
      setHabis(false);
      setGalatLagi(null);
      setMemuatLagi(false);
      void mintaHalaman(1, baru, 'awal');
    },
    [mintaHalaman],
  );

  /** Halaman berikutnya — dipanggil `onEndReached` / IntersectionObserver. */
  const muatLagi = useCallback(() => {
    if (sedangMuatRef.current) return;
    if (halamanRef.current === 0) return; // halaman pertama belum selesai
    if (lastPageRef.current !== null && halamanRef.current >= lastPageRef.current) return;
    void mintaHalaman(halamanRef.current + 1, kategoriRef.current, 'lanjut');
  }, [mintaHalaman]);

  const segarkan = useCallback(() => {
    if (sedangMuatRef.current) return;
    generasiRef.current += 1;
    sedangMuatRef.current = false;
    void mintaHalaman(1, kategoriRef.current, 'segarkan');
  }, [mintaHalaman]);

  const cobaLagi = useCallback(() => {
    generasiRef.current += 1;
    sedangMuatRef.current = false;
    void mintaHalaman(1, kategoriRef.current, 'awal');
  }, [mintaHalaman]);

  return {
    produk,
    total,
    status,
    pesanGalat,
    memuatLagi,
    galatLagi,
    habis,
    menyegarkan,
    kategoriId,
    pilihKategori,
    muatLagi,
    segarkan,
    cobaLagi,
  };
}

export default useProdukPaginasi;
