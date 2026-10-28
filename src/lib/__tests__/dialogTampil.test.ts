/**
 * Regresi rencana render dialog — akar masalah "backdrop tampil, konten kosong"
 * pada APK 2026-10-28b.
 *
 * Jalankan: `node --test src/lib/__tests__/dialogTampil.test.ts`
 *
 * Yang dikunci:
 *  1. KONTEN dan MODAL diputuskan bersama; tidak ada keadaan
 *     "modal tampil tetapi konten tidak";
 *  2. konten tidak pernah bergantung pada parameter lain (animasi, opacity,
 *     reduce motion) — fungsi ini tidak punya parameter seperti itu;
 *  3. dialog yang tidak diminta tidak merender apa pun.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { rencanaRenderDialog } from "../dialogTampil.ts";

describe("rencanaRenderDialog", () => {
  test("visible + memegang slot → modal DAN konten dirender", () => {
    assert.deepEqual(rencanaRenderDialog(true, true), { modal: true, konten: true });
  });

  test("visible tetapi belum dapat slot → tidak merender apa pun", () => {
    assert.deepEqual(rencanaRenderDialog(true, false), { modal: false, konten: false });
  });

  test("tidak visible tetapi masih memegang slot → tidak merender apa pun", () => {
    assert.deepEqual(rencanaRenderDialog(false, true), { modal: false, konten: false });
  });

  test("tertutup sepenuhnya → tidak merender apa pun", () => {
    assert.deepEqual(rencanaRenderDialog(false, false), { modal: false, konten: false });
  });

  // Invarian inti bug 28b: dulu kartu dialog punya gate opacity sendiri
  // (Animated.Value mulai 0). Di Android pembaruan opacity bisa tidak sampai,
  // sehingga modal tampil tanpa konten. Sekarang dua keputusan itu satu.
  test("INVARIAN: konten selalu sama dengan modal pada semua kombinasi", () => {
    for (const visible of [true, false]) {
      for (const slot of [true, false]) {
        const r = rencanaRenderDialog(visible, slot);
        assert.equal(
          r.konten,
          r.modal,
          `kombinasi visible=${visible} slot=${slot} memisahkan konten dari modal`,
        );
      }
    }
  });

  test("tidak menerima parameter animasi/opacity (konten tidak bisa ditunda)", () => {
    // Fungsi hanya punya dua parameter. Bila suatu saat ada parameter ketiga,
    // tes ini gagal dan memaksa peninjauan ulang: konten tidak boleh punya
    // gate tambahan.
    assert.equal(rencanaRenderDialog.length, 2);
  });

  test("nilai non-boolean diperlakukan sebagai 'tidak tampil'", () => {
    // Jaga-jaga terhadap prop undefined dari pemanggil JS.
    assert.deepEqual(rencanaRenderDialog(undefined as unknown as boolean, true), {
      modal: false,
      konten: false,
    });
  });
});
