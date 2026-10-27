/**
 * Logika uang tunai untuk pembayaran checkout pelanggan.
 *
 * Modul ini SENGAJA bebas dependensi (tanpa React Native/expo) supaya bisa
 * diuji `node --test` — sama seperti `utils/strukPelanggan.ts`.
 *
 * Aturan yang dipegang:
 * - "Uang pas" = tepat sebesar tagihan.
 * - Tombol pecahan menampilkan **kelipatan terdekat di atas tagihan** untuk
 *   tiap pecahan yang beredar (2rb/5rb/10rb/20rb/50rb/100rb), mis. tagihan
 *   Rp 275.000 → 276.000 (2rb), 280.000 (10rb), 300.000 (50rb). Nominal
 *   kembar dibuang supaya tombol tidak dobel.
 * - Uang diterima < tagihan TIDAK dianggap sah: `validasiTunai` mengembalikan
 *   pesan peringatan dan layar menahan tombol "Buat Pesanan".
 * - Kembalian hanya informasi (order online belum menerima uang); nilainya
 *   ikut ditulis ke `catatan` dengan penanda `[Tunai: ...]` — pola yang sama
 *   dengan `[Split: ...]` di `utils/payment.ts` — sehingga kasir, layar detail
 *   pesanan, dan struk PDF pelanggan membaca angka yang sama.
 */

/** Pecahan rupiah yang dipakai tombol cepat (uang kertas/koin yang lazim). */
export const PECAHAN_UANG = [2000, 5000, 10000, 20000, 50000, 100000] as const;

export type SaranTunai = {
  /** Nominal yang dipasang ke input bila tombol ditekan. */
  nominal: number;
  /** `pas` = tepat tagihan; `pecahan` = pembulatan ke atas. */
  jenis: "pas" | "pecahan";
  /** Pecahan asal pembulatan (null untuk "uang pas"). */
  pecahan: number | null;
  /** Label siap tampil, mis. "Rp 300.000". */
  label: string;
};

/** "Rp 25.000" — konsisten dengan struk & layar lain (tanpa desimal). */
export const rupiahTunai = (nilai: number): string => {
  const angka = Number.isFinite(nilai) ? Math.round(nilai) : 0;
  return `Rp ${angka.toLocaleString("id-ID")}`;
};

/** Bulatkan ke atas ke kelipatan terdekat (kelipatan <= 0 → nilai apa adanya). */
export const bulatKeAtas = (nominal: number, kelipatan: number): number => {
  const nilai = Math.max(0, Math.round(Number.isFinite(nominal) ? nominal : 0));
  const k = Math.round(kelipatan);
  if (!Number.isFinite(k) || k <= 0) return nilai;
  return Math.ceil(nilai / k) * k;
};

/**
 * Daftar tombol cepat untuk sebuah tagihan: "Uang Pas" di depan, lalu
 * kelipatan terdekat tiap pecahan. Nominal yang sama hanya muncul sekali
 * (pecahan terkecil yang menang) dan hasilnya urut naik.
 */
export function saranTunai(total: number): SaranTunai[] {
  const tagihan = Math.max(0, Math.round(Number.isFinite(total) ? total : 0));
  const hasil: SaranTunai[] = [
    { nominal: tagihan, jenis: "pas", pecahan: null, label: rupiahTunai(tagihan) },
  ];
  const sudahAda = new Set<number>([tagihan]);

  for (const pecahan of PECAHAN_UANG) {
    const nominal = bulatKeAtas(tagihan, pecahan);
    if (nominal <= tagihan || sudahAda.has(nominal)) continue;
    sudahAda.add(nominal);
    hasil.push({ nominal, jenis: "pecahan", pecahan, label: rupiahTunai(nominal) });
  }

  return hasil.sort((a, b) => a.nominal - b.nominal);
}

/** Ambil angka dari input manual ("300.000", "Rp 300000" → 300000). */
export const nominalTunai = (teks: string | number | null | undefined): number => {
  if (typeof teks === "number") return Number.isFinite(teks) ? Math.max(0, Math.round(teks)) : 0;
  if (teks == null) return 0;
  const digit = String(teks).replace(/[^0-9]/g, "");
  if (digit === "") return 0;
  const nilai = parseInt(digit, 10);
  return Number.isFinite(nilai) ? nilai : 0;
};

export type HasilTunai = {
  /** Uang diterima sudah menutup tagihan. */
  cukup: boolean;
  /** Kembalian (0 bila kurang). */
  kembalian: number;
  /** Kekurangan (0 bila cukup). */
  kurang: number;
};

export const hitungTunai = (total: number, diterima: number): HasilTunai => {
  const tagihan = Math.max(0, Math.round(Number.isFinite(total) ? total : 0));
  const uang = Math.max(0, Math.round(Number.isFinite(diterima) ? diterima : 0));
  const selisih = uang - tagihan;
  return {
    cukup: selisih >= 0,
    kembalian: selisih > 0 ? selisih : 0,
    kurang: selisih < 0 ? -selisih : 0,
  };
};

/**
 * Validasi uang tunai untuk tagihan tertentu.
 *
 * `null` = tidak ada masalah (termasuk saat input masih kosong: pelanggan
 * boleh membuat order COD lalu membayar tunai di tempat). Pesan dikembalikan
 * bila nominal sudah diisi tetapi kurang dari tagihan.
 */
export function validasiTunai(total: number, diterima: number): string | null {
  const uang = nominalTunai(diterima);
  if (uang <= 0) return null;

  const { cukup, kurang } = hitungTunai(total, uang);
  if (cukup) return null;

  return `Uang diterima kurang ${rupiahTunai(kurang)} dari total pembayaran.`;
}

const POLA_TUNAI = /\[Tunai:\s*diterima\s*([^;\]]+)(?:;\s*kembali\s*([^\]]+))?\]/i;

/** Penanda catatan order: `[Tunai: diterima Rp 300.000; kembali Rp 25.000]`. */
export const tandaTunai = (diterima: number, kembalian: number): string => {
  const uang = nominalTunai(diterima);
  const kembali = Math.max(0, nominalTunai(kembalian));
  return `[Tunai: diterima ${rupiahTunai(uang)}; kembali ${rupiahTunai(kembali)}]`;
};

/**
 * Gabungkan penanda tunai ke catatan pesanan. `null` → catatan dibiarkan
 * apa adanya (tidak ada uang tunai yang dicatat).
 */
export function gabungCatatanTunai(
  catatan: string | undefined,
  tunai: { diterima: number; kembalian: number } | null
): string | undefined {
  const dasar = (catatan ?? "").trim();
  if (!tunai || nominalTunai(tunai.diterima) <= 0) return dasar || undefined;

  const penanda = tandaTunai(tunai.diterima, tunai.kembalian);
  return dasar ? `${dasar} ${penanda}` : penanda;
}

/** Baca kembali angka tunai dari catatan order (dipakai layar detail & struk). */
export function parseTunaiCatatan(
  catatan?: string | null
): { diterima: number; kembalian: number } | null {
  if (!catatan) return null;
  const cocok = catatan.match(POLA_TUNAI);
  if (!cocok) return null;

  const diterima = nominalTunai(cocok[1]);
  if (diterima <= 0) return null;

  return { diterima, kembalian: nominalTunai(cocok[2] ?? 0) };
}

/** Buang penanda `[Tunai: ...]` agar catatan pelanggan tetap bersih. */
export function stripTunaiCatatan(catatan?: string | null): string {
  if (!catatan) return "";
  return catatan.replace(new RegExp(POLA_TUNAI.source, "gi"), "").replace(/\s{2,}/g, " ").trim();
}
