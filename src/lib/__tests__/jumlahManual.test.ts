/**
 * Regresi qty manual (ketik angka) — keranjang & detail produk.
 *
 * Jalankan: `node --test src/lib/__tests__/jumlahManual.test.ts`
 *
 * Yang dikunci:
 *  - hanya digit diterima (paste "12 pcs", "-3", "1.5" tidak menghasilkan angka aneh);
 *  - kosong = belum sah (pengguna boleh menghapus lalu mengetik ulang);
 *  - 0 ditolak (minimum 1), "007" = 7;
 *  - di atas stok di-clamp + ditandai `melebihiBatas` (bukan dipotong diam-diam);
 *  - tanpa batas stok (max 0/undefined) angka apa pun diterima;
 *  - selesai-mengetik dengan isi kosong tidak menghapus qty.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  batasAtas,
  galatJumlah,
  hanyaDigit,
  jumlahSaatSelesai,
  uraiJumlah,
} from "../jumlahManual.ts";

const pesan = {
  melebihiStok: (maks: number) => `Maksimal ${maks} item sesuai stok.`,
  minimum: (min: number) => `Minimal ${min} item.`,
};

describe("hanyaDigit", () => {
  test("membuang semua non-digit", () => {
    assert.equal(hanyaDigit("12 pcs"), "12");
    assert.equal(hanyaDigit("-3"), "3");
    assert.equal(hanyaDigit("1.5"), "15");
    assert.equal(hanyaDigit(" 7 "), "7");
    assert.equal(hanyaDigit("abc"), "");
  });

  test("membuang nol di depan tetapi menyisakan satu nol", () => {
    assert.equal(hanyaDigit("007"), "7");
    assert.equal(hanyaDigit("000"), "0");
    assert.equal(hanyaDigit("010"), "10");
  });

  test("membatasi jumlah digit", () => {
    assert.equal(hanyaDigit("123456789", 3), "123");
    assert.equal(hanyaDigit("23", 6), "23");
  });
});

describe("uraiJumlah", () => {
  test("angka biasa diterima apa adanya", () => {
    const h = uraiJumlah("12", { min: 1, max: 15 });
    assert.equal(h.nilai, 12);
    assert.equal(h.teks, "12");
    assert.equal(h.melebihiBatas, false);
    assert.equal(h.diBawahMinimum, false);
  });

  test("kosong = belum sah (nilai null), bukan 0/1", () => {
    for (const teks of ["", "   ", "abc"]) {
      const h = uraiJumlah(teks, { min: 1, max: 15 });
      assert.equal(h.nilai, null, `"${teks}" harus null`);
      assert.equal(h.teks, "");
    }
  });

  test("nol dan nol-nol di depan: 0 ditolak, 007 = 7", () => {
    const nol = uraiJumlah("0", { min: 1, max: 15 });
    assert.equal(nol.nilai, 1, "0 di-clamp ke minimum");
    assert.equal(nol.diBawahMinimum, true);

    const tujuh = uraiJumlah("007", { min: 1, max: 15 });
    assert.equal(tujuh.nilai, 7);
    assert.equal(tujuh.teks, "7");
  });

  test("melebihi stok di-clamp dan ditandai", () => {
    const h = uraiJumlah("99", { min: 1, max: 15 });
    assert.equal(h.nilai, 15);
    assert.equal(h.teks, "15");
    assert.equal(h.melebihiBatas, true);
    assert.equal(galatJumlah(h, pesan, { min: 1, max: 15 }), "Maksimal 15 item sesuai stok.");
  });

  test("tepat sama dengan stok tidak dianggap melebihi", () => {
    const h = uraiJumlah("15", { min: 1, max: 15 });
    assert.equal(h.nilai, 15);
    assert.equal(h.melebihiBatas, false);
    assert.equal(galatJumlah(h, pesan, { min: 1, max: 15 }), null);
  });

  test("tanpa batas stok (max undefined/0) angka besar diterima", () => {
    for (const max of [undefined, null, 0, -5]) {
      const h = uraiJumlah("999", { min: 1, max });
      assert.equal(h.nilai, 999, `max=${max}`);
      assert.equal(h.melebihiBatas, false);
    }
  });

  test("stok 0 tidak membatasi (produk tanpa data stok)", () => {
    const h = uraiJumlah("5", { min: 1, max: 0 });
    assert.equal(h.nilai, 5);
    assert.equal(batasAtas(0), undefined);
  });

  test("paste berisi teks tetap menghasilkan digit saja", () => {
    const h = uraiJumlah("12 pcs", { min: 1, max: 15 });
    assert.equal(h.nilai, 12);
    assert.equal(h.teks, "12");
  });

  test("min bukan 1 dihormati", () => {
    const h = uraiJumlah("2", { min: 3, max: 10 });
    assert.equal(h.nilai, 3);
    assert.equal(h.diBawahMinimum, true);
    assert.equal(galatJumlah(h, pesan, { min: 3, max: 10 }), "Minimal 3 item.");
  });
});

describe("jumlahSaatSelesai", () => {
  test("isi sah dipakai", () => {
    assert.equal(jumlahSaatSelesai("7", 2, { min: 1, max: 15 }), 7);
  });

  test("kosong jatuh ke nilai terakhir, tidak menghapus qty", () => {
    assert.equal(jumlahSaatSelesai("", 4, { min: 1, max: 15 }), 4);
    assert.equal(jumlahSaatSelesai("abc", 4, { min: 1, max: 15 }), 4);
  });

  test("nilai terakhir tidak sah pun tetap menghasilkan >= 1", () => {
    assert.equal(jumlahSaatSelesai("", 0, { min: 1 }), 1);
    assert.equal(jumlahSaatSelesai("", -3, { min: 1 }), 1);
    assert.equal(jumlahSaatSelesai("", Number.NaN, { min: 1 }), 1);
  });

  test("melebihi stok dipotong ke stok saat selesai", () => {
    assert.equal(jumlahSaatSelesai("99", 2, { min: 1, max: 15 }), 15);
  });
});
