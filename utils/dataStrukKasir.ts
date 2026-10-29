import type { DataStrukThermal } from "./strukThermal";

/**
 * Menyusun data struk thermal dari satu order layar kasir.
 *
 * Sumber data:
 *  - toko  → `GET /api/public/store-info` (ProfilToko, publik tanpa auth) —
 *    pengambilannya di `utils/cetakStrukThermal.ts` (`ambilTokoStruk`) supaya
 *    modul ini tetap bebas dependensi dan bisa diuji `node --test`.
 *    Kegagalan fetch TIDAK boleh menggagalkan verifikasi; kop struk jatuh ke
 *    `NAMA_TOKO_CADANGAN` dan kasir tetap mendapat struk.
 *  - order → kartu order di layar (detail transaksi yang sudah dimuat).
 */

export type TokoStrukSumber = {
  nama_toko?: string | null;
  alamat?: string | null;
  telepon?: string | null;
};

export type OrderStrukSumber = {
  nomor_transaksi: string;
  tanggal_transaksi: string;
  pelanggan?: { nama_pelanggan?: string | null; telepon?: string | null } | null;
  metode_pembayaran?: string | null;
  status_pembayaran?: string | null;
  alamat_pengiriman?: string | null;
  catatan?: string | null;
  /**
   * Kolom pembayaran dari transaksi (backend mengisinya sejak checkout &
   * verifikasi diperbaiki). Order lama masih 0 → struk membaca penanda
   * `[Tunai: …]` di `catatan` sebagai cadangan.
   */
  jumlah_dibayar?: number | string | null;
  kembalian?: number | string | null;
  total_harga?: number | null;
  subtotal?: number | null;
  total_diskon?: number | null;
  total_bayar: number;
  items: {
    nama_produk: string;
    nama_varian?: string | null;
    satuan?: string | null;
    jumlah: number;
    /** `harga` (bentuk ringkas) atau `harga_satuan` (baris detail backend). */
    harga?: number | string;
    harga_satuan?: number | string;
    subtotal: number | string;
  }[];
};

/**
 * Rakit `DataStrukThermal`. Nominal dari backend bisa berupa string desimal
 * ("32000.00") — semuanya dinormalkan ke number di sini supaya struk tidak
 * mencetak "Rp NaN".
 */
export function siapkanDataStruk(
  order: OrderStrukSumber,
  toko: TokoStrukSumber | null,
  verifikasi?: { oleh?: string | null; pada?: string | null } | null
): DataStrukThermal {
  const angka = (nilai: unknown): number => {
    const n = typeof nilai === "string" ? Number(nilai) : (nilai as number);
    return Number.isFinite(n) ? Number(n) : 0;
  };

  return {
    toko: {
      // Nama kosong sengaja diteruskan apa adanya: `susunBarisStruk` yang
      // menggantinya dengan `TEKS_CADANGAN_TOKO`, jadi fallback toko hanya ada
      // di satu tempat.
      nama_toko: (toko?.nama_toko ?? "").trim(),
      alamat: toko?.alamat ?? "",
      telepon: toko?.telepon ?? "",
      footer: "Terima kasih sudah berbelanja",
    },
    order: {
      nomor_transaksi: order.nomor_transaksi,
      tanggal_transaksi: order.tanggal_transaksi,
      pelanggan: order.pelanggan ?? null,
      metode_pembayaran: order.metode_pembayaran ?? null,
      status_pembayaran: order.status_pembayaran ?? null,
      alamat_pengiriman: order.alamat_pengiriman ?? null,
      catatan: order.catatan ?? null,
      /**
       * Diteruskan apa adanya: `susunBarisStruk` (`bacaPembayaran`) yang
       * memutuskan sumber angka — kolom dulu, penanda `[Tunai: …]` sebagai
       * cadangan data lama. Menyaring di sini berarti dua tempat memutuskan.
       */
      jumlah_dibayar: angka(order.jumlah_dibayar ?? 0),
      kembalian: angka(order.kembalian ?? 0),
      subtotal: angka(order.subtotal ?? order.total_harga ?? 0),
      total_diskon: angka(order.total_diskon ?? 0),
      total_bayar: angka(order.total_bayar),
      items: (order.items ?? []).map((item) => ({
        nama_produk: item.nama_produk,
        nama_varian: item.nama_varian ?? null,
        satuan: item.satuan ?? null,
        jumlah: Number(item.jumlah) || 0,
        harga: angka(item.harga_satuan ?? item.harga ?? 0),
        subtotal: angka(item.subtotal),
      })),
    },
    verifikasi: verifikasi ?? null,
  };
}
