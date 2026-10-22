import { Check } from "lucide-react-native";
import { Text, View } from "react-native";
import { TAHAP_TIMELINE } from "../../lib/pesanan";
import { colors } from "../../theme/tokens";

export type OrderTimelineProps = {
  /** 0 = dibuat, 1 = diproses, 2 = selesai; `-1` menyembunyikan timeline. */
  indeks: number;
  className?: string;
};

/**
 * Timeline status pesanan — turunan guideline §3.7/§5.
 * Titik 24 (primary-600 bila tercapai, neutral-200 bila belum) dengan garis
 * penghubung 2 pt, label Body medium dan deskripsi Small. Tahap yang sudah
 * dilalui ditandai centang, bukan hanya warna (guideline §7).
 */
export function OrderTimeline({ indeks, className = "" }: OrderTimelineProps) {
  if (indeks < 0) return null;

  return (
    <View
      className={className}
      accessibilityRole="list"
      accessibilityLabel={TAHAP_TIMELINE.map((t) => t.label).join(", ")}
    >
      {TAHAP_TIMELINE.map((tahap, i) => {
        const tercapai = i <= indeks;
        const terakhir = i === TAHAP_TIMELINE.length - 1;

        return (
          <View key={tahap.key} className="flex-row">
            <View className="mr-3 items-center">
              <View
                className={`items-center justify-center rounded-full ${
                  tercapai ? "bg-primary-600" : "bg-neutral-200"
                }`}
                style={{ width: 24, height: 24 }}
              >
                {tercapai ? (
                  <Check size={14} color={colors.white} strokeWidth={3} />
                ) : (
                  <View
                    className="rounded-full bg-neutral-400"
                    style={{ width: 8, height: 8 }}
                  />
                )}
              </View>
              {!terakhir ? (
                <View
                  className={`w-0.5 ${i < indeks ? "bg-primary-600" : "bg-neutral-200"}`}
                  style={{ height: 32 }}
                />
              ) : null}
            </View>

            <View className="flex-1 pb-3">
              <Text
                className={`font-inter-medium text-sm ${
                  tercapai ? "text-neutral-900" : "text-neutral-500"
                }`}
                maxFontSizeMultiplier={1.3}
              >
                {tahap.label}
              </Text>
              <Text
                className="font-inter text-xs text-neutral-500"
                maxFontSizeMultiplier={1.3}
              >
                {tahap.deskripsi}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default OrderTimeline;
