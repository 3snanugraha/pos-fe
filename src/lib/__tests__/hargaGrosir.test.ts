/**
 * Harga grosir: paritas aturan backend + bentuk data API.
 *
 * Jalankan: `node --test src/lib/__tests__/hargaGrosir.test.ts`
 *
 * Yang dijaga di sini BUKAN sekadar fungsi tampilan: aturan "tier mana yang
 * dipakai untuk qty X" harus sama dengan `App\Services\HargaService::pilihOtomatis`
 * di backend. Bila menyimpang, layar menampilkan harga ecer sementara server
 * menagih harga grosir (atau sebaliknya) — selisih baru terlihat di halaman
 * pembayaran.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  barisUntukVarian,
  hargaEfektif,
  labelGrosir,
  teksUpsell,
  tierDariRingkas,
  tierGrosirSaja,
  type GrosirTier,
} from "../hargaGrosir.ts";

const TIER: GrosirTier[] = [
  { nama_tier: "Ecer", harga: 15000, min_qty: 1, is_default: true },
  { nama_tier: "Grosir 1", harga: 13500, min_qty: 12, is_default: false },
  { nama_tier: "Grosir 2", harga: 11000, min_qty: 100, is_default: false },
];

test("qty di bawah ambang memakai harga ecer", () => {
  const hasil = hargaEfektif(TIER, 5, 15000);

  assert.equal(hasil.harga, 15000);
  assert.equal(hasil.namaTier, "Ecer");
  assert.equal(hasil.grosir, false);
  // Upsell menunjuk ambang TERDEKAT yang belum tercapai.
  assert.equal(hasil.berikut?.min_qty, 12);
  assert.equal(hasil.berikut?.harga, 13500);
});

test("qty mencapai ambang memakai tier grosir", () => {
  const hasil = hargaEfektif(TIER, 12, 15000);

  assert.equal(hasil.harga, 13500);
  assert.equal(hasil.namaTier, "Grosir 1");
  assert.equal(hasil.grosir, true);
  assert.equal(hasil.hargaEcer, 15000);
  assert.equal(hasil.berikut?.min_qty, 100, "Upsell lompat ke ambang berikutnya.");
});

test("ambang lebih besar menang walau harganya bukan termurah", () => {
  // Backend: tier otomatis = min_qty TERBESAR yang tercapai, bukan termurah.
  const tier: GrosirTier[] = [
    { nama_tier: "Ecer", harga: 15000, min_qty: 1, is_default: true },
    { nama_tier: "Promo 5", harga: 10000, min_qty: 5, is_default: false },
    { nama_tier: "Partai 50", harga: 12000, min_qty: 50, is_default: false },
  ];

  const hasil = hargaEfektif(tier, 60, 15000);

  assert.equal(hasil.namaTier, "Partai 50");
  assert.equal(hasil.harga, 12000);
});

test("qty besar memakai tier termahal ambangnya", () => {
  const hasil = hargaEfektif(TIER, 100, 15000);

  assert.equal(hasil.harga, 11000);
  assert.equal(hasil.namaTier, "Grosir 2");
  assert.equal(hasil.berikut, null, "Tidak ada ambang lebih tinggi lagi.");
});

test("produk tanpa tier tetap memakai harga ecer", () => {
  const hasil = hargaEfektif([], 50, 20000);

  assert.equal(hasil.harga, 20000);
  assert.equal(hasil.grosir, false);
  assert.equal(hasil.berikut, null);
});

test("tier default/min_qty 1 tidak dianggap grosir", () => {
  const tier: GrosirTier[] = [
    { nama_tier: "Ecer", harga: 15000, min_qty: 1, is_default: true },
    { nama_tier: "Grosir Salah", harga: 9000, min_qty: 1, is_default: false },
    { nama_tier: "Grosir 1", harga: 13500, min_qty: 12, is_default: false },
  ];

  assert.deepEqual(
    tierGrosirSaja(tier).map((t) => t.nama_tier),
    ["Grosir 1"],
    "min_qty 1 selalu berarti ecer, apa pun nama tier-nya.",
  );

  assert.equal(hargaEfektif(tier, 3, 15000).harga, 15000);
});

test("harga sebagai string desimal dari API tetap terbaca", () => {
  const tier = [
    { nama_tier: "Ecer", harga: "15000.00", min_qty: "1", is_default: true },
    { nama_tier: "Grosir 1", harga: "13500.00", min_qty: "12", is_default: false },
  ] as GrosirTier[];

  assert.equal(hargaEfektif(tier, 12, 15000).harga, 13500);
});

test("ringkasan grosir dari kartu produk menjadi tier tunggal", () => {
  const tier = tierDariRingkas({ min_qty: 12, harga: 13500, nama_tier: "Grosir 1" });

  assert.equal(tier.length, 1);
  assert.equal(tier[0].min_qty, 12);
  assert.equal(hargaEfektif(tier, 12, 15000).harga, 13500);
  assert.equal(hargaEfektif(tier, 3, 15000).harga, 15000);
});

test("ringkasan grosir kosong/tidak valid menghasilkan tanpa tier", () => {
  assert.deepEqual(tierDariRingkas(null), []);
  assert.deepEqual(tierDariRingkas({ min_qty: 1, harga: 15000 }), []);
  assert.deepEqual(tierDariRingkas({ min_qty: 12, harga: 0 }), []);
});

test("baris matriks dipilih per varian, satuan default didahulukan", () => {
  const matriks = [
    { varian_id: 1, satuan_id: 9, nama_satuan: "dus", faktor: 12, is_default_satuan: false, harga_ecer: 180000, tier: [] },
    { varian_id: 1, satuan_id: 3, nama_satuan: "pcs", faktor: 1, is_default_satuan: true, harga_ecer: 15000, tier: TIER },
    { varian_id: 2, satuan_id: 4, nama_satuan: "pcs", faktor: 1, is_default_satuan: true, harga_ecer: 20000, tier: [] },
  ];

  assert.equal(barisUntukVarian(matriks, 1)?.satuan_id, 3);
  assert.equal(barisUntukVarian(matriks, 2)?.harga_ecer, 20000);
  assert.equal(barisUntukVarian(matriks, 1, 9)?.nama_satuan, "dus");
  assert.equal(barisUntukVarian([], 1), null);
});

test("label kartu dan teks upsell memakai angka nyata", () => {
  const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  assert.equal(
    labelGrosir({ min_qty: 12, harga: 13500, nama_tier: "Grosir 1" }, rp),
    "Grosir 1 12+ · Rp 13.500",
  );
  assert.equal(labelGrosir(null, rp), null);

  assert.equal(
    teksUpsell({ min_qty: 12, harga: 13500, nama_tier: "Grosir 1" }, rp),
    "Beli 12+ jadi Rp 13.500 (Grosir 1)",
  );
  assert.equal(teksUpsell(null, rp), null);
});
