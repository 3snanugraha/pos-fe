import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG, API_ORIGIN, WEB_ENDPOINTS } from "./config";
import { PaymentPayload, Transaction } from "./types";

/**
 * Sesi staf (kasir/admin).
 *
 * Kenapa modul terpisah dari `apiService`?
 *
 * 1. Penerimaan order online (`POST /kasir/online-orders/{id}/verify|reject`)
 *    HANYA tersedia sebagai rute **web** (session + CSRF, lihat
 *    `routes/web.php`), bukan rute API. Bearer token tidak diterima
 *    (selalu 401), jadi verifikasi harus lewat sesi cookie + token CSRF.
 * 2. Token API staf (`POST /api/login`) berbeda dari token pelanggan
 *    (`auth_token`), sehingga disimpan di key terpisah agar tidak saling
 *    menimpa dan tidak ikut terhapus saat pelanggan logout.
 * 3. Split payment hanya diproses `POST /api/transactions`
 *    (`TransaksiController@store`) yang menyimpan `detail_pembayaran`;
 *    endpoint order pelanggan tidak menerima `payments[]`.
 */

const STAFF_TOKEN_KEY = "@staff_token";
const STAFF_USER_KEY = "@staff_user";

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export class StaffApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status = 0, errors?: Record<string, string[]>) {
    super(message);
    this.name = "StaffApiError";
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Dilempar bila rute web menolak sesi (cookie lintas-origin diblokir
 * browser karena SameSite, atau sesi kedaluwarsa / 419 CSRF).
 */
export class StaffSessionUnavailableError extends Error {
  /** True bila penyebabnya CORS/cookie lintas-origin (khas build web). */
  crossOrigin: boolean;

  constructor(
    message = "Verifikasi butuh sesi kasir di browser.",
    crossOrigin = false
  ) {
    super(message);
    this.name = "StaffSessionUnavailableError";
    this.crossOrigin = crossOrigin;
  }
}

/**
 * Rute verifikasi adalah rute **web** Laravel dengan middleware `web`
 * (cookie + CSRF). `config/cors.php` hanya mengizinkan path `api/*`, sehingga
 * fetch lintas origin (mis. app di :8099 → backend di :8124) selalu gagal
 * dengan "Failed to fetch".
 *
 * Di build APK/iOS tidak ada CORS, jadi jalur sesi tetap berfungsi. Untuk web,
 * kasir diarahkan membuka halaman kasir backend.
 */
export const isCrossOriginWeb = (): boolean => {
  if (typeof window === "undefined" || !window.location) return false;
  try {
    return new URL(API_ORIGIN).origin !== window.location.origin;
  } catch {
    return false;
  }
};

/** URL halaman kasir backend (tempat verifikasi/tolak bisa dilakukan). */
export const onlineOrdersPageUrl = (): string =>
  `${API_ORIGIN}${WEB_ENDPOINTS.onlineOrdersPage}`;

// ---------------------------------------------------------------------------
// API token staf (Bearer) — untuk daftar order & transaksi POS
// ---------------------------------------------------------------------------

export const getStaffToken = async (): Promise<string | null> =>
  AsyncStorage.getItem(STAFF_TOKEN_KEY);

export const getStaffUser = async (): Promise<StaffUser | null> => {
  const raw = await AsyncStorage.getItem(STAFF_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffUser;
  } catch {
    return null;
  }
};

export const clearStaffSession = async (): Promise<void> => {
  csrfToken = null;
  await AsyncStorage.multiRemove([STAFF_TOKEN_KEY, STAFF_USER_KEY]);
};

const staffRequest = async <T>(
  endpoint: string,
  init: RequestInit = {}
): Promise<T> => {
  const token = await getStaffToken();
  if (!token) {
    throw new StaffApiError("Login staf diperlukan.", 401);
  }

  const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text.replace(/^\uFEFF/, "")) : {};

  if (!response.ok) {
    throw new StaffApiError(
      data?.message ?? `Permintaan gagal (HTTP ${response.status})`,
      response.status,
      data?.errors
    );
  }

  return data as T;
};

/**
 * Login staf lewat API (`AuthController@login`).
 * Hanya role Admin / Super Admin yang diterima backend; akun kasir akan
 * mendapat 403 (gunakan halaman web kasir untuk role kasir).
 */
export const loginStaff = async (
  email: string,
  password: string
): Promise<StaffUser> => {
  const response = await fetch(`${API_CONFIG.baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password, device_name: "pos-mobile-app" }),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text.replace(/^\uFEFF/, "")) : {};

  if (!response.ok || !data?.success) {
    const firstError = data?.errors
      ? (Object.values(data.errors)[0] as string[] | undefined)?.[0]
      : undefined;
    throw new StaffApiError(
      firstError ?? data?.message ?? "Login staf gagal.",
      response.status,
      data?.errors
    );
  }

  const token: string = data.data.token;
  const user: StaffUser = data.data.user;

  await AsyncStorage.multiSet([
    [STAFF_TOKEN_KEY, token],
    [STAFF_USER_KEY, JSON.stringify(user)],
  ]);

  return user;
};

// ---------------------------------------------------------------------------
// Sesi web (cookie + CSRF) — untuk verify/reject order online
// ---------------------------------------------------------------------------

let csrfToken: string | null = null;

const extractLoginCsrf = (html: string): string | null => {
  const match = html.match(/name="_token"\s+value="([^"]+)"/);
  return match ? match[1] : null;
};

const extractMetaCsrf = (html: string): string | null => {
  const match = html.match(/name="csrf-token"\s+content="([^"]+)"/);
  return match ? match[1] : null;
};

/**
 * Token CSRF dari cookie `XSRF-TOKEN` (Laravel mengirim nilai ter-encrypt,
 * dan middleware `VerifyCsrfToken` menerima header `X-XSRF-TOKEN`).
 *
 * CATATAN: nilai ini TIDAK bisa dipakai sebagai field `_token` pada form login
 * (sudah terenkripsi → Laravel membalas 419). Pakai hanya untuk header
 * `X-XSRF-TOKEN`, atau lebih aman pakai `_token` dari HTML form login.
 */
const csrfFromCookie = (): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Pastikan ada sesi web kasir (cookie + CSRF) untuk verify/reject.
 *
 * Urutan strategi:
 * 1. Sudah ada sesi aktif (halaman kasir mengirim meta csrf) → pakai itu.
 * 2. Ambil `_token` dari HTML form login (`<input name="_token">`) lalu login.
 *    Ini satu-satunya token yang diterima middleware CSRF untuk POST form;
 *    cookie `XSRF-TOKEN` terenkripsi sehingga selalu 419 bila dipakai
 *    sebagai `_token`.
 * 3. Cadangan: meta csrf halaman login.
 */
export const loginStaffSession = async (
  email: string,
  password: string
): Promise<void> => {
  // 1. Coba manfaatkan sesi yang sudah ada.
  try {
    await refreshCsrfToken();
    return;
  } catch {
    // belum ada sesi — lanjut login.
  }

  // 2. Ambil token form dari halaman login.
  let formToken: string | null = null;
  try {
    const loginPage = await fetch(`${API_ORIGIN}/login`, {
      credentials: "include",
      headers: { Accept: "text/html" },
    });
    const html = await loginPage.text();
    formToken = extractLoginCsrf(html) ?? extractMetaCsrf(html);
  } catch {
    formToken = null;
  }

  const token = formToken ?? csrfFromCookie();
  if (!token) {
    throw new StaffSessionUnavailableError(
      "Token CSRF halaman login kasir tidak dapat dibaca.",
      isCrossOriginWeb()
    );
  }

  try {
    const body = new URLSearchParams({ _token: token, email, password });
    const loginResponse = await fetch(`${API_ORIGIN}/login`, {
      method: "POST",
      credentials: "include",
      redirect: "follow",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
      },
      body: body.toString(),
    });

    const afterLogin = await loginResponse.text();

    // Login gagal mengembalikan halaman form lagi (200).
    if (/name="password"/.test(afterLogin)) {
      throw new StaffSessionUnavailableError(
        "Email atau password kasir salah."
      );
    }

    if (loginResponse.status === 419) {
      throw new StaffSessionUnavailableError(
        "Token CSRF login kasir kedaluwarsa. Muat ulang halaman lalu coba lagi."
      );
    }

    await refreshCsrfToken();
  } catch (error) {
    if (error instanceof StaffSessionUnavailableError) throw error;
    throw new StaffSessionUnavailableError(
      "Tidak dapat membuka sesi web kasir pada origin ini.",
      isCrossOriginWeb()
    );
  }
};

/** Ambil ulang token CSRF dari halaman verifikasi order. */
export const refreshCsrfToken = async (): Promise<string> => {
  const page = await fetch(`${API_ORIGIN}${WEB_ENDPOINTS.onlineOrdersPage}`, {
    credentials: "include",
    headers: { Accept: "text/html" },
  });

  const html = await page.text();

  if (!page.ok) {
    throw new StaffSessionUnavailableError(
      `Halaman kasir menolak sesi (HTTP ${page.status}).`
    );
  }

  const token = extractMetaCsrf(html);
  if (!token) {
    throw new StaffSessionUnavailableError(
      "Token CSRF halaman kasir tidak ditemukan — sesi belum aktif."
    );
  }

  csrfToken = token;
  return token;
};

const postWebOrderAction = async (
  url: string,
  payload: Record<string, unknown> = {}
): Promise<{ success: boolean; message: string }> => {
  /**
   * `refreshCsrfToken()` melakukan fetch ke rute web Laravel. Di build web
   * lintas origin, fetch itu gagal dengan TypeError "Failed to fetch" —
   * sebelumnya error tersebut lolos ke UI sebagai pesan mentah karena
   * pemanggilannya di luar `try`. Bungkus di sini agar selalu diterjemahkan
   * menjadi StaffSessionUnavailableError yang informatif.
   */
  let token: string;
  try {
    token = csrfToken ?? (await refreshCsrfToken());
  } catch (error) {
    if (error instanceof StaffSessionUnavailableError) throw error;
    throw new StaffSessionUnavailableError(
      isCrossOriginWeb()
        ? "Backend memblokir permintaan lintas origin (CORS) untuk rute verifikasi web."
        : "Tidak dapat menghubungi backend untuk verifikasi.",
      isCrossOriginWeb()
    );
  }
  const cookieToken = csrfFromCookie();

  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}${url}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-TOKEN": token,
        ...(cookieToken ? { "X-XSRF-TOKEN": cookieToken } : {}),
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // TypeError "Failed to fetch" pada rute web lintas origin = CORS
    // (config/cors.php backend hanya mengizinkan path `api/*`).
    throw new StaffSessionUnavailableError(
      isCrossOriginWeb()
        ? "Backend memblokir permintaan lintas origin (CORS) untuk rute verifikasi web."
        : "Tidak dapat menghubungi backend untuk verifikasi.",
      isCrossOriginWeb()
    );
  }

  if (response.status === 401 || response.status === 419) {
    csrfToken = null;
    throw new StaffSessionUnavailableError(
      "Sesi kasir tidak valid atau kedaluwarsa (401/419)."
    );
  }

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text.replace(/^\uFEFF/, "")) : {};
  } catch {
    throw new StaffSessionUnavailableError(
      "Respons verifikasi bukan JSON — sesi kasir kemungkinan dialihkan ke halaman login."
    );
  }

  if (!response.ok) {
    throw new StaffApiError(
      data?.message ?? `Gagal (HTTP ${response.status})`,
      response.status
    );
  }

  return { success: !!data.success, message: data.message ?? "Berhasil" };
};

export const verifyOnlineOrder = (id: number) =>
  postWebOrderAction(WEB_ENDPOINTS.verifyOnlineOrder(id));

export const rejectOnlineOrder = (id: number, alasan: string) =>
  postWebOrderAction(WEB_ENDPOINTS.rejectOnlineOrder(id), { alasan });

// ---------------------------------------------------------------------------
// Data staf
// ---------------------------------------------------------------------------

interface PaginatedTransactions {
  success: boolean;
  data: Transaction[];
  meta?: { total: number; per_page: number; current_page: number; last_page: number };
}

/**
 * Order online yang masih menunggu verifikasi.
 *
 * `GET /api/transactions` mengembalikan seluruh transaksi berstatus pending;
 * order online dibedakan lewat `jenis_transaksi === 'online'`
 * (kolom ini ada di transform backend walau belum ada di tipe TS lama).
 */
export const fetchPendingOnlineOrders = async (): Promise<Transaction[]> => {
  const result = await staffRequest<PaginatedTransactions>(
    "/transactions?status=pending&per_page=50&sort_direction=desc"
  );

  const rows = Array.isArray(result.data) ? result.data : [];

  return rows.filter((trx: any) => {
    const jenis = (trx.jenis_transaksi ?? "").toLowerCase();
    const status = trx.status_transaksi ?? trx.status;
    return jenis === "online" && status === "pending";
  });
};

/** Detail order untuk keperluan verifikasi (termasuk item). */
export const fetchStaffOrderDetail = async (id: number) => {
  const result = await staffRequest<{ success: boolean; data: any }>(
    `/transactions/${id}`
  );
  return result.data;
};

export interface PosTransactionInput {
  pelanggan_id?: number | null;
  items: { produk_id: number; varian_id?: number; jumlah: number }[];
  payments: PaymentPayload[];
  catatan?: string;
}

/**
 * Buat transaksi POS dengan pembayaran campuran.
 * Backend menyimpan setiap baris `payments[]` ke `detail_pembayaran`.
 */
export const createPosTransaction = async (input: PosTransactionInput) => {
  const result = await staffRequest<{ success: boolean; data: any; message?: string }>(
    "/transactions",
    { method: "POST", body: JSON.stringify(input) }
  );
  return result.data;
};
