import { Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  /** Batas stok — tombol + nonaktif saat tercapai. */
  max?: number;
  min?: number;
  /** Dipanggil setelah pengguna mengonfirmasi hapus (qty 1 → tombol −). */
  onRemove?: () => void;
  /** Tampilkan dialog konfirmasi hapus saat qty 1 (default true). */
  confirmRemove?: boolean;
  disabled?: boolean;
  /** Label aksesibilitas konteks, mis. nama produk. */
  contextLabel?: string;
  className?: string;
};

/**
 * Stepper Zovora — guideline §3.11 + §7.
 * Tombol − dan + 28×28 border neutral-200 radius md, angka Body semibold
 * min-width 24 rata tengah. Minimum 1; menekan − pada qty 1 memunculkan
 * konfirmasi hapus. Dibatasi stok (`max`).
 */
export function Stepper({
  value,
  onChange,
  max,
  min = 1,
  onRemove,
  confirmRemove = true,
  disabled = false,
  contextLabel,
  className = "",
}: StepperProps) {
  const [konfirmasi, setKonfirmasi] = useState(false);

  const batasAtas = max != null && max > 0 ? max : Number.POSITIVE_INFINITY;
  const bisaKurang = !disabled && (value > min || (value === min && !!onRemove && confirmRemove));
  const bisaTambah = !disabled && value < batasAtas;

  const kurangi = () => {
    if (value > min) {
      onChange(value - 1);
      return;
    }
    if (value === min && onRemove) {
      if (confirmRemove) setKonfirmasi(true);
      else onRemove();
    }
  };

  const tambah = () => {
    if (value < batasAtas) onChange(Math.min(value + 1, batasAtas));
  };

  return (
    <View
      className={`flex-row items-center gap-2 ${className}`}
      accessibilityRole="adjustable"
      accessibilityLabel={contextLabel ? `${teks.checkout.jumlah} ${contextLabel}` : teks.checkout.jumlah}
      accessibilityValue={{ min, max: max ?? undefined, now: value, text: String(value) }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={teks.a11y.kurangiJumlah}
        accessibilityState={{ disabled: !bisaKurang }}
        disabled={!bisaKurang}
        onPress={kurangi}
        hitSlop={sizes.hitSlop}
        className={`items-center justify-center rounded-md border border-neutral-200 bg-white ${
          bisaKurang ? "" : "opacity-40"
        }`}
        style={{ width: sizes.stepperButton, height: sizes.stepperButton }}
      >
        <Minus size={16} color={colors.neutral700} strokeWidth={1.75} />
      </Pressable>

      <Text
        className="text-center font-inter-semibold text-sm text-neutral-900 tabular-nums"
        style={{ minWidth: 24 }}
        accessibilityLiveRegion="polite"
      >
        {value}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={teks.a11y.tambahJumlah}
        accessibilityState={{ disabled: !bisaTambah }}
        disabled={!bisaTambah}
        onPress={tambah}
        hitSlop={sizes.hitSlop}
        className={`items-center justify-center rounded-md border border-neutral-200 bg-white ${
          bisaTambah ? "" : "opacity-40"
        }`}
        style={{ width: sizes.stepperButton, height: sizes.stepperButton }}
      >
        <Plus size={16} color={colors.neutral700} strokeWidth={1.75} />
      </Pressable>

      {konfirmasi ? (
        <Dialog
          visible
          onClose={() => setKonfirmasi(false)}
          title={teks.dialog.hapusItem.judul}
          description={
            contextLabel
              ? `${contextLabel} — ${teks.dialog.hapusItem.deskripsi}`
              : teks.dialog.hapusItem.deskripsi
          }
          actions={
            <>
              <Button
                title={teks.dialog.hapusItem.batal}
                variant="outline"
                size="md"
                className="flex-1"
                onPress={() => setKonfirmasi(false)}
              />
              <Button
                title={teks.dialog.hapusItem.ya}
                variant="primary"
                size="md"
                className="flex-1"
                onPress={() => {
                  setKonfirmasi(false);
                  onRemove?.();
                }}
              />
            </>
          }
        />
      ) : null}
    </View>
  );
}

export default Stepper;
