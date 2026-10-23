import { Bell, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { teks } from "../../lib/i18n";
import { colors, radius, shadowStyle } from "../../theme/tokens";
import type { ToastNotifikasi as ItemToast } from "../../lib/realtime/toastAntrean";

export type ToastNotifikasiProps = {
  toast: ItemToast | null;
  /** Jumlah notifikasi lain yang menunggu (badge kecil di kanan judul). */
  menunggu?: number;
  onPress: (toast: ItemToast) => void;
  onTutup: () => void;
  /** Nonaktifkan animasi untuk Reduce Motion. */
  reduceMotion?: boolean;
  testID?: string;
};

/**
 * Toast notifikasi global — guideline §5 ("feedback ringan: bg neutral-900,
 * teks putih, rounded-md").
 *
 * Kenapa mengambang di atas kanan-kiri layar (bukan banner yang mendorong
 * konten)? Ia harus bisa muncul di SEMUA rute tanpa mengubah layout layar
 * mana pun — termasuk layar yang sedang scroll — dan tidak boleh menghalangi
 * tombol. `pointerEvents="box-none"` pada pembungkus membuat area di luar
 * kartu tetap tembus sentuhan; hanya kartu toast yang menangkap tap
 * (untuk navigasi) dan tombol X (untuk menutup).
 *
 * Posisi: tepat DI BAWAH AppBar (`inset.top + 56 + 8`). Menumpang di tengah
 * layar akan menutupi tombol kembali/menu AppBar dan judul layar; di bawah
 * AppBar ia hanya menutupi beberapa piksel pertama konten dan hilang setelah
 * ~5 detik atau saat ditutup.
 */

/** Tinggi AppBar (guideline §2.3) — toast mulai di bawahnya. */
export const TINGGI_APPBAR = 56;
const JARAK_BAWAH_APPBAR = 8;
export function ToastNotifikasi({
  toast,
  menunggu = 0,
  onPress,
  onTutup,
  reduceMotion = false,
  testID = "toast-notifikasi",
}: ToastNotifikasiProps) {
  const insets = useSafeAreaInsets();
  // Animated.Value di state (bukan ref) agar aman dibaca saat render —
  // pola yang sama dipakai Dialog.tsx.
  const [animasi] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      animasi.setValue(toast ? 1 : 0);
      return;
    }

    Animated.timing(animasi, {
      toValue: toast ? 1 : 0,
      duration: toast ? 180 : 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [toast, animasi, reduceMotion]);

  if (!toast) {
    return null;
  }

  const terjemahan = animasi.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });

  return (
    <View
      // Seluruh area layar tembus sentuhan; hanya kartu yang menangkap.
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + TINGGI_APPBAR + JARAK_BAWAH_APPBAR,
        left: 0,
        right: 0,
      }}
    >
      <Animated.View
        style={{
          marginHorizontal: 16,
          opacity: animasi,
          transform: [{ translateY: terjemahan }],
          borderRadius: radius.md,
          ...shadowStyle("float"),
        }}
      >
        <View
          testID={testID}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          className="flex-row items-center gap-2 rounded-md bg-neutral-900 px-3 py-2.5"
        >
          <Pressable
            onPress={() => onPress(toast)}
            accessibilityRole="button"
            accessibilityLabel={`${teks.notifikasi.bukaToast}: ${toast.judul}`}
            accessibilityHint={toast.pesan ?? undefined}
            className="min-h-[44px] flex-1 flex-row items-center gap-2 active:opacity-80"
          >
            <Bell size={16} color={colors.white} strokeWidth={2} />
            <View className="flex-1">
              <Text
                className="font-inter-semibold text-xs text-white"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {toast.judul}
              </Text>
              {toast.pesan ? (
                <Text
                  className="font-inter text-caption text-neutral-300"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {toast.pesan}
                </Text>
              ) : null}
            </View>
            {menunggu > 0 ? (
              <View className="rounded-full bg-neutral-700 px-2 py-0.5">
                <Text className="font-inter-medium text-caption text-white tabular-nums">
                  +{menunggu}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={onTutup}
            accessibilityRole="button"
            accessibilityLabel={teks.umum.tutup}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="h-11 w-11 items-center justify-center rounded-md active:bg-neutral-800"
          >
            <X size={16} color={colors.white} strokeWidth={2} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

export default ToastNotifikasi;
