/**
 * Menyalin teks ke papan klip (clipboard) — inti yang bisa diuji.
 *
 * Kenapa tidak langsung `navigator.clipboard`?
 *
 * - `navigator.clipboard.writeText()` hanya ada di secure context (HTTPS /
 *   localhost). Build web yang disajikan lewat `http://192.168.x.x` TIDAK
 *   punya API itu, jadi tombol "Salin" akan tampak mati.
 * - Jalur cadangan `document.execCommand("copy")` masih didukung semua browser
 *   dan dipakai react-native-web (`Clipboard.setString`).
 *
 * Modul ini bebas React Native supaya bisa diuji `node --test`; pembungkus
 * platform ada di `utils/salinPapanKlip.ts`.
 */

export type CaraSalin = "clipboard-api" | "exec-command" | "native" | "gagal";

export type HasilSalin = { ok: boolean; cara: CaraSalin };

/** Ketergantungan yang disuntikkan — memudahkan tes tanpa DOM/native. */
export type SaranaSalin = {
  /** `navigator.clipboard.writeText` bila tersedia. */
  tulisClipboardApi?: ((teks: string) => Promise<void>) | null;
  /** Jalur cadangan `<textarea>` + `document.execCommand("copy")`. */
  execCommandCopy?: ((teks: string) => boolean) | null;
  /** `Clipboard.setString` di Android/iOS. */
  setStringNative?: ((teks: string) => void) | null;
};

/**
 * Salin `teks` dengan urutan: Clipboard API → execCommand → native.
 * Mengembalikan cara yang berhasil agar UI bisa memberi pesan yang tepat
 * (mis. "Disalin" vs "Tekan lama untuk menyalin manual").
 */
export async function salinTeks(
  teks: string,
  sarana: SaranaSalin = {}
): Promise<HasilSalin> {
  const nilai = teks ?? "";

  if (nilai.trim() === "") {
    return { ok: false, cara: "gagal" };
  }

  if (sarana.tulisClipboardApi) {
    try {
      await sarana.tulisClipboardApi(nilai);
      return { ok: true, cara: "clipboard-api" };
    } catch {
      /* izin ditolak / bukan secure context → coba cadangan */
    }
  }

  if (sarana.execCommandCopy) {
    try {
      if (sarana.execCommandCopy(nilai)) {
        return { ok: true, cara: "exec-command" };
      }
    } catch {
      /* execCommand bisa melempar di WebView lama */
    }
  }

  if (sarana.setStringNative) {
    try {
      sarana.setStringNative(nilai);
      return { ok: true, cara: "native" };
    } catch {
      /* modul native tidak tersedia */
    }
  }

  return { ok: false, cara: "gagal" };
}

/**
 * Jalur cadangan berbasis `<textarea>` tak terlihat.
 *
 * `readOnly` + posisi di luar layar dipakai agar papan klip di iOS tidak
 * memunculkan keyboard saat elemen difokuskan.
 */
export function execCommandCopyWeb(teks: string): boolean {
  if (typeof document === "undefined") return false;

  const area = document.createElement("textarea");
  area.value = teks;
  area.readOnly = true;
  area.setAttribute("aria-hidden", "true");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";

  document.body.appendChild(area);

  try {
    area.select();
    area.setSelectionRange(0, teks.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}

/** Label singkat untuk umpan balik UI. */
export function pesanHasilSalin(hasil: HasilSalin, label: string): string {
  return hasil.ok ? `${label} disalin` : `Gagal menyalin ${label.toLowerCase()}`;
}
