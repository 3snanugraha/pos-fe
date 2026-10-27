import { Check, Copy } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";
import { salinKePapanKlip } from "../../../utils/salinPapanKlip";
import { pesanHasilSalin } from "../../../utils/salinTeks";

export type TombolSalinProps = {
  /** Teks yang disalin (mis. nomor transaksi). */
  nilai: string;
  /** Nama benda untuk pesan umpan balik (mis. "Nomor transaksi"). */
  label?: string;
  /** Tampilkan teks label di samping ikon (default: hanya ikon). */
  denganTeks?: boolean;
  disabled?: boolean;
  className?: string;
  /** Dipanggil setelah percobaan salin, untuk pesan di induk. */
  onSelesai?: (ok: boolean, pesan: string) => void;
};

/**
 * Tombol "salin ke papan klip" dengan umpan balik di dalam tombol.
 *
 * Kenapa umpan balik lokal (ikon berubah jadi centang 2 dtk) dan bukan
 * `ToastAndroid`/`Alert`? `Alert` callback tidak selalu jalan di web dan toast
 * native tidak ada di web; umpan balik di tombol sendiri bekerja di ketiga
 * platform dan tidak menghalangi kasir yang sedang melayani antrean.
 *
 * `onSelesai` tetap disediakan supaya induk bisa mengumumkan lewat
 * `AccessibilityInfo` (pembaca layar tidak membaca ikon).
 */
export function TombolSalin({
  nilai,
  label = teks.kasir.salinNomor,
  denganTeks = false,
  disabled = false,
  className = "",
  onSelesai,
}: TombolSalinProps) {
  const [berhasil, setBerhasil] = useState<boolean | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const salin = useCallback(async () => {
    const hasil = await salinKePapanKlip(nilai);
    setBerhasil(hasil.ok);
    onSelesai?.(hasil.ok, pesanHasilSalin(hasil, label));

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBerhasil(null), 2000);
  }, [label, nilai, onSelesai]);

  const aktif = berhasil === true;

  return (
    <Pressable
      onPress={salin}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={teks.kasir.salinHint}
      // Diperlukan agar QA/atribut web bisa membedakan tombol salin per kartu.
      testID={`salin-${nilai}`}
      hitSlop={sizes.hitSlop}
      className={`flex-row items-center gap-1 rounded-sm px-2 ${
        aktif ? "bg-success-100" : "bg-neutral-100"
      } ${disabled ? "opacity-50" : ""} ${className}`}
      style={{ minHeight: 32 }}
    >
      {aktif ? (
        <Check size={14} color={colors.success700} strokeWidth={2.25} />
      ) : (
        <Copy size={14} color={colors.neutral700} strokeWidth={1.75} />
      )}
      <Text
        className={`font-inter-medium text-caption ${
          aktif ? "text-success-700" : "text-neutral-700"
        }`}
        maxFontSizeMultiplier={1.3}
      >
        {aktif ? teks.kasir.tersalin : denganTeks ? teks.kasir.salin : ""}
      </Text>
      {!denganTeks && !aktif ? <View style={{ width: 0 }} /> : null}
    </Pressable>
  );
}

export default TombolSalin;
