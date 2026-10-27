/**
 * Penyusun HTML struk/faktur PDF untuk PELANGGAN.
 *
 * Modul ini SENGAJA bebas dependensi (tanpa React Native/expo) supaya bisa
 * diuji `node --test`. Pemanggilan `expo-print` ada di
 * `utils/cetakStrukPelanggan.ts`.
 *
 * Kenapa PDF, bukan thermal: tombol "Cetak Struk" di aplikasi pelanggan dulu
 * memakai jalur ESC/POS (RawBT) dan di web hanya mengunduh `struk-*.bin`.
 * Pelanggan tidak punya printer thermal — hasilnya tombol terasa mati. Jalur
 * thermal TETAP ada (`utils/printReceipt.ts`) untuk kasir/admin di back-office;
 * modul ini hanya untuk pelanggan.
 *
 * Kop toko diambil dari `GET /api/public/store-info` (ProfilToko). Fallback
 * 'Toko Kami' HANYA dipakai bila fetch gagal — bukan nilai default.
 */

export type TokoStruk = {
  nama_toko: string;
  alamat: string;
  telepon: string;
  email?: string | null;
  website?: string | null;
  npwp?: string | null;
  logo_url?: string | null;
};

export type ItemStruk = {
  nama_produk: string;
  nama_varian?: string | null;
  /** Satuan jual ("pcs", "box") bila backend mengirimkannya. */
  satuan?: string | null;
  jumlah: number;
  harga: number;
  subtotal: number;
};

export type DataStrukPelanggan = {
  toko: TokoStruk;
  order: {
    nomor_transaksi: string;
    tanggal_transaksi: string;
    status: string;
    status_pembayaran?: string | null;
    alamat_pengiriman?: string | null;
    catatan?: string | null;
    total_harga: number;
    total_diskon: number;
    total_bayar: number;
    metode_pembayaran?: {
      nama: string;
      jenis?: string | null;
      nomor_rekening?: string | null;
      atas_nama?: string | null;
    } | null;
    items: ItemStruk[];
  };
  /** Rincian split payment hasil `parseSplitFromCatatan` (teks mentah). */
  rincianSplit?: string | null;
  /** Poin yang dipakai, bila diketahui terpisah dari `total_diskon`. */
  poinDigunakan?: number;
  /**
   * Uang tunai pelanggan. Diisi dari `parseTunaiCatatan(order.catatan)` —
   * order online belum menerima uang, jadi angka ini kesepakatan bayar tunai
   * di tempat; kembalian dicetak supaya pelanggan & kasir memakai angka sama.
   */
  tunai?: { diterima: number; kembalian: number } | null;
};

/** Nama toko cadangan — HANYA bila fetch store-info gagal. */
export const NAMA_TOKO_CADANGAN = "Toko Kami";

export const escapeHtml = (nilai: string): string =>
  nilai
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Rp 1.234.567 — tanpa spasi non-breaking agar aman di PDF. */
export const rupiahStruk = (nilai: number): string => {
  const angka = Number.isFinite(nilai) ? Math.round(nilai) : 0;
  return `Rp ${angka.toLocaleString("id-ID")}`;
};

/** 23/10/2026 14:05 — locale id-ID, jatuh ke ISO bila tanggal tidak valid. */
export const tanggalStruk = (iso: string): string => {
  const tanggal = new Date(iso);
  if (Number.isNaN(tanggal.getTime())) return iso || "-";
  return tanggal.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Satu baris item: "Nama Produk (Varian) / pcs". */
export const labelItem = (item: ItemStruk): string => {
  const varian = item.nama_varian ? ` (${item.nama_varian})` : "";
  const satuan = item.satuan ? ` / ${item.satuan}` : "";
  return `${item.nama_produk}${varian}${satuan}`;
};

/** Order dianggap belum lunas bila status pembayaran belum "lunas"/"paid". */
export const belumLunas = (statusPembayaran?: string | null): boolean => {
  const status = (statusPembayaran ?? "").toLowerCase();
  return status !== "lunas" && status !== "paid" && status !== "settled";
};

/**
 * HTML struk pelanggan — satu halaman A4 portrait, tipografi 11–12 pt,
 * margin 16 mm. Semua teks di-escape; gambar logo hanya dirender bila URL ada.
 */
export function bangunHtmlStruk(data: DataStrukPelanggan): string {
  const { toko, order } = data;
  const namaToko = (toko?.nama_toko ?? "").trim() || NAMA_TOKO_CADANGAN;
  const kontak = [toko?.telepon ? `Telp ${toko.telepon}` : "", toko?.email ?? ""]
    .filter((bagian) => bagian.trim() !== "")
    .join(" · ");

  const barisItem = order.items
    .map((item) => {
      // Bentuk label sesuai permintaan pemilik: "produk (varian) / satuan".
      const label = labelItem(item);
      return `<tr>
        <td class="nama">${escapeHtml(label)}</td>
        <td class="kanan">${item.jumlah}</td>
        <td class="kanan">${rupiahStruk(Number(item.harga) || 0)}</td>
        <td class="kanan">${rupiahStruk(Number(item.subtotal) || 0)}</td>
      </tr>`;
    })
    .join("");

  const split =
    data.rincianSplit && data.rincianSplit.trim() !== ""
      ? `<div class="baris"><span>Rincian pembayaran campuran</span><span>${escapeHtml(
          data.rincianSplit
        )}</span></div>`
      : "";

  const poin =
    data.poinDigunakan && data.poinDigunakan > 0
      ? `<div class="baris"><span>Poin digunakan</span><span>- ${rupiahStruk(
          data.poinDigunakan
        )}</span></div>`
      : "";

  /**
   * Baris uang tunai & kembalian di nota. Pelanggan yang bayar 300rb untuk
   * belanja 275rb harus melihat "Kembalian Rp 25.000" di struknya.
   */
  const tunaiDiterima = Number(data.tunai?.diterima) || 0;
  const tunaiKembalian = Math.max(0, Number(data.tunai?.kembalian) || 0);
  const tunai =
    tunaiDiterima > 0
      ? `<div class="baris"><span>Uang tunai diterima</span><span>${rupiahStruk(
          tunaiDiterima
        )}</span></div><div class="baris kuat"><span>Kembalian</span><span>${rupiahStruk(
          tunaiKembalian
        )}</span></div>`
      : "";

  const belum = belumLunas(order.status_pembayaran);
  const metode = order.metode_pembayaran;
  const rekening =
    belum && metode && (metode.nomor_rekening || metode.nama)
      ? `<section class="kotak">
          <h3>Tujuan Pembayaran</h3>
          <p class="kuat">${escapeHtml(metode.nama ?? "")}</p>
          ${
            metode.nomor_rekening
              ? `<p>No. Rekening <span class="kuat">${escapeHtml(
                  metode.nomor_rekening
                )}</span>${
                  metode.atas_nama ? ` a.n. ${escapeHtml(metode.atas_nama)}` : ""
                }</p>`
              : `<p>Silakan hubungi kasir untuk detail rekening tujuan.</p>`
          }
          <p class="muted">Cantumkan nomor transaksi pada berita transfer, lalu kirim bukti ke kasir.</p>
        </section>`
      : "";

  const alamat = order.alamat_pengiriman
    ? `<section class="kotak">
        <h3>Alamat Pengiriman</h3>
        <p>${escapeHtml(order.alamat_pengiriman)}</p>
      </section>`
    : "";

  const catatan = order.catatan
    ? `<section class="kotak">
        <h3>Catatan</h3>
        <p>${escapeHtml(order.catatan)}</p>
      </section>`
    : "";

  const logo = toko?.logo_url
    ? `<img class="logo" src="${escapeHtml(toko.logo_url)}" alt="Logo ${escapeHtml(
        namaToko
      )}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Struk ${escapeHtml(order.nomor_transaksi)} — ${escapeHtml(namaToko)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    color: #111827;
    line-height: 1.5;
  }
  header { display: flex; gap: 12px; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 10px; }
  .logo { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; }
  .identitas { flex: 1; }
  .identitas h1 { font-size: 17px; margin: 0 0 2px; letter-spacing: .2px; }
  .identitas p { margin: 0; color: #4b5563; font-size: 11px; }
  .dokumen { text-align: right; }
  .dokumen .judul { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .dokumen .nomor { font-size: 13px; font-weight: 700; margin-top: 2px; }
  .dokumen .tanggal { color: #4b5563; font-size: 11px; }
  .status { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 999px; border: 1px solid #d1d5db; font-size: 10px; text-transform: uppercase; letter-spacing: .6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  thead th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .6px; color: #6b7280; border-bottom: 1px solid #d1d5db; padding: 6px 4px; }
  tbody td { padding: 8px 4px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  .kanan { text-align: right; white-space: nowrap; }
  .nama { font-weight: 600; }
  .varian { color: #6b7280; font-size: 11px; }
  .ringkasan { margin-top: 12px; margin-left: auto; width: 58%; }
  .baris { display: flex; justify-content: space-between; padding: 3px 0; }
  .baris.total { border-top: 2px solid #111827; margin-top: 6px; padding-top: 6px; font-size: 14px; font-weight: 700; }
  .kotak { margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
  .kotak h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: #374151; }
  .kotak p { margin: 2px 0; }
  .kuat { font-weight: 700; }
  .muted { color: #6b7280; font-size: 11px; }
  footer { margin-top: 18px; padding-top: 10px; border-top: 1px dashed #d1d5db; text-align: center; color: #6b7280; font-size: 11px; }
</style>
</head>
<body>
  <header>
    ${logo}
    <div class="identitas">
      <h1>${escapeHtml(namaToko)}</h1>
      ${toko?.alamat ? `<p>${escapeHtml(toko.alamat)}</p>` : ""}
      ${kontak ? `<p>${escapeHtml(kontak)}</p>` : ""}
    </div>
    <div class="dokumen">
      <div class="judul">Struk Pembelian</div>
      <div class="nomor">${escapeHtml(order.nomor_transaksi || "-")}</div>
      <div class="tanggal">${escapeHtml(tanggalStruk(order.tanggal_transaksi))}</div>
      <div class="status">${escapeHtml(order.status || "-")}</div>
    </div>
  </header>

  <table>
    <thead>
      <tr>
        <th>Produk</th>
        <th class="kanan">Qty</th>
        <th class="kanan">Harga</th>
        <th class="kanan">Jumlah</th>
      </tr>
    </thead>
    <tbody>${barisItem}</tbody>
  </table>

  <div class="ringkasan">
    <div class="baris"><span>Subtotal</span><span>${rupiahStruk(
      Number(order.total_harga) || 0
    )}</span></div>
    ${
      Number(order.total_diskon) > 0
        ? `<div class="baris"><span>Diskon (promo + poin)</span><span>- ${rupiahStruk(
            Number(order.total_diskon)
          )}</span></div>`
        : ""
    }
    ${poin}
    ${split}
    <div class="baris"><span>Metode</span><span>${escapeHtml(
      metode?.nama ?? "-"
    )}</span></div>
    <div class="baris total"><span>Total</span><span>${rupiahStruk(
      Number(order.total_bayar) || 0
    )}</span></div>
    ${tunai}
    ${
      order.status_pembayaran
        ? `<div class="baris muted"><span>Status pembayaran</span><span>${escapeHtml(
            order.status_pembayaran.replace(/_/g, " ")
          )}</span></div>`
        : ""
    }
  </div>

  ${rekening}
  ${alamat}
  ${catatan}

  <footer>
    Struk ini dibuat otomatis oleh aplikasi. Simpan sebagai bukti pembelian yang sah.
  </footer>
</body>
</html>`;
}
