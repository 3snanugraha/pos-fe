import { Text, View } from "react-native";

export type BadgeProps = {
  /** Label singkat, mis. "-20%". */
  label: string;
  /** Varian warna: diskon (primary-600) atau netral. */
  variant?: "diskon" | "netral" | "danger" | "success" | "warning";
  className?: string;
  accessibilityLabel?: string;
};

const boxCls: Record<NonNullable<BadgeProps["variant"]>, string> = {
  diskon: "bg-primary-600",
  netral: "bg-neutral-100",
  danger: "bg-danger-500",
  success: "bg-success-100",
  warning: "bg-warning-500",
};

const labelCls: Record<NonNullable<BadgeProps["variant"]>, string> = {
  diskon: "text-white",
  netral: "text-neutral-700",
  danger: "text-white",
  success: "text-success-700",
  warning: "text-white",
};

/**
 * Badge Zovora — guideline §3.19.
 * Badge diskon: bg primary-600, teks putih Caption bold, padding 6×2, radius sm.
 */
export function Badge({
  label,
  variant = "diskon",
  className = "",
  accessibilityLabel,
}: BadgeProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
      className={`self-start rounded-sm px-1.5 py-0.5 ${boxCls[variant]} ${className}`}
    >
      <Text
        className={`font-inter-bold text-caption ${labelCls[variant]}`}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
    </View>
  );
}

/** Badge persentase diskon dari harga asli & harga jual. */
export function hitungDiskon(hargaAsli: number, hargaJual: number): number {
  if (!hargaAsli || hargaAsli <= hargaJual) return 0;
  return Math.round(((hargaAsli - hargaJual) / hargaAsli) * 100);
}

export default Badge;
