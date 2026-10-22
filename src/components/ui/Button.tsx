import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { colors, sizes } from "../../theme/tokens";

export type ButtonVariant = "primary" | "outline" | "social" | "ghost";
export type ButtonSize = "lg" | "md" | "sm";

export type ButtonProps = {
  /** Label tombol (sudah dilokalisasi lewat `teks`). */
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ikon Lucide (20 untuk md/lg, 16 untuk sm) di kiri label. */
  icon?: ReactNode;
  /** Ikon di kanan label. */
  trailingIcon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Menggantikan label saat loading (lebar tetap dipertahankan). */
  loadingText?: string;
  testID?: string;
  accessibilityLabel?: string;
  className?: string;
};

const boxCls: Record<ButtonVariant, string> = {
  primary: "bg-primary-600",
  outline: "bg-white border border-primary-600",
  social: "bg-white border border-neutral-200",
  ghost: "bg-transparent",
};

const pressedCls: Record<ButtonVariant, string> = {
  primary: "bg-primary-700",
  outline: "bg-primary-50",
  social: "bg-neutral-50",
  ghost: "bg-primary-50",
};

const textCls: Record<ButtonVariant, string> = {
  primary: "text-white",
  outline: "text-primary-700",
  social: "text-neutral-900",
  ghost: "text-primary-700",
};

const sizeCls: Record<ButtonSize, string> = {
  lg: "h-12 px-5",
  md: "h-10 px-4",
  sm: "h-8 px-3",
};

const labelCls: Record<ButtonSize, string> = {
  lg: "text-base font-inter-semibold",
  md: "text-sm font-inter-semibold",
  sm: "text-xs font-inter-semibold",
};

const spinnerColor: Record<ButtonVariant, string> = {
  primary: colors.white,
  outline: colors.primary600,
  social: colors.neutral900,
  ghost: colors.primary600,
};

/**
 * Button Zovora — guideline §3.1.
 * Varian: primary | outline | social | ghost × ukuran lg (48) | md (40) | sm (32).
 * Radius md (8), pressed state warna lebih gelap, disabled opacity 50%.
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  loadingText,
  testID,
  accessibilityLabel,
  className = "",
}: ButtonProps) {
  const off = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-md ${sizeCls[size]} ${boxCls[variant]} ${off ? "opacity-50" : ""} ${fullWidth ? "w-full" : "self-start"} ${className}`}
      style={({ pressed }) => (pressed && !off ? { opacity: 0.92 } : null)}
    >
      {loading ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={spinnerColor[variant]} />
          {loadingText ? (
            <Text className={`${labelCls[size]} ${textCls[variant]}`}>{loadingText}</Text>
          ) : null}
        </View>
      ) : (
        <>
          {icon}
          <Text className={`${labelCls[size]} ${textCls[variant]}`} numberOfLines={1}>
            {title}
          </Text>
          {trailingIcon}
        </>
      )}
    </Pressable>
  );
}

/** Label pressed class diekspor untuk komponen lain yang butuh warna sama. */
export const buttonPressedClass = pressedCls;
export const buttonMinHeight = sizes.buttonLg;

export default Button;
