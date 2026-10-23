import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { bangunHtmlStruk, type DataStrukPelanggan } from "./strukPelanggan";

/**
 * Cetak struk untuk PELANGGAN sebagai PDF — bukan ESC/POS.
 *
 * Latar (bug pemilik 2026-10-23): tombol "Cetak Struk" di detail pesanan
 * pelanggan memanggil jalur thermal (`utils/printReceipt.ts`) yang membuka
 * `rawbt:` atau mengunduh `struk-*.bin`. Pelanggan tidak punya printer
 * thermal, jadi hasilnya tidak bisa dibaca. Jalur thermal TIDAK diubah —
 * kasir/admin di back-office tetap memakainya; layar ini memakai PDF.
 *
 * Perilaku per platform:
 * - Android/iOS: `Print.printToFileAsync` → PDF di cache → `Sharing.shareAsync`
 *   (simpan / kirim WhatsApp / buka aplikasi PDF). Bila Sharing tidak
 *   tersedia, jatuh ke dialog cetak native `Print.printAsync` yang juga
 *   menghasilkan PDF.
 * - Web: `expo-print` web hanya memicu `window.print()` pada halaman aplikasi
 *   (bukan HTML struk), jadi struk ditulis ke `<iframe>` tersembunyi lalu
 *   dicetak dari iframe itu. Dialog cetak browser menawarkan "Save as PDF",
 *   dan isi iframe menyimpan HTML struk yang sebenarnya (dipakai QA untuk
 *   membuktikan kop memakai nama toko dari backend).
 */

export type HasilCetakStruk =
  | { ok: true; mode: "pdf" | "dialog" | "web"; uri?: string }
  | { ok: false; message: string };

/** id iframe struk di web — dipakai QA untuk membaca isi yang dicetak. */
export const IFRAME_STRUK_ID = "struk-pelanggan-print";

/**
 * Tulis HTML struk ke iframe tersembunyi lalu buka dialog cetak.
 * iframe sengaja DIBIARKAN di DOM (disembunyikan) sampai pencetakan berikutnya
 * supaya isi struk bisa diperiksa; kalau langsung dilepas, QA tidak bisa
 * membuktikan apa yang dicetak.
 */
function cetakDiWeb(html: string): HasilCetakStruk {
  if (typeof document === "undefined") {
    return { ok: false, message: "Browser tidak mendukung pencetakan." };
  }

  document.getElementById(IFRAME_STRUK_ID)?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = IFRAME_STRUK_ID;
  iframe.setAttribute("title", "Struk pesanan");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.srcdoc = html;

  document.body.appendChild(iframe);

  const jendela = iframe.contentWindow;
  if (!jendela) {
    return { ok: false, message: "Gagal menyiapkan dokumen struk." };
  }

  // Tunggu dokumen iframe selesai dimuat sebelum mencetak; `srcdoc` selesai
  // hampir seketika, tetapi Chrome butuh satu tick untuk layout.
  jendela.setTimeout(() => {
    try {
      jendela.focus();
      jendela.print();
    } catch {
      /* dialog cetak diblokir (popup blocker) — HTML tetap ada di iframe */
    }
  }, 120);

  return { ok: true, mode: "web" };
}

/**
 * Bangun PDF struk pelanggan lalu buka jalur berbagi/cetak yang sesuai.
 * `data.toko` WAJIB berasal dari `GET /api/public/store-info`.
 */
export async function cetakStrukPelangganPdf(
  data: DataStrukPelanggan
): Promise<HasilCetakStruk> {
  const html = bangunHtmlStruk(data);

  if (Platform.OS === "web") {
    return cetakDiWeb(html);
  }

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    try {
      const bisaBagikan = await Sharing.isAvailableAsync();
      if (bisaBagikan) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Simpan atau bagikan struk",
        });
        return { ok: true, mode: "pdf", uri };
      }
    } catch {
      /* berbagi gagal → coba dialog cetak native di bawah */
    }

    await Print.printAsync({ html });
    return { ok: true, mode: "dialog", uri };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message ?? "Gagal membuat PDF struk.",
    };
  }
}
