/**
 * Skeleton shimmer Zovora — guideline §2.6 + §5.
 *
 * Loading memakai skeleton yang meniru layout asli (bukan spinner layar penuh).
 * Shimmer 1,2 dtk dengan transisi warna neutral-100 → neutral-200. Bila
 * Reduce Motion aktif, blok dirender statis (tanpa animasi) agar tetap tenang.
 */
import { useEffect, useState } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import { useReduceMotion } from "../../lib/motion";
import { colors } from "../../theme/tokens";

export type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  /** Radius kelas Tailwind, mis. "rounded-lg". */
  radiusClassName?: string;
  style?: ViewStyle;
  className?: string;
};

const DURASI = 1200;

/**
 * Blok skeleton dengan shimmer.
 *
 * Catatan implementasi: interpolasi **warna** pada react-native-web tidak
 * dianimasikan oleh `Animated` (nilainya hanya diterapkan sekali), sehingga
 * shimmer tidak terlihat. Karena itu denyut dilakukan lewat `opacity` blok
 * neutral-200 — ini berjalan di web dan native, dan tetap memenuhi spesifikasi
 * "neutral-100 → neutral-200" secara visual (bg neutral-200 yang berdenyut di
 * atas latar kartu putih/neutral-50).
 */
export function Skeleton({
  width,
  height,
  radiusClassName = "rounded-md",
  style,
  className = "",
}: SkeletonProps) {
  const reduce = useReduceMotion();
  // Animated.Value disimpan di state (bukan ref) agar aman dibaca saat render,
  // sama seperti pola Dialog di src/components/ui/Dialog.tsx.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduce) {
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: DURASI / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: DURASI / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduce]);

  const opacity = reduce
    ? 1
    : progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`${radiusClassName} ${className}`}
      style={[
        {
          width,
          height,
          backgroundColor: reduce ? colors.neutral100 : colors.neutral200,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Kartu skeleton grid produk 2 kolom (gambar 3:4, nama 2 baris, harga). */
export function SkeletonGridProduk({ jumlah = 4 }: { jumlah?: number }) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 12 }}>
      {Array.from({ length: jumlah }).map((_, i) => (
        <View
          key={i}
          className="rounded-lg border border-neutral-100 bg-white p-2"
          style={{ width: "47.5%", flexGrow: 1 }}
        >
          <Skeleton height={150} radiusClassName="rounded-lg" />
          <Skeleton height={12} className="mt-2" width="90%" />
          <Skeleton height={12} className="mt-1.5" width="60%" />
          <Skeleton height={14} className="mt-2" width="45%" />
        </View>
      ))}
    </View>
  );
}

/** Skeleton banner: kartu ~140 + dots. */
export function SkeletonBanner() {
  return (
    <View>
      <Skeleton height={148} radiusClassName="rounded-lg" width="100%" />
      <View className="mt-2 flex-row justify-center gap-2">
        <Skeleton width={16} height={6} radiusClassName="rounded-full" />
        <Skeleton width={6} height={6} radiusClassName="rounded-full" />
        <Skeleton width={6} height={6} radiusClassName="rounded-full" />
      </View>
    </View>
  );
}

/** Skeleton daftar baris 52 (suggestion / review). */
export function SkeletonBaris({ jumlah = 5 }: { jumlah?: number }) {
  return (
    <View>
      {Array.from({ length: jumlah }).map((_, i) => (
        <View key={i} className="flex-row items-center gap-3 px-4" style={{ height: 52 }}>
          <Skeleton width={28} height={28} radiusClassName="rounded-sm" />
          <Skeleton height={12} width="65%" />
        </View>
      ))}
    </View>
  );
}

export default Skeleton;
