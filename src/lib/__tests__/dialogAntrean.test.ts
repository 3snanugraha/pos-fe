/**
 * Regresi antrean modal — akar masalah "dialog harus di-back dulu".
 *
 * Jalankan: `node --test src/lib/__tests__/dialogAntrean.test.ts`
 *
 * Yang dikunci:
 *  1. hanya SATU id yang boleh merender Modal pada satu waktu;
 *  2. tutup A + buka B pada commit yang sama TIDAK menukar jendela langsung
 *     (B menunggu satu tick) — inilah yang mencegah dialog "tidak muncul"
 *     di Android;
 *  3. antrean FIFO, dan id yang batal (dilepas sebelum giliran) tidak
 *     meninggalkan slot terkunci;
 *  4. `lepas` idempoten.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { AntreanModal } from "../dialogAntrean.ts";

/** Penjadwal palsu: tick hanya jalan saat `jalankan()`. */
function penjadwalPalsu() {
  const antre: (() => void)[] = [];
  const jadwalkan = (fn: () => void) => {
    antre.push(fn);
  };
  const jalankan = () => {
    const salinan = [...antre];
    antre.length = 0;
    for (const fn of salinan) fn();
  };
  return { jadwalkan, jalankan, jumlahTertunda: () => antre.length };
}

describe("AntreanModal", () => {
  test("peminta pertama langsung memegang slot", () => {
    const a = new AntreanModal(penjadwalPalsu().jadwalkan);
    a.minta("hapus");
    assert.equal(a.aktif(), "hapus");
    assert.equal(a.boleh("hapus"), true);
    assert.equal(a.boleh("pesan"), false);
  });

  test("peminta kedua mengantre, tidak pernah dua slot hidup", () => {
    const a = new AntreanModal(penjadwalPalsu().jadwalkan);
    a.minta("hapus");
    a.minta("pesan");
    assert.equal(a.aktif(), "hapus");
    assert.deepEqual(a.antrean(), ["pesan"]);
  });

  test("minta dua kali untuk id yang sama tidak menggandakan antrean", () => {
    const a = new AntreanModal(penjadwalPalsu().jadwalkan);
    a.minta("hapus");
    a.minta("pesan");
    a.minta("pesan");
    assert.deepEqual(a.antrean(), ["pesan"]);
  });

  test("tutup A + buka B pada commit yang sama: B TIDAK langsung dapat slot", () => {
    const p = penjadwalPalsu();
    const a = new AntreanModal(p.jadwalkan);

    a.minta("A");
    assert.equal(a.aktif(), "A");

    // Commit yang sama: A ditutup, B diminta.
    a.lepas("A");
    a.minta("B");

    // Inilah inti perbaikan: slot KOSONG tetapi belum boleh dipakai, supaya
    // jendela lama (Dialog Android) benar-benar selesai dibuang lebih dulu.
    assert.equal(a.aktif(), null, "slot harus kosong satu tick");
    assert.deepEqual(a.antrean(), ["B"]);

    p.jalankan();
    assert.equal(a.aktif(), "B", "setelah satu tick B memegang slot");
    assert.deepEqual(a.antrean(), []);
  });

  test("antrean FIFO: dua permintaan saat slot terisi dilayani berurutan", () => {
    const p = penjadwalPalsu();
    const a = new AntreanModal(p.jadwalkan);

    a.minta("A");
    a.minta("B");
    a.minta("C");

    assert.equal(a.aktif(), "A");
    a.lepas("A");
    p.jalankan();
    assert.equal(a.aktif(), "B");

    a.lepas("B");
    p.jalankan();
    assert.equal(a.aktif(), "C");

    a.lepas("C");
    p.jalankan();
    assert.equal(a.aktif(), null);
    assert.deepEqual(a.antrean(), []);
  });

  test("id yang batal sebelum giliran dibuang dari antrean, slot tidak terkunci", () => {
    const p = penjadwalPalsu();
    const a = new AntreanModal(p.jadwalkan);

    a.minta("A");
    a.minta("B");
    a.lepas("B"); // B batal sebelum tampil
    assert.deepEqual(a.antrean(), []);
    assert.equal(a.aktif(), "A");

    a.lepas("A");
    p.jalankan();
    assert.equal(a.aktif(), null, "tidak ada yang menunggu → slot bebas");
  });

  test("pemegang slot dilepas → peminta berikutnya (satu tick) memegang slot", () => {
    const p = penjadwalPalsu();
    const a = new AntreanModal(p.jadwalkan);

    a.minta("A");
    a.lepas("A");
    p.jalankan();
    a.minta("B");
    assert.equal(a.aktif(), "B", "setelah promosi selesai, minta langsung dapat");
  });

  test("lepas idempoten untuk id yang tidak memegang slot", () => {
    const p = penjadwalPalsu();
    const a = new AntreanModal(p.jadwalkan);

    a.minta("A");
    a.lepas("A");
    a.lepas("A");
    a.lepas("tidak-ada");
    p.jalankan();
    assert.equal(a.aktif(), null);
  });

  test("reset mengembalikan keadaan awal", () => {
    const a = new AntreanModal(penjadwalPalsu().jadwalkan);
    a.minta("A");
    a.minta("B");
    a.reset();
    assert.equal(a.aktif(), null);
    assert.deepEqual(a.antrean(), []);
  });

  test("pendengar diberi tahu saat slot berpindah, bisa berhenti berlangganan", () => {
    const p = penjadwalPalsu();
    const a = new AntreanModal(p.jadwalkan);
    let panggilan = 0;
    const berhenti = a.langgan(() => {
      panggilan += 1;
    });

    a.minta("A");
    const setelahMinta = panggilan;
    assert.ok(setelahMinta > 0, "pendengar dipanggil saat slot dipegang");

    a.lepas("A");
    p.jalankan();
    const setelahLepas = panggilan;
    assert.ok(setelahLepas > setelahMinta, "pendengar dipanggil saat slot dilepas");

    berhenti();
    a.minta("B");
    assert.equal(panggilan, setelahLepas, "tidak ada panggilan setelah berhenti");
  });

  test("dialog yang sama dibuka-tutup-dibuka berulang tetap dapat slot", () => {
    const p = penjadwalPalsu();
    const a = new AntreanModal(p.jadwalkan);

    for (let i = 0; i < 3; i += 1) {
      a.minta("hapus");
      assert.equal(a.aktif(), "hapus", `siklus ${i}: terbuka`);
      a.lepas("hapus");
      p.jalankan();
      assert.equal(a.aktif(), null, `siklus ${i}: tertutup`);
    }
  });
});
