/**
 * Regresi format bagian bawah struk thermal pesanan ONLINE (ORD-XXX).
 *
 * Keluhan pemilik: struk mencetak
 *
 *     Catatan: [Tunai: diterima Rp 100.000; kembali Rp. 33.000]
 *
 * — info pembayaran tumpah ke baris Catatan. Format yang diminta (mirip struk
 * kasir):
 *
 *     Subtotal : 100.000
 *     TOTAL    : 133.000
 *     Uang diterima  100.000
 *     Kembali         33.000
 *     ............................
 *     Catatan :
 *     <isi catatan bersih>
 *
 * Yang dikunci di sini:
 *  1. penanda `[Tunai: …]`/`[Split: …]` TIDAK pernah tercetak di baris Catatan;
 *  2. angkanya tetap tercetak (Uang diterima/Kembali) walau kolom DB masih 0
 *     (data lama) — parser menutup bug tanpa menyentuh DB;
 *  3. penanda bermakna `[Ditolak kasir …]`/`[Dibatalkan pelanggan]` TETAP
 *     tercetak di Catatan;
 *  4. label "Catatan :" berdiri sendiri, isi di baris berikutnya;
 *  5. order tanpa catatan tidak mencetak blok Catatan kosong.
 *
 * Jalankan: `node --test utils/__tests__/strukOrderCatatan.test.ts`
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  KOLOM_58,
  angkaPenanda,
  bacaPembayaran,
  bacaRincianSplit,
  bacaTunaiCatatan,
  catatanStrukBersih,
  bangunHtmlThermal,
  pecahRincianSplit,
  susunBarisStruk,
  teksStruk,
  type DataStrukThermal,
} from "../strukThermal.ts";
import { siapkanDataStruk, type OrderStrukSumber } from "../dataStrukKasir.ts";

/** Order hasil checkout dengan uang tunai (bentuk yang benar-benar tersimpan). */
const dataTunai = (): DataStrukThermal => ({
  toko: {
    nama_toko: "Oman Jaya Abadi",
    alamat: "Jl. Merdeka No. 17",
    telepon: "081234567890",
    footer: "Terima kasih sudah berbelanja",
  },
  order: {
    nomor_transaksi: "ORD-20261030-X1Y2Z3",
    tanggal_transaksi: "2026-10-30T10:15:00+07:00",
    pelanggan: { nama_pelanggan: "Budi", telepon: "081200001111" },
    metode_pembayaran: "Tunai",
    status_pembayaran: "lunas",
    alamat_pengiriman: null,
    // PERSIS bentuk data lama: jumlah_dibayar & kembalian masih 0.
    jumlah_dibayar: 0,
    kembalian: 0,
    catatan: "Antar sore ya [Tunai: diterima Rp 100.000; kembali Rp. 33.000]",
    subtotal: 67000,
    total_diskon: 0,
    total_bayar: 67000,
    items: [
      {
        nama_produk: "Kursi Lipat",
        nama_varian: null,
        satuan: "pcs",
        jumlah: 1,
        harga: 67000,
        subtotal: 67000,
      },
    ],
  },
});

const barisTeks = (data: DataStrukThermal): string[] => teksStruk(data).split("\n");

test("penanda [Tunai: …] tidak tercetak apa adanya di struk", () => {
  const teks = teksStruk(dataTunai());

  assert.ok(!teks.includes("[Tunai:"), `penanda tunai bocor ke struk:\n${teks}`);
  assert.ok(!/diterima Rp/i.test(teks), "kalimat penanda tidak boleh tercetak");
  assert.ok(!teks.includes("Catatan: ["), "Catatan tidak boleh memuat penanda mentah");
});

test("bagian bawah struk mengikuti format pesanan: Subtotal, TOTAL, garis, Catatan :", () => {
  const baris = barisTeks(dataTunai());

  const subtotal = baris.findIndex((b) => b.startsWith("Subtotal"));
  const total = baris.findIndex((b) => b.startsWith("TOTAL"));
  const label = baris.indexOf("Catatan :");

  assert.ok(subtotal > 0, `baris Subtotal tidak ada:\n${baris.join("\n")}`);
  assert.ok(total > subtotal, "TOTAL harus setelah Subtotal");
  assert.ok(label > total, "Catatan harus berada di bawah TOTAL");

  // Pemisah (garis) tepat sebelum label Catatan.
  assert.match(baris[label - 1], /^-{10,}$/, "harus ada garis sebelum Catatan :");

  // Isi catatan bersih ada di baris setelah label, tanpa penanda.
  assert.equal(baris[label + 1], "Antar sore ya");
});

test("uang tunai data lama (kolom 0) tetap tercetak sebagai baris pembayaran", () => {
  const baris = barisTeks(dataTunai());

  const diterima = baris.findIndex((b) => b.startsWith("Uang diterima"));
  const kembali = baris.findIndex((b) => b.startsWith("Kembali"));

  assert.ok(diterima > 0, `baris "Uang diterima" tidak ada:\n${baris.join("\n")}`);
  assert.ok(baris[diterima].endsWith("Rp 100.000"), `nominal diterima salah: "${baris[diterima]}"`);
  assert.ok(kembali > diterima, `baris "Kembali" harus di bawah Uang diterima:\n${baris.join("\n")}`);
  assert.ok(baris[kembali].endsWith("Rp 33.000"), `nominal kembali salah: "${baris[kembali]}"`);

  // Nominal memakai kolom kiri-kanan, BUKAN padStart satu blok: tidak ada baris
  // yang seluruhnya diisi spasi + angka.
  for (const b of [baris[diterima], baris[kembali]]) {
    assert.ok(!/^\s+\S/.test(b), `nominal tidak boleh didorong penuh ke kanan: "${b}"`);
    assert.ok(b.length <= KOLOM_58, `baris > ${KOLOM_58} kolom: "${b}"`);
  }
});

test("kolom pembayaran terisi menang atas penanda (sumber angka tunggal)", () => {
  const data = dataTunai();
  data.order.jumlah_dibayar = 150000;
  data.order.kembalian = 83000;

  const bayar = bacaPembayaran(data.order);

  assert.deepEqual(bayar.tunai, { diterima: 150000, kembalian: 83000 });
  assert.ok(!teksStruk(data).includes("Rp 100.000"), "angka penanda tidak boleh menimpa kolom");
});

test("catatan bermakna [Ditolak kasir …] tetap tercetak", () => {
  const data = dataTunai();
  data.order.catatan =
    "Antar sore ya [Tunai: diterima Rp 100.000; kembali Rp 33.000] [Ditolak kasir: stok habis pada 30/10/2026 11:00]";

  const baris = barisTeks(data);

  assert.ok(!teksStruk(data).includes("[Tunai:"), "penanda tunai tetap harus dibuang");
  assert.ok(
    baris.some((b) => b.includes("[Ditolak kasir")),
    `alasan penolakan WAJIB tercetak:\n${baris.join("\n")}`
  );
});

test("catatan bermakna [Dibatalkan pelanggan] tetap tercetak", () => {
  const data = dataTunai();
  data.order.catatan = "Tolong dibungkus rapi [Dibatalkan pelanggan]";

  const teks = teksStruk(data);
  assert.ok(teks.includes("[Dibatalkan pelanggan]"), `pembatalan pelanggan harus tercetak:\n${teks}`);
});

test("tanpa catatan → blok Catatan tidak tercetak sama sekali", () => {
  const data = dataTunai();
  data.order.catatan = null;

  const baris = barisTeks(data);
  assert.ok(!baris.some((b) => b.trim() === "Catatan :"), `blok Catatan kosong tercetak:\n${baris.join("\n")}`);
});

test("catatan hanya berisi penanda → tidak menyisakan blok Catatan kosong", () => {
  const data = dataTunai();
  data.order.catatan = "[Tunai: diterima Rp 100.000; kembali Rp 33.000]";

  const baris = barisTeks(data);
  assert.ok(!baris.some((b) => b.trim() === "Catatan :"), `label Catatan kosong tercetak:\n${baris.join("\n")}`);

  // Angka tunai tetap tampil walau catatannya kosong.
  assert.ok(baris.some((b) => b.startsWith("Uang diterima")));
});

test("rincian split dicetak per metode, bukan sebagai penanda mentah", () => {
  const data = dataTunai();
  data.order.jumlah_dibayar = 0;
  data.order.kembalian = 0;
  data.order.catatan =
    "Antar sore [Split: Tunai Rp 100.000; Transfer BCA Rp 75.000] [Tunai: diterima Rp 100.000; kembali Rp 25.000]";

  const baris = barisTeks(data);

  assert.ok(!teksStruk(data).includes("[Split:"), "penanda split tidak boleh tercetak");
  assert.ok(baris.some((b) => /^Tunai\s+.Rp 100\.000$/.test(b.trimEnd()) || b.includes("Rp 100.000")));
  assert.ok(
    baris.some((b) => b.includes("Transfer BCA") && b.includes("Rp 75.000")),
    `rincian split harus terurai:\n${baris.join("\n")}`
  );
});

test("semua baris tetap <= 32 kolom untuk catatan panjang + nominal", () => {
  const data = dataTunai();
  data.order.catatan =
    "Mohon dibungkus bubble wrap dan dikirim setelah jam 16.00 karena toko tutup lebih awal [Tunai: diterima Rp 1.000.000; kembali Rp 933.000]";
  data.order.jumlah_dibayar = 0;
  data.order.kembalian = 0;

  for (const b of barisTeks(data)) {
    assert.ok(b.length <= KOLOM_58, `baris > ${KOLOM_58} kolom (${b.length}): "${b}"`);
  }
});

test("HTML struk tidak memuat penanda mentah (jalur cetak web)", () => {
  const html = bangunHtmlThermal(dataTunai());

  assert.ok(!html.includes("[Tunai:"), "penanda tunai bocor ke HTML");
  assert.ok(html.includes("Catatan :"), "label Catatan harus ada di HTML");
  assert.ok(html.includes("Uang diterima"));
  assert.ok(html.includes("Kembali"));
});

test("parser: bacaTunaiCatatan toleran format rupiah & null", () => {
  assert.deepEqual(bacaTunaiCatatan("[Tunai: diterima Rp 100.000; kembali Rp. 33.000]"), {
    diterima: 100000,
    kembalian: 33000,
  });
  assert.deepEqual(bacaTunaiCatatan("[Tunai: diterima 100000]"), { diterima: 100000, kembalian: 0 });
  assert.equal(bacaTunaiCatatan("tanpa penanda"), null);
  assert.equal(bacaTunaiCatatan(null), null);
  assert.equal(bacaTunaiCatatan("[Tunai: diterima Rp 0; kembali Rp 0]"), null);
});

test("parser: catatanStrukBersih membuang penanda mesin saja", () => {
  assert.equal(
    catatanStrukBersih("Antar sore [Tunai: diterima Rp 100.000; kembali Rp 33.000]"),
    "Antar sore"
  );
  assert.equal(catatanStrukBersih("[Split: Tunai Rp 100.000; Transfer BCA Rp 5.000]"), "");
  // Penanda bermakna tidak boleh ikut terbuang.
  assert.equal(catatanStrukBersih("[Dibatalkan pelanggan]"), "[Dibatalkan pelanggan]");
  assert.equal(catatanStrukBersih("[Ditolak kasir: stok habis]"), "[Ditolak kasir: stok habis]");
});

test("parser: rincian split & pecahannya", () => {
  assert.equal(bacaRincianSplit("[Split: Tunai Rp 100.000; Transfer BCA Rp 5.000]"), "Tunai Rp 100.000; Transfer BCA Rp 5.000");
  assert.equal(bacaRincianSplit("tanpa penanda"), null);
  assert.deepEqual(pecahRincianSplit("Tunai Rp 100.000; Transfer BCA Rp 175.000"), [
    { kiri: "Tunai", kanan: "Rp 100.000" },
    { kiri: "Transfer BCA", kanan: "Rp 175.000" },
  ]);
  assert.deepEqual(pecahRincianSplit(""), []);
  assert.equal(angkaPenanda("Rp. 1.234.567"), 1234567);
});

test("siapkanDataStruk meneruskan kolom pembayaran & catatan apa adanya", () => {
  const sumber: OrderStrukSumber = {
    nomor_transaksi: "ORD-20261030-AAAAAA",
    tanggal_transaksi: "2026-10-30T09:00:00+07:00",
    catatan: "Antar sore [Tunai: diterima Rp 100.000; kembali Rp 33.000]",
    jumlah_dibayar: "100000.00",
    kembalian: "33000.00",
    total_bayar: 67000,
    items: [
      {
        nama_produk: "Kursi",
        jumlah: 1,
        harga: 67000,
        subtotal: 67000,
      },
    ],
  };

  const data = siapkanDataStruk(sumber, { nama_toko: "Oman Jaya" });

  // Normalisasi string desimal backend.
  assert.equal(data.order.jumlah_dibayar, 100000);
  assert.equal(data.order.kembalian, 33000);

  const bayar = bacaPembayaran(data.order);
  assert.equal(bayar.tunai?.diterima, 100000);
  assert.equal(bayar.catatan, "Antar sore");

  const baris = barisTeks(data);
  assert.ok(!teksStruk(data).includes("[Tunai:"));
  assert.equal(baris[baris.indexOf("Catatan :") + 1], "Antar sore");
});

test("urutan lengkap bagian bawah: Subtotal → TOTAL → pembayaran → garis → Catatan :", () => {
  const baris = barisTeks(dataTunai()).filter((b) => b.trim() !== "");

  const idxSubtotal = baris.findIndex((b) => b.startsWith("Subtotal"));
  const idxTotal = baris.findIndex((b) => b.startsWith("TOTAL"));
  const idxDiterima = baris.findIndex((b) => b.startsWith("Uang diterima"));
  const idxKembali = baris.findIndex((b) => b.startsWith("Kembali"));
  const idxGaris = baris.findIndex((b, i) => i > idxKembali && /^-{10,}$/.test(b));
  const idxCatatan = baris.indexOf("Catatan :");

  assert.ok(idxSubtotal < idxTotal, "Subtotal sebelum TOTAL");
  assert.ok(idxTotal < idxDiterima, "TOTAL sebelum baris pembayaran");
  assert.ok(idxDiterima < idxKembali, "Uang diterima sebelum Kembali");
  assert.ok(idxKembali < idxGaris, "garis setelah blok pembayaran");
  assert.equal(idxGaris + 1, idxCatatan, "Catatan : tepat setelah garis");
});
