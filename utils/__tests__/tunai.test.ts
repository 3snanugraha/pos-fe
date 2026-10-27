/**
 * Regresi uang tunai checkout.
 *
 * Jalankan: `node --test utils/__tests__/tunai.test.ts`
 *
 * Kasus yang dikunci (permintaan pemilik):
 * - tombol "Uang Pas" = tepat tagihan;
 * - tombol pecahan = kelipatan terdekat DI ATAS tagihan (2rb/5rb/10rb/20rb/
 *   50rb/100rb), nominal kembar dibuang;
 * - uang diterima < tagihan ditolak dengan pesan yang menyebut kekurangan;
 * - bayar 300rb untuk belanja 275rb → kembalian 25rb, dan angka itu ikut
 *   ditulis ke catatan order lalu terbaca kembali (dasar baris nota/struk).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PECAHAN_UANG,
  bulatKeAtas,
  gabungCatatanTunai,
  hitungTunai,
  nominalTunai,
  parseTunaiCatatan,
  rupiahTunai,
  saranTunai,
  stripTunaiCatatan,
  tandaTunai,
  validasiTunai,
} from "../tunai.ts";

test("uang pas = tepat sebesar tagihan dan selalu jadi saran pertama", () => {
  const saran = saranTunai(275000);
  assert.equal(saran[0].jenis, "pas");
  assert.equal(saran[0].nominal, 275000);
});

test("pecahan menghasilkan kelipatan terdekat di atas tagihan", () => {
  const saran = saranTunai(275000);
  const nominal = saran.filter((s) => s.jenis === "pecahan").map((s) => s.nominal);

  // 275.000 → 276.000 (2rb); 280.000 (5rb & 10rb sama-sama menghasilkan ini,
  // hanya muncul sekali); 300.000 (20rb & 50rb → 300.000, sekali); 300.000 juga
  // kelipatan 100rb → sudah ada.
  assert.deepEqual(nominal, [276000, 280000, 300000]);
});

test("semua nominal pecahan >= tagihan dan urut naik", () => {
  const saran = saranTunai(127000);
  for (const opsi of saran) assert.ok(opsi.nominal >= 127000, `${opsi.nominal} < tagihan`);

  const urut = [...saran].sort((a, b) => a.nominal - b.nominal);
  assert.deepEqual(saran.map((s) => s.nominal), urut.map((s) => s.nominal));
});

test("nominal kembar tidak dobel saat tagihan sudah kelipatan pecahan", () => {
  // 300.000 tepat kelipatan 100rb → semua pecahan membulatkan ke angka yang
  // sama dengan "uang pas", jadi hanya satu tombol (tidak ada tombol kembar).
  const nominal = saranTunai(300000).map((s) => s.nominal);
  assert.equal(new Set(nominal).size, nominal.length);
  assert.deepEqual(nominal, [300000]);
});

test("bulatKeAtas membulatkan ke kelipatan dan aman untuk nilai aneh", () => {
  assert.equal(bulatKeAtas(275000, 100000), 300000);
  assert.equal(bulatKeAtas(275000, 2000), 276000);
  assert.equal(bulatKeAtas(275000, 0), 275000);
  assert.equal(bulatKeAtas(-500, 1000), 0);
});

test("PECAHAN_UANG memuat 2rb..100rb sesuai permintaan", () => {
  assert.deepEqual([...PECAHAN_UANG], [2000, 5000, 10000, 20000, 50000, 100000]);
});

test("nominalTunai membaca input manual dengan titik/spasi/prefix Rp", () => {
  assert.equal(nominalTunai("300000"), 300000);
  assert.equal(nominalTunai("300.000"), 300000);
  assert.equal(nominalTunai("Rp 300 000"), 300000);
  assert.equal(nominalTunai(""), 0);
  assert.equal(nominalTunai("abc"), 0);
  assert.equal(nominalTunai(275000), 275000);
});

test("bayar 300rb untuk belanjaan 275rb → kembalian 25rb", () => {
  const hasil = hitungTunai(275000, 300000);
  assert.equal(hasil.cukup, true);
  assert.equal(hasil.kembalian, 25000);
  assert.equal(hasil.kurang, 0);
  assert.equal(rupiahTunai(hasil.kembalian), "Rp 25.000");
});

test("uang kurang ditolak dengan pesan yang menyebut kekurangan", () => {
  const pesan = validasiTunai(275000, 250000);
  assert.ok(pesan, "validasi harus mengembalikan pesan");
  assert.ok(pesan!.includes("Rp 25.000"), `pesan tidak memuat kekurangan: ${pesan}`);

  assert.equal(validasiTunai(275000, 275000), null, "uang pas bukan error");
  assert.equal(validasiTunai(275000, 300000), null, "uang lebih bukan error");
  assert.equal(validasiTunai(275000, 0), null, "input kosong bukan error (COD)");
});

test("catatan order menyimpan uang diterima & kembalian", () => {
  const catatan = gabungCatatanTunai("Antar sore ya", {
    diterima: 300000,
    kembalian: 25000,
  });

  assert.equal(catatan, "Antar sore ya [Tunai: diterima Rp 300.000; kembali Rp 25.000]");

  const dibaca = parseTunaiCatatan(catatan);
  assert.deepEqual(dibaca, { diterima: 300000, kembalian: 25000 });
});

test("catatan tanpa uang tunai tidak diubah", () => {
  assert.equal(gabungCatatanTunai("Hati-hati kaca", null), "Hati-hati kaca");
  assert.equal(gabungCatatanTunai(undefined, null), undefined);
  assert.equal(gabungCatatanTunai("", { diterima: 0, kembalian: 0 }), undefined);
  assert.equal(parseTunaiCatatan("tanpa penanda"), null);
  assert.equal(parseTunaiCatatan(null), null);
});

test("penanda tunai bisa digabung dengan penanda split", () => {
  const gabungan = gabungCatatanTunai("[Split: Tunai Rp 100.000; Transfer BCA Rp 175.000]", {
    diterima: 100000,
    kembalian: 0,
  });

  assert.ok(gabungan!.includes("[Split:"), "penanda split hilang");
  assert.ok(gabungan!.includes("[Tunai:"), "penanda tunai tidak ditulis");
  assert.deepEqual(parseTunaiCatatan(gabungan), { diterima: 100000, kembalian: 0 });
  assert.equal(
    stripTunaiCatatan(gabungan),
    "[Split: Tunai Rp 100.000; Transfer BCA Rp 175.000]"
  );
});

test("tandaTunai memakai format rupiah Indonesia", () => {
  assert.equal(tandaTunai(300000, 25000), "[Tunai: diterima Rp 300.000; kembali Rp 25.000]");
  assert.equal(tandaTunai(1000, -5), "[Tunai: diterima Rp 1.000; kembali Rp 0]");
});
