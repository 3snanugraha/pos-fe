import { Platform, Share } from "react-native";
import { API_ORIGIN } from "../services/config";
import {
  pathProdukWeb,
  pesanBagikan,
  susunUrlProduk,
  tentukanOriginWeb,
} from "./tautanProduk";

/**
 * Bagikan tautan produk versi WEB (ecommerce).
 *
 * Kenapa tidak memakai URL halaman aplikasi apa adanya: aplikasi berjalan di
 * Android/iOS (skema `deadeastore://`) dan di web (http). Penerima tautan di
 * WhatsApp/chat tidak bisa membuka skema native, jadi tautan yang dibagikan
 * SELALU menunjuk ke build web ecommerce: `<origin-web>/product/<id>`.
 *
 * Penyusunan tautan ada di `utils/tautanProduk.ts` (bebas dependensi, diuji
 * `node --test`); modul ini hanya mengeksekusi share/copy sesuai platform.
 *
 * Origin web ditentukan berurutan:
 * 1. `EXPO_PUBLIC_WEB_URL` — dipakai bila web ecommerce dideploy di domain
 *    terpisah (mis. `https://toko.gudangperabot.my.id`). Metro meng-inline
 *    variabel ini saat bundling, jadi harus diakses statis.
 * 2. Bila sedang berjalan DI WEB: `window.location.origin` — tautan yang
 *    dibagikan selalu domain yang sedang dibuka pengguna.
 * 3. `API_ORIGIN` (origin backend tanpa `/api`) — pola deploy satu domain
 *    yang sudah dipakai repo ini (web + API same-origin di balik proxy).
 */

/** Origin web ecommerce yang dipakai untuk tautan bagikan. */
export const originWeb = (): string =>
  tentukanOriginWeb({
    envWebUrl: process.env.EXPO_PUBLIC_WEB_URL,
    originHalaman:
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location?.origin
        : null,
    originApi: API_ORIGIN,
  });

/** URL absolut produk versi web — mis. `https://gudangperabot.my.id/product/4501`. */
export const urlProdukWeb = (idProduk: number | string): string =>
  susunUrlProduk(originWeb(), idProduk);

export { pathProdukWeb, pesanBagikan };

export type HasilBagikan =
  | { mode: "share"; url: string }
  | { mode: "copy"; url: string }
  | { mode: "batal"; url: string }
  | { mode: "gagal"; url: string; message: string };

/**
 * Salin teks ke clipboard.
 *
 * `navigator.clipboard` hanya tersedia di secure context (https/localhost).
 * Bila tidak ada atau ditolak (izin), dipakai `document.execCommand("copy")`
 * lewat textarea sementara — jalur ini masih jalan di http dan browser lama.
 */
export async function salinTeks(teks: string): Promise<boolean> {
  if (Platform.OS !== "web" || typeof document === "undefined") return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
  } catch {
    /* jatuh ke execCommand di bawah */
  }

  try {
    const area = document.createElement("textarea");
    area.value = teks;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const berhasil = document.execCommand("copy");
    area.remove();
    return berhasil;
  } catch {
    return false;
  }
}

/**
 * Bagikan produk memakai Web Share API (web) atau share sheet native.
 *
 * - Web dengan `navigator.share` → dialog share bawaan sistem.
 * - Web tanpa Web Share API (atau share ditolak) → salin tautan, `mode: "copy"`
 *   supaya layar bisa memberi tahu "Tautan produk disalin".
 * - Native → `Share.share` (Android: sheet aplikasi; iOS: activity sheet).
 *   Pengguna menutup sheet → `mode: "batal"` (bukan error).
 */
export async function bagikanProduk(params: {
  idProduk: number | string;
  namaProduk: string;
}): Promise<HasilBagikan> {
  const url = urlProdukWeb(params.idProduk);
  const judul = params.namaProduk;
  const pesan = pesanBagikan(params.namaProduk, url);

  if (Platform.OS === "web") {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: judul, text: pesan, url });
        return { mode: "share", url };
      }
    } catch (error: any) {
      // Pengguna menutup dialog share → bukan kegagalan, jangan salin apa pun.
      if (error?.name === "AbortError") return { mode: "batal", url };
      // Selain itu (mis. NotAllowedError karena bukan gesture) → coba salin.
    }

    const tersalin = await salinTeks(url);
    if (tersalin) return { mode: "copy", url };
    return { mode: "gagal", url, message: "Clipboard tidak tersedia di browser ini." };
  }

  try {
    const hasil = await Share.share(
      { message: pesan, url, title: judul },
      { dialogTitle: judul, subject: judul }
    );
    if (hasil.action === Share.dismissedAction) return { mode: "batal", url };
    return { mode: "share", url };
  } catch (error: any) {
    return {
      mode: "gagal",
      url,
      message: error?.message ?? "Gagal membuka dialog bagikan.",
    };
  }
}
