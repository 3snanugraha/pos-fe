/**
 * Unit test antrean toast notifikasi global.
 *
 * Jalankan: `node --test src/lib/__tests__/toastAntrean.test.ts`
 *
 * Yang dikunci (sesuai keluhan pemilik: notifikasi hanya muncul di
 * /kasir/orders):
 * - event order baru menghasilkan judul "Order Baru: ORD-…" (bukan judul
 *   generik) dan antrean bisa memuat >1 notifikasi tanpa saling menimpa;
 * - duplikat (event ganda karena reconnect) tidak menumpuk;
 * - antrean dibatasi MAKS_ANTREAN dan yang tertua dibuang lebih dulu;
 * - tombol tutup hanya menghapus toast yang dimaksud, dan "tutupSemua"
 *   mengosongkan antrean (dipakai saat logout);
 * - tujuan navigasi per target benar: kasir → /kasir/orders, status pelanggan
 *   → /orders/{id}, notifikasi umum → /notifications.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAKS_ANTREAN,
  keadaanAwalToast,
  jumlahMenunggu,
  reducerToast,
  toastAktif,
  tujuanToast,
} from "../realtime/toastAntrean.ts";
import type { NotifikasiRealtime } from "../../../services/realtime/eventMapping.ts";

function notif(overrides: Partial<NotifikasiRealtime> = {}): NotifikasiRealtime {
  return {
    notifikasiId: 1,
    tipe: "new_order",
    judul: "Penerimaan Order Baru",
    pesan: "Order ORD-1 dari Budi menunggu verifikasi kasir.",
    jenis: "warning",
    target: "kasir-order-baru",
    channel: "private-orders",
    orderId: 77,
    nomorTransaksi: "ORD-1",
    statusOrder: "pending",
    bunyikanSuara: true,
    waktu: "2026-10-23T06:00:00+00:00",
    ...overrides,
  };
}

test("order baru memakai judul 'Order Baru: <nomor>'", () => {
  const keadaan = reducerToast(keadaanAwalToast, {
    jenis: "tampilkan",
    notifikasi: notif({ nomorTransaksi: "ORD-20261023-0001" }),
  });

  assert.equal(keadaan.daftar.length, 1);
  assert.equal(toastAktif(keadaan)?.judul, "Order Baru: ORD-20261023-0001");
  assert.equal(toastAktif(keadaan)?.pesan, "Order ORD-1 dari Budi menunggu verifikasi kasir.");
});

test("tanpa nomor transaksi jatuh ke judul server, tidak pernah kosong", () => {
  const keadaan = reducerToast(keadaanAwalToast, {
    jenis: "tampilkan",
    notifikasi: notif({ nomorTransaksi: null, judul: "Penerimaan Order Baru" }),
  });

  assert.equal(toastAktif(keadaan)?.judul, "Penerimaan Order Baru");
});

test("notifikasi status pelanggan memakai judul server", () => {
  const keadaan = reducerToast(keadaanAwalToast, {
    jenis: "tampilkan",
    notifikasi: notif({
      target: "pelanggan-status",
      judul: "Pesanan Diverifikasi",
      nomorTransaksi: "ORD-9",
      orderId: 9,
    }),
  });

  assert.equal(toastAktif(keadaan)?.judul, "Pesanan Diverifikasi");
});

test("dua notifikasi berbeda diantrekan, yang pertama tetap tampil", () => {
  let keadaan = reducerToast(keadaanAwalToast, {
    jenis: "tampilkan",
    notifikasi: notif({ nomorTransaksi: "ORD-1", orderId: 1 }),
  });
  keadaan = reducerToast(keadaan, {
    jenis: "tampilkan",
    notifikasi: notif({ nomorTransaksi: "ORD-2", orderId: 2 }),
  });

  assert.equal(keadaan.daftar.length, 2);
  assert.equal(toastAktif(keadaan)?.judul, "Order Baru: ORD-1");
  assert.equal(jumlahMenunggu(keadaan), 1);
});

test("event duplikat tidak menumpuk antrean", () => {
  let keadaan = reducerToast(keadaanAwalToast, {
    jenis: "tampilkan",
    notifikasi: notif({ nomorTransaksi: "ORD-1" }),
  });
  keadaan = reducerToast(keadaan, {
    jenis: "tampilkan",
    notifikasi: notif({ nomorTransaksi: "ORD-1" }),
  });

  assert.equal(keadaan.daftar.length, 1);
  // Nomor urut tetap naik supaya id berikutnya tidak bertabrakan.
  assert.equal(keadaan.urut, 2);
});

test("antrean dibatasi MAKS_ANTREAN, yang tertua dibuang", () => {
  let keadaan = keadaanAwalToast;

  for (let i = 1; i <= MAKS_ANTREAN + 2; i += 1) {
    keadaan = reducerToast(keadaan, {
      jenis: "tampilkan",
      notifikasi: notif({ nomorTransaksi: `ORD-${i}`, orderId: i }),
    });
  }

  assert.equal(keadaan.daftar.length, MAKS_ANTREAN);
  assert.equal(toastAktif(keadaan)?.judul, `Order Baru: ORD-3`);
});

test("tutup hanya menghapus toast yang dimaksud, sisanya maju", () => {
  let keadaan = reducerToast(keadaanAwalToast, {
    jenis: "tampilkan",
    notifikasi: notif({ nomorTransaksi: "ORD-1" }),
  });
  keadaan = reducerToast(keadaan, {
    jenis: "tampilkan",
    notifikasi: notif({ nomorTransaksi: "ORD-2" }),
  });

  const idPertama = toastAktif(keadaan)!.id;
  keadaan = reducerToast(keadaan, { jenis: "tutup", id: idPertama });

  assert.equal(keadaan.daftar.length, 1);
  assert.equal(toastAktif(keadaan)?.judul, "Order Baru: ORD-2");
});

test("tutupSemua mengosongkan antrean (logout)", () => {
  let keadaan = reducerToast(keadaanAwalToast, {
    jenis: "tampilkan",
    notifikasi: notif({ nomorTransaksi: "ORD-1" }),
  });
  keadaan = reducerToast(keadaan, { jenis: "tutupSemua" });

  assert.deepEqual(keadaan.daftar, []);
  assert.equal(toastAktif(keadaan), null);
});

test("tujuan navigasi per target", () => {
  assert.deepEqual(tujuanToast({ target: "kasir-order-baru", orderId: 5 }), {
    rute: "/kasir/orders",
  });
  assert.deepEqual(tujuanToast({ target: "pelanggan-status", orderId: 5 }), {
    rute: "/orders/5",
  });
  assert.deepEqual(tujuanToast({ target: "pelanggan-status", orderId: null }), {
    rute: "/orders",
  });
  assert.deepEqual(tujuanToast({ target: "notifikasi-umum", orderId: null }), {
    rute: "/notifications",
  });
  assert.equal(tujuanToast({ target: "tak-dikenal", orderId: null }), null);
});
