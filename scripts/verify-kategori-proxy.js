#!/usr/bin/env node
/**
 * Proxy CORS untuk verifikasi web halaman Kategori.
 *
 * Kenapa perlu? Layar web (`expo start --web`) memanggil API produksi dari
 * origin `http://127.0.0.1:8177`, sedangkan `config/cors.php` backend hanya
 * mengizinkan path `api/*` untuk origin tertentu. Proxy ini menyajikan
 * `/api/*` pada origin yang sama dengan app sehingga browser tidak memblokir
 * request — tanpa mengubah satu baris pun di `services/`.
 *
 * Pemakaian (dua terminal):
 *   PORT=18950 node scripts/verify-kategori-proxy.js
 *   EXPO_PUBLIC_API_URL=http://127.0.0.1:18950/api npx expo start --web --port 8177
 *   # buka http://127.0.0.1:8177/products
 *
 * Hanya alat bantu QA; tidak dipakai di build APK.
 */
const http = require("http");
const https = require("https");

const PORT = Number(process.env.PORT || 18950);
const TARGET = process.env.TARGET || "https://gudangperabot.my.id";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  const mulai = Date.now();
  const upstream = https.request(
    {
      hostname: new URL(TARGET).hostname,
      path: req.url,
      method: req.method,
      headers: { Accept: "application/json" },
    },
    (r) => {
      let body = "";
      r.on("data", (c) => (body += c));
      r.on("end", () => {
        // Log dipakai sebagai bukti jumlah request halaman (deteksi double-load).
        console.log(
          `${req.method} ${req.url} -> ${r.statusCode} (${Date.now() - mulai}ms) ${body.length}b`,
        );
        res.writeHead(r.statusCode || 502, { ...CORS, "Content-Type": "application/json" });
        res.end(body);
      });
    },
  );

  upstream.on("error", (e) => {
    console.log(`ERR ${req.url}: ${e.message}`);
    res.writeHead(502, CORS);
    res.end(JSON.stringify({ success: false, message: e.message }));
  });

  req.pipe(upstream);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`proxy http://127.0.0.1:${PORT} -> ${TARGET}`);
});
