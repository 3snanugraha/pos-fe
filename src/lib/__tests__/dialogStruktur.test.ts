/**
 * Pagar struktur komponen `Dialog` — mencegah regresi kelas "konten dialog
 * digate terpisah dari backdrop".
 *
 * Jalankan: `node --test src/lib/__tests__/dialogStruktur.test.ts`
 *
 * Kenapa tes ini ada (APK 2026-10-28b):
 *
 * Di versi 28b kartu dialog dibungkus `Animated.View` dengan `opacity` yang
 * dimulai 0, sedangkan backdrop adalah `View` biasa. Di Android nilai opacity
 * itu hanya dikirim lewat native animated driver, bukan lewat render React,
 * sehingga bila pembaruannya tidak sampai, kartu tetap 0 (tak terlihat)
 * sementara backdrop tampil — persis keluhan "layar menghitam tetapi dialog
 * kosong". Di web bug ini tidak terlihat karena react-native-web tidak punya
 * native animated module sehingga `useNativeDriver` diam-diam jatuh ke driver
 * JS. Karena itu dibutuhkan pagar di level sumber: konten dialog tidak boleh
 * punya animasi/opacity sendiri.
 *
 * Tes ini membaca teks sumber (bukan merender), sehingga bisa jalan di
 * `node --test` tanpa React Native.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const SUMBER = new URL("../../components/ui/Dialog.tsx", import.meta.url);
const kode = readFileSync(SUMBER, "utf8");

/** Buang komentar supaya penjelasan di docblock tidak dianggap kode. */
function tanpaKomentar(teks: string): string {
  return teks
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const badan = tanpaKomentar(kode);

describe("struktur Dialog", () => {
  test("tidak memakai Animated sama sekali (konten tidak boleh dianimasikan manual)", () => {
    assert.equal(
      /\bAnimated\b/.test(badan),
      false,
      "Dialog memakai Animated — animasi konten harus diserahkan ke animationType milik Modal",
    );
  });

  test("tidak menyetel opacity pada kartu dialog", () => {
    assert.equal(
      /\bopacity\b/.test(badan),
      false,
      "Dialog menyetel opacity — konten bisa tersangkut tak terlihat",
    );
  });

  test("meneruskan animationType ke <Modal> (animasi jendela bawaan)", () => {
    assert.match(badan, /<Modal[\s\S]*?animationType=\{/);
  });

  test("keputusan render memakai rencanaRenderDialog (satu keputusan, bukan dua)", () => {
    assert.match(badan, /rencanaRenderDialog\(/);
    assert.match(badan, /if \(!rencana\.modal\)/);
  });

  test("tidak memakai onDismiss sebagai penanda jendela tertutup", () => {
    // RN hanya mengimplementasikan onDismiss di iOS; memakainya sebagai
    // syarat promosi antrean akan membuat antrean macet di Android.
    assert.equal(
      /onDismiss/.test(badan),
      false,
      "Dialog memakai onDismiss — di Android event ini tidak pernah dikirim",
    );
  });

  test("konten (judul/anak/aksi) dirender tanpa syarat tambahan selain keberadaan prop", () => {
    // Konten harus dirender langsung di dalam kartu; satu-satunya kondisi
    // yang boleh ada adalah `title ?` / `children ?` / `actions ?`.
    assert.match(badan, /\{title \? \(/);
    assert.match(badan, /\{children \? <View className="mt-4">\{children\}<\/View> : null\}/);
    assert.match(badan, /\{actions \? \(/);
  });
});
