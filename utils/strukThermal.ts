/**
 * Struk thermal 58 mm untuk VERIFIKASI order online (layar kasir "Order Masuk").
 *
 * Kenapa modul terpisah, bukan menumpang `utils/printReceipt.ts`?
 *
 * 1. `printReceipt.ts` dirancang untuk struk penjualan POS (harga jual, diskon
 *    baris, kembalian). Order online diverifikasi kasir tanpa uang tunai:
 *    yang penting nomor transaksi, pelanggan, item, metode bayar, dan bukti
 *    "diverifikasi oleh". Struk yang mencetak "Kembali: Rp 0" untuk transfer
 *    menyesatkan.
 * 2. Modul ini SENGAJA bebas React Native/expo supaya bisa diuji `node --test`
 *    (lihat `utils/__tests__/strukThermal.test.ts`). Pemanggilan
 *    `expo-print`/`rawbt:` ada di `utils/cetakStrukThermal.ts`.
 *
 * Dua keluaran dari satu sumber data supaya struk kertas dan struk HTML tidak
 * pernah berbeda isi:
 *  - `bangunEscPos()` → byte ESC/POS (RawBT / printer thermal Android),
 *  - `bangunHtmlThermal()` → dokumen 58 mm untuk dialog cetak browser/iframe
 *    (pola yang sama dipakai posku-umkm: `@page { size: 58mm auto }`,
 *    wrapper 48 mm, font monospace tebal 13 px).
 */

/**
 * Antarmuka minimal encoder ESC/POS yang dibutuhkan modul ini.
 *
 * Modul ini sengaja TIDAK meng-import `./escpos` secara statis: `node --test`
 * (ESM) tidak bisa me-resolve import tanpa ekstensi, sedangkan kode produk
 * memakai gaya tanpa ekstensi yang dipahami Metro. Pemanggil menyuntikkan
 * encoder nyata (`utils/cetakStrukThermal.ts`), tes menyuntikkan encoder asli
 * lewat jalur yang sama.
 */
export interface EncoderEscPos {
  align(direction: "left" | "center" | "right"): EncoderEscPos;
  bold(active: boolean): EncoderEscPos;
  text(content: string): EncoderEscPos;
  newline(count?: number): EncoderEscPos;
  feed(lines?: number): EncoderEscPos;
  qr(content: string, size?: number): EncoderEscPos;
  cut(): EncoderEscPos;
  toBase64(): string;
  getURI(): string;
}

/** Lebar kolom struk 58 mm (32 karakter font A). */
export const KOLOM_58 = 32;

/** id iframe cetak thermal di web — dipakai QA untuk membaca struk yang dicetak. */
export const IFRAME_STRUK_THERMAL_ID = "struk-thermal-kasir";

export type ItemStrukThermal = {
  nama_produk: string;
  nama_varian?: string | null;
  satuan?: string | null;
  jumlah: number;
  harga: number;
  subtotal: number;
};

export type DataStrukThermal = {
  toko: {
    nama_toko: string;
    alamat?: string | null;
    telepon?: string | null;
    footer?: string | null;
  };
  order: {
    nomor_transaksi: string;
    tanggal_transaksi: string;
    pelanggan?: { nama_pelanggan?: string | null; telepon?: string | null } | null;
    metode_pembayaran?: string | null;
    status_pembayaran?: string | null;
    alamat_pengiriman?: string | null;
    catatan?: string | null;
    subtotal?: number;
    total_diskon?: number;
    total_bayar: number;
    items: ItemStrukThermal[];
  };
  /** Bukti verifikasi — dicetak sebagai baris "Diverifikasi" + waktu. */
  verifikasi?: { oleh?: string | null; pada?: string | null } | null;
};

export type BarisStruk = {
  teks: string;
  rata?: "kiri" | "tengah" | "kanan";
  tebal?: boolean;
};

export const TEKS_CADANGAN_TOKO = "TOKO";

/** Rp 32.000 — tanpa desimal, spasi biasa (aman di printer 32 kolom). */
export const rupiahThermal = (nilai: number): string => {
  const angka = Number.isFinite(nilai) ? Math.round(nilai) : 0;
  return `Rp ${angka.toLocaleString("id-ID")}`;
};

/** 27/10/2026 14:05 */
export const tanggalThermal = (iso: string): string => {
  const tanggal = new Date(iso);
  if (Number.isNaN(tanggal.getTime())) return iso || "-";
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${dua(tanggal.getDate())}/${dua(tanggal.getMonth() + 1)}/${tanggal.getFullYear()} ${dua(
    tanggal.getHours()
  )}:${dua(tanggal.getMinutes())}`;
};

/** Pecah teks jadi potongan selebar `kolom` tanpa memotong kata bila mungkin. */
export function bungkusTeks(teks: string, kolom = KOLOM_58): string[] {
  const bersih = (teks ?? "").replace(/\s+/g, " ").trim();
  if (bersih === "") return [];
  if (bersih.length <= kolom) return [bersih];

  const hasil: string[] = [];
  let sisa = bersih;

  while (sisa.length > kolom) {
    let potong = sisa.lastIndexOf(" ", kolom);
    if (potong <= 0) potong = kolom;
    hasil.push(sisa.slice(0, potong).trimEnd());
    sisa = sisa.slice(potong).trimStart();
  }

  if (sisa !== "") hasil.push(sisa);
  return hasil;
}

/**
 * Satu baris "kiri … kanan" selebar `kolom`.
 *
 * Bila label + nilai tidak muat, label dibungkus dan nilai ditaruh di baris
 * berikutnya — lebih baik daripada nilai terpotong (nomor transaksi/nominal
 * harus utuh di struk). `rataNilai` menentukan posisi nilai pada baris
 * lanjutan: "kanan" untuk nominal (standar struk) dan "kiri" untuk nomor
 * transaksi (deretan angka lebih mudah dibaca dari tepi kiri).
 */
export function barisKiriKanan(
  kiri: string,
  kanan: string,
  kolom = KOLOM_58,
  rataNilai: "kiri" | "kanan" = "kanan"
): string[] {
  const label = (kiri ?? "").trim();
  const nilai = (kanan ?? "").trim();
  const sisa = kolom - nilai.length - 1;

  if (label.length <= sisa) {
    return [`${label}${" ".repeat(Math.max(1, kolom - label.length - nilai.length))}${nilai}`];
  }

  return [
    ...bungkusTeks(label, kolom),
    rataNilai === "kiri" ? nilai : nilai.padStart(kolom),
  ];
}

/** Label item: "Lemari Pakaian (2 Pintu) / unit". */
export function labelItemThermal(item: ItemStrukThermal): string {
  const varian = item.nama_varian ? ` (${item.nama_varian})` : "";
  const satuan = item.satuan ? ` / ${item.satuan}` : "";
  return `${item.nama_produk}${varian}${satuan}`;
}

/**
 * Susun struk sebagai daftar baris terstruktur (dipakai tes dan oleh
 * pembangun ESC/POS maupun HTML). Lebar baris maksimum `KOLOM_58`.
 */
export function susunBarisStruk(data: DataStrukThermal): BarisStruk[] {
  const { toko, order } = data;
  const baris: BarisStruk[] = [];
  const pemisah = "-".repeat(KOLOM_58);

  const namaToko = (toko.nama_toko ?? "").trim() || TEKS_CADANGAN_TOKO;
  baris.push({ teks: namaToko, rata: "tengah", tebal: true });

  for (const potong of bungkusTeks(toko.alamat ?? "")) {
    baris.push({ teks: potong, rata: "tengah" });
  }

  if (toko.telepon) {
    baris.push({ teks: `Telp: ${toko.telepon}`, rata: "tengah" });
  }

  baris.push({ teks: pemisah });
  baris.push({ teks: "STRUK PESANAN ONLINE", rata: "tengah", tebal: true });

  // Nomor transaksi ditaruh di barisnya sendiri: 18 karakter (ORD-) + label
  // tidak muat di 32 kolom, dan memotongnya jadi "       ORD-2026..." sulit
  // dibaca. Nomor utuh tepat di bawah label.
  baris.push({ teks: "No. Transaksi" });

  for (const potong of bungkusTeks(order.nomor_transaksi)) {
    baris.push({ teks: potong, tebal: true });
  }

  baris.push({ teks: `Tanggal  : ${tanggalThermal(order.tanggal_transaksi)}` });

  if (order.pelanggan?.nama_pelanggan) {
    for (const potong of bungkusTeks(order.pelanggan.nama_pelanggan, KOLOM_58 - 11)) {
      baris.push({ teks: `Pelanggan: ${potong}` });
    }

    if (order.pelanggan.telepon) {
      baris.push({ teks: `Telepon  : ${order.pelanggan.telepon}` });
    }
  }

  baris.push({ teks: pemisah });

  for (const item of order.items) {
    for (const potong of bungkusTeks(labelItemThermal(item), KOLOM_58)) {
      baris.push({ teks: potong, tebal: true });
    }

    for (const potong of barisKiriKanan(
      `  ${item.jumlah} x ${rupiahThermal(Number(item.harga) || 0)}`,
      rupiahThermal(Number(item.subtotal) || 0)
    )) {
      baris.push({ teks: potong });
    }
  }

  baris.push({ teks: pemisah });

  const subtotal = Number(order.subtotal ?? 0);
  if (subtotal > 0) {
    for (const potong of barisKiriKanan("Subtotal", rupiahThermal(subtotal))) {
      baris.push({ teks: potong });
    }
  }

  if (Number(order.total_diskon ?? 0) > 0) {
    for (const potong of barisKiriKanan(
      "Diskon",
      `-${rupiahThermal(Number(order.total_diskon))}`
    )) {
      baris.push({ teks: potong });
    }
  }

  for (const potong of barisKiriKanan("TOTAL", rupiahThermal(Number(order.total_bayar) || 0))) {
    baris.push({ teks: potong, tebal: true });
  }

  if (order.metode_pembayaran) {
    for (const potong of bungkusTeks(order.metode_pembayaran, KOLOM_58 - 11)) {
      baris.push({ teks: `Bayar    : ${potong}` });
    }
  }

  if (order.status_pembayaran) {
    baris.push({
      teks: `Status   : ${String(order.status_pembayaran).replace(/_/g, " ").toUpperCase()}`,
    });
  }

  if (order.alamat_pengiriman) {
    baris.push({ teks: pemisah });

    for (const potong of bungkusTeks(`Kirim ke: ${order.alamat_pengiriman}`)) {
      baris.push({ teks: potong });
    }
  }

  if (order.catatan) {
    baris.push({ teks: pemisah });

    for (const potong of bungkusTeks(`Catatan: ${order.catatan}`)) {
      baris.push({ teks: potong });
    }
  }

  if (data.verifikasi) {
    baris.push({ teks: pemisah });
    baris.push({ teks: "PESANAN DIVERIFIKASI", rata: "tengah", tebal: true });

    if (data.verifikasi.oleh) {
      for (const potong of bungkusTeks(`Oleh: ${data.verifikasi.oleh}`)) {
        baris.push({ teks: potong });
      }
    }

    if (data.verifikasi.pada) {
      baris.push({ teks: `Pada: ${tanggalThermal(data.verifikasi.pada)}` });
    }
  }

  baris.push({ teks: pemisah });

  const footer = (toko.footer ?? "").trim();
  if (footer !== "") {
    for (const potong of bungkusTeks(footer)) {
      baris.push({ teks: potong, rata: "tengah" });
    }
  }

  baris.push({ teks: order.nomor_transaksi, rata: "tengah" });

  return baris;
}

/** Render daftar baris menjadi teks polos (dipakai tes & fallback). */
export function teksStruk(data: DataStrukThermal): string {
  return susunBarisStruk(data).map((baris) => baris.teks).join("\n");
}

/**
 * Tulis struk ke encoder ESC/POS yang disuntikkan (dipakai produksi maupun
 * tes) lalu kembalikan encoder-nya. QR berisi nomor transaksi supaya struk
 * bisa dipindai ulang di kasir.
 */
export function tulisEscPos<T extends EncoderEscPos>(encoder: T, data: DataStrukThermal): T {
  // Pemetaan rata: tipe internal modul ("kiri"/"tengah"/"kanan") → perintah
  // encoder ESC/POS ("left"/"center"/"right").
  const rata = { kiri: "left", tengah: "center", kanan: "right" } as const;

  for (const baris of susunBarisStruk(data)) {
    encoder
      .align(rata[baris.rata ?? "kiri"])
      .bold(!!baris.tebal)
      .text(baris.teks)
      .newline();
  }

  encoder.align("center").bold(false).newline().qr(data.order.nomor_transaksi).feed(2).cut();

  return encoder;
}

/** Escape minimal agar isi struk tidak bisa menyuntik HTML (catatan pelanggan). */
export const escapeHtmlThermal = (nilai: string): string =>
  (nilai ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Dokumen HTML struk thermal 58 mm.
 *
 * Aturan cetak mengikuti pola posku-umkm (badan 48 mm, monospace tebal 13 px)
 * dengan satu koreksi: posku memakai `@page { size: 58mm auto }`, dan Chrome
 * MEMBUANG deklarasi itu karena tidak valid (properti `size` hanya menerima
 * satu/dua panjang, satu kata kunci `auto`, atau nama halaman — bukan
 * gabungan panjang + `auto`). Akibatnya struk tercetak di A4 dan terpotong.
 * Di sini dipakai `size: 58mm` (lebar kertas, tinggi mengikuti isi) yang
 * benar-benar diterapkan browser.
 */
export function bangunHtmlThermal(data: DataStrukThermal): string {
  const baris = susunBarisStruk(data)
    .map((b) => {
      const kelas = [b.rata && b.rata !== "kiri" ? `rata-${b.rata}` : "", b.tebal ? "tebal" : ""]
        .filter(Boolean)
        .join(" ");
      return `<div class="${kelas}">${escapeHtmlThermal(b.teks) || "&nbsp;"}</div>`;
    })
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Struk ${escapeHtmlThermal(data.order.nomor_transaksi)}</title>
<style>
  @page { size: 58mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  #receipt-thermal {
    width: 48mm;
    margin: 0 auto;
    padding: 2mm 1mm 6mm;
    font-family: "Courier New", Courier, monospace;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.25;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  #receipt-thermal .rata-tengah { text-align: center; }
  #receipt-thermal .rata-kanan { text-align: right; }
  #receipt-thermal .tebal { font-weight: 700; }
</style>
</head>
<body>
  <div id="receipt-thermal" data-nomor="${escapeHtmlThermal(data.order.nomor_transaksi)}">
      ${baris}
  </div>
</body>
</html>`;
}
