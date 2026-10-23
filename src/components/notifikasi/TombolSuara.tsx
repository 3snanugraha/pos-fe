import { Bell, BellOff } from "lucide-react-native";
import { Pressable } from "react-native";
import { useRealtime } from "../../../src/lib/realtime/RealtimeProvider";
import { colors, sizes } from "../../../src/theme/tokens";

/**
 * Tombol nyala/mati bell notifikasi.
 *
 * Kenapa perlu tombol eksplisit? Browser menolak audio sampai ada interaksi
 * pengguna. Menekan tombol ini (a) menyalakan/mematikan bell sesuai keinginan
 * kasir, dan (b) sekaligus membuka kunci audio — jadi ini jalan keluar yang
 * jelas bila bell belum pernah berbunyi di perangkat itu.
 *
 * Pilihan disimpan (`services/realtime/bell.ts` → AsyncStorage), jadi bertahan
 * setelah aplikasi ditutup.
 */
export function TombolSuara({ className = "" }: { className?: string }) {
  const { suara, ubahSuara } = useRealtime();

  return (
    <Pressable
      onPress={() => ubahSuara(!suara)}
      accessibilityRole="switch"
      accessibilityState={{ checked: suara }}
      accessibilityLabel={suara ? "Matikan bunyi notifikasi" : "Nyalakan bunyi notifikasi"}
      hitSlop={sizes.hitSlop}
      className={`h-10 w-10 items-center justify-center rounded-md active:bg-neutral-100 ${className}`}
    >
      {suara ? (
        <Bell size={20} color={colors.neutral900} strokeWidth={1.75} />
      ) : (
        <BellOff size={20} color={colors.neutral400} strokeWidth={1.75} />
      )}
    </Pressable>
  );
}
