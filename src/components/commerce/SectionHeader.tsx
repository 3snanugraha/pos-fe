import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";

export type SectionHeaderProps = {
  /** Judul Section neutral-900 (guideline §3.8). */
  judul: string;
  /** Label tautan kanan, default "Lihat Semua". */
  aksiLabel?: string;
  onPressAksi?: () => void;
  /** Tampilkan chevron di kanan teks aksi. */
  chevron?: boolean;
  className?: string;
};

/**
 * SectionHeader Zovora — guideline §3.8.
 * Judul Section neutral-900 di kiri, "Lihat Semua" Small medium primary-700
 * rata kanan, jarak ke konten 12. Seluruh area aksi memakai hitSlop 8 agar
 * target sentuh tetap nyaman (butir teks hanya ~16 pt tinggi).
 */
export function SectionHeader({
  judul,
  aksiLabel = teks.beranda.lihatSemua,
  onPressAksi,
  chevron = false,
  className = "",
}: SectionHeaderProps) {
  return (
    <View className={`mb-3 flex-row items-center justify-between ${className}`}>
      <Text
        className="flex-1 font-inter-semibold text-base text-neutral-900"
        accessibilityRole="header"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {judul}
      </Text>

      {onPressAksi ? (
        <Pressable
          onPress={onPressAksi}
          accessibilityRole="link"
          accessibilityLabel={aksiLabel}
          hitSlop={sizes.hitSlop}
          className="ml-3 flex-row items-center gap-0.5 active:opacity-70"
          style={{ minHeight: sizes.minTouchTarget }}
        >
          <Text
            className="font-inter-medium text-xs text-primary-700"
            maxFontSizeMultiplier={1.3}
          >
            {aksiLabel}
          </Text>
          {chevron ? (
            <ChevronRight size={14} color={colors.primary700} strokeWidth={1.75} />
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

export default SectionHeader;
