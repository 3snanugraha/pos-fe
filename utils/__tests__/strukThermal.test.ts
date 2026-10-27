/**
 * Regresi struk thermal untuk verifikasi order online (layar kasir).
 *
 * Yang dikunci:
 *  - struk 58 mm: setiap baris ≤ 32 kolom (printer font A tidak membungkus
 *    sendiri, teks lebih panjang terpotong di kertas);
 *  - nomor transaksi & TOTAL selalu utuh (tidak pernah jadi baris terpotong);
 *  - label item = "produk (varian) / satuan";
 *  - bukti verifikasi (oleh + waktu) tercetak;
 *  - HTML memakai aturan cetak 58 mm (`@page size: 58mm auto`) dan meng-escape
 *    isi pelanggan (catatan bisa berisi `<`/`>`);
 *  - ESC/POS menghasilkan byte dengan init + cut + QR.
 *
 * Jalankan: `node --test utils/__tests__/strukThermal.test.ts`
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  KOLOM_58,
  TEKS_CADANGAN_TOKO,
  bangunHtmlThermal,
  barisKiriKanan,
  bungkusTeks,
  labelItemThermal,
  rupiahThermal,
  susunBarisStruk,
  tanggalThermal,
  teksStruk,
  tulisEscPos,
  type DataStrukThermal,
} from "../strukThermal.ts";
// Encoder nyata dari kode produk — tes memakai jalur yang sama dengan produksi.
import { EscPosEncoder } from "../escpos.ts";

const dataDasar = (): DataStrukThermal => ({
  toko: {
    nama_toko: "Oman Jaya Abadi",
    alamat: "Jl. Merdeka No. 17, Bandung",
    telepon: "081234567890",
    footer: "Terima kasih sudah berbelanja",
  },
  order: {
    nomor_transaksi: "ORD-20261027-A7P3D8",
    tanggal_transaksi: "2026-10-27T13:05:00+07:00",
    pelanggan: { nama_pelanggan: "Budi Santoso", telepon: "081200001111" },
    metode_pembayaran: "Transfer Bank",
    status_pembayaran: "belum_bayar",
    alamat_pengiriman: "Jl. Sudirman 10, Bandung",
    catatan: "Titip di pos keamanan",
    subtotal: 350000,
    total_diskon: 25000,
    total_bayar: 325000,
    items: [
      {
        nama_produk: "Lemari Pakaian",
        nama_varian: "2 Pintu",
        satuan: "unit",
        jumlah: 1,
        harga: 300000,
        subtotal: 300000,
      },
      {
        nama_produk: "Kursi Tamu",
        nama_varian: null,
        satuan: "pcs",
        jumlah: 2,
        harga: 25000,
        subtotal: 50000,
      },
    ],
  },
  verifikasi: { oleh: "Siti Kasir", pada: "2026-10-27T13:10:00+07:00" },
});

test("setiap baris struk tidak melebihi 32 kolom", () => {
  const data = dataDasar();
  data.order.catatan =
    "Mohon dibungkus rapi dan dikirim setelah jam 16.00 karena toko tutup lebih awal hari ini";

  for (const baris of susunBarisStruk(data)) {
    assert.ok(
      baris.teks.length <= KOLOM_58,
      `baris > ${KOLOM_58} kolom (${baris.teks.length}): "${baris.teks}"`
    );
  }
});

test("nomor transaksi dan TOTAL tercetak utuh", () => {
  const teks = teksStruk(dataDasar());

  assert.ok(teks.includes("ORD-20261027-A7P3D8"), "nomor transaksi harus utuh");
  assert.ok(/TOTAL\s+Rp 325\.000/.test(teks), `baris TOTAL tidak ditemukan:\n${teks}`);
});

test("nomor transaksi punya barisnya sendiri (tidak didorong ke kanan)", () => {
  const baris = teksStruk(dataDasar()).split("\n");
  const indeks = baris.indexOf("ORD-20261027-A7P3D8");

  assert.ok(indeks > 0, "nomor transaksi harus jadi baris utuh");
  assert.equal(baris[indeks - 1], "No. Transaksi");
  // Tidak ada baris yang isinya hanya padding + nomor.
  assert.ok(
    !baris.some((b) => b.trim() === "ORD-20261027-A7P3D8" && b !== b.trim()),
    "nomor transaksi tidak boleh menjorok ke kanan"
  );
});

test("label item memuat produk, varian, dan satuan", () => {
  assert.equal(
    labelItemThermal({
      nama_produk: "Lemari Pakaian",
      nama_varian: "2 Pintu",
      satuan: "unit",
      jumlah: 1,
      harga: 1,
      subtotal: 1,
    }),
    "Lemari Pakaian (2 Pintu) / unit"
  );

  assert.equal(
    labelItemThermal({
      nama_produk: "Kursi",
      nama_varian: null,
      satuan: null,
      jumlah: 1,
      harga: 1,
      subtotal: 1,
    }),
    "Kursi"
  );
});

test("bukti verifikasi (oleh + waktu) tercetak", () => {
  const teks = teksStruk(dataDasar());

  assert.ok(teks.includes("PESANAN DIVERIFIKASI"));
  assert.ok(teks.includes("Oleh: Siti Kasir"));
  assert.ok(teks.includes("Pada: 27/10/2026 13:10"));
});

test("struk tanpa verifikasi tidak mencetak blok verifikasi", () => {
  const data = dataDasar();
  data.verifikasi = null;

  assert.ok(!teksStruk(data).includes("PESANAN DIVERIFIKASI"));
});

test("rupiah tanpa desimal dan tanggal dd/mm/yyyy hh:mm", () => {
  assert.equal(rupiahThermal(325000), "Rp 325.000");
  assert.equal(rupiahThermal(0), "Rp 0");
  assert.equal(tanggalThermal("2026-10-27T13:05:00+07:00"), "27/10/2026 13:05");
  // Tanggal rusak tidak boleh jadi "Invalid Date" di kertas.
  assert.equal(tanggalThermal("bukan-tanggal"), "bukan-tanggal");
});

test("barisKiriKanan merapatkan nilai ke kiri bila diminta", () => {
  const hasil = barisKiriKanan(
    "Label yang jauh lebih panjang dari lebar kertas struk",
    "ORD-20261027-A7P3D8",
    32,
    "kiri"
  );

  assert.equal(hasil[hasil.length - 1], "ORD-20261027-A7P3D8");
});

test("barisKiriKanan membungkus label panjang tanpa memotong nilai", () => {
  const hasil = barisKiriKanan(
    "Label yang jauh lebih panjang dari lebar kertas struk",
    "Rp 1.000.000"
  );

  assert.ok(hasil.length >= 2, "label panjang harus dibungkus");
  assert.equal(hasil[hasil.length - 1].trim(), "Rp 1.000.000");
  for (const baris of hasil) {
    assert.ok(baris.length <= KOLOM_58, `baris bocor: ${baris.length}`);
  }
});

test("bungkusTeks tidak memotong kata bila masih muat", () => {
  assert.deepEqual(bungkusTeks("Lemari Pakaian Kayu Jati Belanda", 20), [
    "Lemari Pakaian Kayu",
    "Jati Belanda",
  ]);
  assert.deepEqual(bungkusTeks("   ", 20), []);
});

test("nama toko kosong memakai teks cadangan, bukan string kosong", () => {
  const data = dataDasar();
  data.toko.nama_toko = "   ";

  assert.ok(teksStruk(data).includes(TEKS_CADANGAN_TOKO));
});

test("HTML memakai aturan cetak 58mm dan meng-escape isi pelanggan", () => {
  const data = dataDasar();
  data.order.catatan = "Tolong <b>jangan</b> dijejer & jangan dibanting";

  const html = bangunHtmlThermal(data);

  // `size: 58mm auto` TIDAK valid dan dibuang Chrome (struk jatuh ke A4).
  assert.ok(html.includes("@page { size: 58mm; margin: 0; }"), "@page harus 58mm");
  assert.ok(!html.includes("58mm auto"), "jangan pakai gabungan panjang + auto");
  assert.ok(html.includes("width: 48mm"), "badan struk harus 48mm");
  assert.ok(html.includes('id="receipt-thermal"'), "QA membaca #receipt-thermal");
  assert.ok(html.includes("&lt;b&gt;"), "tag dari catatan harus di-escape");
  assert.ok(!html.includes("<b>jangan</b>"), "isi pelanggan tidak boleh jadi HTML");
  assert.ok(html.includes("&amp;"));
});

test("ESC/POS memuat perintah init, QR nomor transaksi, dan cut", () => {
  const encoder = tulisEscPos(new EscPosEncoder(), dataDasar());
  const base64 = encoder.toBase64();
  const biner = Buffer.from(base64, "base64");

  // ESC @ (init)
  assert.equal(biner[0], 0x1b);
  assert.equal(biner[1], 0x40);
  // Potong kertas GS V B 0 di akhir payload.
  const ekor = biner.subarray(biner.length - 4);
  assert.deepEqual([...ekor], [0x1d, 0x56, 66, 0]);

  const teksPayload = biner.toString("latin1");
  assert.ok(teksPayload.includes("ORD-20261027-A7P3D8"), "nomor transaksi ada di payload");
  // Perintah store data QR (GS ( k ... 0x31 0x50 0x30).
  assert.ok(biner.includes(Buffer.from([0x1d, 0x28, 0x6b])), "perintah QR harus ada");
});
