import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { bukaKunciAudio, pasangPembukaAudio, putarBell } from "../../../services/realtime/bell";
import type { StatusKoneksi } from "../../../services/realtime/klien";
import { KlienRealtime } from "../../../services/realtime/klien";
import type { NotifikasiRealtime } from "../../../services/realtime/eventMapping";

/**
 * Hook notifikasi realtime (Pusher) untuk layar aplikasi.
 *
 * Perilaku:
 * - Menyambung saat layar fokus/mount dan memutus saat dilepas.
 * - Menyambung ulang saat aplikasi kembali aktif (AppState) — koneksi web
 *   socket sering mati saat tab disembunyikan di web.
 * - Memutar bunyi bell untuk SETIAP notifikasi baru. Bila browser memblokir
 *   autoplay, pemutaran ditunda sampai interaksi pertama; pemanggil bisa
 *   memanggil `bukaKunciAudio` dari handler sentuhan.
 *
 * @param ambilToken sumber token akun (pelanggan atau staf)
 * @param opsi.onNotifikasi dipanggil untuk setiap notifikasi valid
 * @param opsi.aktif false → tidak menyambung (mis. belum login)
 */
export function useNotifikasiRealtime(opsi: {
  ambilToken: () => Promise<string | null>;
  onNotifikasi: (notifikasi: NotifikasiRealtime) => void;
  aktif?: boolean;
  /** Matikan bunyi (mis. layar yang hanya butuh refresh data). */
  bunyi?: boolean;
}): {
  status: StatusKoneksi;
  jumlahBelumDibaca: number;
  resetBelumDibaca: () => void;
  /** Buka kunci audio dari handler sentuhan pertama (khusus web). */
  bukaKunciAudio: () => void;
} {
  const { ambilToken, onNotifikasi, aktif = true, bunyi = true } = opsi;

  const [status, setStatus] = useState<StatusKoneksi>("idle");
  const [jumlahBelumDibaca, setJumlahBelumDibaca] = useState(0);

  // Callback disimpan di ref supaya effect tidak berulang saat parent re-render
  // (setiap reconnect akan memutus channel dan menghilangkan event).
  const notifikasiRef = useRef(onNotifikasi);
  const bunyiRef = useRef(bunyi);
  const klienRef = useRef<KlienRealtime | null>(null);

  useEffect(() => {
    notifikasiRef.current = onNotifikasi;
  }, [onNotifikasi]);

  useEffect(() => {
    bunyiRef.current = bunyi;
  }, [bunyi]);

  const buatKlien = useCallback(
    () =>
      new KlienRealtime({
        ambilToken,
        onStatus: setStatus,
        onNotifikasi: (notifikasi: NotifikasiRealtime) => {
          setJumlahBelumDibaca((n) => n + 1);
          notifikasiRef.current(notifikasi);

          if (bunyiRef.current) {
            // Tidak di-await: bunyi tidak boleh menunda pembaruan UI.
            void putarBell(notifikasi.bunyikanSuara);
          }
        },
      }),
    [ambilToken]
  );

  useEffect(() => {
    if (!aktif) {
      return;
    }

    // Web: bell pada notifikasi berikutnya boleh berbunyi setelah sentuhan
    // pertama pengguna. Native tidak butuh ini.
    pasangPembukaAudio();

    const klien = buatKlien();
    klienRef.current = klien;

    let dibatalkan = false;
    void klien.mulai();

    const langganan = AppState.addEventListener("change", (status) => {
      if (dibatalkan) return;

      if (status === "active" && klien.statusSaatIni !== "terhubung") {
        klien.berhenti();
        void klien.mulai();
      }
    });

    return () => {
      dibatalkan = true;
      langganan.remove();
      klien.berhenti();
      klienRef.current = null;
    };
  }, [aktif, buatKlien]);

  const resetBelumDibaca = useCallback(() => {
    setJumlahBelumDibaca(0);
    klienRef.current?.resetBelumDibaca();
  }, []);

  return { status, jumlahBelumDibaca, resetBelumDibaca, bukaKunciAudio };
}

/** Token pelanggan (disimpan `httpClient` setelah login). */
export const ambilTokenPelanggan = () => AsyncStorage.getItem("auth_token");

/** Token staf — key terpisah supaya login pelanggan tidak menimpanya. */
export const ambilTokenStaf = () => AsyncStorage.getItem("@staff_token");
