/**
 * Harga grosir di sisi aplikasi pelanggan.
 *
 * Aturan BACKEND (`App\Services\HargaService`) adalah satu-satunya kebenaran.
 * Modul ini MENIRU aturan itu untuk TAMPILAN supaya angka di layar sama dengan
 * yang nanti ditagih server:
 *
 *   - tier `Ecer` (is_default / min_qty 1) adalah harga normal;
 *   - tier grosir dipakai OTOMATIS bila qty mencapai `min_qty`;
 *   - bila beberapa tier tercapai, yang menang adalah `min_qty` TERBESAR
 *     (partai mengalahkan promosi ber-min_qty rendah), tiebreak harga termurah
 *     lalu nama tier.
 *
 * Tanpa ini, layar menampilkan harga ecer sementara backend menagih harga
 * grosir — selisih yang baru terlihat di halaman pembayaran.
 *
 * Bebas React Native supaya bisa diuji `node --test`.
 */

/** Satu tier harga dari API (`harga_varian_satuan`). */
export type GrosirTier = {
  nama_tier: string;
  harga: number | string;
  min_qty: number | string;
  is_default?: boolean;
};

/** Ringkasan grosir per produk (field `grosir` pada `/public/products`). */
export type GrosirRingkas = {
  min_qty: number | string;
  harga: number | string;
  nama_tier?: string;
  nama_satuan?: string;
  varian_id?: number | null;
  hemat?: number | string;
};

/** Satu baris matriks harga (field `harga_jual_satuan` pada detail produk). */
export type BarisHargaSatuan = {
  varian_id: number;
  nama_varian?: string;
  satuan_id: number;
  nama_satuan: string;
  faktor: number | string;
  is_default_satuan?: boolean;
  /** Harga yang DITAGIH untuk qty 1 — sudah termasuk harga flash bila aktif. */
  harga_ecer: number | string;
  /** Harga ecer master (tanpa promo) — acuan harga coret. */
  harga_ecer_normal?: number | string;
  /** true bila harga flash aktif dan lebih murah dari harga ecer master. */
  flash?: boolean;
  tier: GrosirTier[];
};

export type HargaEfektif = {
  /** Harga yang dipakai untuk qty ini. */
  harga: number;
  /** Harga normal (tier Ecer) — acuan teks coret & hemat. */
  hargaEcer: number;
  namaTier: string;
  /** true bila yang dipakai adalah tier grosir, bukan ecer. */
  grosir: boolean;
  /** Tier termurah yang belum tercapai (untuk teks upsell). */
  berikut: { min_qty: number; harga: number; nama_tier: string } | null;
};

/** Label tier untuk harga flash (sama dengan `App\Support\HargaFlash::NAMA_TIER`). */
export const NAMA_TIER_FLASH = "Flash Sale";

const keAngka = (nilai: unknown): number => {
  const n = typeof nilai === "number" ? nilai : Number(String(nilai ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Tier yang BUKAN harga ecer (min_qty / is_default menentukan). */
export function tierGrosirSaja(tier: GrosirTier[] | undefined | null): GrosirTier[] {
  if (!Array.isArray(tier)) return [];
  return tier.filter((t) => !t.is_default && keAngka(t.min_qty) > 1);
}

/**
 * Harga efektif untuk `qty` tertentu, mengikuti aturan backend.
 *
 * @param tier    daftar tier (dari detail produk atau ringkasan kartu)
 * @param qty     jumlah yang dipesan
 * @param ecer    harga ecer acuan bila tier kosong (harga varian/produk)
 */
export function hargaEfektif(
  tier: GrosirTier[] | undefined | null,
  qty: number,
  ecer: number,
): HargaEfektif {
  const jumlah = Math.max(1, Math.floor(keAngka(qty) || 1));
  const hargaEcer = keAngka(ecer);
  const grosir = tierGrosirSaja(tier)
    .map((t) => ({
      min_qty: Math.max(2, Math.floor(keAngka(t.min_qty))),
      harga: keAngka(t.harga),
      nama_tier: String(t.nama_tier ?? ""),
    }))
    .filter((t) => t.harga > 0);

  // Kandidat yang ambangnya tercapai, diurutkan sesuai backend:
  // min_qty terbesar → harga termurah → nama tier.
  const tercapai = grosir
    .filter((t) => t.min_qty <= jumlah)
    .sort(
      (a, b) =>
        b.min_qty - a.min_qty || a.harga - b.harga || a.nama_tier.localeCompare(b.nama_tier),
    );

  const berikut =
    grosir
      .filter((t) => t.min_qty > jumlah)
      .sort(
        (a, b) =>
          a.min_qty - b.min_qty || a.harga - b.harga || a.nama_tier.localeCompare(b.nama_tier),
      )[0] ?? null;

  if (tercapai.length === 0) {
    const label = labelFlash(tier, jumlah, hargaEcer);

    return { harga: hargaEcer, hargaEcer, namaTier: label ?? "Ecer", grosir: false, berikut };
  }

  const dipakai = tercapai[0];

  return {
    harga: dipakai.harga,
    hargaEcer,
    namaTier: dipakai.nama_tier || "Grosir",
    grosir: true,
    berikut,
  };
}

/**
 * Label `Flash Sale` untuk harga ecer — hanya bila backend MEMANG mengirim
 * baris tier berlabel itu dan angkanya sama dengan harga yang dipakai.
 *
 * K1 membuat harga ecer yang ditagih bisa berasal dari promo. Tanpa label ini
 * keranjang menulis "Ecer" di sebelah angka harga flash (Rp 720.000 dengan
 * label "Ecer" padahal harga ecer master 750.000) — angka benar, keterangan
 * menyesatkan. Fungsi ini tidak mengarang label: barisnya harus ada di tier.
 */
function labelFlash(
  tier: GrosirTier[] | undefined | null,
  qty: number,
  harga: number,
): string | null {
  if (!Array.isArray(tier) || harga <= 0) return null;

  const baris = tier.find(
    (t) =>
      String(t.nama_tier ?? "") === NAMA_TIER_FLASH
      && keAngka(t.min_qty) <= qty
      && keAngka(t.harga) === harga,
  );

  return baris ? NAMA_TIER_FLASH : null;
}

/** Ringkasan grosir dari field `grosir` (kartu produk). */
export function tierDariRingkas(
  grosir: GrosirRingkas | null | undefined,
): GrosirTier[] {
  if (!grosir) return [];

  const minQty = keAngka(grosir.min_qty);
  const harga = keAngka(grosir.harga);

  if (minQty <= 1 || harga <= 0) return [];

  return [
    {
      nama_tier: grosir.nama_tier || "Grosir",
      harga,
      min_qty: minQty,
      is_default: false,
    },
  ];
}

/**
 * Harga efektif untuk satu BARIS matriks harga API (`harga_jual_satuan`).
 *
 * Sejak keputusan K1, baris itu sudah membawa harga efektif: `harga_ecer`
 * adalah harga yang benar-benar ditagih untuk qty 1 (harga flash bila promo
 * aktif), `harga_ecer_normal` harga master untuk harga coret, dan baris tier
 * yang lebih mahal dari flash sudah diganti label `Flash Sale`. Fungsi ini
 * menyatukan pembacaan itu supaya layar detail tidak menebak sendiri:
 *
 *  - ecer acuan `hargaEfektif()` = `harga_ecer` (efektif), sehingga qty 1 di
 *    layar sama dengan tagihan checkout;
 *  - `hargaNormal` hanya untuk teks coret/badge diskon, tidak pernah dipakai
 *    sebagai harga tagihan.
 *
 * Produk legacy tanpa matriks (atau payload lama yang belum punya field baru)
 * jatuh ke `ecerCadangan` / `flashCadangan` tanpa mengarang angka.
 */
export function hargaEfektifBaris(
  baris: BarisHargaSatuan | null | undefined,
  qty: number,
  ecerCadangan: number,
  flashCadangan?: number | null,
): HargaEfektif & { hargaNormal: number; flash: boolean } {
  const ecerMaster = keAngka(baris?.harga_ecer_normal ?? ecerCadangan);

  const flashDariBaris = Boolean(baris?.flash);
  const flashCadanganAngka = keAngka(flashCadangan ?? 0);
  const flashAktif = flashDariBaris
    || (flashCadanganAngka > 0 && ecerMaster > 0 && flashCadanganAngka < ecerMaster);

  // Acuan ecer untuk hargaEfektif().
  //
  // Kontrak BARU: `harga_ecer` sudah harga efektif → dipakai apa adanya.
  // Payload LAMA (APK terpasang, belum menerima field baru): `harga_ecer` masih
  // harga MASTER. Karena itu harga flash dari field produk dipakai bila lebih
  // murah, sehingga layar tidak kembali menampilkan harga ecer saat promo.
  const ecerApi = keAngka(baris?.harga_ecer ?? 0);
  const ecerKandidat = ecerApi > 0 ? ecerApi : ecerMaster;
  const ecerEfektif = flashAktif && flashCadanganAngka > 0 && flashCadanganAngka < ecerKandidat
    ? flashCadanganAngka
    : ecerKandidat;

  const hasil = hargaEfektif(baris?.tier ?? [], qty, ecerEfektif);

  // Bila harga yang dipakai memang harga promo (bukan tier grosir), labelnya
  // `Flash Sale` supaya keranjang/ringkasan menyebut KENAPA harganya turun.
  const pakaiFlash = flashAktif && !hasil.grosir && ecerMaster > hasil.harga;

  return {
    ...hasil,
    namaTier: pakaiFlash ? NAMA_TIER_FLASH : hasil.namaTier,
    // Coret hanya punya arti bila harga master memang lebih tinggi.
    hargaNormal: ecerMaster,
    flash: pakaiFlash,
  };
}

/** Baris matriks harga untuk satu varian (detail produk). */
export function barisUntukVarian(
  matriks: BarisHargaSatuan[] | undefined | null,
  varianId: number | null | undefined,
  satuanId?: number | null,
): BarisHargaSatuan | null {
  if (!Array.isArray(matriks) || matriks.length === 0) return null;

  const kandidat = matriks.filter((b) => Number(b.varian_id) === Number(varianId));
  const dipakai = kandidat.length > 0 ? kandidat : matriks;
  const urut = [...dipakai].sort((a, b) => Number(b.is_default_satuan) - Number(a.is_default_satuan));

  if (satuanId != null) {
    const cocok = urut.find((b) => Number(b.satuan_id) === Number(satuanId));
    if (cocok) return cocok;
  }

  return urut[0] ?? null;
}

/**
 * Teks ringkas harga grosir untuk kartu produk: `Grosir 12+ · Rp 13.500`.
 * Mengembalikan null bila produk tidak punya tier grosir.
 */
export function labelGrosir(
  grosir: GrosirRingkas | null | undefined,
  formatRupiah: (angka: number) => string,
): string | null {
  const tier = tierDariRingkas(grosir)[0];

  if (!tier) return null;

  return `${tier.nama_tier} ${keAngka(tier.min_qty)}+ · ${formatRupiah(keAngka(tier.harga))}`;
}

/** Teks upsell: `Beli 12+ jadi Rp 13.500 (Grosir 1)`. */
export function teksUpsell(
  berikut: { min_qty: number; harga: number; nama_tier: string } | null,
  formatRupiah: (angka: number) => string,
): string | null {
  if (!berikut) return null;

  return `Beli ${berikut.min_qty}+ jadi ${formatRupiah(berikut.harga)} (${berikut.nama_tier})`;
}
