/**
 * Regresi filter "Order Masuk" (layar kasir).
 *
 * Yang dikunci:
 *  - batas tanggal memakai tanggal LOKAL, bukan UTC (filter "Hari ini" tidak
 *    boleh kosong pada pagi hari WIB);
 *  - `end_date` inklusif dan preset 7/30 hari menghitung hari ini;
 *  - query selalu membawa `jenis=online` + whitelist parameter yang dikenal
 *    backend;
 *  - tanggal kustom divalidasi (termasuk 31 Februari) dan urutan dari/sampai;
 *  - pencarian kosong tidak mengirim `search=` yang membuat backend memfilter
 *    string kosong.
 *
 * Jalankan: `node --test src/lib/__tests__/filterOrder.test.ts`
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FILTER_AWAL,
  bangunQueryOrder,
  galatTanggalKustom,
  geserHari,
  jumlahFilterAktif,
  rentangTanggal,
  ringkasFilter,
  tanggalLokalISO,
  tanggalTampil,
  validasiTanggal,
  type FilterOrder,
} from "../filterOrder.ts";

/** 27 Okt 2026 06:30 WIB — jam di mana konversi UTC akan memundurkan tanggal. */
const PAGI = new Date(2026, 9, 27, 6, 30, 0);

const filter = (ubah: Partial<FilterOrder> = {}): FilterOrder => ({ ...FILTER_AWAL, ...ubah });

test("tanggalLokalISO memakai tanggal lokal, bukan UTC", () => {
  assert.equal(tanggalLokalISO(PAGI), "2026-10-27");
  // Bukti kenapa bukan toISOString(): pada WIB 06.30 nilainya masih 26 Okt UTC.
  assert.equal(PAGI.toISOString().slice(0, 10), "2026-10-26");
});

test("geserHari menyeberangi batas bulan dan tahun", () => {
  assert.equal(tanggalLokalISO(geserHari(new Date(2026, 9, 3), -6)), "2026-09-27");
  assert.equal(tanggalLokalISO(geserHari(new Date(2026, 0, 3), -6)), "2025-12-28");
});

test("preset hari ini / 7 hari / 30 hari / semua", () => {
  assert.deepEqual(rentangTanggal(filter({ rentang: "hari_ini" }), PAGI), {
    start_date: "2026-10-27",
    end_date: "2026-10-27",
  });

  // 7 hari termasuk hari ini → 21..27 Okt.
  assert.deepEqual(rentangTanggal(filter({ rentang: "7_hari" }), PAGI), {
    start_date: "2026-10-21",
    end_date: "2026-10-27",
  });

  assert.deepEqual(rentangTanggal(filter({ rentang: "30_hari" }), PAGI), {
    start_date: "2026-09-28",
    end_date: "2026-10-27",
  });

  assert.deepEqual(rentangTanggal(filter({ rentang: "semua" }), PAGI), {});
});

test("rentang kustom hanya mengirim batas yang valid (boleh satu sisi)", () => {
  assert.deepEqual(
    rentangTanggal(filter({ rentang: "kustom", dariTanggal: "2026-10-01" }), PAGI),
    { start_date: "2026-10-01" }
  );

  assert.deepEqual(
    rentangTanggal(
      filter({ rentang: "kustom", dariTanggal: "2026-10-01", sampaiTanggal: "2026-10-05" }),
      PAGI
    ),
    { start_date: "2026-10-01", end_date: "2026-10-05" }
  );

  // Tanggal tidak valid tidak boleh lolos ke API (hasil kosong tanpa sebab).
  assert.deepEqual(
    rentangTanggal(filter({ rentang: "kustom", dariTanggal: "2026-02-31" }), PAGI),
    {}
  );
});

test("validasiTanggal menolak format dan tanggal yang tidak ada", () => {
  assert.equal(validasiTanggal("2026-10-27"), true);
  assert.equal(validasiTanggal("2026-02-28"), true);
  assert.equal(validasiTanggal("2024-02-29"), true); // kabisat
  assert.equal(validasiTanggal("2026-02-29"), false);
  assert.equal(validasiTanggal("2026-02-31"), false);
  assert.equal(validasiTanggal("27-10-2026"), false);
  assert.equal(validasiTanggal(""), false);
  assert.equal(validasiTanggal("2026-13-01"), false);
});

test("bangunQueryOrder selalu membawa jenis=online dan parameter yang dikenal API", () => {
  const q = bangunQueryOrder(
    filter({
      status: "pending",
      rentang: "7_hari",
      metodePembayaranId: 8,
      cari: "  budi  ",
    }),
    PAGI
  );

  const params = new URLSearchParams(q);

  assert.equal(params.get("jenis"), "online");
  assert.equal(params.get("dengan_item"), "1");
  assert.equal(params.get("status"), "pending");
  assert.equal(params.get("start_date"), "2026-10-21");
  assert.equal(params.get("end_date"), "2026-10-27");
  assert.equal(params.get("metode_pembayaran_id"), "8");
  assert.equal(params.get("search"), "budi", "spasi di tepi harus dipangkas");
  assert.equal(params.get("per_page"), "50");
  assert.equal(params.get("sort_by"), "tanggal_transaksi");
  assert.equal(params.get("sort_direction"), "desc");

  // Tidak ada parameter yang tidak dikenal backend.
  const dikenal = new Set([
    "jenis",
    "dengan_item",
    "status",
    "start_date",
    "end_date",
    "metode_pembayaran_id",
    "search",
    "per_page",
    "sort_by",
    "sort_direction",
    "page",
  ]);
  for (const kunci of params.keys()) {
    assert.ok(dikenal.has(kunci), `parameter tak dikenal: ${kunci}`);
  }
});

test("halaman hanya dikirim bila lebih dari 1 (halaman pertama tetap bersih)", () => {
  assert.equal(new URLSearchParams(bangunQueryOrder(filter(), PAGI)).get("page"), null);
  assert.equal(
    new URLSearchParams(bangunQueryOrder(filter(), PAGI, 1)).get("page"),
    null,
    "halaman 1 adalah default server — mengirimnya hanya menambah noise"
  );
  assert.equal(
    new URLSearchParams(bangunQueryOrder(filter(), PAGI, 3)).get("page"),
    "3",
    "tanpa `page`, order ke-51 dan seterusnya tidak bisa dijangkau"
  );
});

test("status semua dan pencarian kosong tidak mengirim parameter", () => {
  const params = new URLSearchParams(
    bangunQueryOrder(filter({ status: "semua", rentang: "semua", cari: "   " }), PAGI)
  );

  assert.equal(params.get("status"), null);
  assert.equal(params.get("search"), null);
  assert.equal(params.get("start_date"), null);
  assert.equal(params.get("end_date"), null);
  assert.equal(params.get("jenis"), "online");
});

test("galatTanggalKustom menjelaskan setiap kesalahan yang mungkin", () => {
  assert.equal(galatTanggalKustom(filter({ rentang: "7_hari" })), null);

  assert.match(
    String(galatTanggalKustom(filter({ rentang: "kustom" }))),
    /Isi tanggal mulai atau tanggal akhir/
  );

  assert.match(
    String(galatTanggalKustom(filter({ rentang: "kustom", dariTanggal: "2026-02-31" }))),
    /tidak valid/
  );

  assert.match(
    String(
      galatTanggalKustom(
        filter({ rentang: "kustom", dariTanggal: "2026-10-10", sampaiTanggal: "2026-10-01" })
      )
    ),
    /tidak boleh setelah/
  );

  assert.equal(
    galatTanggalKustom(
      filter({ rentang: "kustom", dariTanggal: "2026-10-01", sampaiTanggal: "2026-10-10" })
    ),
    null
  );
});

test("jumlahFilterAktif menghitung filter di luar default", () => {
  assert.equal(jumlahFilterAktif(filter()), 0);

  assert.equal(jumlahFilterAktif(filter({ cari: "budi" })), 1);
  assert.equal(jumlahFilterAktif(filter({ metodePembayaranId: 4 })), 1);
  assert.equal(jumlahFilterAktif(filter({ rentang: "hari_ini" })), 1);
  assert.equal(jumlahFilterAktif(filter({ status: "selesai" })), 1);

  assert.equal(
    jumlahFilterAktif(
      filter({ status: "selesai", rentang: "hari_ini", metodePembayaranId: 4, cari: "a" })
    ),
    4
  );
});

test("ringkasFilter & tanggalTampil memberi keterangan yang terbaca", () => {
  assert.equal(tanggalTampil("2026-10-27"), "27/10/2026");
  assert.equal(tanggalTampil("bukan-tanggal"), "bukan-tanggal");

  const ringkas = ringkasFilter(
    filter({ status: "pending", rentang: "kustom", dariTanggal: "2026-10-01", cari: "budi" })
  );

  assert.ok(ringkas.includes("Status: Menunggu"));
  assert.ok(ringkas.includes("01/10/2026"));
  assert.ok(ringkas.includes("Cari: budi"));
});
