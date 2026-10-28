/**
 * Server statis kecil untuk verifikasi web export (expo-router `output: static`).
 *
 * Kenapa tidak `python -m http.server`: export memakai rute TANPA ekstensi
 * (`/cart`, `/product/[id]`). python hanya menyajikan `cart.html` bila URL-nya
 * menyebut `.html`, sehingga router melihat path `/cart.html` dan menampilkan
 * "Unmatched Route" — hasil verifikasi jadi palsu.
 *
 * Aturan:
 *   /cart          → cart.html
 *   /product/4502  → product/[id].html  (rute dinamis)
 *   /              → index.html
 *
 * Pemakaian: node scripts/serve-static.mjs <dir> [port]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const ROOT = process.argv[2] || "dist-web-verify";
const PORT = Number(process.argv[3] || 8791);

const TIPE = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wav": "audio/wav",
  ".map": "application/json; charset=utf-8",
};

const adaFile = async (jalur) => {
  try {
    const s = await stat(jalur);
    return s.isFile();
  } catch {
    return false;
  }
};

/** Kandidat berkas untuk satu pathname, berurutan. */
const kandidat = (pathname) => {
  const bersih = normalize(pathname).replace(/^([/\\])+/, "");
  if (bersih.includes(`..${sep}`) || bersih === "..") return [];
  const dasar = join(ROOT, bersih);
  const daftar = [];

  if (pathname === "/" || pathname === "") daftar.push(join(ROOT, "index.html"));
  if (extname(dasar)) daftar.push(dasar);
  daftar.push(`${dasar}.html`);
  daftar.push(join(dasar, "index.html"));

  // Rute dinamis: /product/<apa pun> → product/[id].html
  const segmen = bersih.split(/[/\\]/).filter(Boolean);
  if (segmen.length === 2) {
    daftar.push(join(ROOT, segmen[0], "[id].html"));
  }

  return daftar;
};

const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  for (const jalur of kandidat(pathname)) {
    if (await adaFile(jalur)) {
      const isi = await readFile(jalur);
      res.writeHead(200, {
        "Content-Type": TIPE[extname(jalur)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(isi);
      return;
    }
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(`404 ${pathname}`);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`statis: http://127.0.0.1:${PORT} (root ${ROOT})`);
});
