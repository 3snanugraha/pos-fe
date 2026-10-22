/**
 * Tema per kategori untuk Home (guideline §2.1 + §3.6 + §3.7).
 *
 * Setiap kategori memakai satu "pasangan warna" dari palet guideline:
 * - `gradien`  : gradien header (warna muda → neutral-50 → putih) agar teks
 *                neutral-900 tetap kontras (aturan §2.1: warna 500/400 tidak
 *                boleh dipakai di bawah teks).
 * - `banner`   : pasangan 500 → 600 untuk kartu banner (teks putih semibold).
 * - `teksBanner`: `light` bila banner memakai bg muda (mis. peach-300) sehingga
 *                teks harus neutral-900 (aturan §3.7 Beauty).
 */
import { colors } from "./tokens";

export type TeksBanner = "light" | "dark";

export type TemaKategori = {
  /** Kunci stabil (dipakai testID/aria). */
  kunci: string;
  /** Gradien header: [atas, tengah, bawah]. */
  gradien: readonly [string, string, string];
  /** Gradien banner utama. */
  banner: readonly [string, string];
  /** Warna teks di atas banner. */
  teksBanner: TeksBanner;
};

const PUTIH = colors.white;
const NETRAL_50 = colors.neutral50;

/** Tema default = "Untuk Anda" (biru muda, guideline §3.7). */
export const TEMA_FOR_YOU: TemaKategori = {
  kunci: "forYou",
  gradien: [colors.primary200, colors.primary50, PUTIH],
  banner: [colors.primary500, colors.primary600],
  teksBanner: "light",
};

/**
 * Pasangan warna alternatif yang semuanya berasal dari palet guideline:
 * biru (primary), oranye (peach), hijau (success), kuning (warning),
 * dan biru gelap (primary-800) untuk kategori bernuansa teknologi.
 */
const TEMA: Record<string, TemaKategori> = {
  beauty: {
    kunci: "beauty",
    gradien: [colors.peach200, NETRAL_50, PUTIH],
    banner: [colors.peach300, colors.peach200],
    teksBanner: "dark",
  },
  elektronik: {
    kunci: "elektronik",
    gradien: [colors.primary200, colors.primary50, PUTIH],
    banner: [colors.primary600, colors.primary700],
    teksBanner: "light",
  },
  fashion: {
    kunci: "fashion",
    gradien: [colors.peach200, NETRAL_50, PUTIH],
    banner: [colors.peach300, colors.peach200],
    teksBanner: "dark",
  },
  rumah: {
    kunci: "rumah",
    gradien: [colors.success100, NETRAL_50, PUTIH],
    banner: [colors.success500, colors.success700],
    teksBanner: "light",
  },
  olahraga: {
    kunci: "olahraga",
    gradien: [colors.primary100, NETRAL_50, PUTIH],
    banner: [colors.primary600, colors.primary700],
    teksBanner: "light",
  },
  otomotif: {
    kunci: "otomotif",
    gradien: [colors.neutral100, NETRAL_50, PUTIH],
    banner: [colors.neutral700, colors.neutral900],
    teksBanner: "light",
  },
  makanan: {
    kunci: "makanan",
    gradien: [colors.warning100, NETRAL_50, PUTIH],
    banner: [colors.warning500, colors.warning700],
    teksBanner: "light",
  },
};

/** Urutan pencocokan nama kategori → tema. Paling spesifik lebih dulu. */
const ATURAN: [string[], string][] = [
  [["kecantikan", "beauty", "perawatan", "kosmetik", "skincare"], "beauty"],
  [["elektronik", "komputer", "hp", "handphone", "gadget"], "elektronik"],
  [["pakaian", "fashion", "sepatu", "tas"], "fashion"],
  [["rumah", "dapur", "perabot", "furniture", "dekorasi"], "rumah"],
  [["olahraga", "outdor", "outdoor", "sport"], "olahraga"],
  [["helm", "motor", "mobil", "aksesoris", "acc "], "otomotif"],
  [["makan", "minum", "snack", "sembako"], "makanan"],
];

/**
 * Tema untuk nama kategori (heuristik nama, sama seperti `ikonKategori` di
 * beranda). Kategori yang tidak dikenal memakai tema For You agar header tetap
 * konsisten.
 */
export function temaKategori(namaKategori?: string | null): TemaKategori {
  if (!namaKategori) return TEMA_FOR_YOU;
  const nama = namaKategori.toLowerCase();
  for (const [kataKunci, kunci] of ATURAN) {
    if (kataKunci.some((k) => nama.includes(k))) {
      return TEMA[kunci] ?? TEMA_FOR_YOU;
    }
  }
  return TEMA_FOR_YOU;
}

export default temaKategori;
