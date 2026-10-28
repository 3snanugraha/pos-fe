/**
 * K1 — HARGA YANG TAMPIL = HARGA YANG DITAGIH (layar detail produk).
 *
 * Konteks keputusan pemilik 2026-10-28: di aplikasi pelanggan, halaman detail
 * produk menampilkan harga ECER (Rp 750.000) sementara checkout menagih harga
 * FLASH (Rp 720.000). Arah selisihnya menguntungkan pembeli, tetapi
 * "katalog ↔ detail ↔ keranjang ↔ checkout menyebut angka yang sama" adalah
 * aturan yang sudah dipenuhi di web — jadi detail aplikasi disamakan.
 *
 * Kontrak API detail (`GET /api/public/products/{id}` → `harga_jual_satuan`)
 * sekarang mengirim HARGA EFEKTIF:
 *   · `harga_ecer`        = harga yang ditagih untuk qty 1 (flash bila aktif);
 *   · `harga_ecer_normal` = harga master, acuan harga coret;
 *   · `flash`             = true bila promo aktif & lebih murah;
 *   · baris `tier` yang lebih mahal dari flash berganti label `Flash Sale`.
 *
 * Yang dijaga di sini: pembacaan kontrak itu di sisi aplikasi
 * (`hargaEfektifBaris`), termasuk fallback payload lama (APK terpasang yang
 * masih menerima matriks tanpa field baru).
 *
 * Jalankan: `node --test src/lib/__tests__/hargaEfektifBaris.test.ts`
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  hargaEfektif,
  hargaEfektifBaris,
  NAMA_TIER_FLASH,
  type BarisHargaSatuan,
} from "../hargaGrosir.ts";

/** Baris seperti yang sekarang dikirim endpoint detail saat flash aktif. */
const BARIS_FLASH: BarisHargaSatuan = {
  varian_id: 1,
  satuan_id: 3,
  nama_satuan: "pcs",
  faktor: 1,
  is_default_satuan: true,
  harga_ecer: 720000,
  harga_ecer_normal: 750000,
  flash: true,
  tier: [
    { nama_tier: NAMA_TIER_FLASH, harga: 720000, min_qty: 1, is_default: true },
    { nama_tier: "Grosir 1", harga: 700000, min_qty: 3, is_default: false },
    { nama_tier: "Grosir 2", harga: 650000, min_qty: 10, is_default: false },
  ],
};

/** Baris payload LAMA: `harga_ecer` masih harga master, tanpa field baru. */
const BARIS_LAMA: BarisHargaSatuan = {
  varian_id: 1,
  satuan_id: 3,
  nama_satuan: "pcs",
  faktor: 1,
  is_default_satuan: true,
  harga_ecer: 750000,
  tier: [
    { nama_tier: "Ecer", harga: 750000, min_qty: 1, is_default: true },
    { nama_tier: "Grosir 1", harga: 700000, min_qty: 3, is_default: false },
    { nama_tier: "Grosir 2", harga: 650000, min_qty: 10, is_default: false },
  ],
};

test("flash aktif: harga qty 1 di layar = harga yang ditagih (720.000)", () => {
  const hasil = hargaEfektifBaris(BARIS_FLASH, 1, 750000);

  assert.equal(hasil.harga, 720000, "harga tampil besar harus harga flash");
  assert.equal(hasil.hargaNormal, 750000, "harga master dipakai sebagai harga coret");
  assert.equal(hasil.flash, true);
  assert.equal(hasil.namaTier, NAMA_TIER_FLASH);
  assert.equal(hasil.grosir, false, "flash bukan tier grosir");
});

test("flash aktif: qty lewat ambang tetap memakai grosir yang lebih murah", () => {
  const hasil = hargaEfektifBaris(BARIS_FLASH, 3, 750000);

  assert.equal(hasil.harga, 700000, "grosir 700.000 < flash 720.000");
  assert.equal(hasil.namaTier, "Grosir 1");
  assert.equal(hasil.grosir, true);
  assert.equal(hasil.flash, false, "badge flash tidak boleh menutupi tier grosir");
  assert.equal(hasil.hargaNormal, 750000);
});

test("tanpa flash: harga & tier dibaca apa adanya, tidak ada badge karangan", () => {
  const hasil = hargaEfektifBaris(BARIS_LAMA, 1, 750000);

  assert.equal(hasil.harga, 750000);
  assert.equal(hasil.hargaNormal, 750000);
  assert.equal(hasil.flash, false);
  assert.equal(hargaEfektifBaris(BARIS_LAMA, 5, 750000).harga, 700000);
});

test("payload lama (APK terpasang) tetap benar: fallback harga_flash_sale", () => {
  // APK lama menerima matriks tanpa `harga_ecer_normal` & tanpa baris Flash.
  // Angka flash tetap bisa disimpulkan dari field produk, jadi layar tidak
  // kembali menampilkan 750.000.
  const hasil = hargaEfektifBaris(BARIS_LAMA, 1, 750000, 720000);

  assert.equal(hasil.harga, 720000, "fallback memakai harga flash dari field produk");
  assert.equal(hasil.hargaNormal, 750000);
  assert.equal(hasil.flash, true);
});

test("matriks tidak ada (produk legacy) memakai harga varian, tanpa karangan", () => {
  const hasil = hargaEfektifBaris(null, 1, 250000);

  assert.equal(hasil.harga, 250000);
  assert.equal(hasil.hargaNormal, 250000);
  assert.equal(hasil.flash, false);
  assert.equal(hasil.namaTier, "Ecer");
});

test("flash lebih mahal dari ecer master diabaikan", () => {
  // Data lengkap tapi harga flash di atas harga master = promo tidak masuk
  // akal. Layar memakai harga master, bukan menaikkan harga pembeli.
  const hasil = hargaEfektifBaris(BARIS_LAMA, 1, 750000, 900000);

  assert.equal(hasil.harga, 750000);
  assert.equal(hasil.flash, false);
  assert.equal(hasil.hargaNormal, 750000);
});

test("flash per satuan berfaktor mengikuti harga_ecer dari API", () => {
  const dus: BarisHargaSatuan = {
    varian_id: 1,
    satuan_id: 9,
    nama_satuan: "dus",
    faktor: 12,
    is_default_satuan: false,
    harga_ecer: 8640000,
    harga_ecer_normal: 9000000,
    flash: true,
    tier: [{ nama_tier: NAMA_TIER_FLASH, harga: 8640000, min_qty: 1, is_default: true }],
  };

  const hasil = hargaEfektifBaris(dus, 1, 9000000);

  assert.equal(hasil.harga, 8640000, "harga efektif dus = flash dasar × faktor");
  assert.equal(hasil.hargaNormal, 9000000);
});

test("hargaEfektif murni tetap kompatibel untuk keranjang", () => {
  // Keranjang memakai hargaEfektif() atas tier baris; ecer acuannya kini harga
  // efektif. Perilaku fungsi itu sendiri tidak berubah.
  const hasil = hargaEfektif(BARIS_FLASH.tier, 4, 720000);

  assert.equal(hasil.harga, 700000);
  assert.equal(hasil.namaTier, "Grosir 1");
});

test("keranjang melabeli harga promo sebagai Flash Sale, bukan Ecer", () => {
  // Tanpa label ini baris keranjang menulis "Ecer" di sebelah Rp 720.000
  // padahal harga ecer master Rp 750.000 — angka benar, keterangan menyesatkan.
  const qty1 = hargaEfektif(BARIS_FLASH.tier, 1, 720000);

  assert.equal(qty1.harga, 720000);
  assert.equal(qty1.namaTier, NAMA_TIER_FLASH, "label promo dipakai saat harganya memang harga flash");
  assert.equal(qty1.grosir, false);

  // Label hanya muncul bila backend benar-benar mengirim baris Flash Sale.
  const tanpaBarisFlash = hargaEfektif(
    [{ nama_tier: "Ecer", harga: 750000, min_qty: 1, is_default: true }],
    1,
    750000,
  );

  assert.equal(tanpaBarisFlash.namaTier, "Ecer", "tidak mengarang label promo dari harga saja");
});

test("keranjang memakai harga efektif saat qty naik melewati ambang", () => {
  // Perilaku CartContext.updateItemQuantity: qty 1 → 3 harus turun ke grosir
  // dan labelnya berganti, dengan acuan ecer tetap harga efektif.
  const qty3 = hargaEfektif(BARIS_FLASH.tier, 3, 720000);
  const qty2 = hargaEfektif(BARIS_FLASH.tier, 2, 720000);

  assert.equal(qty2.namaTier, NAMA_TIER_FLASH);
  assert.equal(qty2.harga, 720000);
  assert.equal(qty3.namaTier, "Grosir 1");
  assert.equal(qty3.harga, 700000);
});
