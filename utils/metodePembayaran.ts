/**
 * Bentuk seragam metode pembayaran untuk UI.
 *
 * Backend mengirim tiga bentuk berbeda untuk hal yang sama:
 * - `POST /api/customer/orders` / `GET /api/customer/orders` dulu: string
 *   nama metode ("DANA");
 * - `GET /api/customer/orders/{id}`: objek
 *   `{ id, nama, jenis, nomor_rekening, atas_nama }`;
 * - endpoint metode pembayaran: bentuk mentah tabel `metode_pembayaran`
 *   (`nama_metode`, `jenis_pembayaran`).
 *
 * Semua dirapikan di sini supaya layar tidak perlu menebak bentuk payload.
 * Modul ini sengaja bebas dependensi (tanpa React Native/expo) agar bisa diuji
 * langsung dengan `node --test`.
 */

export type MetodePembayaranRingkas = {
  id: number | null;
  nama: string;
  jenis: string | null;
  nomor_rekening: string | null;
  atas_nama: string | null;
  instruksi: string | null;
};

/** Metode bertipe transfer atau e-wallet — dua-duanya punya nomor tujuan. */
export const punyaNomorTujuan = (jenis?: string | null): boolean => {
  const j = (jenis ?? "").toLowerCase();
  return j === "transfer" || j === "ewallet";
};

export const normalisasiMetodePembayaran = (
  metode: unknown
): MetodePembayaranRingkas | null => {
  if (!metode) return null;

  if (typeof metode === "string") {
    const nama = metode.trim();
    return nama
      ? {
          id: null,
          nama,
          jenis: null,
          nomor_rekening: null,
          atas_nama: null,
          instruksi: null,
        }
      : null;
  }

  if (typeof metode !== "object") return null;

  const obj = metode as Record<string, unknown>;
  const teks = (kunci: string): string | null => {
    const nilai = obj[kunci];
    return typeof nilai === "string" && nilai.trim() !== "" ? nilai.trim() : null;
  };

  const nama = teks("nama") ?? teks("nama_metode");
  if (!nama) return null;

  const idMentah = obj.id;
  const id = typeof idMentah === "number" ? idMentah : Number(idMentah);

  return {
    id: idMentah != null && Number.isFinite(id) ? id : null,
    nama,
    jenis: teks("jenis") ?? teks("jenis_pembayaran"),
    nomor_rekening: teks("nomor_rekening"),
    atas_nama: teks("atas_nama"),
    instruksi: teks("instruksi"),
  };
};
