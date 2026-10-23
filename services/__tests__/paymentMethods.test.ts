/**
 * Regresi bug "metode pembayaran admin tidak muncul di aplikasi Android".
 *
 * Jalankan: `node --test services/__tests__/paymentMethods.test.ts`
 *
 * Kasus yang dikunci:
 * - cache berisi `[]` harus dianggap MISS (bug aslinya: `getOrSet` menganggap
 *   `[]` sebagai hit, jadi daftar kosong bertahan sampai TTL 2 jam);
 * - hasil kosong tidak boleh disimpan;
 * - rute staff yang gagal TIDAK boleh mengurangi jumlah metode dari endpoint
 *   customer (dulu `getOrSet` menyimpan hasil gabungan yang bisa kosong);
 * - `nomor_rekening`/`atas_nama` dari endpoint customer dipakai apa adanya
 *   (sejak backend mengirimnya), dengan rute staff hanya sebagai fallback.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dariCache,
  gabungInfoRekening,
  layakDisimpan,
  normalisasiDaftar,
} from "../paymentMethods.ts";
import type { PaymentMethod } from "../types.ts";

const METODE_PROD: PaymentMethod[] = [
  {
    id: 1,
    nama_metode: "Tunai",
    jenis_pembayaran: "tunai",
    biaya_admin: 0,
    persentase_biaya: 0,
    nomor_rekening: null,
    atas_nama: null,
    status: "aktif",
  },
  {
    id: 4,
    nama_metode: "Transfer Bank",
    jenis_pembayaran: "transfer",
    biaya_admin: 0,
    persentase_biaya: 0,
    nomor_rekening: "123456789010",
    atas_nama: "BRI A/N Dea Dea Store",
    status: "aktif",
  },
  {
    id: 6,
    nama_metode: "GoPay",
    jenis_pembayaran: "ewallet",
    biaya_admin: 0,
    persentase_biaya: 0,
    nomor_rekening: "082130130955",
    atas_nama: "Dea Dea Store",
    status: "aktif",
  },
];

test("cache kosong dianggap MISS, bukan hit", () => {
  // Inti bug: `[]` dulu dikembalikan sebagai data valid sehingga layar kosong
  // permanen sampai TTL habis.
  assert.equal(dariCache([]), null);
});

test("cache berisi metode dipakai apa adanya", () => {
  const hasil = dariCache(METODE_PROD);
  assert.notEqual(hasil, null);
  assert.equal(hasil.length, 3);
  assert.equal(hasil[1].nama_metode, "Transfer Bank");
});

test("cache rusak / bukan array dianggap MISS", () => {
  assert.equal(dariCache(null), null);
  assert.equal(dariCache(undefined), null);
  assert.equal(dariCache({}), null);
  assert.equal(dariCache({ data: METODE_PROD }), null);
  assert.equal(dariCache("[]"), null);
});

test("daftar kosong tidak layak disimpan ke cache", () => {
  assert.equal(layakDisimpan([]), false);
  assert.equal(layakDisimpan(null), false);
  assert.equal(layakDisimpan({ data: METODE_PROD }), false);
  assert.equal(layakDisimpan(METODE_PROD), true);
});

test("payload bukan array dinormalkan jadi daftar kosong (tidak crash)", () => {
  assert.deepEqual(normalisasiDaftar(null), []);
  assert.deepEqual(normalisasiDaftar({ success: false }), []);
  assert.equal(normalisasiDaftar(METODE_PROD).length, 3);
});

test("rute staff gagal tidak mengurangi metode dari endpoint customer", () => {
  // Skenario nyata: token pelanggan ditolak rute staff, atau rute dihapus.
  const hasil = gabungInfoRekening(METODE_PROD, []);
  assert.equal(hasil.length, 3, "jumlah metode tidak boleh berkurang");
  assert.deepEqual(
    hasil.map((m) => m.nama_metode),
    ["Tunai", "Transfer Bank", "GoPay"]
  );
});

test("nomor rekening dari endpoint customer dipertahankan", () => {
  const hasil = gabungInfoRekening(METODE_PROD, []);
  const transfer = hasil.find((m) => m.jenis_pembayaran === "transfer");
  assert.equal(transfer?.nomor_rekening, "123456789010");
  assert.equal(transfer?.atas_nama, "BRI A/N Dea Dea Store");
});

test("rute staff tetap dipakai sebagai fallback untuk API lama", () => {
  // Deployment lama: endpoint customer belum mengirim nomor_rekening.
  const customerLama = METODE_PROD.map((m) => ({
    ...m,
    nomor_rekening: undefined,
    atas_nama: undefined,
  }));

  const hasil = gabungInfoRekening(customerLama, METODE_PROD);
  const transfer = hasil.find((m) => m.id === 4);
  assert.equal(transfer?.nomor_rekening, "123456789010");
  assert.equal(transfer?.atas_nama, "BRI A/N Dea Dea Store");
  assert.equal(transfer?.status, "aktif");
});

test("pencocokan rekening memakai tipe id yang konsisten (string vs angka)", () => {
  // MySQL/JSON kadang mengirim id sebagai string; pencocokan `===` dulu gagal.
  const customerLama = [{ id: "4", nama_metode: "Transfer Bank", jenis_pembayaran: "transfer" }];
  const staff = [{ id: 4, nomor_rekening: "999", atas_nama: "Toko" }];

  const hasil = gabungInfoRekening(customerLama, staff);
  assert.equal(hasil[0].nomor_rekening, "999");
  assert.equal(hasil[0].atas_nama, "Toko");
});

test("metode tanpa rekening tetap menghasilkan null, bukan undefined", () => {
  const hasil = gabungInfoRekening([METODE_PROD[0]], []);
  assert.equal(hasil[0].nomor_rekening, null);
  assert.equal(hasil[0].atas_nama, null);
});
