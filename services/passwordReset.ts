/**
 * Alur lupa password pelanggan (13.836 akun legacy tanpa password).
 *
 * Status backend per audit `pos-be/routes/api.php` (2026-10):
 * BELUM ADA endpoint `forgot-password` / verifikasi kode / reset password untuk
 * customer. Fungsi di bawah sudah memanggil kontrak yang diusulkan
 * (`/customer/forgot-password`, `/customer/verify-reset-code`,
 * `/customer/reset-password`) sehingga begitu backend menyediakannya, layar
 * langsung berfungsi tanpa perubahan UI.
 *
 * Sampai endpoint tersedia, panggilan menghasilkan `kode: "tidak_tersedia"`
 * (HTTP 404/405) atau `"jaringan"` dan layar menampilkan pesan yang jelas —
 * tidak ada tombol mati atau simulasi palsu.
 */
import { API_CONFIG } from "./config";

export type KodeHasil =
  | "berhasil"
  | "validasi"
  | "tidak_tersedia"
  | "jaringan"
  | "gagal";

export type HasilReset<T = undefined> = {
  ok: boolean;
  kode: KodeHasil;
  message?: string;
  /** Error per field dari backend (422): { email: ["..."] }. */
  errors?: Record<string, string[]>;
  data?: T;
};

type OpsiPermintaan = {
  path: string;
  body: Record<string, unknown>;
};

/**
 * Satu titik untuk semua panggilan reset password.
 * Backend Laravel mengirim BOM pada beberapa respons (lihat services/auth.ts),
 * jadi teks respons dibersihkan sebelum di-parse.
 */
async function minta<T = undefined>({ path, body }: OpsiPermintaan): Promise<HasilReset<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    // Endpoint belum terdaftar di backend → 404 / 405.
    if (response.status === 404 || response.status === 405 || response.status === 501) {
      return { ok: false, kode: "tidak_tersedia" };
    }

    const teksRespons = await response.text();
    const bersih = teksRespons.replace(/^\uFEFF/, "");
    let hasil: Record<string, unknown> = {};
    try {
      hasil = bersih ? JSON.parse(bersih) : {};
    } catch {
      hasil = {};
    }

    if (response.status === 422) {
      return {
        ok: false,
        kode: "validasi",
        message: (hasil.message as string) ?? undefined,
        errors: hasil.errors as Record<string, string[]> | undefined,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        kode: "gagal",
        message: (hasil.message as string) ?? undefined,
        errors: hasil.errors as Record<string, string[]> | undefined,
      };
    }

    if (hasil.success === false) {
      return {
        ok: false,
        kode: "gagal",
        message: (hasil.message as string) ?? undefined,
        errors: hasil.errors as Record<string, string[]> | undefined,
      };
    }

    return {
      ok: true,
      kode: "berhasil",
      message: (hasil.message as string) ?? undefined,
      data: hasil.data as T,
    };
  } catch {
    return { ok: false, kode: "jaringan" };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Minta kode verifikasi 4 digit ke email pelanggan.
 *
 * Kontrak yang diusulkan (POST `/customer/forgot-password`):
 * payload `{ email: string }` →
 * `200 { success: true, message: "Kode dikirim", data: { email: string, kedaluwarsa_detik: 900 } }`
 */
export function mintaKodeReset(email: string) {
  return minta<{ email?: string; kedaluwarsa_detik?: number }>({
    path: "/customer/forgot-password",
    body: { email },
  });
}

/**
 * Verifikasi kode 4 digit.
 *
 * Kontrak yang diusulkan (POST `/customer/verify-reset-code`):
 * payload `{ email: string, code: string }` →
 * `200 { success: true, data: { reset_token: string } }`
 * `422 { success: false, errors: { code: ["Kode salah"] } }`
 * `410 { success: false, message: "Kode kedaluwarsa" }`
 */
export function verifikasiKodeReset(email: string, code: string) {
  return minta<{ reset_token?: string }>({
    path: "/customer/verify-reset-code",
    body: { email, code },
  });
}

/**
 * Simpan password baru.
 *
 * Kontrak yang diusulkan (POST `/customer/reset-password`):
 * payload `{ email: string, reset_token: string, password: string,
 *            password_confirmation: string }` →
 * `200 { success: true, message: "Password berhasil diubah" }`
 */
export function simpanPasswordBaru(args: {
  email: string;
  resetToken: string;
  password: string;
  konfirmasi: string;
}) {
  return minta({
    path: "/customer/reset-password",
    body: {
      email: args.email,
      reset_token: args.resetToken,
      password: args.password,
      password_confirmation: args.konfirmasi,
    },
  });
}

/** True bila hasil menandakan endpoint belum ada di backend. */
export function belumTersedia(hasil: HasilReset<unknown>): boolean {
  return hasil.kode === "tidak_tersedia" || hasil.kode === "jaringan";
}
