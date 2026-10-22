import { Text, View } from "react-native";
import { rupiah } from "../../lib/format";
import { teks } from "../../lib/i18n";

export type BarisRingkasan = {
  label: string;
  /** Nilai rupiah; `null`/`undefined` = baris disembunyikan. */
  nilai?: number | null;
  /** Tampilkan sebagai pengurang bergaya success-700 (diskon, poin). */
  potongan?: boolean;
  /** Nilai berupa teks bebas (mis. "Gratis"). */
  teksNilai?: string;
};

export type PriceSummaryProps = {
  baris: BarisRingkasan[];
  total: number;
  totalLabel?: string;
  className?: string;
};

/**
 * Price summary Zovora — guideline §3.12.
 * Kartu `rounded-lg` bg primary-50 border primary-100 padding 16. Baris label
 * Body neutral-700 di kiri, nilai Body neutral-900 di kanan, jarak 12; divider
 * neutral-200; lalu "Total amount" Body bold + nilai Section bold.
 */
export function PriceSummary({
  baris,
  total,
  totalLabel = teks.checkout.total,
  className = "",
}: PriceSummaryProps) {
  const tampil = baris.filter(
    (b) => (b.nilai != null && b.nilai !== 0) || b.teksNilai
  );

  return (
    <View
      className={`rounded-lg border border-primary-100 bg-primary-50 p-4 ${className}`}
      accessibilityRole="summary"
      accessibilityLabel={`${teks.checkout.total} ${rupiah(total)}`}
    >
      {tampil.map((b, i) => (
        <View key={`${b.label}-${i}`} className="mb-3 flex-row items-center justify-between gap-3">
          <Text className="font-inter text-sm text-neutral-700" maxFontSizeMultiplier={1.3}>
            {b.label}
          </Text>
          <Text
            className={`font-inter text-sm tabular-nums ${
              b.potongan ? "text-success-700" : "text-neutral-900"
            }`}
            maxFontSizeMultiplier={1.3}
          >
            {b.teksNilai ?? `${b.potongan ? "-" : ""}${rupiah(b.nilai ?? 0)}`}
          </Text>
        </View>
      ))}

      <View className="mb-3 h-px w-full bg-primary-100" />

      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-inter-bold text-sm text-neutral-900" maxFontSizeMultiplier={1.3}>
          {totalLabel}
        </Text>
        <Text
          className="font-inter-bold text-base text-neutral-900 tabular-nums"
          maxFontSizeMultiplier={1.3}
        >
          {rupiah(total)}
        </Text>
      </View>
    </View>
  );
}

export default PriceSummary;
