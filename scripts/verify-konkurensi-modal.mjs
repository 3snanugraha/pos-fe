/**
 * Probe konkurensi overlay modal — inti bug "dialog stuck" di Android.
 *
 * Latar belakang teknis. Di react-native-web, `ModalContent` memberi
 * `aria-modal="true"` pada kontainer overlay SELALU, tetapi `role="dialog"`
 * hanya setelah animasi masuk selesai (`active`). Jadi menghitung
 * `[role="dialog"]` melewatkan jendela yang sedang dibuka.
 *
 * Di Android, setiap `<Modal>` adalah jendela `Dialog` Android sungguhan.
 * Dua jendela yang hidup bersamaan — atau satu dibuang sementara yang lain
 * dibuat pada commit yang sama — adalah kondisi yang membuat `WindowManager`
 * menolak/menaruh jendela baru di belakang (gejala: dialog tidak muncul
 * sampai BACK ditekan). Karena itu metrik yang benar adalah:
 *
 *   PUNCAK jumlah kontainer `[aria-modal="true"]` yang hidup bersamaan.
 *
 * Ideal (sesudah perbaikan): puncak = 1 sepanjang alur.
 * Sebelum perbaikan: puncak >= 2 pada alur "tutup dialog A + buka dialog B".
 *
 * Pemakaian: node scripts/verify-konkurensi-modal.mjs <baseUrl>
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

const pemantau = () => {
  window.__puncak = 0;
  window.__riwayat = [];
  const hitung = () => document.querySelectorAll('[aria-modal="true"]').length;
  const cek = () => {
    const n = hitung();
    if (n > window.__puncak) window.__puncak = n;
    if (window.__riwayat[window.__riwayat.length - 1] !== n) window.__riwayat.push(n);
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
};

const jalankan = async (nama, siapkanRute) => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
  await page.route("**/api/**", siapkanRute);
  await page.addInitScript(() => window.localStorage.setItem("auth_token", "uji"));
  await page.addInitScript(pemantau);

  await page.goto(`${BASE}/wishlist`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("Blender"), { timeout: 30000 });
  await page.evaluate(() => {
    window.__puncak = 0;
    window.__riwayat = [];
  });

  await page.locator('[aria-label*="Hapus" i]').first().click();
  await page.waitForTimeout(900);
  const saatKonfirmasi = await page.evaluate(() =>
    document.querySelectorAll('[aria-modal="true"]').length,
  );

  await page.getByRole("button", { name: "Hapus", exact: true }).first().click();
  await page.waitForTimeout(10000);

  const hasil = await page.evaluate(() => ({
    puncak: window.__puncak,
    riwayat: window.__riwayat,
    overlaySekarang: document.querySelectorAll('[aria-modal="true"]').length,
    teks: Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'))
      .map((e) => (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 70))
      .filter(Boolean),
  }));

  await browser.close();
  return { nama, saatKonfirmasi, ...hasil };
};

const gagal = async (route) => {
  const url = route.request().url();
  if (url.includes("wishlist")) {
    if (route.request().method() === "DELETE") {
      return route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"x"}' });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(WISHLIST),
    });
  }
  return route.abort();
};

const hasil = await jalankan("hapus gagal (dialog A ditutup, dialog B dibuka)", gagal);
console.log(JSON.stringify({ base: BASE, ...hasil }, null, 2));
