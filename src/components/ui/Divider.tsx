import { Text, View } from "react-native";
import { teks } from "../../lib/i18n";

export type DividerProps = {
  /** Teks di tengah ("atau lanjutkan dengan"). Tanpa label = garis biasa. */
  label?: string;
  className?: string;
  /** Warna garis: neutral-200 (default) atau neutral-100 untuk divider tipis. */
  muted?: boolean;
};

/**
 * Divider Zovora — guideline §3.19.
 * Garis neutral-200 di kiri dan kanan, teks Small neutral-500, gap 12,
 * margin vertikal 24.
 */
export function Divider({ label, className = "", muted = false }: DividerProps) {
  const lineCls = muted ? "bg-neutral-100" : "bg-neutral-200";

  if (!label) {
    return <View className={`h-px w-full ${lineCls} ${className}`} accessibilityRole="none" />;
  }

  return (
    <View
      className={`my-6 w-full flex-row items-center ${className}`}
      style={{ gap: 12 }}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <View className={`h-px flex-1 ${lineCls}`} />
      <Text className="font-inter text-sm text-neutral-500" maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      <View className={`h-px flex-1 ${lineCls}`} />
    </View>
  );
}

/** Pintasan untuk divider "atau lanjutkan dengan" di layar auth. */
export function DividerAtau({ className = "" }: { className?: string }) {
  return <Divider label={teks.checkout.orContinueWith} className={className} />;
}

export default Divider;
