/**
 * Probe DOM: perilaku dialog di build web (react-native-web).
 *
 * Dipakai untuk merekam KEADAAN SEBELUM dan SESUDAH perbaikan dialog.
 * Menjalankan Chromium headless, menyemai keranjang ke localStorage
 * (AsyncStorage web = localStorage), lalu mengukur:
 *   1. berapa elemen [role="dialog"] hidup saat sebuah dialog dibuka;
 *   2. apakah dialog benar-benar tampil pada pemanggilan PERTAMA;
 *   3. apakah dialog bisa dibuka ulang segera setelah ditutup;
 *   4. apakah dua dialog bersaudara (tutup A + buka B dalam satu commit)
 *      menghasilkan dua jendela sekaligus.
 *
 * Jalankan:
 *   node scripts/verify-dialog-dom.mjs <baseUrl> [--json <berkas>]
 */
import { writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

/**
 * Playwright TIDAK menjadi dependensi proyek ini (tidak dipakai runtime).
 * Skrip mencari salinan yang tersedia: env `PLAYWRIGHT_PATH`, lalu cache npx.
 */
const kandidatPlaywright = [
  process.env.PLAYWRIGHT_PATH,
  join(process.cwd(), "node_modules", "playwright", "index.mjs"),
  join(
    process.env.LOCALAPPDATA || "",
    "npm-cache",
    "_npx",
    "e41f203b7505f1fb",
    "node_modules",
    "playwright",
    "index.mjs",
  ),
].filter(Boolean);

const muatPlaywright = async () => {
  for (const jalur of kandidatPlaywright) {
    if (jalur.startsWith("file:") || existsSync(jalur)) {
      return import(jalur.startsWith("file:") ? jalur : pathToFileURL(jalur).href);
    }
  }
  throw new Error(
    "Playwright tidak ditemukan. Set PLAYWRIGHT_PATH ke index.mjs playwright.",
  );
};


const BASE = process.argv[2] || "http://127.0.0.1:8792";
const jsonIdx = process.argv.indexOf("--json");
const OUT = jsonIdx > -1 ? process.argv[jsonIdx + 1] : null;

const KERANJANG = [
  {
    id: 4502000000,
    produk_id: 4502,
    nama_produk: "Blender Cosmos 2 Liter",
    harga: 80000,
    harga_ecer: 80000,
    nama_tier: "Ecer",
    quantity: 2,
    stok_tersedia: 15,
    subtotal: 160000,
    tier: [
      { nama_tier: "Ecer", harga: 80000, min_qty: 1, is_default: true },
      { nama_tier: "Grosir 1", harga: 70000, min_qty: 12 },
    ],
  },
  {
    id: 4503000000,
    produk_id: 4503,
    nama_produk: "Kipas Angin Meja",
    harga: 55000,
    harga_ecer: 55000,
    nama_tier: "Ecer",
    quantity: 1,
    stok_tersedia: 4,
    subtotal: 55000,
    tier: [{ nama_tier: "Ecer", harga: 55000, min_qty: 1, is_default: true }],
  },
];

const hasil = { base: BASE, waktu: new Date().toISOString(), langkah: [] };

const catat = (nama, data) => {
  hasil.langkah.push({ nama, ...data });
  console.log(`\n### ${nama}`);
  for (const [k, v] of Object.entries(data)) {
    console.log(`  ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  }
};

/** Jumlah elemen dialog yang benar-benar terlihat (punya ukuran & bukan hidden). */
const hitungDialog = (page) =>
  page.evaluate(() => {
    const semua = Array.from(document.querySelectorAll('[role="dialog"]'));
    const terlihat = semua.filter((el) => {
      const r = el.getBoundingClientRect();
      const gaya = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        gaya.display !== "none" &&
        gaya.visibility !== "hidden" &&
        Number(gaya.opacity) > 0.05 &&
        el.getAttribute("aria-hidden") !== "true"
      );
    });
    return {
      total: semua.length,
      terlihat: terlihat.length,
      teks: terlihat.map((el) => (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120)),
    };
  });

const teksHalaman = (page) =>
  page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim());

const klikLabel = async (page, label, opsi = {}) => {
  const loc = page.locator(`[aria-label="${label}"]`).first();
  await loc.click({ timeout: 8000, ...opsi });
};

const run = async () => {
  const { chromium } = await muatPlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // Backend tidak dipakai: seluruh request ke API digagalkan supaya hasil
  // deterministik (keranjang dibaca dari localStorage, bukan dari server).
  await page.route("**/api/**", (route) => route.abort());
  await page.addInitScript((cart) => {
    window.localStorage.setItem("@cart_items", JSON.stringify(cart));
  }, KERANJANG);

  const galatKonsol = [];
  page.on("pageerror", (e) => galatKonsol.push(String(e).slice(0, 200)));

  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => (document.body.innerText || "").includes("Blender Cosmos 2 Liter"),
    { timeout: 25000 },
  );
  catat("01. keranjang termuat", { teks: (await teksHalaman(page)).slice(0, 220) });

  // --- A. Buka dialog hapus item (tombol trash) -------------------------
  const sebelum = await hitungDialog(page);
  await klikLabel(page, "Hapus Blender Cosmos 2 Liter dari keranjang");
  await page.waitForTimeout(600);
  const sesudah = await hitungDialog(page);
  catat("02. dialog hapus item (pemanggilan pertama)", {
    dialogSebelum: sebelum.total,
    dialogSesudah: sesudah.total,
    dialogTerlihat: sesudah.terlihat,
    teksDialog: sesudah.teks,
    "MUNCUL_PADA_PANGGILAN_PERTAMA": sesudah.terlihat === 1 ? "YA" : "TIDAK",
  });

  // --- B. Tutup dengan Batal, lalu buka lagi (uji "pemicu ulang") --------
  const adaBatal = await page.locator('[role="dialog"] button, [role="dialog"] [role="button"]').first().isVisible().catch(() => false);
  hasil.langkah.push({ nama: "03. kontrol di dalam dialog", adaTombol: adaBatal });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const setelahTutup = await hitungDialog(page);

  await klikLabel(page, "Hapus Blender Cosmos 2 Liter dari keranjang");
  await page.waitForTimeout(600);
  const bukaUlang = await hitungDialog(page);
  catat("03. tutup (Escape) lalu buka ulang segera", {
    "dialog_setelah_tutup": setelahTutup.terlihat,
    "dialog_setelah_buka_ulang": bukaUlang.terlihat,
    "BUKA_ULANG_BERHASIL": bukaUlang.terlihat === 1 ? "YA" : "TIDAK",
  });

  // Tutup lagi supaya bersih.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // --- C. Dua dialog bersaudara: tutup A + buka B dalam satu commit ------
  // Stepper punya dialog sendiri (qty 1 → tombol −). Keranjang punya dialog
  // hapus. Membuka keduanya berurutan menguji penumpukan jendela.
  const dialogPerAksi = [];
  for (const nama of ["Blender Cosmos 2 Liter", "Kipas Angin Meja"]) {
    await klikLabel(page, `Hapus ${nama} dari keranjang`);
    await page.waitForTimeout(500);
    const d = await hitungDialog(page);
    dialogPerAksi.push({ nama, terlihat: d.terlihat, total: d.total });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const setelah = await hitungDialog(page);
    dialogPerAksi.push({ nama: `${nama} (setelah tutup)`, terlihat: setelah.terlihat, total: setelah.total });
  }
  catat("04. buka/tutup berulang tiap baris keranjang", {
    urutan: dialogPerAksi,
    "SISA_DIALOG_SETELAH_SEMUA_DITUTUP": (await hitungDialog(page)).total,
  });

  // --- D. Qty manual: apakah angka qty bisa diketik? --------------------
  const qtyProbe = await page.evaluate(() => {
    const input = Array.from(document.querySelectorAll("input")).find((el) => {
      const v = el.value;
      return /^\d+$/.test(v) && Number(v) <= 99;
    });
    return input
      ? { ada: true, nilai: input.value, inputMode: input.getAttribute("inputmode") }
      : { ada: false, nilai: null, inputMode: null };
  });
  catat("05. input qty manual di keranjang", {
    ...qtyProbe,
    "QTY_BISA_DIKETIK": qtyProbe.ada ? "YA" : "TIDAK",
  });

  catat("06. galat halaman", { jumlah: galatKonsol.length, contoh: galatKonsol.slice(0, 3) });

  await browser.close();

  if (OUT) {
    writeFileSync(OUT, JSON.stringify(hasil, null, 2), "utf8");
    console.log(`\nJSON disimpan: ${OUT}`);
  }
  return hasil;
};

run().catch((e) => {
  console.error("PROBE GAGAL:", e);
  process.exit(1);
});
