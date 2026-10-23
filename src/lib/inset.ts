/**
 * Perhitungan inset safe area — guideline §2.3/§3.5.
 *
 * Semua angka desain Zovora dinyatakan relatif terhadap area aman:
 * - header bergradien: gradien boleh menjangkau ke belakang status bar, tetapi
 *   kontennya mulai `inset.top + 8`;
 * - sticky bar: padding 16 + inset bawah (kecuali bar sudah berdiri di atas
 *   tab bar yang memakan inset bawah);
 * - tab bar: 64 + inset bawah;
 * - elemen mengambang di atas gambar (tombol kembali galeri): `inset.top + 12`.
 *
 * Fungsi murni dipisah dari komponen agar nilai inset fiktif (mis. 47/59/34)
 * bisa diuji tanpa perangkat ber-notch.
 */
export type InsetAtasBawah = { top: number; bottom: number };

/** Jarak konten dari tepi atas header bergradien. */
export const JARAK_HEADER = 8;
/** Jarak desain sticky bar (padding atas/bawah dasar). */
export const JARAK_STICKY_BAR = 16;
/** Jarak elemen mengambang dari inset atas. */
export const JARAK_MENGAMBANG = 12;

/** paddingTop konten header bergradien = inset status bar + 8. */
export function paddingAtasHeader(inset: InsetAtasBawah | number): number {
  const top = typeof inset === "number" ? inset : inset.top;
  return Math.max(0, top) + JARAK_HEADER;
}

/**
 * paddingBottom sticky bar = inset bawah (bila dipakai) + 16.
 * `denganInset: false` dipakai saat bar berada di atas tab bar yang sudah
 * memakan inset bawah — mencegah inset dihitung dua kali.
 */
export function paddingBawahStickyBar(
  inset: InsetAtasBawah | number,
  denganInset = true,
): number {
  const bottom = typeof inset === "number" ? inset : inset.bottom;
  const tambahan = denganInset ? Math.max(0, bottom) : 0;
  return tambahan + JARAK_STICKY_BAR;
}

/** Tinggi total tab bar = tinggi desain (64) + inset bawah. */
export function tinggiTabBar(tinggiDesain: number, insetBawah: number): number {
  return tinggiDesain + Math.max(0, insetBawah);
}

/**
 * paddingBottom konten scroll pada layar tanpa sticky bar / tab bar:
 * jarak desain + inset bawah, agar item terakhir tidak tertutup gesture bar
 * (Android edge-to-edge) atau home indicator (iOS).
 */
export function paddingBawahKonten(
  inset: InsetAtasBawah | number,
  dasar = 24,
): number {
  const bottom = typeof inset === "number" ? inset : inset.bottom;
  return dasar + Math.max(0, bottom);
}

/** Offset elemen mengambang (tombol kembali galeri) dari tepi atas = inset + 12. */
export function offsetMengambang(inset: InsetAtasBawah | number): number {
  const top = typeof inset === "number" ? inset : inset.top;
  return Math.max(0, top) + JARAK_MENGAMBANG;
}
