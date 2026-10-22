/**
 * Utilitas format tampilan (locale id-ID).
 * Sumber: docs/PATTERN DESIGN.txt §6 — Rupiah tanpa desimal, tanggal absolut
 * gaya "23 Okt 2026", waktu relatif "2 mnt lalu / 9 hari lalu".
 */

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const idrNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/**
 * Rp 2.070.000 — simbol "Rp" + spasi tipis sesuai Intl id-ID.
 */
export function rupiah(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || Number.isNaN(n)) return idr.format(0);
  return idr.format(n);
}

/** 2.070.000 — angka tanpa simbol mata uang. */
export function angka(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0";
  return idrNumber.format(value);
}

/**
 * Ambil bagian numerik dari string harga backend ("Rp 12.000", "12000.00").
 * Mengembalikan null bila tidak ada angka.
 */
export function parseRupiah(text: string | number | null | undefined): number | null {
  if (text == null) return null;
  if (typeof text === "number") return Number.isNaN(text) ? null : text;
  const cleaned = text.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

/** 23 Okt 2026 */
export function tanggal(input: Date | string | number | null | undefined): string {
  if (input == null || input === "") return "-";
  const d = toDate(input);
  if (!d) return "-";
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** 23 Okt 2026, 14.05 */
export function tanggalWaktu(input: Date | string | number | null | undefined): string {
  if (input == null || input === "") return "-";
  const d = toDate(input);
  if (!d) return "-";
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  return `${tanggal(d)}, ${jam}.${menit}`;
}

/** 14.05 */
export function jam(input: Date | string | number | null | undefined): string {
  if (input == null || input === "") return "-";
  const d = toDate(input);
  if (!d) return "-";
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Waktu relatif: "baru saja", "2 mnt lalu", "3 jam lalu", "9 hari lalu",
 * lalu jatuh ke tanggal absolut setelah 30 hari.
 */
export function waktuRelatif(input: Date | string | number | null | undefined): string {
  if (input == null || input === "") return "-";
  const d = toDate(input);
  if (!d) return "-";
  const diffMs = Date.now() - d.getTime();
  const menit = Math.floor(diffMs / 60_000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} mnt lalu`;
  const jamLalu = Math.floor(menit / 60);
  if (jamLalu < 24) return `${jamLalu} jam lalu`;
  const hari = Math.floor(jamLalu / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return tanggal(d);
}

/** "su****er@gmail.com" untuk subjudul layar OTP (guideline §3.3). */
export function samarkanEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  if (user.length <= 2) return `${user[0] ?? ""}***@${domain}`;
  const awal = user.slice(0, 2);
  const akhir = user.slice(-2);
  return `${awal}${"*".repeat(Math.max(4, user.length - 4))}${akhir}@${domain}`;
}

/** 99+ pada badge jumlah (guideline §3.18). */
export function badgeJumlah(n: number): string {
  return n > 99 ? "99+" : String(n);
}

function toDate(input: Date | string | number): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  // Angka kecil = epoch detik (backend mengirim epoch detik).
  if (typeof input === "number") {
    const ms = input < 1e11 ? input * 1000 : input;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const asNumber = Number(input);
  if (input.trim() !== "" && !Number.isNaN(asNumber) && /^\d+$/.test(input.trim())) {
    return toDate(asNumber);
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}
