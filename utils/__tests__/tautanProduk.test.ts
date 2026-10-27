/**
 * Regresi tautan bagikan produk (versi web ecommerce).
 *
 * Jalankan: `node --test utils/__tests__/tautanProduk.test.ts`
 *
 * Yang dikunci:
 * - tautan selalu `/product/<id>` di origin WEB (bukan skema `deadeastore://`);
 * - prioritas origin: env `EXPO_PUBLIC_WEB_URL` → origin halaman → origin API;
 * - garis miring akhir tidak menghasilkan `//` di URL.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  normalisasiOrigin,
  pathProdukWeb,
  pesanBagikan,
  susunUrlProduk,
  tentukanOriginWeb,
} from "../tautanProduk.ts";

test("path produk memakai segmen /product/<id>", () => {
  assert.equal(pathProdukWeb(4501), "/product/4501");
  assert.equal(pathProdukWeb("4501"), "/product/4501");
  assert.equal(pathProdukWeb(" 4501 "), "/product/4501");
});

test("normalisasiOrigin membuang garis miring akhir dan spasi", () => {
  assert.equal(normalisasiOrigin("https://gudangperabot.my.id/"), "https://gudangperabot.my.id");
  assert.equal(normalisasiOrigin(" https://toko.test/// "), "https://toko.test");
  assert.equal(normalisasiOrigin(""), null);
  assert.equal(normalisasiOrigin(null), null);
  assert.equal(normalisasiOrigin(undefined), null);
});

test("env EXPO_PUBLIC_WEB_URL menang atas origin lain", () => {
  const origin = tentukanOriginWeb({
    envWebUrl: "https://toko.gudangperabot.my.id/",
    originHalaman: "https://app.gudangperabot.my.id",
    originApi: "https://gudangperabot.my.id",
  });
  assert.equal(origin, "https://toko.gudangperabot.my.id");
});

test("tanpa env: origin halaman (saat di web) dipakai", () => {
  const origin = tentukanOriginWeb({
    envWebUrl: "",
    originHalaman: "http://127.0.0.1:8133",
    originApi: "https://gudangperabot.my.id",
  });
  assert.equal(origin, "http://127.0.0.1:8133");
});

test("tanpa env & tanpa halaman (native): origin API dipakai", () => {
  const origin = tentukanOriginWeb({
    envWebUrl: null,
    originHalaman: null,
    originApi: "https://gudangperabot.my.id",
  });
  assert.equal(origin, "https://gudangperabot.my.id");
});

test("semua kosong → jatuh ke domain produksi", () => {
  assert.equal(tentukanOriginWeb({}), "https://gudangperabot.my.id");
});

test("URL produk absolut tidak dobel garis miring", () => {
  assert.equal(
    susunUrlProduk("https://toko.test/", 4501),
    "https://toko.test/product/4501"
  );
  assert.equal(
    susunUrlProduk("https://gudangperabot.my.id", "77"),
    "https://gudangperabot.my.id/product/77"
  );
});

test("pesan bagikan memuat nama produk dan URL", () => {
  const pesan = pesanBagikan("Lemari Pakaian 2 Pintu", "https://toko.test/product/9");
  assert.ok(pesan.includes("Lemari Pakaian 2 Pintu"));
  assert.ok(pesan.includes("https://toko.test/product/9"));
  // Nama kosong tidak menghasilkan pesan tanpa subjek.
  assert.ok(pesanBagikan("", "https://toko.test/product/9").startsWith("Produk"));
});
