import { Minus, Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { teks } from "../../lib/i18n";
import { batasAtas, hanyaDigit, uraiJumlah, type HasilJumlah } from "../../lib/jumlahManual";
import { colors, sizes } from "../../theme/tokens";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  /** Batas stok — tombol + nonaktif saat tercapai, ketikan di-clamp. */
  max?: number;
  min?: number;
  /** Dipanggil setelah pengguna mengonfirmasi hapus (qty 1 → tombol −). */
  onRemove?: () => void;
  /** Tampilkan dialog konfirmasi hapus saat qty 1 (default true). */
  confirmRemove?: boolean;
  disabled?: boolean;
  /** Label aksesibilitas konteks, mis. nama produk. */
  contextLabel?: string;
  /**
   * Izinkan qty diketik langsung (default true). Dimatikan bila angka hanya
   * boleh diubah lewat tombol.
   */
  bisaKetik?: boolean;
  className?: string;
};

/**
 * Stepper Zovora — guideline §3.11 + §7.
 * Tombol − dan + 28×28 border neutral-200 radius md, angka Body semibold
 * di tengah. Minimum 1; menekan − pada qty 1 memunculkan konfirmasi hapus.
 * Dibatasi stok (`max`).
 *
 * ── Qty manual (perbaikan APK 2026-10-28b) ──────────────────────────────
 *
 * Angka di tengah dulu `<Text>` sehingga pembeli hanya bisa menaikkan qty
 * satu-satu — untuk 24 pcs berarti 23 ketukan. Sekarang angka itu
 * `<TextInput>` bernomor (keyboard angka) sehingga qty bisa diketik langsung,
 * di keranjang DAN di detail produk, karena keduanya memakai komponen ini.
 *
 * Aturan yang berlaku sama di kedua layar (`src/lib/jumlahManual.ts`):
 *  - hanya digit yang diterima, termasuk saat paste;
 *  - ketikan kosong ditahan (tidak memaksa jadi 1 saat pengguna menghapus);
 *  - angka di atas stok di-clamp ke stok + pesan "Maksimal N";
 *  - nilai sah langsung diteruskan lewat `onChange`, sehingga harga tier
 *    grosir/flash dan subtotal ikut berubah saat angka diketik.
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
  bisaKetik = true,
  className = "",
}: StepperProps) {
  const [konfirmasi, setKonfirmasi] = useState(false);
  /** Teks mentah saat pengguna mengetik; null = ikut `value` dari induk. */
  const [teksKetik, setTeksKetik] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const timerGalat = useRef<ReturnType<typeof setTimeout> | null>(null);

  const batasMaks = batasAtas(max);
  const batasAngka = batasMaks ?? Number.POSITIVE_INFINITY;
  /**
   * Tombol − aktif bila masih bisa mengurangi ATAU bila pada qty minimum
   * masih ada aksi hapus. `confirmRemove` hanya menentukan APAKAH dialog
   * konfirmasi lokal ditampilkan — bukan apakah tombolnya bisa ditekan.
   */
  const bisaKurang = !disabled && (value > min || (value === min && !!onRemove));
  const bisaTambah = !disabled && value < batasAngka;

  useEffect(
    () => () => {
      if (timerGalat.current) clearTimeout(timerGalat.current);
    },
    [],
  );

  const tampilkanGalat = (pesan: string) => {
    setGalat(pesan);
    if (timerGalat.current) clearTimeout(timerGalat.current);
    timerGalat.current = setTimeout(() => setGalat(null), 2600);
  };

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
    if (value < batasAngka) onChange(Math.min(value + 1, batasAngka));
  };

  /** Ketikan pengguna: saring digit, picu perubahan, tandai bila melebihi stok. */
  const onKetik = (masukan: string) => {
    if (disabled) return;

    const digit = hanyaDigit(masukan, 4);
    const hasil: HasilJumlah = uraiJumlah(digit, { min, max: batasMaks });

    if (hasil.nilai == null) {
      // Kosong: tahan. Qty tidak diubah sampai pengguna mengetik angka.
      setTeksKetik(digit);
      return;
    }

    /*
     * Tampilkan angka yang SUDAH dirapikan, bukan ketikan mentah. Tanpa ini
     * pengguna melihat "99" di kotak sementara pesan di bawahnya berkata
     * "Maksimal 15" — angka di layar berbeda dengan qty yang dipakai.
     */
    setTeksKetik(hasil.teks);

    if (hasil.melebihiBatas && batasMaks != null) {
      tampilkanGalat(teks.keranjang.qtyMelebihiStok.replace("{maks}", String(batasMaks)));
    } else if (hasil.diBawahMinimum) {
      tampilkanGalat(teks.keranjang.qtyMinimal.replace("{min}", String(min)));
    } else {
      setGalat(null);
    }

    if (hasil.nilai !== value) {
      onChange(hasil.nilai);
    }
  };

  /** Selesai mengetik: rapikan teks ke nilai sah (kosong → nilai terakhir). */
  const selesaiKetik = () => {
    const hasil = uraiJumlah(teksKetik ?? String(value), { min, max: batasMaks });
    const akhir = hasil.nilai ?? Math.max(min, value);
    setTeksKetik(null);
    if (akhir !== value) onChange(akhir);
  };

  const teksTampil = teksKetik ?? String(value);

  return (
    <View className={className} style={{ gap: 2 }}>
      <View
        className="flex-row items-center gap-2"
        accessibilityRole="adjustable"
        accessibilityLabel={
          contextLabel ? `${teks.checkout.jumlah} ${contextLabel}` : teks.checkout.jumlah
        }
        accessibilityValue={{ min, max: batasMaks ?? undefined, now: value, text: String(value) }}
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

        {bisaKetik ? (
          <TextInput
            value={teksTampil}
            onChangeText={onKetik}
            onBlur={selesaiKetik}
            onSubmitEditing={selesaiKetik}
            editable={!disabled}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            maxLength={4}
            selectTextOnFocus
            accessibilityLabel={
              contextLabel ? `${teks.checkout.jumlah} ${contextLabel}` : teks.checkout.jumlah
            }
            accessibilityHint={teks.keranjang.qtyKetikHint.replace(
              "{maks}",
              String(batasMaks ?? ""),
            )}
            testID="stepper-input"
            className={`rounded-md border bg-white text-center font-inter-semibold text-sm tabular-nums ${
              disabled ? "text-neutral-400" : "text-neutral-900"
            } ${galat ? "border-danger-500" : "border-neutral-200"}`}
            style={{
              minWidth: 40,
              height: sizes.stepperButton,
              paddingHorizontal: 4,
              // Android menambah padding bawaan pada TextInput; dinolkan agar
              // angka tetap di tengah kotak setinggi tombol (28pt).
              paddingVertical: 0,
            }}
          />
        ) : (
          <Text
            className="text-center font-inter-semibold text-sm text-neutral-900 tabular-nums"
            style={{ minWidth: 24 }}
            accessibilityLiveRegion="polite"
          >
            {value}
          </Text>
        )}

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
      </View>

      {galat ? (
        <Text
          className="font-inter text-caption text-danger-700"
          accessibilityLiveRegion="polite"
          testID="stepper-galat"
        >
          {galat}
        </Text>
      ) : null}

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
