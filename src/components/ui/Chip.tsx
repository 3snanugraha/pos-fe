import { Check } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { colors, sizes } from "../../theme/tokens";

export type ChipProps = {
  /** Label chip (mis. nama warna atau filter). */
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /**
   * Warna swatch (hex dari tokens). Bila diisi, chip dirender sebagai
   * thumbnail warna 48×56 sesuai guideline §3.19.
   */
  swatchColor?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  className?: string;
};

/**
 * Chip Zovora — guideline §3.19.
 * - Chip warna: thumbnail 48×56 radius md, border 1 neutral-200;
 *   terpilih = border 2 primary-600 + bg primary-50.
 * - Chip teks: pill radius sm, bg primary-100 + teks primary-800 saat terpilih.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  swatchColor,
  disabled = false,
  accessibilityLabel,
  className = "",
}: ChipProps) {
  if (swatchColor) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={accessibilityLabel ?? label}
        disabled={disabled}
        onPress={onPress}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        className={`items-center gap-1 ${disabled ? "opacity-50" : ""} ${className}`}
      >
        <View
          className={`items-center justify-center rounded-md ${
            selected ? "border-2 border-primary-600 bg-primary-50" : "border border-neutral-200 bg-white"
          }`}
          style={{ width: 48, height: 56 }}
        >
          <View
            className="rounded-full"
            style={{ width: 26, height: 26, backgroundColor: swatchColor }}
          />
          {selected ? (
            <View className="absolute bottom-1 right-1 rounded-full bg-primary-600 p-0.5">
              <Check size={10} color={colors.white} strokeWidth={3} />
            </View>
          ) : null}
        </View>
        <Text
          className={`font-inter text-caption ${
            selected ? "text-primary-700 font-inter-medium" : "text-neutral-500"
          }`}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={sizes.hitSlop}
      className={`rounded-sm px-3 py-1.5 ${
        selected ? "bg-primary-100" : "bg-neutral-100"
      } ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <Text
        className={`font-inter-medium text-xs ${
          selected ? "text-primary-800" : "text-neutral-700"
        }`}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default Chip;
