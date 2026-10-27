import { Linking, Platform } from "react-native";
import { API_CONFIG } from "../services/config";
import { siapkanDataStruk, type OrderStrukSumber, type TokoStrukSumber } from "./dataStrukKasir";
import { EscPosEncoder } from "./escpos";
import {
  IFRAME_STRUK_THERMAL_ID,
  bangunHtmlThermal,
  tulisEscPos,
  type DataStrukThermal,
} from "./strukThermal";

/**
 * Pengiriman struk thermal ke printer (58 mm).
 *
 * Tiga jalur, dipilih dari yang paling "nyata" ke paling aman — pola ini
 * mengikuti posku-umkm (`src/lib/print-smart.ts`) yang sudah terbukti di
 * perangkat pemilik:
 *
 * 1. **Android/iOS**: intent `rawbt:base64,...` (RawBT / Thermer). Printer
 *    thermal Bluetooth/USB dicetak langsung tanpa dialog.
 * 2. **Bila app print tidak terpasang**: jatuh ke dialog cetak native
 *    `expo-print` dengan HTML 58 mm (printer driver / PDF).
 * 3. **Web**: tidak ada intent `rawbt:`; HTML struk ditulis ke iframe
 *    tersembunyi 48 mm lalu `window.print()`. iframe SENGAJA dibiarkan di DOM
 *    (id `struk-thermal-kasir`) supaya isi struk bisa diperiksa QA — kalau
 *    langsung dilepas, tidak ada bukti apa yang dicetak.
 */

export type HasilCetakThermal =
  | { ok: true; jalur: "rawbt" | "dialog" | "web" }
  | { ok: false; alasan: "tanpa-app" | "galat"; pesan: string };

/** Selaraskan dengan `utils/cetakStrukPelanggan.ts` untuk delay yang sama. */
const JEDA_CETAK_WEB_MS = 120;

/**
 * Tulis HTML struk ke iframe tersembunyi lalu buka dialog cetak browser.
 * `id` iframe tetap → QA dapat membaca `#struk-thermal-kasir` setelah cetak.
 */
export function cetakHtmlDiWeb(html: string): HasilCetakThermal {
  if (typeof document === "undefined") {
    return { ok: false, alasan: "galat", pesan: "Browser tidak mendukung pencetakan." };
  }

  document.getElementById(IFRAME_STRUK_THERMAL_ID)?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = IFRAME_STRUK_THERMAL_ID;
  iframe.setAttribute("title", "Struk thermal pesanan");
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
    return { ok: false, alasan: "galat", pesan: "Gagal menyiapkan dokumen struk." };
  }

  jendela.setTimeout(() => {
    try {
      jendela.focus();
      jendela.print();
    } catch {
      /* popup blocker — HTML struk tetap tersimpan di iframe */
    }
  }, JEDA_CETAK_WEB_MS);

  return { ok: true, jalur: "web" };
}

/**
 * Ambil identitas toko dari API publik; null bila jaringan gagal.
 *
 * Endpoint ini publik (tanpa auth) dan sudah dipakai struk pelanggan, jadi
 * kasir tidak perlu token tambahan. Kegagalan apa pun (offline, 5xx) → null;
 * pemanggil memakai nama cadangan.
 */
export async function ambilTokoStruk(): Promise<TokoStrukSumber | null> {
  try {
    const respons = await fetch(`${API_CONFIG.baseUrl}/public/store-info`, {
      headers: { Accept: "application/json" },
    });

    if (!respons.ok) return null;

    const json: any = await respons.json();
    const data = json?.data ?? json;

    if (!data || typeof data !== "object") return null;

    return {
      nama_toko: data.nama_toko ?? null,
      alamat: data.alamat ?? null,
      telepon: data.telepon ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Cetak struk thermal untuk satu order, memuat sendiri identitas toko.
 * Dipisah dari `cetakStrukThermal` (yang murni transport) supaya layar cukup
 * memanggil satu fungsi dan tidak perlu tahu soal store-info.
 */
export async function cetakStrukOrderKasir(
  order: OrderStrukSumber,
  verifikasi?: { oleh?: string | null; pada?: string | null } | null
): Promise<HasilCetakThermal> {
  const toko = await ambilTokoStruk();
  return cetakStrukThermal(siapkanDataStruk(order, toko, verifikasi));
}

export async function cetakStrukThermal(data: DataStrukThermal): Promise<HasilCetakThermal> {
  const html = bangunHtmlThermal(data);

  if (Platform.OS === "web") {
    return cetakHtmlDiWeb(html);
  }

  // 1. RawBT/Thermer via intent. `canOpenURL` bisa melempar di perangkat tanpa
  //    intent handler, jadi kegagalan apa pun jatuh ke jalur 2.
  try {
    const uri = tulisEscPos(new EscPosEncoder(), data).getURI();
    const bisaBuka = await Linking.canOpenURL(uri);

    if (bisaBuka) {
      await Linking.openURL(uri);
      return { ok: true, jalur: "rawbt" };
    }
  } catch {
    /* lanjut ke dialog cetak native */
  }

  // 2. Dialog cetak native (expo-print) — hasilnya PDF 58 mm yang bisa dicetak
  //    lewat printer driver apa pun.
  try {
    const Print = await import("expo-print");
    await Print.printAsync({ html });
    return { ok: true, jalur: "dialog" };
  } catch (error: any) {
    return {
      ok: false,
      alasan: "tanpa-app",
      pesan:
        error?.message ??
        "Printer thermal belum terhubung. Pasang RawBT/Thermer atau hubungkan printer 58 mm.",
    };
  }
}
