import type { NotifikasiRealtime, RealtimeTarget } from "../../../services/realtime/eventMapping";

/**
 * Antrean toast notifikasi global — modul murni (tanpa React/RN) supaya bisa
 * diuji dengan `node --test`.
 *
 * Kenapa antrean, bukan satu toast?
 * Kasir bisa menerima dua order dalam hitungan detik. Satu toast yang langsung
 * ditimpa membuat pemberitahuan pertama tak pernah terbaca; antrean
 * menampilkan satu per satu dengan batas `MAKS_ANTREAN` agar layar tidak
 * dibanjiri. Toast yang sedang tampil selalu `daftar[0]` — sisanya menunggu.
 */

export interface ToastNotifikasi {
  /** Id unik naik (dipakai sebagai `key` & untuk menutup toast tertentu). */
  id: number;
  /** Judul ringkas, mis. "Order Baru: ORD-20261023-0001". */
  judul: string;
  /** Baris kedua opsional (pesan dari server). */
  pesan: string | null;
  /** Target rute saat toast diketuk. */
  target: RealtimeTarget;
  orderId: number | null;
  nomorTransaksi: string | null;
}

export interface KeadaanToast {
  daftar: ToastNotifikasi[];
  /** Nomor urut berikutnya; disimpan di state agar reducer tetap murni. */
  urut: number;
}

export const MAKS_ANTREAN = 3;

export const keadaanAwalToast: KeadaanToast = { daftar: [], urut: 0 };

export type AksiToast =
  | { jenis: "tampilkan"; notifikasi: NotifikasiRealtime }
  | { jenis: "tutup"; id: number }
  | { jenis: "tutupSemua" }
  | { jenis: "ganti"; daftar: ToastNotifikasi[] };

/**
 * Judul toast.
 *
 * Order baru memakai format yang diminta pemilik: `Order Baru: ORD-XXXX`.
 * Bila nomor transaksi tidak ada di payload, jatuh ke judul server supaya
 * toast tidak pernah kosong.
 */
export function judulToast(notifikasi: NotifikasiRealtime): string {
  if (notifikasi.target === "kasir-order-baru") {
    const nomor = notifikasi.nomorTransaksi;

    if (nomor) {
      return `Order Baru: ${nomor}`;
    }

    return notifikasi.judul || "Order Baru";
  }

  return notifikasi.judul || "Notifikasi baru";
}

/** Rute tujuan saat toast diketuk (null = tidak ada tujuan khusus). */
export function tujuanToast(
  toast: Pick<ToastNotifikasi, "target" | "orderId">
): { rute: string } | null {
  switch (toast.target) {
    case "kasir-order-baru":
      // Layar kasir berisi daftar order pending + aksi verifikasi.
      return { rute: "/kasir/orders" };
    case "pelanggan-status":
      return toast.orderId ? { rute: `/orders/${toast.orderId}` } : { rute: "/orders" };
    case "notifikasi-umum":
      return { rute: "/notifications" };
    default:
      return null;
  }
}

/** Ubah notifikasi realtime menjadi item toast. */
export function buatToast(notifikasi: NotifikasiRealtime, id: number): ToastNotifikasi {
  return {
    id,
    judul: judulToast(notifikasi),
    pesan: notifikasi.pesan?.trim() ? notifikasi.pesan : null,
    target: notifikasi.target,
    orderId: notifikasi.orderId,
    nomorTransaksi: notifikasi.nomorTransaksi,
  };
}

/**
 * Reducer murni: satu aksi masuk, keadaan baru keluar.
 *
 * Aturan:
 * - toast dengan judul + nomor transaksi sama tidak diduplikasi (event ganda
 *   dari server/reconnect tidak boleh menumpuk antrean);
 * - antrean dibatasi `MAKS_ANTREAN`; yang paling lama dibuang lebih dulu.
 */
export function reducerToast(keadaan: KeadaanToast, aksi: AksiToast): KeadaanToast {
  switch (aksi.jenis) {
    case "tampilkan": {
      const urut = keadaan.urut + 1;
      const baru = buatToast(aksi.notifikasi, urut);

      const duplikat = keadaan.daftar.some(
        (toast) =>
          toast.judul === baru.judul &&
          toast.nomorTransaksi === baru.nomorTransaksi &&
          toast.target === baru.target
      );

      if (duplikat) {
        return { ...keadaan, urut };
      }

      const daftar = [...keadaan.daftar, baru];

      return {
        daftar: daftar.slice(-MAKS_ANTREAN),
        urut,
      };
    }

    case "tutup":
      return { ...keadaan, daftar: keadaan.daftar.filter((toast) => toast.id !== aksi.id) };

    case "tutupSemua":
      return { ...keadaan, daftar: [] };

    case "ganti":
      return { ...keadaan, daftar: aksi.daftar.slice(-MAKS_ANTREAN) };

    default:
      return keadaan;
  }
}

/** Toast yang sedang tampil (null bila antrean kosong). */
export function toastAktif(keadaan: KeadaanToast): ToastNotifikasi | null {
  return keadaan.daftar[0] ?? null;
}

/** Jumlah toast yang menunggu di belakang toast aktif. */
export function jumlahMenunggu(keadaan: KeadaanToast): number {
  return Math.max(0, keadaan.daftar.length - 1);
}
