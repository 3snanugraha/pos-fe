/**
 * Probe pembanding: perilaku dialog + qty pada build SEBELUM perbaikan.
 *
 * Sama seperti `verify-dialog-qty-dom.mjs` tetapi TIDAK mengasumsikan adanya
 * `data-testid="stepper-input"` (build lama tidak punya input qty), sehingga
 * bisa dijalankan pada ekspor web dari commit mana pun.
 *
 * Pemakaian: node scripts/verify-baseline-dom.mjs <baseUrl>
 */
const { chromium } = await import(
  process.env.PLAYWRIGHT_PATH ||
    "file:///C:/Users/userU/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs"
);

const BASE = process.argv[2] || "http://127.0.0.1:8792";
const KERANJANG = [
  {
    id: 4502000000,
    produk_id: 4502,
    nama_produk: "Blender Cosmos 2 Liter",
    harga: 80000,
    harga_ecer: 80000,
    quantity: 2,
    stok_tersedia: 15,
    subtotal: 160000,
    tier: [
      { nama_tier: "Ecer", harga: 80000, min_qty: 1, is_default: true },
      { nama_tier: "Grosir 1", harga: 70000, min_qty: 12 },
    ],
  },
];

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
await page.route("**/api/**", (r) => r.abort());
await page.addInitScript((cart) => {
  window.localStorage.setItem("@cart_items", JSON.stringify(cart));
  window.localStorage.setItem("auth_token", "uji");
}, KERANJANG);

const hitung = () =>
  page.evaluate(() => {
    const semua = Array.from(document.querySelectorAll('[role="dialog"]'));
    const terlihat = semua.filter((el) => {
      const r = el.getBoundingClientRect();
      const g = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && g.display !== "none" && Number(g.opacity) > 0.05;
    });
    const inputNumerik = Array.from(document.querySelectorAll("input")).filter(
      (el) => el.getAttribute("inputmode") === "numeric" || el.type === "number",
    );
    return {
      dialogTotal: semua.length,
      dialogTerlihat: terlihat.length,
      teks: terlihat.map((e) => (e.innerText || "").replace(/\s+/g, " ").slice(0, 90)),
      inputQty: inputNumerik.map((e) => ({ value: e.value, testid: e.getAttribute("data-testid") })),
      ringkas: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 200),
    };
  });

await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("Blender"), { timeout: 30000 });

const hasil = { base: BASE };

// 1. dialog hapus pada pemanggilan pertama
await page.locator('[aria-label="Hapus Blender Cosmos 2 Liter dari keranjang"]').first().click();
await page.waitForTimeout(900);
hasil.dialogPertama = await hitung();

// 2. tutup + buka ulang
await page.getByRole("button", { name: "Batal", exact: true }).first().click();
await page.waitForTimeout(800);
hasil.setelahTutup = await hitung();
await page.locator('[aria-label="Hapus Blender Cosmos 2 Liter dari keranjang"]').first().click();
await page.waitForTimeout(900);
hasil.setelahBukaUlang = await hitung();
await page.keyboard.press("Escape");
await page.waitForTimeout(600);

// 3. qty manual tersedia?
hasil.qty = await hitung();

// 4. hitungan dialog yang dirender di keranjang (DOM, tanpa dibuka)
hasil.dialogDiDom = await page.evaluate(() => document.querySelectorAll('[role="dialog"]').length);

await browser.close();
console.log(JSON.stringify(hasil, null, 2));
