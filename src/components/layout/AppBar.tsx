import { ArrowLeft, Ellipsis } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";

export type AppBarProps = {
  /** Judul section (Section 16/24) atau Title 24/30 pada varian auth. */
  title: string;
  /** Subjudul Small neutral-500 — hanya dirender pada varian auth. */
  subtitle?: string;
  /** Tampilkan tombol kembali. Default: `true` bila `onBack` diberikan. */
  showBack?: boolean;
  onBack?: () => void;
  /** Aksi kanan (ikon 24 atau tombol teks). */
  right?: ReactNode;
  /** Pintasan aksi kanan berupa ellipsis (menu). */
  onPressMenu?: () => void;
  /**
   * `default` = AppBar standar (56, judul tengah, back arrow 24).
   * `auth` = varian auth: back kotak 32 neutral-100, judul Title rata kiri,
   * subjudul Small di bawahnya.
   */
  variant?: "default" | "auth";
  className?: string;
};

/**
 * AppBar Zovora — guideline §3.5.
 * Tinggi 56, bg putih tanpa shadow, back arrow 24, judul Section di tengah,
 * aksi kanan opsional. Varian `auth` memakai back kotak 32 (rounded-md,
 * bg neutral-100) dan judul Title + subjudul Small rata kiri.
 */
export function AppBar({
  title,
  subtitle,
  showBack = true,
  onBack,
  right,
  onPressMenu,
  variant = "default",
  className = "",
}: AppBarProps) {
  const adaBack = showBack && !!onBack;

  const tombolBack =
    variant === "auth" ? (
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={teks.umum.kembali}
        hitSlop={sizes.hitSlop}
        className="items-center justify-center rounded-md bg-neutral-100 active:bg-neutral-200"
        style={{ width: 32, height: 32 }}
      >
        <ArrowLeft size={18} color={colors.neutral900} strokeWidth={1.75} />
      </Pressable>
    ) : (
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={teks.umum.kembali}
        hitSlop={sizes.hitSlop}
        className="items-center justify-center"
        style={{ width: 44, height: 44 }}
      >
        <ArrowLeft size={24} color={colors.neutral900} strokeWidth={1.75} />
      </Pressable>
    );

  if (variant === "auth") {
    return (
      <View className={`w-full bg-white ${className}`}>
        <View className="flex-row items-start gap-3 px-6 pb-2 pt-3">
          {adaBack ? tombolBack : null}
          <View className="flex-1">
            <Text
              className="font-inter-bold text-2xl text-neutral-900"
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                className="mt-1 font-inter text-xs text-neutral-500"
                maxFontSizeMultiplier={1.3}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right ? <View className="items-center justify-center">{right}</View> : null}
        </View>
      </View>
    );
  }

  return (
    <View
      className={`w-full flex-row items-center bg-white px-2 ${className}`}
      style={{ height: sizes.appBar }}
    >
      <View style={{ width: 44 }}>{adaBack ? tombolBack : null}</View>
      <Text
        className="flex-1 text-center font-inter-semibold text-base text-neutral-900"
        accessibilityRole="header"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>
      <View className="items-end justify-center" style={{ width: 44, height: 44 }}>
        {right ??
          (onPressMenu ? (
            <Pressable
              onPress={onPressMenu}
              accessibilityRole="button"
              accessibilityLabel={teks.umum.lihat}
              hitSlop={sizes.hitSlop}
              className="h-11 w-11 items-center justify-center"
            >
              <Ellipsis size={24} color={colors.neutral700} strokeWidth={1.75} />
            </Pressable>
          ) : null)}
      </View>
    </View>
  );
}

export default AppBar;
