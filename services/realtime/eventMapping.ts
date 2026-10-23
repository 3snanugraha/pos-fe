/**
 * Pemetaan event realtime Pusher → model notifikasi aplikasi.
 *
 * Modul ini SENGAJA murni (tanpa React/React Native/pusher-js) supaya bisa
 * diuji dengan `node --test` tanpa bundler. Semua keputusan "event apa, harus
 * menyegarkan layar apa, apakah bunyi bell berbunyi" ada di sini — komponen
 * hanya mengeksekusi hasilnya.
 *
 * Kontrak backend (lihat App\Services\NotifikasiRealtime):
 * - `order.baru`      → channel privat tim (kasir/admin), saat order mobile masuk
 * - `order.status`    → channel privat pelanggan, saat status order berubah
 * - `notifikasi.baru` → channel sesuai target baris `notifikasi`
 * Semua payload membawa `tipe`, `judul`, `pesan`, `jenis`, `sound`, `dikirim_pada`.
 */

/** Nama event Pusher yang dikenali. */
export const EVENT_REALTIME = {
  orderBaru: "order.baru",
  orderStatus: "order.status",
  notifikasiBaru: "notifikasi.baru",
} as const;

export type NamaEventRealtime = (typeof EVENT_REALTIME)[keyof typeof EVENT_REALTIME];

export type RealtimeTarget = "kasir-order-baru" | "pelanggan-status" | "notifikasi-umum" | "tak-dikenal";

/** Notifikasi ternormalisasi yang siap dipakai UI. */
export interface NotifikasiRealtime {
  /** Id baris `notifikasi` bila ada; null untuk event yang tidak menyimpannya. */
  notifikasiId: number | null;
  /** Tipe domain (new_order, order_verified, order_rejected, ...). */
  tipe: string;
  judul: string;
  pesan: string;
  /** info | success | warning | danger — dipakai untuk warna ikon. */
  jenis: string;
  target: RealtimeTarget;
  channel: string;
  orderId: number | null;
  nomorTransaksi: string | null;
  /** Status order terbaru bila event membawanya. */
  statusOrder: string | null;
  /** True bila perangkat sebaiknya memutar bunyi bell. */
  bunyikanSuara: boolean;
  /** ISO timestamp pengiriman dari server. */
  waktu: string | null;
}

export interface HasilPemetaan {
  /** Null bila nama event tidak dikenal (event lain di channel yang sama). */
  notifikasi: NotifikasiRealtime | null;
  /** Layar yang datanya perlu dimuat ulang. */
  segarkan: Array<"kasir-orders" | "orders" | "notifikasi" | "badge">;
  /** Naikkan badge belum dibaca (selalu true untuk notifikasi yang valid). */
  tambahBelumDibaca: boolean;
}

/** Target dari nama event; channel hanya dipakai untuk event tak dikenal. */
export function targetDari(namaEvent: string, channel = ""): RealtimeTarget {
  switch (namaEvent) {
    case EVENT_REALTIME.orderBaru:
      return "kasir-order-baru";
    case EVENT_REALTIME.orderStatus:
      return "pelanggan-status";
    case EVENT_REALTIME.notifikasiBaru:
      return "notifikasi-umum";
    default:
      return channel.includes("customer.") ? "pelanggan-status" : "tak-dikenal";
  }
}

/** Channel privat pelanggan: `private-customer.{id}` (prefix `private-` milik Pusher). */
export function channelPelanggan(pelangganId: number): string {
  return `private-customer.${pelangganId}`;
}

/** Channel privat tim kasir/admin. */
export function channelTim(nama = "orders"): string {
  return `private-${nama}`;
}

/** True bila event termasuk yang harus diproses aplikasi. */
export function eventDikenal(namaEvent: string): namaEvent is NamaEventRealtime {
  return (Object.values(EVENT_REALTIME) as string[]).includes(namaEvent);
}

/**
 * Ubah payload mentah Pusher menjadi notifikasi ternormalisasi.
 *
 * Payload rusak/kosong tidak pernah melempar error: aplikasi tetap jalan dan
 * hanya menampilkan teks fallback.
 */
export function petakanEvent(namaEvent: string, payload: unknown, channel = ""): NotifikasiRealtime | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, any>;
  const target = targetDari(namaEvent, channel);

  if (target === "tak-dikenal") {
    return null;
  }

  const order = (data.order ?? {}) as Record<string, any>;

  return {
    notifikasiId: angkaAtauNull(data.notifikasi_id),
    tipe: teksAtau(data.tipe ?? data.referensi_tipe, namaEvent),
    judul: teksAtau(data.judul, "Notifikasi"),
    pesan: teksAtau(data.pesan, ""),
    jenis: teksAtau(data.jenis, "info"),
    target,
    channel,
    orderId: angkaAtauNull(order.id ?? data.referensi_id),
    nomorTransaksi: teksAtauNull(order.nomor_transaksi),
    statusOrder: teksAtauNull(order.status ?? data.status),
    // Default true: bunyi bell adalah inti fitur ini, dan server hanya
    // mengirim false bila admin mematikannya di pengaturan.
    bunyikanSuara: data.sound !== false,
    waktu: teksAtauNull(data.dikirim_pada),
  };
}

/** Rangkuman tindakan untuk satu event: notifikasi + layar yang perlu refresh. */
export function hasilDariEvent(namaEvent: string, payload: unknown, channel = ""): HasilPemetaan {
  const notifikasi = petakanEvent(namaEvent, payload, channel);

  if (!notifikasi) {
    return { notifikasi: null, segarkan: [], tambahBelumDibaca: false };
  }

  const segarkan: HasilPemetaan["segarkan"] = ["badge", "notifikasi"];

  if (notifikasi.target === "kasir-order-baru") {
    segarkan.unshift("kasir-orders");
  }

  if (notifikasi.target === "pelanggan-status") {
    // Status order berubah → daftar & detail pesanan pelanggan ikut basi.
    segarkan.unshift("orders");
  }

  return { notifikasi, segarkan, tambahBelumDibaca: true };
}

function teksAtau(nilai: unknown, fallback: string): string {
  return typeof nilai === "string" && nilai.trim() !== "" ? nilai : fallback;
}

function teksAtauNull(nilai: unknown): string | null {
  return typeof nilai === "string" && nilai.trim() !== "" ? nilai : null;
}

function angkaAtauNull(nilai: unknown): number | null {
  const angka = Number(nilai);
  return Number.isFinite(angka) && angka > 0 ? angka : null;
}
