/**
 * Regresi penyusunan data struk thermal kasir.
 *
 * Kegagalan yang dikunci:
 *  - nominal backend berupa string desimal ("32000.00") dulu berpotensi
 *    tercetak "Rp NaN" bila tidak dinormalkan;
 *  - toko yang gagal dimuat tidak boleh membuat struk tanpa nama toko;
 *  - order tanpa pelanggan/alamat tidak boleh memaksa blok kosong tercetak.
 *
 * Jalankan: `node --test utils/__tests__/dataStrukKasir.test.ts`
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { NAMA_TOKO_CADANGAN } from "../strukPelanggan.ts";
import { siapkanDataStruk, type OrderStrukSumber } from "../dataStrukKasir.ts";
import { TEKS_CADANGAN_TOKO, teksStruk } from "../strukThermal.ts";

const order = (ubah: Partial<OrderStrukSumber> = {}): OrderStrukSumber => ({
  nomor_transaksi: "ORD-20261027-A7P3D8",
  tanggal_transaksi: "2026-10-27T13:05:00+07:00",
  pelanggan: { nama_pelanggan: "Budi", telepon: "081200001111" },
  metode_pembayaran: "DANA",
  status_pembayaran: "belum_bayar",
  alamat_pengiriman: null,
  catatan: null,
  total_bayar: 32000,
  items: [
    {
      nama_produk: "Kursi Lipat",
      nama_varian: null,
      satuan: "pcs",
      jumlah: 2,
      // Backend mengirim decimal:2 sebagai string.
      harga: "16000.00",
      subtotal: "32000.00",
    },
  ],
  ...ubah,
});

test("nominal string desimal dinormalkan (tidak ada Rp NaN)", () => {
  const data = siapkanDataStruk(order({ total_bayar: "32000.00" as unknown as number }), {
    nama_toko: "Oman Jaya",
  });

  assert.equal(data.order.total_bayar, 32000);
  assert.equal(data.order.items[0].harga, 16000);
  assert.equal(data.order.items[0].subtotal, 32000);

  const teks = teksStruk(data);
  assert.ok(!teks.includes("NaN"), `struk memuat NaN:\n${teks}`);
  assert.ok(teks.includes("Rp 32.000"));
});

test("toko yang gagal dimuat memakai nama cadangan saat dicetak", () => {
  const data = siapkanDataStruk(order(), null);
  assert.equal(data.toko.nama_toko, "");
  // Fallback nama toko ada di satu tempat: susunBarisStruk.
  assert.ok(teksStruk(data).includes(TEKS_CADANGAN_TOKO));
  // Struk pelanggan tetap punya cadangannya sendiri (modul terpisah).
  assert.ok(NAMA_TOKO_CADANGAN.length > 0);
});

test("order tanpa pelanggan/alamat/catatan tidak mencetak blok kosong", () => {
  const data = siapkanDataStruk(
    order({ pelanggan: null, alamat_pengiriman: null, catatan: null }),
    { nama_toko: "Oman Jaya" }
  );

  const teks = teksStruk(data);
  assert.ok(!teks.includes("Pelanggan:"));
  assert.ok(!teks.includes("Kirim ke:"));
  assert.ok(!teks.includes("Catatan:"));
});

test("alamat & catatan panjang tetap tercetak (dibungkus 32 kolom)", () => {
  const data = siapkanDataStruk(
    order({
      alamat_pengiriman:
        "Jl. Raya Cimahi No. 123, RT 04 RW 07, Kelurahan Cibeureum, Kota Bandung",
      catatan: "Tolong dibungkus bubble wrap, jangan ditaruh di atas barang lain",
    }),
    { nama_toko: "Oman Jaya" }
  );

  const baris = teksStruk(data).split("\n");
  assert.ok(baris.some((b) => b.startsWith("Kirim ke:")));

  /*
   * Asersi lama `startsWith("Catatan:")` DIGANTI dengan sengaja.
   *
   * Format yang diminta pemilik: label "Catatan :" berdiri sendiri, isi di
   * baris berikutnya (mirip struk kasir). Format lama menempelkan label + isi
   * satu baris, sehingga penanda pembayaran `[Tunai: …]` yang dulu tersimpan di
   * catatan tampak menyatu dengan pesan pelanggan.
   */
  const indeksLabel = baris.indexOf("Catatan :");
  assert.ok(indeksLabel > 0, `label \"Catatan :\" harus jadi baris sendiri:\n${baris.join("\n")}`);
  assert.equal(
    baris[indeksLabel + 1],
    "Tolong dibungkus bubble wrap,",
    "isi catatan harus mulai di baris setelah label"
  );

  for (const b of baris) {
    assert.ok(b.length <= 32, `baris > 32 kolom: "${b}" (${b.length})`);
  }
});

test("harga_satuan dari API dipakai saat `harga` tidak ada", () => {
  // `detail_transaksi` backend mengirim `harga_satuan`; tanpa pemetaan ini
  // struk mencetak "1 x Rp 0" padahal barangnya Rp 5.000.
  const data = siapkanDataStruk(
    order({
      total_bayar: 5000,
      items: [
        {
          nama_produk: "Gelas Ukur",
          nama_varian: "Default",
          satuan: null,
          jumlah: 1,
          harga_satuan: "5000.00",
          subtotal: "5000.00",
        } as any,
      ],
    }),
    { nama_toko: "Oman Jaya" }
  );

  assert.equal(data.order.items[0].harga, 5000);

  const teks = teksStruk(data);
  assert.ok(teks.includes("1 x Rp 5.000"), `harga item tidak tercetak:\n${teks}`);
  assert.ok(!teks.includes("Rp 0 "));
});

test("blok verifikasi memakai nama kasir dan waktu", () => {
  const data = siapkanDataStruk(order(), { nama_toko: "Oman Jaya" }, {
    oleh: "Siti Kasir",
    pada: "2026-10-27T13:10:00+07:00",
  });

  const teks = teksStruk(data);
  assert.ok(teks.includes("PESANAN DIVERIFIKASI"));
  assert.ok(teks.includes("Oleh: Siti Kasir"));
  assert.ok(teks.includes("Pada: 27/10/2026 13:10"));
});

/**
 * Regresi payload NYATA `GET /api/transactions?dengan_item=1`.
 *
 * Baris `detail_transaksi` dari API memakai `harga_satuan`, bukan `harga`.
 * Kalau pemetaan ini meleset, struk yang dicetak saat verifikasi berisi
 * "Rp 0" untuk setiap item — dan kasir baru sadar setelah kertas tercetak.
 * Diuji dari bentuk respons apa adanya (bukan bentuk ideal), termasuk
 * `status_pembayaran` yang dipaksa "lunas" saat verifikasi.
 */
test("struk verifikasi dari payload API nyata mencetak harga_satuan, bukan Rp 0", () => {
  const barisApi = {
    id: 1,
    nama_produk: "Gelas Ukur Bening 450ml",
    nama_varian: null,
    nama_satuan: "pcs",
    jumlah: 1,
    harga_satuan: "5000.00",
    subtotal: "5000.00",
  };

  const data = siapkanDataStruk(
    {
      nomor_transaksi: "ORD-20261023-ZXI4YD",
      tanggal_transaksi: "2026-10-23T05:40:01.000000Z",
      pelanggan: { nama_pelanggan: "sitihamina", telepon: "082338328159" },
      metode_pembayaran: "Tunai",
      // Layar memaksa "lunas" karena verifikasi menandai pesanan sudah dibayar.
      status_pembayaran: "lunas",
      alamat_pengiriman: "Jl. Uji Tunai No. 2",
      catatan: null,
      subtotal: 5000,
      total_diskon: 0,
      total_bayar: 5000,
      items: [barisApi],
    } as any,
    { nama_toko: "Deadea Store" },
    { oleh: "QA Order Baru", pada: "2026-10-27T07:15:00Z" },
  );

  const teks = teksStruk(data);

  assert.ok(teks.includes("ORD-20261023-ZXI4YD"), teks);
  assert.ok(teks.includes("sitihamina"), teks);
  assert.ok(teks.includes("Gelas Ukur Bening 450ml"), teks);
  assert.ok(teks.includes("1 x Rp 5.000"), `harga_satuan tidak terbaca:\n${teks}`);
  assert.ok(teks.includes("LUNAS"), "verifikasi menandai lunas");
  assert.ok(!/BELUM BAYAR/i.test(teks), "struk verifikasi tidak boleh menyebut belum bayar");
  assert.ok(teks.includes("Oleh: QA Order Baru"), teks);
  assert.ok(teks.includes("Jl. Uji Tunai No. 2"), teks);
  assert.ok(!teks.includes("Rp 0 "), `ada nominal nol:\n${teks}`);
});
