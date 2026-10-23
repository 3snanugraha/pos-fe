/**
 * Unit test pemetaan event realtime (Pusher) → model notifikasi aplikasi.
 *
 * Jalankan: `node --test services/__tests__/realtimeEventMapping.test.ts`
 *
 * Yang dikunci:
 * - `order.baru` (channel tim) → target kasir, segarkan daftar order kasir;
 * - `order.status` (channel pelanggan) → target pelanggan, segarkan pesanan;
 * - sinyal `sound` diteruskan (dan absen dianggap true — bunyi bell adalah
 *   inti fitur, server hanya mengirim false bila dimatikan);
 * - payload rusak / event asing tidak pernah melempar dan tidak menghasilkan
 *   notifikasi palsu;
 * - nama channel privat sesuai kontrak backend (`private-customer.{id}`).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EVENT_REALTIME,
  channelPelanggan,
  channelTim,
  eventDikenal,
  hasilDariEvent,
  petakanEvent,
  targetDari,
} from "../realtime/eventMapping.ts";
import { channelUntuk, konfigurasiLengkap, normalisasiKonfigurasi } from "../realtime/config.ts";

const payloadOrderBaru = {
  tipe: "new_order",
  judul: "Penerimaan Order Baru",
  pesan: "Order ORD-1 dari Budi (2 item) senilai Rp 50.000 menunggu verifikasi kasir.",
  jenis: "warning",
  sound: true,
  dikirim_pada: "2026-10-23T06:00:00+00:00",
  referensi_tipe: "new_order",
  referensi_id: 77,
  pelanggan_id: null,
  order: {
    id: 77,
    nomor_transaksi: "ORD-1",
    total_bayar: 50000,
    status: "pending",
    jumlah_item: 2,
    pelanggan: { id: 5, nama: "Budi" },
  },
};

const payloadStatus = {
  tipe: "order_verified",
  judul: "Pesanan Diproses",
  pesan: "Pesanan ORD-1 telah diverifikasi kasir.",
  jenis: "success",
  sound: true,
  dikirim_pada: "2026-10-23T06:05:00+00:00",
  order: { id: 77, nomor_transaksi: "ORD-1", status: "selesai", total_bayar: 50000 },
};

test("order.baru dipetakan ke target kasir dan menyegarkan daftar order kasir", () => {
  const hasil = hasilDariEvent(EVENT_REALTIME.orderBaru, payloadOrderBaru, channelTim());

  assert.ok(hasil.notifikasi);
  assert.equal(hasil.notifikasi.target, "kasir-order-baru");
  assert.equal(hasil.notifikasi.judul, "Penerimaan Order Baru");
  assert.equal(hasil.notifikasi.orderId, 77);
  assert.equal(hasil.notifikasi.nomorTransaksi, "ORD-1");
  assert.equal(hasil.notifikasi.statusOrder, "pending");
  assert.equal(hasil.notifikasi.tipe, "new_order");
  assert.equal(hasil.notifikasi.bunyikanSuara, true);
  assert.equal(hasil.tambahBelumDibaca, true);
  assert.ok(hasil.segarkan.includes("kasir-orders"));
  assert.ok(hasil.segarkan.includes("badge"));
});

test("order.status dipetakan ke target pelanggan dan menyegarkan pesanan", () => {
  const channel = channelPelanggan(5);
  const hasil = hasilDariEvent(EVENT_REALTIME.orderStatus, payloadStatus, channel);

  assert.ok(hasil.notifikasi);
  assert.equal(hasil.notifikasi.target, "pelanggan-status");
  assert.equal(hasil.notifikasi.statusOrder, "selesai");
  assert.equal(hasil.notifikasi.jenis, "success");
  assert.equal(hasil.notifikasi.channel, "private-customer.5");
  assert.ok(hasil.segarkan.includes("orders"));
  assert.ok(!hasil.segarkan.includes("kasir-orders"));
});

test("sound=false diteruskan, sound yang absen dianggap true", () => {
  assert.equal(petakanEvent("order.baru", { ...payloadOrderBaru, sound: false })?.bunyikanSuara, false);

  const tanpaSound = { ...payloadOrderBaru };
  delete (tanpaSound as any).sound;
  assert.equal(petakanEvent("order.baru", tanpaSound)?.bunyikanSuara, true);
});

test("payload rusak tidak menghasilkan notifikasi dan tidak melempar", () => {
  for (const rusak of [null, undefined, 42, "teks", []]) {
    const hasil = hasilDariEvent(EVENT_REALTIME.orderBaru, rusak);
    assert.equal(hasil.notifikasi, null);
    assert.deepEqual(hasil.segarkan, []);
    assert.equal(hasil.tambahBelumDibaca, false);
  }
});

test("event asing diabaikan", () => {
  assert.equal(eventDikenal("my-event"), false);
  assert.equal(petakanEvent("my-event", { judul: "x" }), null);
  assert.equal(eventDikenal("order.baru"), true);
});

test("target dari channel dipakai untuk event tak dikenal di channel pelanggan", () => {
  assert.equal(targetDari("event.lain", "private-customer.9"), "pelanggan-status");
  assert.equal(targetDari("event.lain", "private-orders"), "tak-dikenal");
});

test("field opsional hilang diganti nilai aman", () => {
  const notif = petakanEvent("order.status", {});
  assert.ok(notif);
  assert.equal(notif.judul, "Notifikasi");
  assert.equal(notif.pesan, "");
  assert.equal(notif.jenis, "info");
  assert.equal(notif.orderId, null);
  assert.equal(notif.statusOrder, null);
});

test("nama channel mengikuti kontrak backend", () => {
  assert.equal(channelTim(), "private-orders");
  assert.equal(channelPelanggan(12), "private-customer.12");
});

test("konfigurasi backend dinormalisasi dan menolak yang tidak lengkap", () => {
  const konfig = normalisasiKonfigurasi({
    success: true,
    data: { enabled: true, key: "b9490", cluster: "ap1", sound: true, channel: "customer.5" },
  });

  assert.ok(konfig);
  assert.equal(konfigurasiLengkap(konfig), true);
  assert.equal(channelUntuk(konfig), "private-customer.5");

  assert.equal(normalisasiKonfigurasi({ data: { enabled: true } }), null);
  assert.equal(konfigurasiLengkap(normalisasiKonfigurasi({ data: { enabled: false, key: "x", cluster: "ap1" } })), false);
  assert.equal(konfigurasiLengkap(null), false);
});

test("konfigurasi tidak pernah memuat secret walau backend mengirimnya", () => {
  const konfig = normalisasiKonfigurasi({
    data: {
      enabled: true,
      key: "b9490",
      cluster: "ap1",
      secret: "6424033e",
      app_id: "2204628",
      channel: "orders",
    },
  });

  assert.ok(konfig);
  assert.equal("secret" in konfig, false);
  assert.equal("app_id" in konfig, false);
  assert.equal(channelUntuk(konfig), "private-orders");
});
