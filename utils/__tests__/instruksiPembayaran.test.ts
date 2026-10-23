/**
 * Regresi bug "order DANA sukses tanpa nomor rekening".
 *
 * Jalankan: `node --test utils/__tests__/instruksiPembayaran.test.ts`
 *
 * Kasus yang dikunci:
 * - metode e-wallet (DANA) yang punya nomor tujuan menghasilkan instruksi
 *   berisi nomor + atas nama (dulu instruksi e-wallet hanya "ke nomor/akun
 *   toko" sehingga pelanggan tidak tahu harus transfer ke mana);
 * - metode transfer tetap memakai format "No. Rekening ... a.n. ...";
 * - metode tanpa rekening (Tunai) tidak mengarang nomor tujuan;
 * - normalisasi menerima tiga bentuk payload backend (string, objek order,
 *   objek mentah metode_pembayaran) dan tetap null-aman.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { normalisasiMetodePembayaran, punyaNomorTujuan } from "../metodePembayaran.ts";
import { buildPaymentInstruction } from "../instruksiPembayaran.ts";

test("instruksi e-wallet memuat nomor tujuan dan atas nama", () => {
  const baris = buildPaymentInstruction({
    nama_metode: "DANA",
    jenis_pembayaran: "ewallet",
    nomor_rekening: "0895339046899",
    atas_nama: "Trisna Nugraha",
  });

  assert.ok(
    baris.some((b) => b.includes("0895339046899") && b.includes("Trisna Nugraha")),
    `nomor tujuan tidak muncul: ${JSON.stringify(baris)}`
  );
});

test("instruksi transfer memakai label No. Rekening + a.n.", () => {
  const baris = buildPaymentInstruction({
    nama_metode: "Transfer Bank",
    jenis_pembayaran: "transfer",
    nomor_rekening: "123456789010",
    atas_nama: "BRI A/N Dea Dea Store",
  });

  assert.ok(
    baris.some(
      (b) =>
        b.includes("No. Rekening 123456789010") &&
        b.includes("a.n. BRI A/N Dea Dea Store")
    ),
    JSON.stringify(baris)
  );
});

test("e-wallet tanpa rekening tidak mengarang nomor tujuan", () => {
  const baris = buildPaymentInstruction({
    nama_metode: "DANA",
    jenis_pembayaran: "ewallet",
    nomor_rekening: null,
    atas_nama: null,
  });

  assert.ok(baris.some((b) => b.includes("nomor/akun toko")));
  assert.ok(!baris.join(" ").includes("a.n."));
});

test("tunai tidak menampilkan rekening dan tidak butuh nomor tujuan", () => {
  const baris = buildPaymentInstruction({
    nama_metode: "Tunai",
    jenis_pembayaran: "tunai",
    nomor_rekening: null,
    atas_nama: null,
  });

  assert.equal(baris.length, 1);
  assert.ok(baris[0].includes("tunai"));
  assert.equal(punyaNomorTujuan("tunai"), false);
  assert.equal(punyaNomorTujuan("ewallet"), true);
  assert.equal(punyaNomorTujuan("transfer"), true);
});

test("normalisasi menerima string nama metode (respons lama)", () => {
  const info = normalisasiMetodePembayaran("DANA");
  assert.equal(info?.nama, "DANA");
  assert.equal(info?.nomor_rekening, null);
});

test("normalisasi menerima objek order (show) lengkap dengan rekening", () => {
  const info = normalisasiMetodePembayaran({
    id: 8,
    nama: "DANA",
    jenis: "ewallet",
    nomor_rekening: "0895339046899",
    atas_nama: "Trisna Nugraha",
  });

  assert.deepEqual(info, {
    id: 8,
    nama: "DANA",
    jenis: "ewallet",
    nomor_rekening: "0895339046899",
    atas_nama: "Trisna Nugraha",
    instruksi: null,
  });
});

test("normalisasi menerima bentuk mentah tabel metode_pembayaran", () => {
  const info = normalisasiMetodePembayaran({
    id: 8,
    nama_metode: "DANA",
    jenis_pembayaran: "ewallet",
    nomor_rekening: "0895339046899",
    atas_nama: "Trisna Nugraha",
  });

  assert.equal(info?.nama, "DANA");
  assert.equal(info?.jenis, "ewallet");
  assert.equal(info?.nomor_rekening, "0895339046899");
});

test("normalisasi aman untuk nilai kosong / tak dikenal", () => {
  assert.equal(normalisasiMetodePembayaran(null), null);
  assert.equal(normalisasiMetodePembayaran(undefined), null);
  assert.equal(normalisasiMetodePembayaran(""), null);
  assert.equal(normalisasiMetodePembayaran({ id: 3 }), null);
  assert.equal(normalisasiMetodePembayaran(42), null);
});
