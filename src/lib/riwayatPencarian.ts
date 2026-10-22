/**
 * Riwayat pencarian lokal (guideline §3.4 "Recent Searches").
 *
 * Disimpan di AsyncStorage karena riwayat pencarian bukan data transaksi:
 * cukup bertahan di perangkat, maksimal 10 entri, terbaru di depan. Tidak
 * menyentuh services/ maupun contexts/ (batas tugas W3).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const KUNCI = "zovora_riwayat_pencarian";
const MAKS = 10;

export function useRiwayatPencarian() {
  const [riwayat, setRiwayat] = useState<string[]>([]);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const mentah = await AsyncStorage.getItem(KUNCI);
        const daftar: unknown = mentah ? JSON.parse(mentah) : [];
        if (aktif && Array.isArray(daftar)) {
          setRiwayat(daftar.filter((x): x is string => typeof x === "string").slice(0, MAKS));
        }
      } catch {
        /* riwayat rusak → mulai dari kosong */
      } finally {
        if (aktif) setSiap(true);
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  const simpan = useCallback((daftar: string[]) => {
    setRiwayat(daftar);
    AsyncStorage.setItem(KUNCI, JSON.stringify(daftar)).catch(() => {
      /* penyimpanan penuh/ditolak — riwayat tetap hidup di memori sesi ini */
    });
  }, []);

  const tambah = useCallback(
    (kata: string) => {
      const bersih = kata.trim();
      if (!bersih) return;
      setRiwayat((prev) => {
        const tanpaDuplikat = prev.filter((x) => x.toLowerCase() !== bersih.toLowerCase());
        const baru = [bersih, ...tanpaDuplikat].slice(0, MAKS);
        AsyncStorage.setItem(KUNCI, JSON.stringify(baru)).catch(() => {});
        return baru;
      });
    },
    [],
  );

  const hapusSemua = useCallback(() => simpan([]), [simpan]);

  return { riwayat, siap, tambah, hapusSemua };
}

export default useRiwayatPencarian;
