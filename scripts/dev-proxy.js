#!/usr/bin/env node
/**
 * Dev proxy same-origin untuk uji E2E web.
 *
 * Kenapa perlu?
 * Rute verifikasi/tolak order kasir (`/kasir/online-orders/{id}/verify|reject`)
 * adalah rute **web** Laravel (session cookie + CSRF), sedangkan
 * `config/cors.php` backend hanya mengizinkan path `api/*`. Kalau app web
 * berjalan di port sendiri (mis. :8131) dan backend di :8124, browser
 * memblokir request lintas origin → tombol verifikasi selalu gagal.
 *
 * Proxy ini menyajikan app dan backend pada ORIGIN YANG SAMA:
 *   - `/api/*`, `/kasir/*`, `/login`, `/logout`, `/storage/*`, `/sanctum/*`
 *     → backend Laravel (default http://127.0.0.1:8124)
 *   - sisanya → dev server Expo (default http://127.0.0.1:8131)
 *
 * Pemakaian:
 *   npx expo start --web --port 8131
 *   node scripts/dev-proxy.js            # lalu buka http://127.0.0.1:8140
 *   EXPO_PUBLIC_API_URL=http://127.0.0.1:8140/api npx expo start --web --port 8131
 *
 * Proxy ini HANYA alat bantu pengembangan/QA — tidak dipakai di build APK.
 */

const http = require("http");

const PORT = Number(process.env.PROXY_PORT || 8140);
const APP_TARGET = process.env.APP_TARGET || "http://127.0.0.1:8131";
const API_TARGET = process.env.API_TARGET || "http://127.0.0.1:8124";

/**
 * PENTING: hanya path backend yang eksplisit, bukan prefix `/kasir/`.
 * App sendiri punya route `/kasir/orders` — kalau seluruh prefix `/kasir/`
 * diteruskan ke Laravel, halaman Order Masuk jadi 404.
 */
const BACKEND_PATHS = [
  /^\/api(\/|$)/,
  /^\/sanctum(\/|$)/,
  /^\/login(\?|$)/,
  /^\/logout(\?|$)/,
  /^\/storage\//,
  /^\/(barcode|qrcode)\//,
  // Halaman & aksi kasir back-office
  /^\/kasir\/online-orders(\/|\?|$)/,
  /^\/kasir\/(cetak-struk|struk|test-print|printer-settings|scan-barcode|cari-produk|cari-pelanggan|validasi-promo|harga|proses-transaksi)(\/|\?|$)/,
  /^\/kas-harian(\/|$)/,
  /^\/dashboard(\?|$)/,
  /^\/notifikasi(\/|\?|$)/,
];

const isBackendPath = (url = "/") => BACKEND_PATHS.some((re) => re.test(url));

const pickTarget = (url = "/") => (isBackendPath(url) ? API_TARGET : APP_TARGET);

const forward = (targetBase, req, res, body) => {
  const target = new URL(req.url, targetBase);
  const headers = { ...req.headers, host: target.host };
  // Origin/Referer harus mengikuti target agar Laravel tidak menolak CSRF.
  if (headers.origin) headers.origin = target.origin;
  if (headers.referer) {
    try {
      const ref = new URL(headers.referer);
      headers.referer = `${target.origin}${ref.pathname}${ref.search}`;
    } catch {
      delete headers.referer;
    }
  }

  const upstream = http.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      path: `${target.pathname}${target.search}`,
      method: req.method,
      headers,
    },
    (up) => {
      const outHeaders = { ...up.headers };
      delete outHeaders["content-security-policy"];
      res.writeHead(up.statusCode || 502, outHeaders);
      up.pipe(res);
    }
  );

  upstream.on("error", (err) => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Proxy gagal menghubungi ${targetBase}: ${err.message}`);
  });

  if (body && body.length) upstream.write(body);
  upstream.end();
};

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const target = pickTarget(req.url);
    forward(target, req, res, Buffer.concat(chunks));
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[dev-proxy] http://127.0.0.1:${PORT}`);
  console.log(`[dev-proxy] app  -> ${APP_TARGET}`);
  console.log(`[dev-proxy] api  -> ${API_TARGET}`);
  console.log(`[dev-proxy] backend path: ${BACKEND_PATHS.map(String).join(" ")}`);
});
