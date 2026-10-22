import { useEffect, useState } from "react";

/**
 * Helper kedaluwarsa order online.
 *
 * Backend mengirim `order_expires_at` = waktu order dibuat +
 * `TransaksiPenjualan::ORDER_TTL_MINUTES` (60 menit). Setelah lewat waktu itu
 * order `pending` tidak akan diverifikasi lagi (reservasi stok dilepas),
 * jadi UI harus menampilkan countdown dan badge "Kedaluwarsa".
 */

export interface ExpiryState {
  /** Detik sisa; 0 bila sudah lewat / tidak ada tanggal. */
  secondsLeft: number;
  expired: boolean;
  /** "HH:MM:SS" untuk countdown. */
  countdown: string;
  label: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

const parseTimestamp = (value?: string | null): number | null => {
  if (!value) return null;
  // Backend mengirim ISO 8601 dengan sufiks Z (UTC).
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

export const computeExpiry = (
  expiresAt: string | null | undefined,
  nowMs: number = Date.now(),
  /** Status order; countdown hanya relevan untuk `pending`. */
  status?: string
): ExpiryState => {
  const target = parseTimestamp(expiresAt);
  const statusLower = (status ?? "pending").toLowerCase();
  const stillWaiting = statusLower === "pending";

  if (target === null) {
    return {
      secondsLeft: 0,
      expired: false,
      countdown: "",
      label: "",
    };
  }

  const diffMs = target - nowMs;
  const secondsLeft = Math.max(0, Math.floor(diffMs / 1000));

  // Order yang sudah diproses tidak lagi "kedaluwarsa" walau jamnya lewat.
  if (!stillWaiting) {
    return { secondsLeft: 0, expired: false, countdown: "", label: "" };
  }

  if (diffMs <= 0) {
    return {
      secondsLeft: 0,
      expired: true,
      countdown: "00:00:00",
      label: "Pesanan kedaluwarsa",
    };
  }

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  const countdown = `${pad(h)}:${pad(m)}:${pad(s)}`;

  return {
    secondsLeft,
    expired: false,
    countdown,
    label: `Bayar dalam ${countdown}`,
  };
};

/**
 * Hook countdown yang berdetak tiap detik.
 * Berhenti otomatis saat order kedaluwarsa / sudah diproses.
 *
 * State hanya menyimpan `now` (bukan hasil hitungan), sehingga nilai expiry
 * selalu diturunkan saat render — tidak ada setState ganda di effect.
 */
export const useOrderExpiry = (
  expiresAt?: string | null,
  status?: string
): ExpiryState => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  const aktif = (status ?? "pending").toLowerCase() === "pending" && !!expiresAt;

  useEffect(() => {
    if (!aktif) return;

    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, status, aktif]);

  return computeExpiry(expiresAt, nowMs, status);
};


/** Format tanggal/jam lokal Indonesia. */
export const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  const ms = parseTimestamp(value);
  if (ms === null) return "-";
  return new Date(ms).toLocaleString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTime = (value?: string | null): string => {
  if (!value) return "-";
  const ms = parseTimestamp(value);
  if (ms === null) return "-";
  return new Date(ms).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
