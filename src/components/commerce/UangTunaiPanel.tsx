import { useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";
import {
  hitungTunai,
  nominalTunai,
  saranTunai,
  validasiTunai,
} from "../../../utils/tunai";

export type UangTunaiPanelProps = {
  /** Total tagihan (setelah promo & poin). */
  total: number;
  /** Nominal uang diterima sebagai teks mentah dari input. */
  nilai: string;
  onChange: (nilai: string) => void;
  /** Input dikunci saat pesanan sedang diproses. */
  disabled?: boolean;
  className?: string;
};

/**
 * Panel uang tunai di layar Pembayaran — tombol cepat + input manual.
 *
 * Susunan (guideline §3.2/§3.4): judul + deskripsi Small → baris tombol
 * pecahan (`Uang Pas` + kelipatan terdekat 2rb…100rb) → input nominal tinggi
 * 44 → ringkasan `Uang diterima` / `Kembalian` (success) atau `Kurang`
 * (danger) → catatan kaki bahwa angkanya ikut tercetak di nota.
 *
 * Semua hitungan memakai `utils/tunai.ts` (diuji `node --test`) supaya angka
 * di layar, catatan pesanan, dan struk PDF berasal dari satu rumus.
 */
export function UangTunaiPanel({
  total,
  nilai,
  onChange,
  disabled = false,
  className = "",
}: UangTunaiPanelProps) {
  const saran = useMemo(() => saranTunai(total), [total]);
  const diterima = nominalTunai(nilai);
  const hasil = useMemo(() => hitungTunai(total, diterima), [total, diterima]);
  const peringatan = validasiTunai(total, diterima);

  return (
    <View
      className={`rounded-md border border-neutral-200 bg-neutral-50 p-3 ${className}`}
      // Penanda stabil untuk verifikasi DOM (web) bahwa panel ini benar ada.
      testID="panel-uang-tunai"
    >
      <Text
        className="font-inter-semibold text-sm text-neutral-900"
        maxFontSizeMultiplier={1.3}
      >
        {teks.checkout.tunai.judul}
      </Text>
      <Text
        className="mt-1 font-inter text-caption text-neutral-500"
        maxFontSizeMultiplier={1.3}
      >
        {teks.checkout.tunai.deskripsi}
      </Text>

      {/* Tombol cepat: Uang Pas + pecahan terdekat di atas tagihan. */}
      <View className="mt-3 flex-row flex-wrap gap-2">
        {saran.map((opsi) => {
          const aktif = diterima === opsi.nominal && opsi.nominal > 0;
          return (
            <Pressable
              key={`${opsi.jenis}-${opsi.nominal}`}
              onPress={() => onChange(String(opsi.nominal))}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: aktif, disabled }}
              accessibilityLabel={
                opsi.jenis === "pas"
                  ? `${teks.checkout.tunai.uangPas}, ${opsi.label}`
                  : teks.checkout.tunai.pecahan.replace("{label}", opsi.label)
              }
              className={`items-center justify-center rounded-sm border px-3 ${
                aktif
                  ? "border-2 border-primary-600 bg-primary-100"
                  : "border-neutral-200 bg-white"
              } ${disabled ? "opacity-50" : "active:bg-primary-50"}`}
              style={{ minHeight: sizes.minTouchTarget }}
            >
              <Text
                className={`font-inter-medium text-xs ${
                  aktif ? "text-primary-800" : "text-neutral-700"
                }`}
                maxFontSizeMultiplier={1.3}
              >
                {opsi.jenis === "pas" ? teks.checkout.tunai.uangPas : opsi.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Input manual. */}
      <View className="mt-3">
        <Text
          className="mb-1 font-inter text-xs text-neutral-500"
          maxFontSizeMultiplier={1.3}
        >
          {teks.checkout.tunai.labelInput}
        </Text>
        <View
          className={`flex-row items-center gap-2 rounded-md border bg-white px-3 ${
            peringatan ? "border-danger-500" : "border-neutral-200"
          }`}
          style={{ height: 44 }}
        >
          <Text className="font-inter text-sm text-neutral-500">Rp</Text>
          <TextInput
            value={nilai}
            onChangeText={onChange}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder={teks.checkout.tunai.placeholder}
            placeholderTextColor={colors.neutral400}
            editable={!disabled}
            accessibilityLabel={teks.checkout.tunai.labelInput}
            className="flex-1 font-inter text-sm text-neutral-900 tabular-nums"
            style={{ height: 44 }}
          />
        </View>
      </View>

      {/* Ringkasan: diterima → kembalian (success) / kurang (danger). */}
      {diterima > 0 ? (
        <View className="mt-3 rounded-md bg-white p-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-inter text-xs text-neutral-500">
              {teks.checkout.tunai.diterima}
            </Text>
            <Text className="font-inter text-xs text-neutral-700 tabular-nums">
              {opsiRupiah(diterima)}
            </Text>
          </View>

          {hasil.cukup ? (
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="font-inter-semibold text-sm text-success-700">
                {teks.checkout.tunai.kembalian}
              </Text>
              <Text
                className="font-inter-bold text-base text-success-700 tabular-nums"
                maxFontSizeMultiplier={1.3}
              >
                {opsiRupiah(hasil.kembalian)}
              </Text>
            </View>
          ) : (
            <View className="mt-1 flex-row items-center justify-between">
              <Text className="font-inter-semibold text-sm text-danger-700">
                {teks.checkout.tunai.kurang}
              </Text>
              <Text
                className="font-inter-bold text-base text-danger-700 tabular-nums"
                maxFontSizeMultiplier={1.3}
              >
                {opsiRupiah(hasil.kurang)}
              </Text>
            </View>
          )}

          {peringatan ? (
            <Text
              className="mt-2 font-inter text-xs text-danger-700"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {peringatan}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text className="mt-2 font-inter text-caption text-neutral-400">
          {teks.checkout.tunai.kosong}
        </Text>
      )}

      <Text className="mt-2 font-inter text-caption text-neutral-400">
        {teks.checkout.tunai.catatanNota}
      </Text>
    </View>
  );
}

/** Rp 25.000 — format yang sama dengan struk (`rupiahTunai`). */
function opsiRupiah(nilai: number): string {
  return `Rp ${Math.round(Number.isFinite(nilai) ? nilai : 0).toLocaleString("id-ID")}`;
}
