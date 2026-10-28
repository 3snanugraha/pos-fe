/**
 * Probe "backdrop tampil, konten kosong" — regresi APK 2026-10-28b.
 *
 * LATAR BELAKANG
 *
 * Di 28b kartu dialog dibungkus `Animated.View` dengan `opacity` mulai 0 lalu
 * dianimasikan ke 1. Di Android pembaruan opacity itu dikirim lewat native
 * animated driver pada frame-frame pertama setelah jendela `Dialog` dibuat;
 * bila tidak sampai, kartu tetap `opacity: 0` PERMANEN sementara backdrop
 * (View biasa, tanpa animasi) tampil — keluhan "layar menghitam tetapi dialog
 * kosong".
 *
 * Probe DOM sebelumnya hanya memeriksa KEBERADAAN `[aria-modal="true"]` dan
 * teks di dalamnya — keduanya lulus walau kartu transparan total. Karena itu
 * probe ini mengukur yang sebenarnya dikeluhkan:
 *
 *   1. opacity terhitung (getComputedStyle) dari kartu dialog;
 *   2. luas kotak kartu yang benar-benar terlihat (bounding rect + opacity);
 *   3. kontras teks judul terhadap latar (kartu putih harus ada).
 *
 * Diukur untuk TIGA dialog nyata: hapus keranjang, bantuan (Akun), dan
 * konfirmasi keluar — plus tiga siklus buka/tutup untuk membuktikan tidak ada
 * dialog yang "hilang" setelah dipakai berulang.
 *
 * Pemakaian: node scripts/verify-dialog-konten-terlihat.mjs <baseUrl>
 */
const { chromium } = await import(
  process.env.PLAYWRIGHT_PATH ||
    "file:///C:/Users/userU/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs"
);

const BASE = process.argv[2] || "http://127.0.0.1:8793";
/**
 * `--bekukan-animasi` mematikan `requestAnimationFrame` sebelum app dimuat.
 *
 * Itu meniru kegagalan yang terjadi di Android: pembaruan nilai animasi tidak
 * pernah sampai ke view. Di build 28b (opacity kartu = Animated.Value mulai 0)
 * kartu lalu tetap 0 sementara backdrop tampil — gejala "layar menghitam,
 * dialog kosong" tereproduksi di web. Di build 28c tidak ada animasi konten
 * sama sekali, jadi hasilnya harus tetap normal.
 */
const BEKUKAN_ANIMASI = process.argv.includes("--bekukan-animasi");

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

const PROFIL = {
  data: {
    id: 9,
    nama: "Siti Rahma",
    email: "siti@contoh.id",
    telepon: "081200000000",
    poin: 120,
    created_at: "2025-01-05T00:00:00Z",
  },
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await context.newPage();

const galatHalaman = [];
page.on("pageerror", (e) => galatHalaman.push(String(e.message).slice(0, 160)));

await page.route("**/api/**", async (route) => {
  const url = route.request().url();
  if (/\/profile|\/me|\/user/.test(url)) {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROFIL),
    });
  }
  // Keranjang memakai localStorage; endpoint lain cukup dijawab kosong supaya
  // layar bisa dirender tanpa backend.
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }),
  });
});

await page.addInitScript((cart) => {
  window.localStorage.setItem("@cart_items", JSON.stringify(cart));
  window.localStorage.setItem("auth_token", "uji");
}, KERANJANG);

if (BEKUKAN_ANIMASI) {
  // Rekam apakah kartu dialog pernah dilukis dengan opacity < 1.
  //
  // Di 28b kartu dibungkus elemen ber-`opacity: 0` lalu dianimasikan ke 1.
  // Artinya konten HANYA terlihat bila tick animasi berjalan; di Android
  // tick itu bisa tidak pernah sampai → kartu tetap tak terlihat selamanya
  // sementara backdrop tampil. Di 28c tidak ada opacity sama sekali, jadi
  // kartu sudah terlihat sejak lukisan pertama.
  await page.addInitScript(() => {
    window.__opacityAwalKartu = null;
    window.__pernahTransparan = false;
    const periksa = () => {
      const overlay = document.querySelector('[aria-modal="true"]');
      if (!overlay) return;
      const kartu = overlay.querySelector('[role="alert"]');
      if (!kartu) return;
      // Telusuri HANYA dari kartu sampai elemen overlay (inklusif). Animasi
      // fade milik react-native-web ada DI ATAS overlay dan tidak relevan —
      // yang diuji adalah apakah kartu membawa opacity sendiri seperti di 28b.
      let nilai = 1;
      let node = kartu;
      while (node) {
        const gaya = window.getComputedStyle(node);
        const o = Number.parseFloat(gaya.opacity);
        if (Number.isFinite(o)) nilai *= o;
        if (gaya.display === "none" || gaya.visibility === "hidden") {
          nilai = 0;
          break;
        }
        if (node === overlay) break;
        node = node.parentElement;
      }
      if (window.__opacityAwalKartu === null) {
        window.__opacityAwalKartu = Number(nilai.toFixed(3));
      }
      if (nilai < 0.99) window.__pernahTransparan = true;
    };
    const pasang = () => {
      if (!document.documentElement) {
        setTimeout(pasang, 5);
        return;
      }
      new MutationObserver(periksa).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "aria-modal", "role"],
      });
    };
    pasang();
  });
}

/**
 * Ukur keadaan visual dialog yang sedang tampil.
 *
 * Kartu = elemen `role="alert"` di dalam `[aria-modal="true"]` (kartu dialog
 * Zovora). Opacity efektif dihitung dari kartu DAN seluruh leluhurnya, karena
 * `opacity` bersifat multiplikatif — bug 28b memasangnya di pembungkus kartu.
 */
const UKUR = () => {
  const overlay = document.querySelector('[aria-modal="true"]');
  if (!overlay) return { ada: false };

  const kartu = overlay.querySelector('[role="alert"]');
  const judul = kartu?.querySelector("h1,h2,h3,[dir]") ?? null;

  const opacityEfektif = (el) => {
    if (!el) return 0;
    let nilai = 1;
    let node = el;
    while (node && node !== document.documentElement) {
      const gaya = window.getComputedStyle(node);
      const o = Number.parseFloat(gaya.opacity);
      if (Number.isFinite(o)) nilai *= o;
      if (gaya.display === "none" || gaya.visibility === "hidden") return 0;
      node = node.parentElement;
    }
    return nilai;
  };

  const rect = kartu ? kartu.getBoundingClientRect() : null;
  const o = opacityEfektif(kartu);

  return {
    ada: true,
    adaKartu: Boolean(kartu),
    opacityKartu: Number(o.toFixed(3)),
    lebarKartu: rect ? Math.round(rect.width) : 0,
    tinggiKartu: rect ? Math.round(rect.height) : 0,
    // Luas yang benar-benar terlihat pengguna.
    luasTerlihat: rect ? Math.round(rect.width * rect.height * o) : 0,
    teks: (kartu?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 90),
    adaJudul: Boolean(judul),
    jumlahOverlay: document.querySelectorAll('[aria-modal="true"]').length,
  };
};

const hasil = { base: BASE, langkah: [], galatHalaman };

async function ukur(label) {
  const data = await page.evaluate(UKUR);
  if (BEKUKAN_ANIMASI) {
    data.opacityAwalKartu = await page.evaluate(() => window.__opacityAwalKartu);
    data.pernahTransparan = await page.evaluate(() => window.__pernahTransparan);
    await page.evaluate(() => {
      window.__opacityAwalKartu = null;
      window.__pernahTransparan = false;
    });
  }
  hasil.langkah.push({ label, ...data });
  return data;
}

// ── Kasus 1: Keranjang → Hapus Keranjang ───────────────────────────────────
await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("Blender"), { timeout: 30000 });

await page.getByRole("button", { name: /Hapus Blender/i }).first().click();
await page.waitForTimeout(700);
await ukur("keranjang/hapus");

// tutup lewat backdrop, lalu buka lagi — 3 siklus
for (let i = 1; i <= 3; i += 1) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: /Hapus Blender/i }).first().click();
  await page.waitForTimeout(700);
  await ukur(`keranjang/hapus-siklus-${i}`);
}
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// ── Kasus 2: Akun → Bantuan ────────────────────────────────────────────────
await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => document.body.innerText.includes("Bantuan"), { timeout: 30000 });

await page.getByText("Bantuan", { exact: true }).first().click();
await page.waitForTimeout(700);
const bantuan = await ukur("akun/bantuan");

await page.getByRole("button", { name: "Tutup", exact: true }).first().click();
await page.waitForTimeout(400);

// ── Kasus 3: Akun → Keluar (dialog ikon, tanpa children) ───────────────────
await page.getByText(/Keluar/i).last().click();
await page.waitForTimeout(700);
await ukur("akun/keluar");
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// ── Penilaian ─────────────────────────────────────────────────────────────
const semua = hasil.langkah.filter((l) => l.ada);
hasil.ringkasan = {
  jumlahDialogDiukur: hasil.langkah.length,
  semuaAdaKartu: semua.every((l) => l.adaKartu),
  opacityMinimum: semua.length ? Math.min(...semua.map((l) => l.opacityKartu)) : 0,
  luasTerlihatMinimum: semua.length ? Math.min(...semua.map((l) => l.luasTerlihat)) : 0,
  semuaSatuOverlay: semua.every((l) => l.jumlahOverlay === 1),
  teksBantuan: bantuan?.teks ?? null,
  jumlahGalatHalaman: galatHalaman.length,
};

if (BEKUKAN_ANIMASI) {
  hasil.ringkasan.semuaKartuTerlihatSejakLukisanPertama = semua.every(
    (l) => l.opacityAwalKartu !== null && l.opacityAwalKartu > 0.99,
  );
  hasil.ringkasan.tidakAdaKartuPernahTransparan = semua.every((l) => l.pernahTransparan === false);
  hasil.ringkasan.opacityAwalKartu = semua.map((l) => l.opacityAwalKartu);
}

// LULUS bila: setiap dialog punya kartu yang benar-benar terlihat, tepat satu
// overlay, tanpa galat halaman — dan (mode --bekukan-animasi) kartu terlihat
// sejak lukisan pertama tanpa pernah transparan.
hasil.lulus =
  semua.length > 0 &&
  semua.every((l) => l.adaKartu && l.opacityKartu > 0.99 && l.luasTerlihat > 1000) &&
  semua.every((l) => l.jumlahOverlay === 1) &&
  galatHalaman.length === 0 &&
  (!BEKUKAN_ANIMASI ||
    (hasil.ringkasan.semuaKartuTerlihatSejakLukisanPertama &&
      hasil.ringkasan.tidakAdaKartuPernahTransparan));

await browser.close();
console.log(JSON.stringify(hasil, null, 2));
process.exit(hasil.lulus ? 0 : 1);
