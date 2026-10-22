/**
 * Pemetaan status pesanan ke label (i18n), nada warna, dan ikon Lucide.
 *
 * Backend `TransaksiPenjualan` memakai `pending | selesai | dibatalkan | retur`,
 * tetapi data lama masih membawa status versi sebelumnya
 * (`confirmed | processing | shipped | delivered | cancelled | completed`).
 * Keduanya dipetakan di sini supaya riwayat dan detail pesanan selalu
 * menampilkan label Bahasa Indonesia yang sama dan tidak ada literal copy
 * yang tersebar di layar.
 */
import {
  CheckCircle2,
  CheckCheck,
  CircleHelp,
  Clock,
  Cog,
  RotateCcw,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react-native";
import { teks } from "./i18n";
import { colors } from "../theme/tokens";

/** Nada warna status — dipetakan ke kelas token di komponen. */
export type NadaStatus = "menunggu" | "proses" | "selesai" | "batal" | "netral";

export type InfoStatus = {
  /** Label siap tampil (Bahasa Indonesia). */
  label: string;
  nada: NadaStatus;
  ikon: LucideIcon;
};

const PETA: Record<string, InfoStatus> = {
  pending: { label: teks.status.menungguVerifikasi, nada: "menunggu", ikon: Clock },
  confirmed: { label: teks.status.dikonfirmasi, nada: "proses", ikon: CheckCircle2 },
  processing: { label: teks.status.diproses, nada: "proses", ikon: Cog },
  shipped: { label: teks.status.dikirim, nada: "proses", ikon: Truck },
  delivered: { label: teks.status.selesai, nada: "selesai", ikon: CheckCheck },
  completed: { label: teks.status.selesai, nada: "selesai", ikon: CheckCheck },
  selesai: { label: teks.status.selesaiDiterima, nada: "selesai", ikon: CheckCheck },
  dibatalkan: { label: teks.status.dibatalkanKasir, nada: "batal", ikon: XCircle },
  cancelled: { label: teks.status.dibatalkan, nada: "batal", ikon: XCircle },
  retur: { label: teks.status.retur, nada: "netral", ikon: RotateCcw },
};

const TIDAK_DIKENAL: InfoStatus = {
  label: teks.status.menunggu,
  nada: "netral",
  ikon: CircleHelp,
};

/** Info status untuk sebuah nilai `status_transaksi`/`status`. */
export function infoStatus(status?: string | null): InfoStatus {
  return PETA[(status ?? "pending").toLowerCase()] ?? TIDAK_DIKENAL;
}

/** Kelas Tailwind latar badge status. */
export const nadaBadgeBg: Record<NadaStatus, string> = {
  menunggu: "bg-warning-100",
  proses: "bg-primary-100",
  selesai: "bg-success-100",
  batal: "bg-danger-100",
  netral: "bg-neutral-100",
};

/**
 * Kelas Tailwind warna teks badge status.
 * Semua kombinasi di atas tint-nya >= 4,5:1 (guideline §2.1 & §7) — jangan
 * memakai primary-500/600 atau warning-500 untuk teks kecil.
 */
export const nadaBadgeTeks: Record<NadaStatus, string> = {
  menunggu: "text-warning-700",
  proses: "text-primary-800",
  selesai: "text-success-700",
  batal: "text-danger-700",
  netral: "text-neutral-700",
};

/** Warna ikon (prop Lucide) untuk nada status. */
export const warnaNada: Record<NadaStatus, string> = {
  menunggu: colors.warning700,
  proses: colors.primary600,
  selesai: colors.success700,
  batal: colors.danger700,
  netral: colors.neutral500,
};

/** Latar lingkaran ikon status. */
export const latarNada: Record<NadaStatus, string> = {
  menunggu: "bg-warning-50",
  proses: "bg-primary-100",
  selesai: "bg-success-100",
  batal: "bg-danger-50",
  netral: "bg-neutral-100",
};

/** Status yang sudah final (tidak bisa dibatalkan, boleh "Beli Lagi"). */
export function statusFinal(status?: string | null): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "selesai" || s === "completed" || s === "delivered" || s === "dibatalkan";
}

/** Pesanan masih boleh dibatalkan pelanggan. */
export function bisaDibatalkan(status?: string | null): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "pending" || s === "confirmed";
}

/**
 * Indeks tahap timeline (0 dibuat, 1 diproses, 2 selesai). `-1` = tidak
 * ditampilkan (status batal/retur punya panel sendiri).
 */
export function indeksTimeline(status?: string | null): number {
  const s = (status ?? "").toLowerCase();
  if (s === "selesai" || s === "completed" || s === "delivered") return 2;
  if (s === "processing" || s === "shipped") return 1;
  if (s === "pending" || s === "confirmed") return 0;
  return -1;
}

/** Tiga tahap timeline sesuai guideline (dibuat → diproses → selesai). */
export const TAHAP_TIMELINE = [
  { key: "pending", label: teks.pesanan.tahap.dibuat, deskripsi: teks.pesanan.tahap.dibuatDeskripsi },
  { key: "proses", label: teks.pesanan.tahap.diproses, deskripsi: teks.pesanan.tahap.diprosesDeskripsi },
  { key: "selesai", label: teks.pesanan.tahap.selesai, deskripsi: teks.pesanan.tahap.selesaiDeskripsi },
] as const;
