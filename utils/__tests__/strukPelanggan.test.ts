/**
 * Regresi bug pemilik 2026-10-23 (struk pelanggan):
 *  - nama toko di kop HARUS dari backend (ProfilToko via /api/public/store-info),
 *    bukan hardcode "Toko Kami";
 *  - struk pelanggan berupa PDF/faktur ramah pelanggan, bukan ESC/POS;
 *  - baris item memuat varian + satuan;
 *  - tujuan pembayaran (rekening) hanya muncul bila BELUM lunas;
 *  - isi disanitasi (escape HTML).
 *
 * Jalankan: `node --test utils/__tests__/strukPelanggan.test.ts`
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  NAMA_TOKO_CADANGAN,
  bangunHtmlStruk,
  belumLunas,
  labelItem,
  rupiahStruk,
  type DataStrukPelanggan,
} from "../strukPelanggan.ts";

const dataDasar = (): DataStrukPelanggan => ({
  toko: {
    nama_toko: "Oman Jaya Abadi",
    alamat: "Jl. Merdeka No. 17, Bandung",
    telepon: "081234567890",
    email: "halo@omanjaya.test",
    logo_url: "https://contoh.test/logo.png",
  },
  order: {
    nomor_transaksi: "TRX-2026-0001",
    tanggal_transaksi: "2026-10-23T07:05:00+07:00",
    status: "selesai",
    status_pembayaran: "lunas",
    alamat_pengiriman: null,
    catatan: null,
    total_harga: 350000,
    total_diskon: 50000,
    total_bayar: 300000,
    metode_pembayaran: {
      nama: "Transfer BCA",
      jenis: "transfer",
      nomor_rekening: "777-888-999",
      atas_nama: "Oman Jaya",
    },
    items: [
      {
        nama_produk: "Lemari Pakaian",
        nama_varian: "2 Pintu",
        satuan: "unit",
        jumlah: 1,
        harga: 350000,
        subtotal: 350000,
      },
    ],
  },
});

test("kop memakai nama toko dari backend, bukan 'Toko Kami'", () => {
  const html = bangunHtmlStruk(dataDasar());

  assert.match(html, /Oman Jaya Abadi/);
  assert.doesNotMatch(html, /Toko Kami/);
  assert.match(html, /Jl\. Merdeka No\. 17/);
  assert.match(html, /Telp 081234567890/);
});

test("fallback 'Toko Kami' hanya bila nama toko kosong", () => {
  const data = dataDasar();
  data.toko = { nama_toko: "   ", alamat: "", telepon: "", logo_url: null };

  const html = bangunHtmlStruk(data);

  assert.match(html, new RegExp(NAMA_TOKO_CADANGAN));
  assert.equal(NAMA_TOKO_CADANGAN, "Toko Kami");
});

test("baris item memuat produk (varian) / satuan", () => {
  const html = bangunHtmlStruk(dataDasar());

  assert.match(html, /Lemari Pakaian \(2 Pintu\) \/ unit/);
});

test("rekening tujuan TIDAK muncul saat sudah lunas", () => {
  const html = bangunHtmlStruk(dataDasar());

  assert.doesNotMatch(html, /Tujuan Pembayaran/);
  assert.doesNotMatch(html, /777-888-999/);
});

test("rekening tujuan muncul saat belum lunas", () => {
  const data = dataDasar();
  data.order.status_pembayaran = "belum_bayar";

  const html = bangunHtmlStruk(data);

  assert.match(html, /Tujuan Pembayaran/);
  assert.match(html, /777-888-999/);
  assert.match(html, /a\.n\. Oman Jaya/);
});

test("rincian split pembayaran ikut tercetak", () => {
  const data = dataDasar();
  data.rincianSplit = "Tunai Rp 100.000; Transfer BCA Rp 200.000";

  const html = bangunHtmlStruk(data);

  assert.match(html, /Rincian pembayaran campuran/);
  assert.match(html, /Tunai Rp 100\.000/);
});

test("poin yang dipakai tercetak sebagai potongan", () => {
  const data = dataDasar();
  data.poinDigunakan = 5000;

  const html = bangunHtmlStruk(data);

  assert.match(html, /Poin digunakan/);
  assert.match(html, /- Rp 5\.000/);
});

test("uang tunai & kembalian tercetak di nota (300rb untuk belanja 275rb)", () => {
  const data = dataDasar();
  data.order.total_harga = 275000;
  data.order.total_diskon = 0;
  data.order.total_bayar = 275000;
  data.tunai = { diterima: 300000, kembalian: 25000 };

  const html = bangunHtmlStruk(data);

  assert.match(html, /Uang tunai diterima/);
  assert.match(html, /Rp 300\.000/);
  assert.match(html, /Kembalian/);
  assert.match(html, /Rp 25\.000/);
});

test("baris tunai TIDAK muncul bila tidak ada uang tunai", () => {
  const html = bangunHtmlStruk(dataDasar());

  assert.doesNotMatch(html, /Uang tunai diterima/);
  assert.doesNotMatch(html, /Kembalian/);
});

test("isi pelanggan di-escape (tidak ada HTML mentah)", () => {
  const data = dataDasar();
  data.order.catatan = "<script>alert(1)</script>";

  const html = bangunHtmlStruk(data);

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test("rupiah & label item", () => {
  assert.equal(rupiahStruk(300000), "Rp 300.000");
  assert.equal(labelItem({ nama_produk: "Kursi", jumlah: 1, harga: 1, subtotal: 1 }), "Kursi");
  assert.equal(
    labelItem({
      nama_produk: "Kursi",
      nama_varian: "Kayu",
      satuan: "pcs",
      jumlah: 1,
      harga: 1,
      subtotal: 1,
    }),
    "Kursi (Kayu) / pcs"
  );
});

test("belumLunas tidak salah menandai status lunas", () => {
  assert.equal(belumLunas("lunas"), false);
  assert.equal(belumLunas("PAID"), false);
  assert.equal(belumLunas("belum_bayar"), true);
  assert.equal(belumLunas(null), true);
});
