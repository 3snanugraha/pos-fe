import { Clipboard, Platform } from "react-native";

import { execCommandCopyWeb, salinTeks, type HasilSalin } from "./salinTeks";

/**
 * Pembungkus platform untuk menyalin teks ke clipboard.
 *
 * `Clipboard` dari `react-native` sudah deprecated, tetapi masih berfungsi di
 * Android/iOS (modul `ClipboardModule` terdaftar di `MainReactPackage`) dan
 * react-native-web menyediakannya sebagai `document.execCommand("copy")`.
 * Alternatif `expo-clipboard` belum terpasang di repo ini, dan menambah
 * dependency baru berarti APK wajib dibangun ulang — sementara modul inti ini
 * sudah cukup untuk menyalin satu nomor transaksi.
 *
 * Urutan jalur: Clipboard API browser → execCommand (react-native-web /
 * WebView) → `Clipboard.setString` native.
 */

export async function salinKePapanKlip(teks: string): Promise<HasilSalin> {
  const apiWeb =
    Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard?.writeText
      ? (nilai: string) => navigator.clipboard.writeText(nilai)
      : null;

  const native =
    Platform.OS !== "web" && typeof Clipboard?.setString === "function"
      ? (nilai: string) => Clipboard.setString(nilai)
      : null;

  return salinTeks(teks, {
    tulisClipboardApi: apiWeb,
    // react-native-web memetakan Clipboard.setString ke execCommand; jalur
    // manual ini dipakai bila API modern tidak tersedia (http non-localhost).
    execCommandCopy:
      Platform.OS === "web" && typeof document !== "undefined" ? execCommandCopyWeb : null,
    setStringNative: native,
  });
}
