import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, View, type ViewStyle } from "react-native";
import { paddingBawahStickyBar } from "../../lib/inset";
import { shadowStyle } from "../../theme/tokens";

export type StickyBarProps = {
  /** Isi kiri (mis. total) dan kanan (CTA) — dirender dalam satu baris. */
  children: React.ReactNode;
  /** Tambah inset bawah perangkat ke padding. Default true. */
  denganInset?: boolean;
  className?: string;
  style?: ViewStyle;
  /** Slot pengumuman (mis. teks error) di atas baris utama. */
  atas?: React.ReactNode;
};

/**
 * Sticky bar Zovora — guideline §3.12.
 * Bg putih, `shadow-bar`, padding 16 + inset bawah, konten satu baris:
 * kiri total (Heading), kanan tombol primary selebar ±140.
 */
export function StickyBar({
  children,
  denganInset = true,
  className = "",
  style,
  atas,
}: StickyBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`w-full border-t border-neutral-100 bg-white ${className}`}
      style={[shadowStyle("bar"), { paddingBottom: paddingBawahStickyBar(insets, denganInset) }, style]}
    >
      {atas}
      <View className="flex-row items-center justify-between gap-3 px-4 pt-3">{children}</View>
    </View>
  );
}

/** Blok kiri sticky bar: total Heading bold + label/catatan Caption. */
export function StickyTotal({
  nilai,
  label,
  catatan,
}: {
  nilai: string;
  label?: string;
  catatan?: string;
}) {
  return (
    <View className="flex-1">
      {catatan ? (
        <Text
          className="font-inter-medium text-caption text-neutral-400"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {catatan}
        </Text>
      ) : null}
      {label ? (
        <Text
          className="font-inter text-caption text-neutral-500"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      ) : null}
      <Text
        className="font-inter-bold text-xl text-neutral-900 tabular-nums"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {nilai}
      </Text>
    </View>
  );
}

export default StickyBar;
