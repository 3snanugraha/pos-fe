/**
 * Kebijakan daftar metode pembayaran — modul MURNI tanpa dependensi
 * React Native / AsyncStorage, supaya bisa diuji unit langsung (`node --test`).
 *
 * Dipakai `apiService.getPaymentMethods()`. Aturannya berasal dari bug nyata:
 * admin menyimpan metode di halaman pengaturan pos-be, tetapi aplikasi Android
 * tetap menampilkan "Belum ada metode pembayaran aktif".
 *
 * Penyebabnya bukan backend (endpoint mengembalikan 8 baris), melainkan dua
 * hal di sisi aplikasi:
 *
 * 1. `cacheManager.getOrSet` menyimpan hasil APA PUN, termasuk `[]`. Daftar
 *    kosong yang tersimpan sebelum admin mengisi metode bertahan sampai TTL
 *    `CACHE_CONFIG.LONG` (2 jam) — dan pull-to-refresh pun masih membaca cache
 *    karena memanggil `getPaymentMethods()` tanpa argumen.
 * 2. `getOrSet` hanya memperlakukan `null` sebagai cache-miss. `[]` dianggap
 *    hit, jadi tidak pernah ada percobaan ulang ke jaringan.
 *
 * Karena itu: cache kosong = miss, dan hasil kosong tidak boleh disimpan.
 */

import type { PaymentMethod } from "./types";

/** Bentuk minimal yang dibutuhkan dari cache/endpoint. */
type MetodeMentah = Partial<PaymentMethod> & { id?: number | string | null };

/**
 * Ambil daftar dari respons endpoint. Payload yang bukan array (mis. objek
 * error, `null`, atau `{data: {...}}`) diperlakukan sebagai daftar kosong agar
 * layar tidak crash saat memetakan `.map`.
 */
export const normalisasiDaftar = (payload: unknown): PaymentMethod[] =>
  Array.isArray(payload) ? (payload as PaymentMethod[]) : [];

/**
 * Nilai cache yang boleh dipakai.
 *
 * `[]` dianggap MISS — inilah inti perbaikan. Cache kosong tidak punya nilai
 * apa pun (tidak menghemat apa-apa: layar tetap harus memanggil jaringan untuk
 * mengisinya) tetapi justru menyembunyikan data yang sudah ada di server.
 */
export const dariCache = (
  tersimpan: unknown
): PaymentMethod[] | null => {
  if (!Array.isArray(tersimpan)) return null;
  if (tersimpan.length === 0) return null;
  return tersimpan as PaymentMethod[];
};

/** Hanya daftar berisi yang layak masuk cache. */
export const layakDisimpan = (daftar: unknown): boolean =>
  Array.isArray(daftar) && daftar.length > 0;

/**
 * Lengkapi `nomor_rekening`/`atas_nama`/`status` dari rute staff.
 *
 * Endpoint customer adalah sumber utama (dan sekarang sudah mengirim ketiga
 * field itu). Rute staff hanya pelengkap untuk deployment lama; bila rute itu
 * gagal, daftar customer tetap utuh — jumlah metode TIDAK boleh berkurang.
 */
export const gabungInfoRekening = (
  metodeCustomer: MetodeMentah[],
  metodeStaff: MetodeMentah[]
): PaymentMethod[] => {
  const byId = new Map<string, MetodeMentah>();
  for (const m of Array.isArray(metodeStaff) ? metodeStaff : []) {
    if (m && m.id != null) byId.set(String(m.id), m);
  }

  return (Array.isArray(metodeCustomer) ? metodeCustomer : []).map((method) => {
    const full = method?.id != null ? byId.get(String(method.id)) : undefined;
    return {
      ...(method as PaymentMethod),
      nomor_rekening: method.nomor_rekening ?? full?.nomor_rekening ?? null,
      atas_nama: method.atas_nama ?? full?.atas_nama ?? null,
      status: method.status ?? full?.status,
    };
  });
};
