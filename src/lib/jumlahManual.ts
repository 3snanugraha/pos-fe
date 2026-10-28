/**
 * Ketik-qty manual (Stepper) — logika murni, bebas React Native.
 *
 * Kenapa dipisah dari komponen: perilaku "ketik angka" punya banyak kasus
 * tepi yang harus sama di keranjang DAN detail produk (dan nanti di layar
 * lain yang punya stepper), dan harus bisa diuji `node --test`.
 *
 * Aturan yang dikunci di sini:
 *
 *  - hanya digit yang diterima; huruf, tanda minus, titik, spasi dibuang
 *    (keyboard numerik Android masih bisa mengirim karakter lain lewat
 *    paste/IME, jadi penyaringan tidak boleh bergantung pada keyboardType);
 *  - kosong = "belum sah" → pemanggil MENAHAN nilai ketikan (tidak menimpa
 *    state), supaya pengguna bisa menghapus lalu mengetik ulang tanpa
 *    dipaksa menjadi 1 di tengah jalan;
 *  - nol / nol-nol di depan ("007") dianggap angka 7 — satu-satunya nol yang
 *    bermakna adalah angka 0 itu sendiri, dan itu ditolak (minimum 1);
 *  - melebihi stok TIDAK dipotong diam-diam: hasil `melebihiBatas` memberi
 *    tahu pemanggil untuk menampilkan pesan stok, lalu nilai di-clamp ke
 *    batas atas supaya keranjang tidak pernah berisi qty di atas stok
 *    (backend menolak, dan harga tier jadi salah);
 *  - di bawah minimum di-clamp ke minimum.
 */

export type BatasJumlah = {
  /** Batas bawah; default 1. */
  min?: number;
  /** Batas atas (stok). `undefined`/0 = tanpa batas. */
  max?: number;
  /** Jumlah digit maksimum yang diterima (jaga-jaga salah tekan). */
  maxDigit?: number;
};

export type HasilJumlah = {
  /**
   * Nilai yang boleh dipakai. `null` berarti ketikan BELUM sah (kosong):
   * pemanggil menyimpan teks mentah saja dan menunggu ketikan berikutnya.
   */
  nilai: number | null;
  /** Teks yang ditampilkan (digit saja, tanpa nol di depan). */
  teks: string;
  /** true bila angka yang diketik melebihi `max` dan sudah di-clamp. */
  melebihiBatas: boolean;
  /** true bila angka yang diketik di bawah `min` dan sudah di-clamp. */
  diBawahMinimum: boolean;
};

/** Batas atas efektif: `undefined` bila tidak dibatasi. */
export function batasAtas(max?: number | null): number | undefined {
  if (max == null) return undefined;
  const angka = Math.floor(Number(max));
  if (!Number.isFinite(angka) || angka <= 0) return undefined;
  return angka;
}

/** Ambil digit saja dari teks apa pun (buang "12 pcs", "-3", "1.5"). */
export function hanyaDigit(teks: string, maxDigit = 6): string {
  const digit = String(teks ?? "").replace(/\D/g, "");
  // "007" → "7"; "000" → "0".
  const tanpaNolDepan = digit.replace(/^0+(?=\d)/, "");
  return tanpaNolDepan.slice(0, Math.max(1, maxDigit));
}

/**
 * Urai ketikan pengguna menjadi jumlah yang sah.
 *
 * `kosong` = teks tanpa digit (mis. pengguna menghapus semua isi) → `nilai`
 * null, `teks` "" — pemanggil menahan nilai lama.
 */
export function uraiJumlah(teks: string, batas: BatasJumlah = {}): HasilJumlah {
  const min = Math.max(1, Math.floor(Number(batas.min ?? 1)) || 1);
  const max = batasAtas(batas.max);
  const digit = hanyaDigit(teks, batas.maxDigit ?? 6);

  if (digit === "") {
    return { nilai: null, teks: "", melebihiBatas: false, diBawahMinimum: false };
  }

  const angka = Number(digit);

  if (max != null && angka > max) {
    return { nilai: max, teks: String(max), melebihiBatas: true, diBawahMinimum: false };
  }

  if (angka < min) {
    return { nilai: min, teks: String(min), melebihiBatas: false, diBawahMinimum: true };
  }

  return { nilai: angka, teks: String(angka), melebihiBatas: false, diBawahMinimum: false };
}

/**
 * Nilai yang dipakai saat pengguna selesai mengetik (blur / submit).
 * Ketikan kosong tidak boleh menghapus qty: jatuh ke nilai terakhir yang sah.
 */
export function jumlahSaatSelesai(
  teks: string,
  nilaiTerakhir: number,
  batas: BatasJumlah = {},
): number {
  const hasil = uraiJumlah(teks, batas);
  if (hasil.nilai != null) return hasil.nilai;
  return Math.max(1, Math.floor(Number(nilaiTerakhir) || 1));
}

/**
 * Pesan galat untuk qty manual, atau null bila tidak ada masalah.
 * Dipisah supaya copy-nya bisa dilokalisasi pemanggil.
 */
export function galatJumlah(
  hasil: HasilJumlah,
  pesan: { melebihiStok: (maks: number) => string; minimum: (min: number) => string },
  batas: BatasJumlah = {},
): string | null {
  const max = batasAtas(batas.max);
  const min = Math.max(1, Math.floor(Number(batas.min ?? 1)) || 1);

  if (hasil.melebihiBatas && max != null) return pesan.melebihiStok(max);
  if (hasil.diBawahMinimum) return pesan.minimum(min);
  return null;
}
