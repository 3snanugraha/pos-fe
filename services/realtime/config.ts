import type { NamaEventRealtime } from "./eventMapping";

/**
 * Kontrak konfigurasi realtime dari backend
 * (`GET /api/notification-config`).
 *
 * Backend TIDAK mengirim `secret` maupun `app_id`: hanya key + cluster yang
 * memang dibutuhkan `pusher.init()` di perangkat.
 */
export interface KonfigurasiRealtime {
  enabled: boolean;
  key: string | null;
  cluster: string;
  sound: boolean;
  channel: string;
}

/** True bila konfigurasi cukup untuk memulai koneksi Pusher. */
export function konfigurasiLengkap(konfig: KonfigurasiRealtime | null): konfig is KonfigurasiRealtime {
  return !!konfig && konfig.enabled === true && !!konfig.key && !!konfig.cluster;
}

/** Normalisasi respons backend yang mungkin membungkus data. */
export function normalisasiKonfigurasi(payload: unknown): KonfigurasiRealtime | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const bungkus = payload as Record<string, any>;
  const data = (bungkus.data ?? bungkus) as Record<string, any>;

  if (!data || typeof data !== "object" || typeof data.key !== "string" || data.key === "") {
    return null;
  }

  return {
    enabled: data.enabled === true,
    key: data.key,
    cluster: typeof data.cluster === "string" && data.cluster !== "" ? data.cluster : "ap1",
    sound: data.sound !== false,
    channel: typeof data.channel === "string" ? data.channel : "orders",
  };
}

/**
 * Nama channel Pusher lengkap untuk satu jenis akun.
 *
 * `channel` dari backend belum berprefix (mis. `customer.12` atau `orders`),
 * sedangkan channel privat di Pusher wajib berawalan `private-`.
 */
export function channelUntuk(konfig: KonfigurasiRealtime): string {
  const nama = konfig.channel === "" ? "orders" : konfig.channel;
  return nama.startsWith("private-") ? nama : `private-${nama}`;
}

/** Daftar event yang di-bind pada satu channel. */
export const EVENT_YANG_DIBIND: NamaEventRealtime[] = [
  "order.baru",
  "order.status",
  "notifikasi.baru",
];
