/**
 * Probe pola "tutup dialog A + buka dialog B pada commit yang sama".
 *
 * Inilah pola yang memicu bug "dialog tidak muncul" di Android. Di web, pola
 * ini terlihat sebagai dua elemen [role="dialog"] yang pernah hidup bersamaan
 * atau sebagai dialog yang hilang setelah aksi gagal.
 *
 * Skenario: wishlist → hapus item. Bila penghapusan GAGAL, kode menutup dialog
 * konfirmasi dan langsung membuka dialog pesan galat pada commit yang sama.
 *
 * Pemakaian: node scripts/verify-swap-dom.mjs <baseUrl>
 */
const { chromium } = await import(
  process.env.PLAYWRIGHT_PATH ||
    "file:///C:/Users/userU/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs"
);

const BASE = process.argv[2] || "http://127.0.0.1:8792";

const WISHLIST = {
  data: [
    {
      id: 77,
      produk_id: 4502,
      nama_produk: "Blender Cosmos 2 Liter",
      harga: 80000,
      gambar_url: null,
      stok: 15,
    },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 50, total: 1 },
};

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();

// DELETE gagal → memicu jalur "tutup konfirmasi + buka pesan galat".
await page.route("**/api/**", (r) => r.abort());
await page.route("**/api/customer/wishlist/*", (r) =>
  r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"gagal"}' }),
);
await page.route("**/api/customer/wishlist?*", (r) =>
  r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(WISHLIST) }),
);
await page.addInitScript(() => {
  window.localStorage.setItem("auth_token", "uji");
});

// Rekam puncak jumlah dialog yang hidup bersamaan.
await page.addInitScript(() => {
  window.__puncak = 0;
  window.__riwayat = [];
  const cek = () => {
    const n = document.querySelectorAll('[role="dialog"]').length;
    if (n > window.__puncak) window.__puncak = n;
    if (window.__riwayat[window.__riwayat.length - 1] !== n) window.__riwayat.push(n);
  };
  // addInitScript berjalan sebelum <html> ada; tunggu documentElement siap.
  const pasang = () => {
    if (!document.documentElement) {
      setTimeout(pasang, 10);
      return;
    }
    new MutationObserver(cek).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    cek();
  };
  pasang();
});

await page.goto(`${BASE}/wishlist`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("Blender"), { timeout: 30000 });

const hasil = { base: BASE };

const hitung = () =>
  page.evaluate(() => {
    const semua = Array.from(document.querySelectorAll('[role="dialog"]'));
    const terlihat = semua.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && Number(getComputedStyle(el).opacity) > 0.05;
    });
    return {
      total: semua.length,
      terlihat: terlihat.length,
      teks: terlihat.map((e) => (e.innerText || "").replace(/\s+/g, " ").slice(0, 80)),
    };
  });

// Buka dialog hapus (dialog pertama di layar ini).
const tombolHapus = page.locator('[aria-label*="Hapus" i]').first();
hasil.tombolHapusDitemukan = await tombolHapus.count();
await tombolHapus.click();
await page.waitForTimeout(800);
hasil.dialogKonfirmasi = await hitung();

// Konfirmasi hapus → server 500 → kode menutup dialog A lalu membuka dialog B.
await page.getByRole("button", { name: "Hapus", exact: true }).first().click();
await page.waitForTimeout(9000);
hasil.setelahGagal = await hitung();
hasil.puncakDialogBersamaan = await page.evaluate(() => window.__puncak);
hasil.riwayatJumlahDialog = await page.evaluate(() => window.__riwayat);

await browser.close();
console.log(JSON.stringify(hasil, null, 2));
