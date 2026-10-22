/**
 * Form alamat Zovora — dipakai layar Tambah Alamat dan Ubah Alamat.
 *
 * Semua copy lewat `teks.alamat` (i18n), semua field memakai `Input` W1
 * (tinggi 48, label 14 medium, error danger-700), dan validasi identik dengan
 * versi lama supaya payload ke `addCustomerAddress`/`updateCustomerAddress`
 * tidak berubah.
 */
import { Save } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { Input, Toggle } from "../../components/ui";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";
import type { AddressCreateData } from "../../../services/types";

export type FormAlamatProps = {
  nilai: AddressCreateData;
  onUbah: (field: keyof AddressCreateData, value: string | boolean) => void;
  galat?: Record<string, string>;
  /** Nonaktifkan semua field saat menyimpan. */
  disabled?: boolean;
};

/** Validasi form — mengembalikan peta error per field (kosong = valid). */
export function validasiAlamat(nilai: AddressCreateData): Record<string, string> {
  const galat: Record<string, string> = {};

  if (!nilai.label.trim()) galat.label = teks.alamat.validasi.label;
  if (!nilai.nama_penerima.trim()) galat.nama_penerima = teks.alamat.validasi.nama;

  if (!nilai.telepon_penerima.trim()) {
    galat.telepon_penerima = teks.alamat.validasi.telepon;
  } else if (!/^[\d+\-\s()]{8,}$/.test(nilai.telepon_penerima.trim())) {
    galat.telepon_penerima = teks.alamat.validasi.teleponFormat;
  }

  if (!nilai.alamat_lengkap.trim()) galat.alamat_lengkap = teks.alamat.validasi.alamat;
  if (!nilai.kota.trim()) galat.kota = teks.alamat.validasi.kota;
  if (!nilai.provinsi.trim()) galat.provinsi = teks.alamat.validasi.provinsi;

  if (!nilai.kode_pos.trim()) {
    galat.kode_pos = teks.alamat.validasi.kodePos;
  } else if (!/^\d{5}$/.test(nilai.kode_pos.trim())) {
    galat.kode_pos = teks.alamat.validasi.kodePosFormat;
  }

  return galat;
}

/** Isi form kosong siap pakai. */
export const FORM_ALAMAT_KOSONG: AddressCreateData = {
  label: "",
  nama_penerima: "",
  telepon_penerima: "",
  alamat_lengkap: "",
  kota: "",
  provinsi: "",
  kode_pos: "",
  is_default: false,
};

/**
 * Field-field form alamat (label, penerima, telepon, alamat lengkap, kota,
 * provinsi, kode pos) + sakelar "Jadikan Alamat Utama".
 */
export function FormAlamat({ nilai, onUbah, galat = {}, disabled = false }: FormAlamatProps) {
  return (
    <View style={{ gap: 16 }}>
      <Input
        label={teks.alamat.field.label}
        value={nilai.label}
        onChangeText={(v) => onUbah("label", v)}
        placeholder={teks.alamat.field.labelPlaceholder}
        error={galat.label}
        editable={!disabled}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Input
        label={teks.alamat.field.namaPenerima}
        value={nilai.nama_penerima}
        onChangeText={(v) => onUbah("nama_penerima", v)}
        placeholder={teks.alamat.field.namaPenerimaPlaceholder}
        error={galat.nama_penerima}
        editable={!disabled}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
      />

      <Input
        label={teks.alamat.field.telepon}
        value={nilai.telepon_penerima}
        onChangeText={(v) => onUbah("telepon_penerima", v)}
        placeholder={teks.alamat.field.teleponPlaceholder}
        error={galat.telepon_penerima}
        editable={!disabled}
        keyboardType="phone-pad"
        autoComplete="tel"
        returnKeyType="next"
      />

      <Input
        label={teks.alamat.field.alamatLengkap}
        value={nilai.alamat_lengkap}
        onChangeText={(v) => onUbah("alamat_lengkap", v)}
        placeholder={teks.alamat.field.alamatPlaceholder}
        error={galat.alamat_lengkap}
        editable={!disabled}
        multiline
        textAlignVertical="top"
        style={{ height: 96, paddingTop: 12 }}
        returnKeyType="next"
      />

      <Input
        label={teks.alamat.field.kota}
        value={nilai.kota}
        onChangeText={(v) => onUbah("kota", v)}
        placeholder={teks.alamat.field.kotaPlaceholder}
        error={galat.kota}
        editable={!disabled}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Input
        label={teks.alamat.field.provinsi}
        value={nilai.provinsi}
        onChangeText={(v) => onUbah("provinsi", v)}
        placeholder={teks.alamat.field.provinsiPlaceholder}
        error={galat.provinsi}
        editable={!disabled}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Input
        label={teks.alamat.field.kodePos}
        value={nilai.kode_pos}
        onChangeText={(v) => onUbah("kode_pos", v)}
        placeholder={teks.alamat.field.kodePosPlaceholder}
        error={galat.kode_pos}
        editable={!disabled}
        keyboardType="numeric"
        maxLength={5}
        returnKeyType="done"
      />

      {/* Sakelar alamat utama — status diumumkan lewat accessibilityState. */}
      <View
        className="flex-row items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4"
        style={{ minHeight: sizes.minTouchTarget + 12 }}
      >
        <View className="mr-3 flex-1">
          <Text
            className="font-inter-medium text-sm text-neutral-900"
            maxFontSizeMultiplier={1.3}
          >
            {teks.alamat.utamaToggle}
          </Text>
          <Text
            className="mt-1 font-inter text-xs text-neutral-500"
            maxFontSizeMultiplier={1.3}
          >
            {teks.alamat.utamaToggleDeskripsi}
          </Text>
        </View>
        <Toggle
          value={!!nilai.is_default}
          onChange={(v) => onUbah("is_default", v)}
          accessibilityLabel={teks.alamat.utamaToggle}
          disabled={disabled}
        />
      </View>

      <Text className="font-inter text-xs text-neutral-500" maxFontSizeMultiplier={1.3}>
        {teks.alamat.wajibCatatan}
      </Text>
    </View>
  );
}

/** Ikon simpan untuk CTA sticky bar (20, putih). */
export const ikonSimpanAlamat = (
  <Save size={20} color={colors.white} strokeWidth={1.75} />
);

/** Wadah scroll standar form alamat (padding 16, bawah 32). */
export function ScrollFormAlamat({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export default FormAlamat;
