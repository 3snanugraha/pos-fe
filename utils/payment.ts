import { API_CONFIG } from "../services/config";

/**
 * Helper seputar pembayaran.
 *
 * Aturan backend yang harus diikuti (lihat `TransaksiController@normalisasiPembayaran`
 * dan `CustomerOrderController@store`):
 * - Total semua `payments[].nominal` harus >= total tagihan.
 * - Kembalian hanya boleh berasal dari metode bertipe `tunai`.
 * - Poin: 1 poin = Rp 1, maksimal sebesar saldo pelanggan.
 */

export type PaymentJenis = string;

export const RUPIAH_PER_POIN = 1;

export const formatRupiah = (value: number | string | null | undefined): string => {
  const num = value === null || value === undefined ? 0 : Number(value);
  if (Number.isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
};

export const isTransfer = (jenis?: PaymentJenis | null): boolean =>
  (jenis ?? "").toLowerCase() === "transfer";

export const isTunai = (jenis?: PaymentJenis | null): boolean =>
  (jenis ?? "").toLowerCase() === "tunai";

export const JENIS_LABEL: Record<string, string> = {
  tunai: "Tunai",
  transfer: "Transfer Bank",
  kartu: "Kartu",
  ewallet: "E-Wallet",
  kredit: "Kredit / Tempo",
  cicilan: "Cicilan",
};

export const jenisLabel = (jenis?: PaymentJenis | null): string =>
  JENIS_LABEL[(jenis ?? "").toLowerCase()] ?? (jenis || "Lainnya");

// Normalisasi bentuk metode pembayaran dipisah ke modul bebas-dependensi
// (utils/metodePembayaran.ts) agar bisa diuji `node --test` tanpa React Native.
// Diekspor ulang di sini supaya layar cukup mengimpor dari satu tempat.
export {
  punyaNomorTujuan,
  normalisasiMetodePembayaran,
  type MetodePembayaranRingkas,
} from "./metodePembayaran";

// Instruksi pembayaran juga dipisah agar bebas dependensi & bisa diuji.
export { buildPaymentInstruction } from "./instruksiPembayaran";

/** Sisa tagihan setelah pembayaran campuran. */
export const hitungSisaPembayaran = (total: number, nominal: number[]): number =>
  Math.round(total - nominal.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0));

/**
 * Validasi split payment terhadap aturan backend.
 * Mengembalikan pesan error (string) atau null bila valid.
 */
export const validasiSplitPembayaran = (
  total: number,
  splits: { nominal: number; jenis_pembayaran?: PaymentJenis | null }[]
): string | null => {
  if (splits.length === 0) return "Pilih minimal satu metode pembayaran.";
  if (splits.some((s) => !s.nominal || s.nominal <= 0)) {
    return "Nominal setiap metode pembayaran harus lebih dari 0.";
  }

  const dibayar = splits.reduce((sum, s) => sum + s.nominal, 0);
  if (dibayar + 0.001 < total) {
    return `Total pembayaran kurang ${formatRupiah(total - dibayar)} dari tagihan.`;
  }

  const kembalian = dibayar - total;
  if (kembalian > 0) {
    const tunai = splits
      .filter((s) => isTunai(s.jenis_pembayaran))
      .reduce((sum, s) => sum + s.nominal, 0);
    if (tunai <= 0) return "Kembalian hanya bisa berasal dari pembayaran tunai.";
    if (kembalian > tunai + 0.001) {
      return "Nominal tunai tidak cukup untuk menutup kembalian.";
    }
  }

  return null;
};

/**
 * Rangkum split payment ke dalam `catatan` order.
 *
 * `POST /api/customer/orders` (CustomerOrderController@store) TIDAK menerima
 * `payments[]` — DetailPembayaran hanya ditulis oleh `TransaksiController@store`
 * (transaksi kasir). Jadi alokasi split disertakan di catatan agar kasir bisa
 * mencocokkan nominal per metode saat verifikasi.
 */
export const buildCatatanWithSplit = (
  catatan: string,
  splits: { nama_metode: string; nominal: number }[]
): string | undefined => {
  const trimmed = catatan.trim();
  if (splits.length <= 1) return trimmed || undefined;

  const rincian = splits
    .map((s) => `${s.nama_metode} ${formatRupiah(s.nominal)}`)
    .join("; ");

  const splitNote = `[Split: ${rincian}]`;
  return trimmed ? `${trimmed} ${splitNote}` : splitNote;
};

/** Ambil kembali rincian split dari catatan (dipakai layar detail order). */
export const parseSplitFromCatatan = (
  catatan?: string | null
): string | null => {
  if (!catatan) return null;
  const match = catatan.match(/\[Split:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
};

/** Buang anotasi `[Split: ...]` agar catatan pelanggan tetap bersih. */
export const stripSplitFromCatatan = (catatan?: string | null): string => {
  if (!catatan) return "";
  return catatan.replace(/\[Split:\s*[^\]]+\]/gi, "").trim();
};

/**
 * URL absolut untuk aset backend (`/storage/...`).
 * Env `EXPO_PUBLIC_API_URL` bila diisi bisa berisi origin + `/api`,
 * jadi prefix `/api` dibuang dulu.
 */
export const buildStorageUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_CONFIG.baseUrl.replace(/\/api$/, "");
  return `${origin}/${path.replace(/^\/+/, "")}`;
};
