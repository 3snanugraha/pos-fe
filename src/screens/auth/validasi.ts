/**
 * Validasi form auth — dipakai bersama oleh semua layar auth Zovora.
 * Aturan mengikuti backend (`CustomerAuthController`): password minimal 6 di
 * backend, UI mensyaratkan 8 (guideline §3.2 helper "Minimal 8 karakter").
 */
import { t, teks } from "../../lib/i18n";

/** Regex email ringkas — cukup untuk menangkap salah ketik umum. */
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validasiEmail(nilai: string, kosong = false): string | undefined {
  const bersih = nilai.trim();
  if (!bersih) return t("error.wajib", { field: teks.field.email });
  if (!POLA_EMAIL.test(bersih)) return teks.error.emailTidakValid;
  if (kosong) return undefined;
  return undefined;
}

export function validasiPassword(nilai: string): string | undefined {
  if (!nilai) return t("error.wajib", { field: teks.field.password });
  if (nilai.length < 8) return teks.error.passwordPendek;
  return undefined;
}

export function validasiKonfirmasi(
  konfirmasi: string,
  password: string,
): string | undefined {
  if (!konfirmasi) return t("error.wajib", { field: teks.field.konfirmasiPassword });
  if (konfirmasi !== password) return teks.error.passwordTidakCocok;
  return undefined;
}

export function validasiWajib(nilai: string, label: string): string | undefined {
  if (!nilai.trim()) return t("error.wajib", { field: label });
  return undefined;
}

/** Nomor telepon Indonesia: 08xx / +62xx, 9–15 digit. */
export function validasiTelepon(nilai: string): string | undefined {
  const digit = nilai.replace(/[^\d]/g, "");
  if (!digit) return t("error.wajib", { field: teks.field.telepon });
  if (!/^(0|62)\d{8,13}$/.test(digit)) return "Format nomor telepon tidak valid";
  return undefined;
}

/** Ambil pesan pertama untuk sebuah field dari `errors` backend. */
export function pesanField(
  errors: Record<string, string[]> | undefined,
  field: string,
): string | undefined {
  const daftar = errors?.[field];
  if (!daftar || daftar.length === 0) return undefined;
  return daftar[0];
}

/** Gabungkan error backend ke state per field. */
export function petakanError(
  errors: Record<string, string[]> | undefined,
  fields: string[],
): Record<string, string | undefined> {
  const hasil: Record<string, string | undefined> = {};
  for (const f of fields) hasil[f] = pesanField(errors, f);
  return hasil;
}
