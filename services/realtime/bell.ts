import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Platform } from "react-native";

/**
 * Bunyi bell untuk notifikasi realtime.
 *
 * Kenapa pakai `createAudioPlayer` (bukan hook)? Bunyi harus bisa diputar dari
 * callback jaringan (bukan render komponen), dan satu pemutar dipakai bersama
 * seluruh aplikasi.
 *
 * Batasan per platform (inilah bedanya web dan native):
 * - **Web (react-native-web)**: browser menolak audio sebelum interaksi
 *   pengguna pertama. `bukaKunciAudio()` dipanggil pada sentuhan/klik pertama
 *   (`pasangPembukaAudio`), dan `putarBell()` mengembalikan `tertunda` alih-alih
 *   melempar error.
 * - **Android/iOS**: TIDAK ADA kebijakan autoplay. Kunci audio harus dianggap
 *   terbuka sejak awal — kalau tidak, bell tidak akan pernah berbunyi. Dulu
 *   `sudahDibuka` hanya di-set oleh handler `document`, yang tidak ada di
 *   native, sehingga APK Android tidak pernah membunyikan bell sama sekali.
 *
 * Preferensi pengguna (toggle suara) disimpan di AsyncStorage supaya pilihan
 * "matikan bell" bertahan setelah aplikasi ditutup.
 */

const KUNCI_PREFERENSI_SUARA = "@notifikasi_suara_aktif";

let pemutar: AudioPlayer | null = null;
let sedangMemuat = false;

/**
 * Status kunci audio. Di native langsung `true` karena tidak ada kebijakan
 * autoplay yang perlu ditembus.
 */
let sudahDibuka = Platform.OS !== "web";

/** Preferensi pengguna; `true` = bell boleh berbunyi. */
let preferensiSuara = true;
let preferensiDimuat = false;

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
 * Pasang pembuka otomatis sekali jalan.
 *
 * - Web: sentuhan/klik/keyboard pertama di mana pun membuka kunci audio,
 *   sehingga bell pada notifikasi BERIKUTNYA berbunyi walau notifikasi
 *   pertama tiba sebelum ada interaksi.
 * - Native: tidak ada kebijakan autoplay, jadi pemutar langsung disiapkan
 *   (tanpa menunggu interaksi) supaya notifikasi pertama pun berbunyi.
 *
 * Aman dipanggil berulang.
 */
export function pasangPembukaAudio(): void {
  if (Platform.OS !== "web") {
    bukaKunciAudio();
    return;
  }

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

/** True bila audio sudah "dibuka" (web: interaksi; native: selalu) & termuat. */
export function audioSiap(): boolean {
  return sudahDibuka && pemutar !== null;
}

/**
 * Baca preferensi suara pengguna dari penyimpanan (sekali).
 *
 * Kegagalan storage tidak boleh menjatuhkan aplikasi → default tetap "bunyi".
 */
export async function muatPreferensiSuara(): Promise<boolean> {
  if (preferensiDimuat) {
    return preferensiSuara;
  }

  preferensiDimuat = true;

  try {
    const tersimpan = await AsyncStorage.getItem(KUNCI_PREFERENSI_SUARA);
    if (tersimpan !== null) {
      preferensiSuara = tersimpan !== "0";
    }
  } catch {
    /* pakai default */
  }

  return preferensiSuara;
}

/** True bila bell diizinkan oleh pengguna. */
export function suaraAktif(): boolean {
  return preferensiSuara;
}

/**
 * Ubah preferensi suara (dipakai tombol toggle di UI).
 *
 * @returns nilai baru
 */
export async function setSuaraAktif(aktif: boolean): Promise<boolean> {
  preferensiSuara = aktif;
  preferensiDimuat = true;

  try {
    await AsyncStorage.setItem(KUNCI_PREFERENSI_SUARA, aktif ? "1" : "0");
  } catch {
    /* preferensi tetap berlaku untuk sesi ini */
  }

  // Menyalakan suara adalah interaksi pengguna → sekaligus buka kunci audio.
  if (aktif) {
    bukaKunciAudio();
  }

  return preferensiSuara;
}

/**
 * Putar bell sekali. Tidak pernah melempar error.
 *
 * @param aktif false bila admin mematikan bunyi di pengaturan → `dimatikan`.
 */
export async function putarBell(aktif = true): Promise<StatusBell> {
  if (!aktif || !preferensiSuara) {
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
  sudahDibuka = Platform.OS !== "web";
}
