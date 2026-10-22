import { Text, View } from "react-native";
import {
  infoStatus,
  nadaBadgeBg,
  nadaBadgeTeks,
  warnaNada,
  type NadaStatus,
} from "../../lib/pesanan";

export type StatusBadgeProps = {
  status?: string | null;
  /** Paksa nada tertentu (mis. saat pesanan kedaluwarsa). */
  nada?: NadaStatus;
  /** Paksa label (mis. "Kedaluwarsa"). */
  label?: string;
  /** Tampilkan ikon 14 di kiri label. Status tidak boleh disampaikan warna saja. */
  denganIkon?: boolean;
  className?: string;
};

/**
 * Badge status pesanan — turunan guideline §3.19.
 * Pill `rounded-full` bg tint + teks 12 semibold (kontras >= 4,5:1), dengan
 * ikon opsional agar status tidak dibedakan hanya lewat warna (§7).
 */
export function StatusBadge({
  status,
  nada,
  label,
  denganIkon = true,
  className = "",
}: StatusBadgeProps) {
  const info = infoStatus(status);
  const nadaAkhir = nada ?? info.nada;
  const Ikon = info.ikon;
  const teksLabel = label ?? info.label;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={teksLabel}
      className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${nadaBadgeBg[nadaAkhir]} ${className}`}
    >
      {denganIkon ? (
        <Ikon size={12} color={warnaNada[nadaAkhir]} strokeWidth={2} />
      ) : null}
      <Text
        className={`font-inter-medium text-xs ${nadaBadgeTeks[nadaAkhir]}`}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {teksLabel}
      </Text>
    </View>
  );
}

export default StatusBadge;
