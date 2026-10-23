import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { KlienRealtime, type StatusKoneksi } from "../../../services/realtime/klien";
import type { NotifikasiRealtime } from "../../../services/realtime/eventMapping";
import {
  audioSiap,
  bukaKunciAudio,
  muatPreferensiSuara,
  pasangPembukaAudio,
  putarBell,
  setSuaraAktif,
} from "../../../services/realtime/bell";
import { getStaffToken, getStaffUser } from "../../../services/staffSession";

/**
 * Satu koneksi realtime untuk seluruh aplikasi.
 *
 * Kenapa provider, bukan hook per layar?
 *
 * Versi sebelumnya memasang `useNotifikasiRealtime` di tiga layar (kasir,
 * riwayat pesanan, notifikasi). Setiap layar membuka koneksi Pusher sendiri:
 * tiga WebSocket, tiga kali langganan channel, dan badge hanya hidup selama
 * layarnya terbuka — akibatnya notifikasi order baru TIDAK sampai saat kasir
 * sedang berada di layar lain. Satu koneksi di root memperbaiki itu sekaligus
 * menghemat baterai.
 *
 * Bell diputar di sini (bukan di layar) supaya berbunyi untuk SETIAP
 * notifikasi baru, apa pun layar yang sedang dibuka.
 */

export interface PesanRealtime {
  notifikasi: NotifikasiRealtime;
  /** Nomor urut naik; dipakai layar sebagai kunci effect. */
  urut: number;
}

interface NilaiKonteks {
  status: StatusKoneksi;
  jumlahBelumDibaca: number;
  resetBelumDibaca: () => void;
  /** Notifikasi terakhir yang diterima (null bila belum ada). */
  terakhir: PesanRealtime | null;
  /** Pesan galat langganan (auth ditolak / realtime mati). */
  galat: string | null;
  /** Preferensi bunyi bell pengguna. */
  suara: boolean;
  ubahSuara: (aktif: boolean) => void;
  /** True bila audio siap berbunyi (web: sudah ada interaksi). */
  siapBunyi: boolean;
  /**
   * Sambungkan ulang dengan token terbaru.
   *
   * Wajib dipanggil setelah login/logout: provider dipasang di root sejak
   * aplikasi dibuka (belum ada token), sehingga tanpa ini koneksi tetap
   * "tidak-aktif" sampai aplikasi dijalankan ulang.
   */
  sambungUlang: () => void;
  /** Daftarkan listener event baru; mengembalikan fungsi pelepas. */
  berlangganan: (listener: (pesan: PesanRealtime) => void) => () => void;
}

const KonteksRealtime = createContext<NilaiKonteks | null>(null);

/**
 * Token akun aktif.
 *
 * Perangkat kasir menyimpan `@staff_token`; perangkat pelanggan menyimpan
 * `auth_token`. Sesi staf diprioritaskan karena aplikasi kasir dipakai di
 * perangkat toko (bila keduanya ada, channel tim yang relevan).
 */
async function ambilTokenAktif(): Promise<string | null> {
  try {
    const staf = await getStaffUser();
    if (staf) {
      const token = await getStaffToken();
      if (token) {
        return token;
      }
    }
  } catch {
    /* lanjut ke token pelanggan */
  }

  try {
    return await AsyncStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<StatusKoneksi>("idle");
  const [jumlahBelumDibaca, setJumlahBelumDibaca] = useState(0);
  const [terakhir, setTerakhir] = useState<PesanRealtime | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [suara, setSuara] = useState(true);
  const [siapBunyi, setSiapBunyi] = useState(false);

  const klienRef = useRef<KlienRealtime | null>(null);
  const listenerRef = useRef(new Set<(pesan: PesanRealtime) => void>());
  const urutRef = useRef(0);

  const berlangganan = useCallback((listener: (pesan: PesanRealtime) => void) => {
    listenerRef.current.add(listener);
    return () => {
      listenerRef.current.delete(listener);
    };
  }, []);

  const resetBelumDibaca = useCallback(() => {
    setJumlahBelumDibaca(0);
    klienRef.current?.resetBelumDibaca();
  }, []);

  /**
   * Putus lalu sambung ulang memakai token yang ada sekarang.
   *
   * Dipanggil setelah login (token baru) dan logout (token dihapus). Tanpa ini
   * koneksi yang dibuat saat aplikasi dibuka — ketika belum ada token — akan
   * tetap "tidak-aktif" dan tidak pernah mencoba lagi.
   */
  const sambungUlang = useCallback(() => {
    const klien = klienRef.current;
    if (!klien) {
      return;
    }

    setGalat(null);
    klien.berhenti();
    void klien.mulai();
    setSiapBunyi(audioSiap());
  }, []);

  const ubahSuara = useCallback((aktif: boolean) => {
    setSuara(aktif);
    void setSuaraAktif(aktif).then(() => setSiapBunyi(audioSiap()));
  }, []);

  // Preferensi suara + kunci audio: sekali saat aplikasi dibuka.
  useEffect(() => {
    let hidup = true;

    void (async () => {
      const tersimpan = await muatPreferensiSuara();
      if (!hidup) return;

      setSuara(tersimpan);
      pasangPembukaAudio();
      setSiapBunyi(audioSiap());
    })();

    return () => {
      hidup = false;
    };
  }, []);

  // Satu koneksi, dipakai bersama semua layar.
  useEffect(() => {
    const klien = new KlienRealtime({
      ambilToken: ambilTokenAktif,
      onStatus: setStatus,
      onGagalLangganan: setGalat,
      onNotifikasi: (notifikasi) => {
        urutRef.current += 1;
        const pesan: PesanRealtime = { notifikasi, urut: urutRef.current };

        setJumlahBelumDibaca((n) => n + 1);
        setTerakhir(pesan);

        // Bell untuk SETIAP notifikasi baru (bukan hanya order).
        void putarBell(notifikasi.bunyikanSuara).then((hasil) => {
          if (hasil === "diputar" || hasil === "tertunda") {
            setSiapBunyi(true);
          }
        });

        listenerRef.current.forEach((listener) => {
          try {
            listener(pesan);
          } catch {
            /* satu listener rusak tidak boleh memutus koneksi */
          }
        });
      },
    });

    klienRef.current = klien;
    void klien.mulai();

    // WebSocket sering mati saat aplikasi/tab disembunyikan.
    const langganan = AppState.addEventListener("change", (keadaan) => {
      if (keadaan === "active" && klien.statusSaatIni !== "terhubung") {
        klien.berhenti();
        void klien.mulai();
      }
    });

    return () => {
      langganan.remove();
      klien.berhenti();
      klienRef.current = null;
    };
  }, []);

  /**
   * Pengawas token: login & logout terjadi di layar lain (layar auth pelanggan,
   * layar kasir) yang tidak memegang provider ini. Alih-alih menyuruh setiap
   * layar memanggil `sambungUlang()`, koneksi mengawasi sendiri keadaan token:
   *
   * - token muncul (baru login) & belum terhubung → sambungkan;
   * - token hilang (logout) & masih terhubung → putuskan.
   *
   * Interval 10 detik hanya membaca AsyncStorage (murah) dan tidak memanggil
   * jaringan kecuali memang perlu menyambung.
   */
  useEffect(() => {
    let berjalan = false;

    const periksa = async () => {
      if (berjalan) {
        return;
      }

      const klien = klienRef.current;
      if (!klien) {
        return;
      }

      berjalan = true;

      try {
        const token = await ambilTokenAktif();

        if (!token && klien.statusSaatIni === "terhubung") {
          klien.berhenti();
        } else if (token && (klien.statusSaatIni === "tidak-aktif" || klien.statusSaatIni === "gagal")) {
          klien.berhenti();
          await klien.mulai();
        }
      } catch {
        /* abaikan */
      } finally {
        berjalan = false;
      }
    };

    const pengawas = setInterval(() => void periksa(), 10_000);

    return () => clearInterval(pengawas);
  }, []);

  const nilai = useMemo<NilaiKonteks>(
    () => ({
      status,
      jumlahBelumDibaca,
      resetBelumDibaca,
      terakhir,
      galat,
      suara,
      ubahSuara,
      siapBunyi,
      sambungUlang,
      berlangganan,
    }),
    [
      status,
      jumlahBelumDibaca,
      resetBelumDibaca,
      terakhir,
      galat,
      suara,
      ubahSuara,
      siapBunyi,
      sambungUlang,
      berlangganan,
    ]
  );

  return <KonteksRealtime.Provider value={nilai}>{children}</KonteksRealtime.Provider>;
}

/** Akses status & kontrol realtime di layar mana pun. */
export function useRealtime(): NilaiKonteks {
  const nilai = useContext(KonteksRealtime);

  if (!nilai) {
    throw new Error("useRealtime harus dipakai di dalam <RealtimeProvider>");
  }

  return nilai;
}

/**
 * Jalankan `callback` setiap ada notifikasi realtime baru.
 *
 * Callback disimpan di ref sehingga layar tidak perlu `useCallback` dan
 * tidak berlangganan ulang setiap render.
 */
export function useNotifikasiMasuk(callback: (pesan: PesanRealtime) => void): void {
  const { berlangganan } = useRealtime();
  const ref = useRef(callback);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  useEffect(() => berlangganan((pesan) => ref.current(pesan)), [berlangganan]);
}

export { bukaKunciAudio };
export { ambilTokenPelanggan, ambilTokenStaf } from "./useNotifikasiRealtime";
