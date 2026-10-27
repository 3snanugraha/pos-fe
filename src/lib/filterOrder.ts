/**
 * Logika filter daftar "Order Masuk" (layar kasir).
 *
 * Sengaja bebas React Native/Intl khusus platform supaya bisa diuji
 * `node --test` (`src/lib/__tests__/filterOrder.test.ts`) — tanggal, query
 * string, dan validasi input di sini, bukan di dalam komponen layar.
 *
 * Semua filter diterjemahkan menjadi parameter API `GET /api/transactions`
 * (backend: `TransaksiController@index`): status, jenis, start_date,
 * end_date, metode_pembayaran_id, search.
 */

export type StatusFilter = "semua" | "pending" | "selesai" | "dibatalkan";

export type RentangFilter = "semua" | "hari_ini" | "7_hari" | "30_hari" | "kustom";

export type FilterOrder = {
  status: StatusFilter;
  rentang: RentangFilter;
  /** yyyy-mm-dd — hanya dipakai saat `rentang === "kustom"`. */
  dariTanggal: string;
  sampaiTanggal: string;
  metodePembayaranId: number | null;
  cari: string;
};

/** Status default: order yang masih menunggu verifikasi (perilaku lama). */
export const FILTER_AWAL: FilterOrder = {
  status: "pending",
  rentang: "30_hari",
  dariTanggal: "",
  sampaiTanggal: "",
  metodePembayaranId: null,
  cari: "",
};

/** Preset rentang tanggal yang ditampilkan sebagai chip. */
export const PRESET_RENTANG: { kunci: RentangFilter; label: string }[] = [
  { kunci: "hari_ini", label: "Hari ini" },
  { kunci: "7_hari", label: "7 hari" },
  { kunci: "30_hari", label: "30 hari" },
  { kunci: "semua", label: "Semua" },
];

export const LABEL_STATUS: { kunci: StatusFilter; label: string }[] = [
  { kunci: "pending", label: "Menunggu" },
  { kunci: "selesai", label: "Selesai" },
  { kunci: "dibatalkan", label: "Ditolak" },
  { kunci: "semua", label: "Semua" },
];

/**
 * Tanggal ISO **lokal** (yyyy-mm-dd).
 *
 * `toISOString()` mengonversi ke UTC: di WIB (UTC+7) pukul 06.00 tanggal 27
 * menjadi 2026-10-26T23.00Z, sehingga filter "Hari ini" membuang transaksi
 * pagi hari. Karena itu bagian tanggal diambil dari komponen lokal.
 */
export function tanggalLokalISO(waktu: Date): string {
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${waktu.getFullYear()}-${dua(waktu.getMonth() + 1)}-${dua(waktu.getDate())}`;
}

/** Geser tanggal lokal sebanyak `hari` (negatif = mundur). */
export function geserHari(waktu: Date, hari: number): Date {
  const salinan = new Date(waktu.getTime());
  salinan.setDate(salinan.getDate() + hari);
  return salinan;
}

/**
 * Batas tanggal untuk API. `end_date` inklusif (backend memakai `whereDate`,
 * jadi transaksi pukul 23.59 pada tanggal akhir tetap ikut).
 * `undefined` = parameter tidak dikirim.
 */
export function rentangTanggal(
  filter: FilterOrder,
  sekarang: Date = new Date()
): { start_date?: string; end_date?: string } {
  switch (filter.rentang) {
    case "hari_ini": {
      const hari = tanggalLokalISO(sekarang);
      return { start_date: hari, end_date: hari };
    }
    case "7_hari":
      return { start_date: tanggalLokalISO(geserHari(sekarang, -6)), end_date: tanggalLokalISO(sekarang) };
    case "30_hari":
      return { start_date: tanggalLokalISO(geserHari(sekarang, -29)), end_date: tanggalLokalISO(sekarang) };
    case "kustom": {
      const hasil: { start_date?: string; end_date?: string } = {};
      if (validasiTanggal(filter.dariTanggal)) hasil.start_date = filter.dariTanggal;
      if (validasiTanggal(filter.sampaiTanggal)) hasil.end_date = filter.sampaiTanggal;
      return hasil;
    }
    case "semua":
    default:
      return {};
  }
}

/**
 * Validasi teks tanggal `yyyy-mm-dd` — termasuk tanggal yang tidak ada di
 * kalender (2026-02-31) supaya tidak dikirim ke API lalu menghasilkan daftar
 * kosong tanpa penjelasan.
 */
export function validasiTanggal(teks: string): boolean {
  const nilai = (teks ?? "").trim();
  const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(nilai);
  if (!cocok) return false;

  const [, tahun, bulan, hari] = cocok;
  const tanggal = new Date(Number(tahun), Number(bulan) - 1, Number(hari));

  return (
    tanggal.getFullYear() === Number(tahun) &&
    tanggal.getMonth() === Number(bulan) - 1 &&
    tanggal.getDate() === Number(hari)
  );
}

/** yyyy-mm-dd → dd/mm/yyyy (label ringkas di UI dan struk). */
export function tanggalTampil(teks: string): string {
  if (!validasiTanggal(teks)) return teks ?? "";
  const [tahun, bulan, hari] = teks.split("-");
  return `${hari}/${bulan}/${tahun}`;
}

/**
 * Query string untuk `GET /api/transactions`.
 *
 * `jenis=online` selalu dikirim: layar ini hanya menampilkan order dari
 * aplikasi pelanggan, bukan transaksi kasir (offline).
 */
export function bangunQueryOrder(
  filter: FilterOrder,
  sekarang: Date = new Date(),
  halaman: number = 1,
): string {
  const params = new URLSearchParams();
  params.set("jenis", "online");
  // Baris item ikut dalam satu permintaan — layar menampilkan rincian barang
  // per kartu tanpa memanggil `GET /transactions/{id}` satu per satu.
  params.set("dengan_item", "1");
  // Halaman diperlukan karena `per_page` dibatasi; tanpa ini order ke-51 dan
  // seterusnya tidak pernah bisa dijangkau dari layar.
  if (halaman > 1) params.set("page", String(halaman));

  if (filter.status !== "semua") {
    params.set("status", filter.status);
  }

  const rentang = rentangTanggal(filter, sekarang);
  if (rentang.start_date) params.set("start_date", rentang.start_date);
  if (rentang.end_date) params.set("end_date", rentang.end_date);

  if (filter.metodePembayaranId != null) {
    params.set("metode_pembayaran_id", String(filter.metodePembayaranId));
  }

  const cari = (filter.cari ?? "").trim();
  if (cari !== "") {
    params.set("search", cari);
  }

  params.set("per_page", "50");
  params.set("sort_by", "tanggal_transaksi");
  params.set("sort_direction", "desc");

  return params.toString();
}

/** Jumlah filter aktif selain status default — untuk badge "Filter (n)". */
export function jumlahFilterAktif(filter: FilterOrder): number {
  let jumlah = 0;
  if (filter.rentang !== FILTER_AWAL.rentang) jumlah += 1;
  if (filter.metodePembayaranId != null) jumlah += 1;
  if ((filter.cari ?? "").trim() !== "") jumlah += 1;
  if (filter.status !== FILTER_AWAL.status) jumlah += 1;
  return jumlah;
}

/** True bila filter tanggal kustom tidak valid (dan karenanya harus ditolak). */
export function galatTanggalKustom(filter: FilterOrder): string | null {
  if (filter.rentang !== "kustom") return null;

  const dari = (filter.dariTanggal ?? "").trim();
  const sampai = (filter.sampaiTanggal ?? "").trim();

  if (dari === "" && sampai === "") {
    return "Isi tanggal mulai atau tanggal akhir (format YYYY-MM-DD).";
  }

  if (dari !== "" && !validasiTanggal(dari)) {
    return `Tanggal mulai tidak valid: ${dari} (format YYYY-MM-DD).`;
  }

  if (sampai !== "" && !validasiTanggal(sampai)) {
    return `Tanggal akhir tidak valid: ${sampai} (format YYYY-MM-DD).`;
  }

  if (dari !== "" && sampai !== "" && dari > sampai) {
    return "Tanggal mulai tidak boleh setelah tanggal akhir.";
  }

  return null;
}

/** Ringkasan filter dalam satu baris (dipakai sebagai keterangan hasil). */
export function ringkasFilter(filter: FilterOrder): string {
  const bagian: string[] = [];

  const status = LABEL_STATUS.find((s) => s.kunci === filter.status);
  if (status) bagian.push(`Status: ${status.label}`);

  if (filter.rentang === "kustom") {
    const dari = filter.dariTanggal ? tanggalTampil(filter.dariTanggal) : "awal";
    const sampai = filter.sampaiTanggal ? tanggalTampil(filter.sampaiTanggal) : "sekarang";
    bagian.push(`${dari} – ${sampai}`);
  } else {
    const preset = PRESET_RENTANG.find((r) => r.kunci === filter.rentang);
    if (preset) bagian.push(preset.label);
  }

  if (filter.metodePembayaranId != null) bagian.push("Metode dipilih");
  if ((filter.cari ?? "").trim() !== "") bagian.push(`Cari: ${filter.cari.trim()}`);

  return bagian.join(" · ");
}
