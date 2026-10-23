import type { Href } from "expo-router";
import type { ImperativeRouter } from "expo-router/build/imperative-api";

/**
 * Navigasi kembali yang aman untuk layar yang bisa dibuka langsung.
 *
 * `router.back()` melempar dev warning
 * "The action GO_BACK was not handled by any navigator" bila stack kosong —
 * dan itu memang terjadi: `/checkout/success`, `/orders/[id]`, `/product/[id]`,
 * `/checkout/summary` semuanya bisa dibuka dari URL/deep link (web, notifikasi,
 * share link) tanpa riwayat navigasi di belakangnya.
 *
 * Aturan: pakai `back()` hanya bila memang ada layar sebelumnya; selain itu
 * `replace()` ke tujuan yang masuk akal (default beranda) agar pengguna tidak
 * terjebak di layar buntu.
 */
export const kembaliAman = (router: ImperativeRouter, fallback: Href = "/"): void => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
};

/**
 * Buang layar saat ini lalu menuju `tujuan` — dipakai setelah aksi selesai
 * (mis. simpan alamat) di layar yang bisa dibuka langsung.
 */
export const kembaliKe = (router: ImperativeRouter, tujuan: Href): void => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(tujuan);
};
