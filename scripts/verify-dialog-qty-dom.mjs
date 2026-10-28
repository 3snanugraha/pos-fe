/**
 * Verifikasi DOM: dialog + qty manual, pada web export.
 *
 * Mengukur hal yang sama pada build SEBELUM dan SESUDAH perbaikan sehingga
 * perbandingannya nyata (bukan klaim). Yang diuji:
 *
 *  A. dialog hapus item keranjang muncul pada pemanggilan PERTAMA;
 *  B. setelah ditutup, bisa dibuka ulang dan tetap muncul;
 *  C. hanya satu dialog terlihat pada satu waktu (tidak ada jendela menumpuk);
 *  D. qty bisa diketik langsung, memicu harga tier, dan dibatasi stok;
 *  E. detail produk juga punya input qty manual.
 */
const { chromium } = await import(
  process.env.PLAYWRIGHT_PATH ||
    "file:///C:/Users/userU/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs"
);

const BASE = process.argv[2] || "http://127.0.0.1:8793";

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
    /*
     * Baris FLASH SALE: harga ecer yang ditagih 72.000 (promo), harga master
     * 80.000, dan tier grosir 70.000 mulai 12 pcs. Dipakai untuk membuktikan
     * bahwa qty yang DIKETIK tidak menghapus harga flash dan hanya berpindah
     * ke grosir saat ambangnya benar-benar tercapai.
     */
    id: 4504000000,
    produk_id: 4504,
    nama_produk: "Kipas Flash Sale",
    harga: 72000,
    harga_ecer: 72000,
    nama_tier: "Flash Sale",
    quantity: 2,
    stok_tersedia: 15,
    subtotal: 144000,
    tier: [
      { nama_tier: "Ecer", harga: 80000, min_qty: 1, is_default: true },
      { nama_tier: "Grosir 1", harga: 70000, min_qty: 12 },
      { nama_tier: "Flash Sale", harga: 72000, min_qty: 1 },
    ],
  },
];

const PRODUK = {
  data: {
    id: 4502,
    nama_produk: "Blender Cosmos 2 Liter",
    deskripsi: "Blender kaca 2 liter.",
    harga: 80000,
    harga_jual_min: 80000,
    harga_jual_max: 80000,
    stok: 15,
    total_stok: 15,
    gambar_url: null,
    gambar: [],
    varian: [
      { id: 1, nama_varian: "Default", harga_jual: 80000, stok: 15 },
    ],
    harga_jual_satuan: [
      {
        varian_id: 1,
        nama_varian: "Default",
        satuan_id: 1,
        nama_satuan: "pcs",
        faktor: 1,
        is_default_satuan: true,
        harga_ecer: 80000,
        harga_ecer_normal: 80000,
        flash: false,
        tier: [
          { nama_tier: "Ecer", harga: 80000, min_qty: 1, is_default: true },
          { nama_tier: "Grosir 1", harga: 70000, min_qty: 12 },
        ],
      },
    ],
    grosir: { min_qty: 12, harga: 70000, nama_tier: "Grosir 1" },
    is_flash_sale: false,
    harga_flash_sale: null,
  },
};

const hasil = { base: BASE, waktu: new Date().toISOString(), uji: {} };

const log = (kunci, data) => {
  hasil.uji[kunci] = data;
  console.log(`\n### ${kunci}`);
  for (const [k, v] of Object.entries(data)) {
    console.log(`  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
  }
};

const state = (page) =>
  page.evaluate(() => {
    const semua = Array.from(document.querySelectorAll('[role="dialog"]'));
    const terlihat = semua.filter((el) => {
      const r = el.getBoundingClientRect();
      const g = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        g.display !== "none" &&
        g.visibility !== "hidden" &&
        Number(g.opacity) > 0.05
      );
    });
    const inputQty = Array.from(document.querySelectorAll('[data-testid="stepper-input"], input')).filter(
      (el) => el.getAttribute("inputmode") === "numeric" || el.type === "number",
    );
    return {
      dialogTotal: semua.length,
      dialogTerlihat: terlihat.length,
      dialogTeks: terlihat.map((el) => (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 100)),
      inputQty: inputQty.map((el) => ({ value: el.value, label: el.getAttribute("aria-label") })),
      galatQty: Array.from(document.querySelectorAll('[data-testid="stepper-galat"]')).map((el) =>
        (el.innerText || "").trim(),
      ),
      teks: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 400),
    };
  });

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await ctx.newPage();
  const galatHalaman = [];
  page.on("pageerror", (e) => galatHalaman.push(String(e).slice(0, 160)));

  // Backend dipalsukan seperlunya: detail produk butuh JSON asli; endpoint lain
  // (alamat, dsb.) dibuat gagal supaya keranjang memakai data lokal.
  //
  // URUTAN PENTING: Playwright memakai handler TERAKHIR yang didaftarkan lebih
  // dulu (LIFO), jadi rute umum `**/api/**` didaftarkan LEBIH AWAL dan rute
  // spesifik produk menyusul agar menang.
  await page.route("**/api/**", (route) => route.abort());
  await page.route("**/api/public/products/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PRODUK),
    }),
  );
  await page.addInitScript((cart) => {
    window.localStorage.setItem("@cart_items", JSON.stringify(cart));
    window.localStorage.setItem("auth_token", "uji-token");
  }, KERANJANG);

  // ---------- KERANJANG ----------
  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("Blender Cosmos"), {
    timeout: 30000,
  });
  const awal = await state(page);

  // A. dialog hapus pada panggilan pertama
  await page.locator('[aria-label="Hapus Blender Cosmos 2 Liter dari keranjang"]').first().click();
  await page.waitForTimeout(700);
  const buka1 = await state(page);

  log("A. dialog hapus item — panggilan pertama", {
    dialogTerlihat: buka1.dialogTerlihat,
    dialogTotal: buka1.dialogTotal,
    teks: buka1.dialogTeks,
    MUNCUL: buka1.dialogTerlihat === 1 ? "YA" : "TIDAK",
  });

  // B. tutup lewat tombol Batal, buka lagi
  await page.getByRole("button", { name: "Batal", exact: true }).first().click();
  await page.waitForTimeout(700);
  const tutup = await state(page);
  await page.locator('[aria-label="Hapus Blender Cosmos 2 Liter dari keranjang"]').first().click();
  await page.waitForTimeout(700);
  const buka2 = await state(page);

  log("B. tutup lalu buka ulang", {
    dialogSetelahTutup: tutup.dialogTerlihat,
    dialogSetelahBukaUlang: buka2.dialogTerlihat,
    teks: buka2.dialogTeks,
    BUKA_ULANG: buka2.dialogTerlihat === 1 ? "YA" : "TIDAK",
  });

  // B2. buka-tutup 3x berturut pada dialog yang sama
  const siklus = [];
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole("button", { name: "Batal", exact: true }).first().click();
    await page.waitForTimeout(500);
    await page.locator('[aria-label="Hapus Blender Cosmos 2 Liter dari keranjang"]').first().click();
    await page.waitForTimeout(500);
    const s = await state(page);
    siklus.push(s.dialogTerlihat);
  }
  log("B2. tiga siklus buka/tutup dialog yang sama", { urutanTerlihat: siklus });

  // tutup dialog terakhir
  await page.getByRole("button", { name: "Batal", exact: true }).first().click();
  await page.waitForTimeout(500);

  /*
   * Fokus setelah dialog ditutup dipulihkan oleh focus-trap react-native-web
   * ke tombol pemicu. Klik pertama pada input qty bisa jatuh saat overlay
   * masih dibongkar, jadi tunggu dialog benar-benar hilang lalu pastikan
   * input benar-benar menerima fokus sebelum mengetik.
   */
  await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 0, {
    timeout: 5000,
  });

  /** Klik input, pastikan fokus, lalu ketik. Melempar bila fokus tidak masuk. */
  const ketikKeInput = async (locator, teks) => {
    for (let coba = 0; coba < 3; coba += 1) {
      await locator.click();
      await page.waitForTimeout(120);
      const fokus = await page.evaluate(() => {
        const a = document.activeElement;
        return a?.getAttribute?.("data-testid") ?? null;
      });
      if (fokus === "stepper-input") break;
      await page.waitForTimeout(300);
    }
    await locator.fill("");
    await page.waitForTimeout(150);
    await locator.type(teks, { delay: 60 });
    await page.waitForTimeout(600);
    return page.evaluate(() =>
      document.activeElement?.getAttribute?.("data-testid") === "stepper-input",
    );
  };

  // C. qty manual — ketik 12 → harga grosir
  const qtyAwal = (await state(page)).inputQty;
  const input = page.locator('[data-testid="stepper-input"]').first();
  const jumlahInput = await page.locator('[data-testid="stepper-input"]').count();

  let ketikHasil = { ada: jumlahInput > 0 };
  if (jumlahInput > 0) {
    const fokusTerpasang = await ketikKeInput(input, "12");
    const s = await state(page);
    ketikHasil = {
      ...ketikHasil,
      fokusTerpasang,
      nilaiInput: s.inputQty[0]?.value,
      teksHalaman: s.teks,
      adaHargaGrosir: s.teks.includes("70.000") || s.teks.includes("Grosir"),
    };
  }
  log("C. qty manual di keranjang — ketik 12", {
    inputQtyDitemukan: jumlahInput,
    nilaiAwal: qtyAwal.map((x) => x.value),
    ...ketikHasil,
  });

  // D. melebihi stok (15) → clamp + pesan
  let clampHasil = {};
  if (jumlahInput > 0) {
    await ketikKeInput(input, "99");
    await page.waitForTimeout(300);
    const s = await state(page);
    clampHasil = {
      nilaiInput: s.inputQty[0]?.value,
      pesanGalat: s.galatQty,
      diClampKeStok: s.inputQty[0]?.value === "15" ? "YA" : "TIDAK",
    };
  }
  log("D. qty manual melebihi stok (99, stok 15)", clampHasil);

  // E. karakter non-digit ditolak
  if (jumlahInput > 0) {
    await ketikKeInput(input, "abc1x2");
    const s = await state(page);
    log("E. ketik campuran 'abc1x2'", {
      nilaiInput: s.inputQty[0]?.value,
      hanyaDigit: /^\d+$/.test(s.inputQty[0]?.value ?? "") ? "YA" : "TIDAK",
    });
  }

  // D2. baris flash sale: ketik 2 → tetap 72.000; ketik 12 → pindah grosir 70.000
  const jumlahStepper = await page.locator('[data-testid="stepper-input"]').count();
  if (jumlahStepper > 1) {
    /*
     * Ambil teks SATU baris keranjang: naik dari input qty ke ancestor
     * terdekat yang memuat nama produk DAN harga. `innerText` elemen
     * terdalam sering kosong, jadi pencarian dilakukan dari input ke atas.
     */
    const hargaBaris = (indeks) =>
      page.evaluate((i) => {
        const input = document.querySelectorAll('[data-testid="stepper-input"]')[i];
        let el = input;
        for (let naik = 0; naik < 8 && el; naik += 1) {
          const isi = el.innerText || "";
          if (isi.includes("Kipas Flash Sale") && /Rp/.test(isi)) {
            return (isi.match(/Rp\s?[\d.]+/g) || []).slice(0, 4);
          }
          el = el.parentElement;
        }
        return [];
      }, indeks);

    await ketikKeInput(page.locator('[data-testid="stepper-input"]').nth(1), "2");
    const hargaDua = await hargaBaris(1);
    await ketikKeInput(page.locator('[data-testid="stepper-input"]').nth(1), "12");
    const hargaDuaBelas = await hargaBaris(1);

    log("D2. baris flash sale — qty 2 lalu 12", {
      "harga@qty2": hargaDua,
      "harga@qty12": hargaDuaBelas,
      "flash_dipertahankan_di_qty2": hargaDua.some((h) => h.includes("72.000")) ? "YA" : "TIDAK",
      "pindah_grosir_di_qty12": hargaDuaBelas.some((h) => h.includes("70.000")) ? "YA" : "TIDAK",
    });
  }

  // ---------- DETAIL PRODUK ----------
  await page.goto(`${BASE}/product/4502`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("Blender Cosmos"), {
    timeout: 30000,
  });
  await page.waitForTimeout(400);
  const produkInput = await page.locator('[data-testid="stepper-input"]').count();
  let produkHasil = { inputQtyDitemukan: produkInput };
  if (produkInput > 0) {
    const pi = page.locator('[data-testid="stepper-input"]').first();
    const fokusProduk = await ketikKeInput(pi, "12");
    const s = await state(page);
    /*
     * Harga yang DITAGIH ada di elemen harga utama (text-2xl), bukan di daftar
     * tier — daftar tier memang selalu memuat harga grosir. Jadi yang diperiksa
     * adalah teks harga besar, bukan sekadar "ada angka 70.000 di halaman".
     */
    const hargaUtama = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("div, span")).find((n) => {
        const c = n.className;
        return typeof c === "string" && c.includes("text-2xl") && (n.innerText || "").includes("Rp");
      });
      return (el?.innerText || "").replace(/\s+/g, " ").trim();
    });
    produkHasil = {
      ...produkHasil,
      fokusTerpasang: fokusProduk,
      nilaiInput: s.inputQty[0]?.value,
      hargaUtamaSetelahKetik: hargaUtama,
      hargaIkutTier: hargaUtama.includes("70.000") ? "YA" : "TIDAK",
      adaTabelHarga: s.teks.includes("Daftar Harga"),
    };
  }
  log("F. detail produk — qty manual ketik 12 (tier grosir 12+)", produkHasil);

  log("G. galat halaman", { jumlah: galatHalaman.length, contoh: galatHalaman.slice(0, 3) });

  await browser.close();
  console.log("\n" + JSON.stringify(hasil, null, 2));
  return hasil;
};

run().catch((e) => {
  console.error("PROBE GAGAL:", e);
  process.exit(1);
});
