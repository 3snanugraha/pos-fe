import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/**
 * Bunyi bell untuk notifikasi realtime.
 *
 * Kenapa pakai `createAudioPlayer` (bukan hook)? Bunyi harus bisa diputar dari
 * callback jaringan (bukan render komponen), dan satu pemutar dipakai bersama
 * seluruh aplikasi.
 *
 * Batasan browser (react-native-web): audio baru boleh berbunyi setelah
 * interaksi pengguna pertama. Karena itu:
 * - `bukaKunciAudio()` dipanggil pada sentuhan pertama (lihat
 *   `useNotifikasiRealtime`), dan
 * - `putarBell()` TIDAK melempar error bila diblokir — ia hanya mencatat
 *   status `tertunda` supaya pemanggil bisa memutuskan menampilkan toast saja.
 */

let pemutar: AudioPlayer | null = null;
let sudahDibuka = false;
let sedangMemuat = false;

/** Status hasil percobaan memutar bunyi. */
export type StatusBell = "diputar" | "tertunda" | "gagal" | "dimatikan";

/**
 * Muat sumber audio sekali. `require` harus statis agar Metro membundel
 * asetnya; dipisah di fungsi ini supaya kegagalan aset hilang tidak
 * menjatuhkan seluruh modul.
 */
function pastikanPemutar(): AudioPlayer | null {
  if (pemutar) {
    return pemutar;
  }

  if (sedangMemuat) {
    return null;
  }

  sedangMemuat = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sumber = require("../../assets/sounds/bell.wav");
    pemutar = createAudioPlayer(sumber);
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {
      /* sebagian platform tidak mendukung opsi ini */
    });
  } catch {
    pemutar = null;
  } finally {
    sedangMemuat = false;
  }

  return pemutar;
}

/**
 * Tandai audio boleh diputar. Panggil dari handler sentuhan pertama
 * (`onPressIn`, dsb.) — di web ini satu-satunya cara membuka kebijakan
 * autoplay.
 */
export function bukaKunciAudio(): void {
  sudahDibuka = true;
  pastikanPemutar();
}

let pembukaTerpasang = false;

/**
 * Pasang pembuka otomatis sekali jalan: sentuhan/klik/keyboard pertama di
 * mana pun membuka kunci audio. Ini yang membuat bell pada notifikasi
 * BERIKUTNYA berbunyi walau notifikasi pertama tiba sebelum ada interaksi.
 *
 * Aman dipanggil berulang; tidak melakukan apa pun di native (tidak perlu).
 */
export function pasangPembukaAudio(): void {
  if (pembukaTerpasang || typeof document === "undefined" || typeof document.addEventListener !== "function") {
    return;
  }

  pembukaTerpasang = true;

  const buka = () => {
    bukaKunciAudio();
    document.removeEventListener("pointerdown", buka);
    document.removeEventListener("keydown", buka);
    document.removeEventListener("touchstart", buka);
  };

  document.addEventListener("pointerdown", buka);
  document.addEventListener("keydown", buka);
  document.addEventListener("touchstart", buka);
}

/** True bila audio sudah pernah "dibuka" lewat interaksi pengguna. */
export function audioSiap(): boolean {
  return sudahDibuka && pemutar !== null;
}

/**
 * Putar bell sekali. Tidak pernah melempar error.
 *
 * @param aktif false bila admin mematikan bunyi di pengaturan → `dimatikan`.
 */
export async function putarBell(aktif = true): Promise<StatusBell> {
  if (!aktif) {
    return "dimatikan";
  }

  const player = pastikanPemutar();

  if (!player) {
    return "gagal";
  }

  if (!sudahDibuka) {
    // Browser akan menolak; jangan buang kesempatan memutar nanti.
    return "tertunda";
  }

  try {
    await player.seekTo(0);
    player.play();
    return "diputar";
  } catch {
    return "gagal";
  }
}

/** Lepas pemutar (dipakai saat logout / unmount di level aplikasi). */
export async function lepasBell(): Promise<void> {
  try {
    pemutar?.remove();
  } catch {
    /* abaikan */
  }

  pemutar = null;
  sudahDibuka = false;
}
