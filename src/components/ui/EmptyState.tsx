import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { colors } from "../../theme/tokens";
import { Button } from "./Button";

export type EmptyStateProps = {
  /** Ikon Lucide ukuran 36 (BUKAN elemen jadi) — dirender dalam lingkaran 80. */
  icon: ReactNode;
  title: string;
  description?: string;
  /** CTA primary full width (opsional). */
  ctaLabel?: string;
  onCtaPress?: () => void;
  /** Slot tambahan di bawah CTA. */
  children?: ReactNode;
  className?: string;
};

/**
 * EmptyState Zovora — guideline §3.16 + copy §5.
 * Lingkaran 80 bg primary-100 dengan ikon 36 primary-600, jarak 16,
 * judul Subheading, deskripsi Small neutral-500 rata tengah lebar maks 260,
 * CTA primary full width 24 di bawah deskripsi.
 */
export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCtaPress,
  children,
  className = "",
}: EmptyStateProps) {
  return (
    <View
      className={`flex-1 items-center justify-center px-6 py-8 ${className}`}
      accessibilityRole="summary"
      accessibilityLabel={description ? `${title}. ${description}` : title}
    >
      <View
        className="items-center justify-center rounded-full bg-primary-100"
        style={{ width: 80, height: 80 }}
      >
        {icon}
      </View>

      <Text className="mt-4 text-center font-inter-semibold text-lg text-neutral-900">
        {title}
      </Text>

      {description ? (
        <Text
          className="mt-2 text-center font-inter text-sm text-neutral-500"
          style={{ maxWidth: 260 }}
        >
          {description}
        </Text>
      ) : null}

      {ctaLabel ? (
        <Button
          title={ctaLabel}
          onPress={onCtaPress}
          variant="primary"
          size="lg"
          fullWidth
          className="mt-6"
        />
      ) : null}

      {children}
    </View>
  );
}

/** Ikon standar empty state (36, primary-600) agar semua layar konsisten. */
export const emptyIconColor = colors.primary600;

export default EmptyState;
