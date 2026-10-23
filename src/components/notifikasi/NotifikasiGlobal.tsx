import { useRouter } from "expo-router";
import { BellOff } from "lucide-react-native";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, shadowStyle } from "../../theme/tokens";
import { teks } from "../../lib/i18n";
import { audioSiap, diagnosaBell } from "../../../services/realtime/bell";
import { useNotifikasiMasuk, useRealtime } from "../../lib/realtime/RealtimeProvider";
import {
  jumlahMenunggu,
  keadaanAwalToast,
  reducerToast,
  toastAktif,
  tujuanToast,
} from "../../lib/realtime/toastAntrean";
import { TINGGI_APPBAR, ToastNotifikasi } from "./ToastNotifikasi";

/** Lama toast tampil sebelum hilang sendiri (permintaan pemilik: ~5 dtk). */
export const DURASI_TOAST_MS = 5000;

/**
 * Notifikasi realtime GLOBAL.
 *
 * Kenapa dipasang di root (`app/_layout.tsx`, di dalam `RealtimeProvider`)
 * dan bukan di layar?
 *
 * Sebelumnya notifikasi order baru hanya tampil di `/kasir/orders` karena
 * listener-nya hidup di layar itu. Kasir yang sedang membuka keranjang,
 * produk, atau detail pesanan tidak melihat apa pun. Komponen ini berlangganan
 * ke provider (satu koneksi Pusher di root) sehingga toast muncul di RUTE APA
 * PUN, dan klik toast langsung membawa kasir ke layar terkait.
 *
 * Yang tetap dipertahankan: layar terkait masih menerima event yang sama lewat
 * `useNotifikasiMasuk` dan menyegarkan daftarnya — toast ini tambahan, bukan
 * pengganti.
 */
export function NotifikasiGlobal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { suara, ubahSuara, siapBunyi } = useRealtime();
  const [keadaan, kirim] = useReducer(reducerToast, keadaanAwalToast);
  const aktif = toastAktif(keadaan);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Umumkan ke pembaca layar (web sudah punya aria-live via role=alert). */
  const umumkan = useCallback((pesan: string) => {
    try {
      AccessibilityInfo.announceForAccessibility(pesan);
    } catch {
      /* tidak didukung di semua platform */
    }
  }, []);

  useNotifikasiMasuk(
    useCallback(
      (pesan) => {
        kirim({ jenis: "tampilkan", notifikasi: pesan.notifikasi });
        umumkan(pesan.notifikasi.judul);
      },
      [umumkan]
    )
  );

  // Log sekali saat bell belum siap: membantu diagnosis di perangkat pemilik
  // tanpa harus menebak ("kenapa tidak ada suara?").
  useEffect(() => {
    if (siapBunyi) {
      return;
    }

    console.info("[notifikasi-global] audio belum siap", {
      ...diagnosaBell(),
      audioSiap: audioSiap(),
    });
  }, [siapBunyi]);

  /** Tutup toast yang sedang tampil (tombol X, atau setelah durasi habis). */
  const tutupAktif = useCallback(() => {
    if (!aktif) {
      return;
    }

    kirim({ jenis: "tutup", id: aktif.id });
  }, [aktif]);

  // Timer otomatis per toast: id berubah → timer direset, jadi toast
  // berikutnya mendapat 5 detik penuh.
  useEffect(() => {
    if (!aktif) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      kirim({ jenis: "tutup", id: aktif.id });
    }, DURASI_TOAST_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [aktif]);

  /** Tap toast → navigasi ke layar terkait lalu tutup. */
  const bukaTujuan = useCallback(
    (toast: typeof aktif) => {
      if (!toast) {
        return;
      }

      const tujuan = tujuanToast(toast);
      kirim({ jenis: "tutup", id: toast.id });

      if (!tujuan) {
        return;
      }

      try {
        router.push(tujuan.rute as never);
      } catch {
        /* rute tidak dikenal di build ini — jangan jatuhkan UI */
      }
    },
    [router]
  );

  return (
    <View
      // Area pembungkus tembus sentuhan: hanya toast/chip yang menangkap.
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <ToastNotifikasi
        toast={aktif}
        menunggu={jumlahMenunggu(keadaan)}
        onPress={bukaTujuan}
        onTutup={tutupAktif}
      />

      {/*
       * Indikator kecil bila bell dimatikan (preferensi tersimpan). Ditaruh di
       * kanan bawah AppBar — tidak menutupi konten utama, dan bisa diketuk
       * untuk menyalakan lagi. Disembunyikan saat ada toast agar tidak
       * bertumpuk (toast sudah memberi sinyal visual di area yang sama).
       */}
      {!suara && !aktif ? (
        <Pressable
          onPress={() => ubahSuara(true)}
          accessibilityRole="button"
          accessibilityLabel={teks.notifikasi.aktifkanSuara}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="flex-row items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1"
          style={{
            position: "absolute",
            top: insets.top + TINGGI_APPBAR + 8,
            right: 16,
            ...shadowStyle("float"),
          }}
        >
          <BellOff size={12} color={colors.neutral700} strokeWidth={2} />
          <Text className="font-inter-medium text-caption text-neutral-700">
            {teks.notifikasi.suaraMati}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default NotifikasiGlobal;
