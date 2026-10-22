import { Check, ChevronDown } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { rupiah } from "../../lib/format";
import { teks } from "../../lib/i18n";
import { colors } from "../../theme/tokens";

export type BannerTotalProps = {
  total: number;
  label?: string;
  className?: string;
};

/**
 * Banner total pembayaran — guideline §3.14.
 * Tinggi 44, `rounded-md`, bg success-100, "Total Amount" Body medium di kiri
 * dan nilai Section bold di kanan, keduanya success-700.
 */
export function BannerTotal({
  total,
  label = teks.checkout.totalAmount,
  className = "",
}: BannerTotalProps) {
  return (
    <View
      className={`flex-row items-center justify-between rounded-md bg-success-100 px-4 ${className}`}
      style={{ height: 44 }}
      accessibilityRole="summary"
      accessibilityLabel={`${label} ${rupiah(total)}`}
    >
      <Text className="font-inter-medium text-sm text-success-700" maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      <Text
        className="font-inter-bold text-base text-success-700 tabular-nums"
        maxFontSizeMultiplier={1.3}
      >
        {rupiah(total)}
      </Text>
    </View>
  );
}

export type BarisMetodeProps = {
  nama: string;
  /** Baris keterangan (jenis pembayaran, biaya admin). */
  keterangan?: string | null;
  /** Baris rekening tujuan (khusus transfer). */
  detail?: string | null;
  /** Sorotan metode terpilih pada split payment. */
  terpilih?: boolean;
  onPress?: () => void;
  /** `chevron` untuk accordion; `radio` untuk pilih tunggal. */
  tanda?: "chevron" | "radio";
  terbuka?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Baris metode pembayaran — guideline §3.14.
 * Tinggi minimum 52, judul Body medium neutral-900, keterangan Small
 * neutral-500, penanda di kanan: chevron yang berputar 200 ms (accordion) atau
 * radio terisi primary-600. Target sentuh >= 44 pt + accessibilityState.
 */
export function BarisMetode({
  nama,
  keterangan,
  detail,
  terpilih = false,
  onPress,
  tanda = "chevron",
  terbuka = false,
  disabled = false,
  className = "",
}: BarisMetodeProps) {
  // Animated.Value di state (bukan ref) agar aman dibaca saat render —
  // pola yang sama dengan Accordion/Dialog.
  const [putaran] = useState(() => new Animated.Value(terbuka ? 1 : 0));

  useEffect(() => {
    Animated.timing(putaran, {
      toValue: terbuka ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [terbuka, putaran]);

  const rotate = putaran.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={tanda === "radio" ? "radio" : "button"}
      accessibilityState={
        tanda === "radio" ? { selected: terpilih, disabled } : { expanded: terbuka, disabled }
      }
      accessibilityLabel={[nama, keterangan, detail].filter(Boolean).join(", ")}
      className={`flex-row items-center gap-3 px-4 ${disabled ? "opacity-50" : ""} ${className}`}
      style={{ minHeight: 52 }}
    >
      <View className="flex-1 py-2">
        <Text
          className={`font-inter-medium text-sm ${
            terpilih ? "text-primary-700" : "text-neutral-900"
          }`}
          maxFontSizeMultiplier={1.3}
        >
          {nama}
        </Text>
        {keterangan ? (
          <Text
            className="mt-0.5 font-inter text-xs text-neutral-500"
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {keterangan}
          </Text>
        ) : null}
        {detail ? (
          <Text
            className="mt-0.5 font-inter text-xs text-primary-700"
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {detail}
          </Text>
        ) : null}
      </View>

      {tanda === "radio" ? (
        <View
          className={`items-center justify-center rounded-full border ${
            terpilih ? "border-primary-600 bg-primary-600" : "border-neutral-300 bg-white"
          }`}
          style={{ width: 20, height: 20 }}
        >
          {terpilih ? <Check size={12} color={colors.white} strokeWidth={3} /> : null}
        </View>
      ) : (
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={20} color={colors.neutral500} strokeWidth={1.75} />
        </Animated.View>
      )}
    </Pressable>
  );
}

export default BannerTotal;
