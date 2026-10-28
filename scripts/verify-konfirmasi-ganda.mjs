/**
 * Probe konfirmasi ganda hapus item keranjang.
 *
 * Sebelum perbaikan, menekan tombol − pada qty 1 memunculkan dialog milik
 * `Stepper`, lalu setelah "Hapus" ditekan muncul LAGI dialog milik layar
 * keranjang — pengguna mengonfirmasi dua kali untuk satu tindakan, dan dua
 * jendela modal bertukar pada commit yang sama (pemicu bug dialog stuck).
 *
 * Metrik: berapa kali teks "Hapus Produk?" muncul selama satu alur hapus,
 * dan berapa dialog berbeda yang tampil.
 *
 * Pemakaian: node scripts/verify-konfirmasi-ganda.mjs <baseUrl>
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
    quantity: 1,
    stok_tersedia: 15,
    subtotal: 80000,
  },
];

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
await page.route("**/api/**", (r) => r.abort());
await page.addInitScript((cart) => {
  window.localStorage.setItem("@cart_items", JSON.stringify(cart));
  window.localStorage.setItem("auth_token", "uji");
}, KERANJANG);

// Catat setiap kali overlay modal baru MUNCUL (0 → 1), bukan setiap mutasi.
await page.addInitScript(() => {
  window.__kemunculan = [];
  let sebelumnya = 0;
  const cek = () => {
    const n = document.querySelectorAll('[aria-modal="true"]').length;
    if (n > sebelumnya) {
      const teks = (document.querySelector('[aria-modal="true"]')?.innerText || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      window.__kemunculan.push(teks);
    }
    sebelumnya = n;
  };
  const pasang = () => {
    if (!document.documentElement) {
      setTimeout(pasang, 5);
      return;
    }
    new MutationObserver(cek).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-modal", "role"],
    });
    cek();
  };
  pasang();
});

await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("Blender"), { timeout: 30000 });
await page.evaluate(() => {
  window.__kemunculan = [];
});

const hasil = { base: BASE };

// Alur: qty 1 → tekan "−" (Stepper menawarkan hapus) → konfirmasi.
await page.locator('[aria-label="Kurangi jumlah"]').first().click();
await page.waitForTimeout(900);
hasil.setelahTombolMinus = await page.evaluate(() =>
  Array.from(document.querySelectorAll('[aria-modal="true"]')).map((e) =>
    (e.innerText || "").replace(/\s+/g, " ").slice(0, 80),
  ),
);

const adaDialog = hasil.setelahTombolMinus.length > 0;
if (adaDialog) {
  await page.getByRole("button", { name: "Hapus", exact: true }).first().click();
  await page.waitForTimeout(1200);
  hasil.setelahKonfirmasiPertama = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-modal="true"]')).map((e) =>
      (e.innerText || "").replace(/\s+/g, " ").slice(0, 80),
    ),
  );
  const masihAda = hasil.setelahKonfirmasiPertama.length > 0;
  if (masihAda) {
    await page.getByRole("button", { name: "Hapus", exact: true }).first().click();
    await page.waitForTimeout(900);
  }
  hasil.konfirmasiKeduaDiperlukan = masihAda;
}

hasil.kemunculanDialog = await page.evaluate(() => window.__kemunculan);
hasil.jumlahDialogMuncul = hasil.kemunculanDialog.length;
hasil.teksAkhirHalaman = await page.evaluate(() =>
  document.body.innerText.replace(/\s+/g, " ").slice(0, 120),
);

await browser.close();
console.log(JSON.stringify(hasil, null, 2));
