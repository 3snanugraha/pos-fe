/**
 * Regresi dev warning
 * "The action GO_BACK was not handled by any navigator".
 *
 * Jalankan: `node --test src/lib/__tests__/navigasi.test.ts`
 *
 * Layar seperti /checkout/success, /orders/[id], /product/[id] bisa dibuka
 * langsung lewat URL/deep link, sehingga stack navigasi kosong. `router.back()`
 * tanpa penjagaan memicu warning itu (dan di produksi tombol kembali mati).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { kembaliAman, kembaliKe } from "../navigasi.ts";

type Panggilan = { metode: "back" | "replace"; tujuan?: string };

const routerPalsu = (canGoBack: boolean) => {
  const panggilan: Panggilan[] = [];
  return {
    panggilan,
    router: {
      canGoBack: () => canGoBack,
      back: () => {
        panggilan.push({ metode: "back" });
      },
      replace: (tujuan: string) => {
        panggilan.push({ metode: "replace", tujuan });
      },
    },
  };
};

test("kembaliAman memakai back() bila ada riwayat", () => {
  const { router, panggilan } = routerPalsu(true);
  kembaliAman(router as never, "/");
  assert.deepEqual(panggilan, [{ metode: "back" }]);
});

test("kembaliAman replace ke fallback bila stack kosong (deep link)", () => {
  const { router, panggilan } = routerPalsu(false);
  kembaliAman(router as never, "/");
  assert.deepEqual(panggilan, [{ metode: "replace", tujuan: "/" }]);
});

test("kembaliAman memakai fallback spesifik per layar", () => {
  const { router, panggilan } = routerPalsu(false);
  kembaliAman(router as never, "/orders");
  assert.deepEqual(panggilan, [{ metode: "replace", tujuan: "/orders" }]);
});

test("kembaliKe menuju tujuan yang diminta saat stack kosong", () => {
  const { router, panggilan } = routerPalsu(false);
  kembaliKe(router as never, "/addresses");
  assert.deepEqual(panggilan, [{ metode: "replace", tujuan: "/addresses" }]);
});

test("tidak pernah memanggil back() tanpa canGoBack", () => {
  const { router, panggilan } = routerPalsu(false);
  kembaliAman(router as never);
  assert.ok(panggilan.every((p) => p.metode !== "back"));
});
