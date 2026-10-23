import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { Platform } from "react-native";

/**
 * Bunyi bell untuk notifikasi realtime.
 *
 * Satu pemutar dipakai bersama seluruh aplikasi (bukan hook) karena bunyi
 * harus bisa diputar dari callback jaringan, bukan dari render komponen.
 *
 * ## Kenapa bell tidak berbunyi sama sekali sebelumnya
 *
 * 1. **`play()` dipanggil sebelum media siap.** `createAudioPlayer(require(...))`
 *    memuat aset secara asinkron; `play()` pada pemutar yang belum
 *    `isLoaded` tidak menghasilkan suara dan TIDAK melempar error. Dengan
 *    `downloadFirst` (native) pemuatan bahkan lebih lambat lagi. Sekarang
 *    pemutaran menunggu `isLoaded` dan mengulang sampai 3 kali.
 * 2. **Aset Android berupa embedded resource (`res/<hash>.wav`).** ExoPlayer
 *    tidak selalu bisa membuka URI itu, sementara `Image` bisa. `downloadFirst`
 *    membuat expo-audio menyalin aset ke cache lalu memutar `file:///…` yang
 *    pasti terbaca.
 * 3. **Web: kunci autoplay + permintaan yang dibuang.** Browser menolak audio
 *    sebelum interaksi pertama. Versi lama mengembalikan "tertunda" dan
 *    permintaan itu hilang; sekarang diingat dan diputar tepat saat kunci
 *    terbuka. Pembuka dipasang di level `document` (tap di layar mana pun),
 *    jadi TombolSuara TIDAK wajib ditekan.
 * 4. **Elemen `<audio>` adalah jalur rapuh di web.** Validasi browser
 *    (`readyState`) bergantung pada perangkat output. Karena itu web memakai
 *    **WebAudio** (`decodeAudioData` + `AudioBufferSourceNode`): state
 *    `AudioContext.state` (`suspended`/`running`) adalah sumber kebenaran
 *    autoplay yang sebenarnya, dan buffer bisa di-decode sekali walau elemen
 *    media tidak tersedia. Native tetap memakai `expo-audio` (ExoPlayer/AVPlayer).
 *
 * Semua kegagalan ditelan (tidak pernah melempar) karena bell tidak boleh
 * menjatuhkan alur kasir.
 */

const KUNCI_PREFERENSI_SUARA = "@notifikasi_suara_aktif";

/** Status hasil percobaan memutar bunyi. */
export type StatusBell = "diputar" | "tertunda" | "gagal" | "dimatikan";

/** Preferensi pengguna; `true` = bell boleh berbunyi. */
let preferensiSuara = true;
let preferensiDimuat = false;

/** Permintaan bunyi yang datang saat kunci/aset belum siap — diputar nanti. */
let permintaanTertunda = false;

/** Catatan diagnostik terakhir (dipakai log & UI saat bell tidak berbunyi). */
let galatTerakhir: string | null = null;
let statusTerakhir: StatusBell | null = null;

/** Berapa kali bell benar-benar mulai berbunyi (bukti untuk uji/log). */
let jumlahDiputar = 0;

/**
 * Jalankan `janji` dengan batas waktu.
 *
 * Kenapa perlu? `AudioContext.resume()` pada browser tanpa perangkat output
 * bisa menggantung selamanya (promise tidak pernah settle). Tanpa batas,
 * `putarBell()` tidak pernah selesai dan status bell tidak pernah tercatat.
 */
function denganBatas<T>(janji: Promise<T>, batasMs: number, cadangan: T): Promise<T> {
  return Promise.race([
    janji.catch(() => cadangan),
    new Promise<T>((resolve) => setTimeout(() => resolve(cadangan), batasMs)),
  ]);
}

function catat(pesan: string, tambahan?: Record<string, unknown>): void {
  // `info`, bukan `debug`: harus terlihat di log Metro / console web saat
  // pemilik melaporkan "bell tidak berbunyi".
  try {
    console.info("[bell]", pesan, tambahan ?? "");
  } catch {
    /* console bisa saja dibungkus platform */
  }
}

// ---------------------------------------------------------------------------
// Bagian web: WebAudio
// ---------------------------------------------------------------------------

type KonteksAudioWeb = {
  ctx: AudioContext;
  buffer: AudioBuffer | null;
  siap: boolean;
};

let web: KonteksAudioWeb | null = null;
let janjiMuatWeb: Promise<boolean> | null = null;

function ambilKelasAudioContext(): (new () => AudioContext) | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  const g = globalThis as unknown as {
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };

  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

/**
 * Siapkan AudioContext + decode `bell.wav` sekali.
 *
 * Aset diambil lewat `fetch` dari URI bundel (`require` → `expo-asset`
 * menyelesaikannya menjadi URL `/assets/...`), lalu di-decode ke `AudioBuffer`.
 * Pendekatan ini tidak bergantung pada elemen `<audio>`/perangkat output,
 * sehingga decode tetap berhasil walau perangkat sedang tanpa speaker.
 */
function pastikanWeb(): Promise<boolean> {
  if (web?.siap) {
    return Promise.resolve(true);
  }

  if (janjiMuatWeb) {
    return janjiMuatWeb;
  }

  janjiMuatWeb = (async () => {
    try {
      const Kelas = ambilKelasAudioContext();

      if (!Kelas) {
        galatTerakhir = "AudioContext tidak tersedia";
        return false;
      }

      const ctx = web?.ctx ?? new Kelas();

      // Sumber kebenaran autoplay adalah `state` konteks, bukan tebakan.
      // Begitu browser mengizinkan (running), permintaan yang tertunda
      // langsung diputar — tanpa menunggu notifikasi berikutnya.
      ctx.onstatechange = () => {
        catat("state AudioContext", { state: keadaanKonteks(ctx) });
        umumkanSiap();

        if (keadaanKonteks(ctx) === "running" && permintaanTertunda) {
          permintaanTertunda = false;
          void putarBell();
        }
      };

      const sumber = require("../../assets/sounds/bell.wav");
      const uri = typeof sumber === "string" ? sumber : (sumber as { uri?: string })?.uri;

      if (!uri) {
        galatTerakhir = "URI aset bell.wav tidak tersedia";
        return false;
      }

      const respons = await fetch(uri);
      const data = await respons.arrayBuffer();
      const buffer = await ctx.decodeAudioData(data);

      web = { ctx, buffer, siap: true };
      galatTerakhir = null;
      catat("buffer web siap", { durasi: buffer.duration, laju: ctx.sampleRate });
      umumkanSiap();
      return true;
    } catch (err) {
      galatTerakhir = String(err);
      web = web ? { ...web, siap: false } : null;
      catat("gagal menyiapkan audio web", { galat: galatTerakhir });
      return false;
    } finally {
      janjiMuatWeb = null;
    }
  })();

  return janjiMuatWeb;
}

/**
 * Baca state AudioContext sebagai `string`.
 *
 * Dibungkus fungsi supaya TypeScript tidak mempersempit tipe setelah `await`
 * (state bisa berubah antara dua pembacaan).
 */
function keadaanKonteks(ctx: AudioContext): string {
  try {
    return ctx.state as string;
  } catch {
    return "closed";
  }
}

/** Status AudioContext web: `running` berarti autoplay sudah diizinkan. */
function kunciWebTerbuka(): boolean {
  return !!web && keadaanKonteks(web.ctx) === "running";
}

// ---------------------------------------------------------------------------
// Bagian native: expo-audio
// ---------------------------------------------------------------------------

let pemutarNative: AudioPlayer | null = null;
let janjiMuatNative: Promise<AudioPlayer | null> | null = null;

/**
 * Buat pemutar native sekali.
 *
 * `require` harus statis agar Metro membundel asetnya. `downloadFirst`
 * menyalin aset bundel (`res/<hash>.wav` di Android) ke cache lalu memutar
 * file lokal — inilah yang membuat ExoPlayer/AVPlayer bisa membukanya.
 */
function pastikanNative(): Promise<AudioPlayer | null> {
  if (pemutarNative) {
    return Promise.resolve(pemutarNative);
  }

  if (janjiMuatNative) {
    return janjiMuatNative;
  }

  janjiMuatNative = (async () => {
    try {
      const sumber = require("../../assets/sounds/bell.wav");
      const dibuat = createAudioPlayer(sumber, { downloadFirst: true });

      pemutarNative = dibuat;

      // "mixWithOthers": SFX pendek tidak merebut fokus audio aplikasi lain
      // dan tidak memblokir play() di Android.
      void setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
      }).catch((err) => catat("setAudioModeAsync gagal", { pesan: String(err) }));

      catat("pemutar native dibuat", { platform: Platform.OS });
      return dibuat;
    } catch (err) {
      galatTerakhir = String(err);
      pemutarNative = null;
      catat("gagal membuat pemutar native", { galat: galatTerakhir });
      return null;
    } finally {
      janjiMuatNative = null;
    }
  })();

  return janjiMuatNative;
}

/** Tunggu media native siap (maks `batasMs`). */
async function tungguNativeSiap(player: AudioPlayer, batasMs = 1500): Promise<boolean> {
  const mulai = Date.now();

  while (Date.now() - mulai < batasMs) {
    try {
      if (player.isLoaded) {
        return true;
      }
    } catch {
      /* properti tidak tersedia */
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  try {
    return player.isLoaded;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Status kesiapan (dipakai UI)
// ---------------------------------------------------------------------------

/** True bila bunyi benar-benar bisa diputar sekarang. */
export function audioSiap(): boolean {
  if (Platform.OS === "web") {
    return kunciWebTerbuka() && web?.siap === true;
  }

  return pemutarNative !== null;
}

type PendengarSiap = (siap: boolean) => void;

const pendengarSiap = new Set<PendengarSiap>();

function umumkanSiap(): void {
  const siap = audioSiap();

  pendengarSiap.forEach((cb) => {
    try {
      cb(siap);
    } catch {
      /* satu pendengar rusak tidak boleh menghentikan sisanya */
    }
  });
}

/**
 * Berlangganan perubahan kesiapan audio — UI memakai ini untuk indikator
 * "bell siap" tanpa polling.
 *
 * @returns fungsi pelepas
 */
export function daftarkanSiapBunyi(cb: PendengarSiap): () => void {
  pendengarSiap.add(cb);
  return () => {
    pendengarSiap.delete(cb);
  };
}

// ---------------------------------------------------------------------------
// Kunci audio
// ---------------------------------------------------------------------------

/**
 * Tandai audio boleh diputar.
 *
 * Di web ini membuka `AudioContext` (harus dipanggil dari gesture pengguna agar
 * `state` menjadi `running`), lalu memutar permintaan yang tertunda. Di native
 * hanya menyiapkan pemutar — tidak ada kebijakan autoplay.
 */
export function bukaKunciAudio(): void {
  if (Platform.OS === "web") {
    void pastikanWeb().then(async (ok) => {
      if (!ok || !web) {
        return;
      }

      try {
        if (keadaanKonteks(web.ctx) !== "running") {
          await denganBatas(web.ctx.resume(), 800, undefined);
        }
      } catch (err) {
        galatTerakhir = String(err);
      }

      catat("kunci audio web", { state: keadaanKonteks(web.ctx) });
      umumkanSiap();

      if (permintaanTertunda) {
        permintaanTertunda = false;
        void putarBell();
      }
    });

    return;
  }

  void pastikanNative().then(() => umumkanSiap());
}

let pembukaTerpasang = false;

/**
 * Pasang pembuka otomatis sekali jalan.
 *
 * - Web: `pointerdown`/`keydown`/`touchstart`/`click` PERTAMA di mana pun
 *   membuka kunci, jadi bell notifikasi berikutnya berbunyi tanpa menekan
 *   TombolSuara lebih dulu.
 * - Native: tidak ada kebijakan autoplay, pemutar langsung disiapkan supaya
 *   notifikasi pertama pun berbunyi.
 *
 * Aman dipanggil berulang.
 */
export function pasangPembukaAudio(): void {
  if (Platform.OS !== "web") {
    void pastikanNative().then(() => umumkanSiap());
    return;
  }

  // Siapkan buffer lebih awal (decode tidak butuh gesture; hanya `resume()`
  // yang butuh). Dengan begitu notifikasi pertama tidak menunggu jaringan.
  void pastikanWeb();

  if (
    pembukaTerpasang ||
    typeof document === "undefined" ||
    typeof document.addEventListener !== "function"
  ) {
    return;
  }

  pembukaTerpasang = true;

  const buka = () => {
    bukaKunciAudio();

    // Kunci hanya perlu dibuka sekali; listener dilepas agar tidak membebani
    // setiap sentuhan berikutnya.
    document.removeEventListener("pointerdown", buka);
    document.removeEventListener("keydown", buka);
    document.removeEventListener("touchstart", buka);
    document.removeEventListener("click", buka);
  };

  document.addEventListener("pointerdown", buka);
  document.addEventListener("keydown", buka);
  document.addEventListener("touchstart", buka);
  document.addEventListener("click", buka);
}

// ---------------------------------------------------------------------------
// Diagnostik
// ---------------------------------------------------------------------------

export interface DiagnosaBell {
  platform: string;
  /** Web: AudioContext `running`. Native: selalu true. */
  dibuka: boolean;
  /** Aset sudah di-decode (web) / pemutar dibuat (native). */
  dimuat: boolean;
  preferensiSuara: boolean;
  permintaanTertunda: boolean;
  statusTerakhir: StatusBell | null;
  galatTerakhir: string | null;
  /** Berapa kali bell benar-benar mulai berbunyi di sesi ini. */
  jumlahDiputar: number;
}

/** Kenapa bell (tidak) berbunyi — tidak mengubah state apa pun. */
export function diagnosaBell(): DiagnosaBell {
  return {
    platform: Platform.OS,
    dibuka: Platform.OS === "web" ? kunciWebTerbuka() : pemutarNative !== null,
    dimuat: Platform.OS === "web" ? web?.siap === true : pemutarNative !== null,
    preferensiSuara,
    permintaanTertunda,
    statusTerakhir,
    galatTerakhir,
    jumlahDiputar,
  };
}

// ---------------------------------------------------------------------------
// Preferensi suara
// ---------------------------------------------------------------------------

/**
 * Baca preferensi suara dari penyimpanan (sekali).
 * Kegagalan storage tidak boleh menjatuhkan aplikasi → default "bunyi".
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

  catat("preferensi suara dimuat", { aktif: preferensiSuara });
  return preferensiSuara;
}

/** True bila bell diizinkan oleh pengguna. */
export function suaraAktif(): boolean {
  return preferensiSuara;
}

/**
 * Ubah preferensi suara (dipakai toggle di UI).
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

  catat("preferensi suara diubah", { aktif });
  umumkanSiap();
  return preferensiSuara;
}

// ---------------------------------------------------------------------------
// Putar
// ---------------------------------------------------------------------------

/**
 * Putar bell sekali. Tidak pernah melempar error.
 *
 * @param aktif false bila admin mematikan bunyi di pengaturan → `dimatikan`.
 */
export async function putarBell(aktif = true): Promise<StatusBell> {
  const hasil = await putarBellInternal(aktif);
  statusTerakhir = hasil;

  catat("putar", { hasil, ...diagnosaBell() });
  return hasil;
}

async function putarBellInternal(aktif: boolean): Promise<StatusBell> {
  if (!aktif || !preferensiSuara) {
    return "dimatikan";
  }

  return Platform.OS === "web" ? putarWeb() : putarNative();
}

/** Web: AudioContext + AudioBufferSourceNode (tanpa elemen `<audio>`). */
async function putarWeb(): Promise<StatusBell> {
  const ok = await pastikanWeb();

  if (!ok || !web || !web.buffer) {
    permintaanTertunda = true;
    return "gagal";
  }

  if (keadaanKonteks(web.ctx) !== "running") {
    // Browser belum mengizinkan. Coba resume; kalau tetap suspended, tunggu
    // interaksi berikutnya (permintaan diingat).
    try {
      await denganBatas(web.ctx.resume(), 800, undefined);
    } catch {
      /* diabaikan; state diperiksa di bawah */
    }

    if (keadaanKonteks(web.ctx) !== "running") {
      permintaanTertunda = true;
      return "tertunda";
    }
  }

  try {
    const sumber = web.ctx.createBufferSource();
    sumber.buffer = web.buffer;
    sumber.connect(web.ctx.destination);
    sumber.start(0);

    jumlahDiputar += 1;
    permintaanTertunda = false;
    umumkanSiap();
    return "diputar";
  } catch (err) {
    galatTerakhir = String(err);
    permintaanTertunda = true;
    return "gagal";
  }
}

/** Native: expo-audio (ExoPlayer/AVPlayer). */
async function putarNative(): Promise<StatusBell> {
  const player = await pastikanNative();

  if (!player) {
    return "gagal";
  }

  // Tunggu sebentar, TAPI jangan menyerah bila belum termuat: ExoPlayer
  // mengantre `play()` dan mulai begitu buffer siap. Menyerah di sini adalah
  // bug lama — bell pertama setelah aplikasi dibuka tidak pernah berbunyi.
  const siap = await tungguNativeSiap(player, 900);

  if (!siap) {
    catat("aset native belum termuat, play() tetap dipanggil", {
      platform: Platform.OS,
    });
  }

  for (let percobaan = 0; percobaan < 3; percobaan += 1) {
    try {
      await player.seekTo(0);
      player.play();

      // ExoPlayer butuh sepersekian detik untuk benar-benar mulai; beri jeda
      // pendek sebelum memutuskan berhasil/gagal.
      await new Promise((resolve) => setTimeout(resolve, 120));

      let berbunyi = true;
      try {
        berbunyi = player.playing;
      } catch {
        berbunyi = true;
      }

      if (berbunyi) {
        jumlahDiputar += 1;
        permintaanTertunda = false;
        umumkanSiap();
        return "diputar";
      }
    } catch (err) {
      galatTerakhir = String(err);
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  permintaanTertunda = true;
  return "gagal";
}

/** Lepas pemutar (logout / unmount level aplikasi). */
export async function lepasBell(): Promise<void> {
  try {
    pemutarNative?.remove();
  } catch {
    /* abaikan */
  }

  pemutarNative = null;
  janjiMuatNative = null;
  permintaanTertunda = false;

  try {
    await web?.ctx.close();
  } catch {
    /* abaikan */
  }

  web = null;
  janjiMuatWeb = null;
  statusTerakhir = null;
  jumlahDiputar = 0;
  umumkanSiap();
}
