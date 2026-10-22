import { ArrowLeft, Camera, Mic, Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { teks } from "../../lib/i18n";
import { useReduceMotion } from "../../lib/motion";
import { colors, sizes } from "../../theme/tokens";

export type SearchBarProps = {
  value: string;
  onChangeText: (teks: string) => void;
  onSubmit?: () => void;
  /** Fokus otomatis saat layar dibuka. */
  autoFocus?: boolean;
  /** Tampilkan panah kembali di kiri (menggantikan ikon search). */
  onBack?: () => void;
  /** Placeholder statis; bila kosong memakai placeholder berganti. */
  placeholder?: string;
  /** Sembunyikan ikon mic/camera (mis. di layar yang tidak butuh). */
  tanpaAksiSuara?: boolean;
  onPressMic?: () => void;
  onPressCamera?: () => void;
};

const JEDA_GANTI = 3500;

/**
 * SearchBar Zovora — guideline §3.4.
 * Tinggi 44, `rounded-md`, border neutral-200, ikon search 20 di kiri,
 * placeholder berganti-ganti, dan ikon kanan. Saat mengetik, ikon kanan
 * menjadi x (clear) dan panah kembali muncul di kiri.
 *
 * Teks placeholder berputar tiap 3,5 dtk — berhenti bila Reduce Motion aktif.
 * Ikon mic/camera dirender sebagai tombol 44 pt (guideline §7).
 */
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  autoFocus = false,
  onBack,
  placeholder,
  tanpaAksiSuara = false,
  onPressMic,
  onPressCamera,
}: SearchBarProps) {
  const reduce = useReduceMotion();
  const [indeks, setIndeks] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const daftarPlaceholder = teks.pencarian.placeholderBerganti as readonly string[];
  const adaIsi = value.trim().length > 0;

  useEffect(() => {
    if (reduce || placeholder || adaIsi) return;
    const timer = setInterval(() => {
      setIndeks((i) => (i + 1) % daftarPlaceholder.length);
    }, JEDA_GANTI);
    return () => clearInterval(timer);
  }, [reduce, placeholder, adaIsi, daftarPlaceholder.length]);

  const labelPlaceholder = placeholder ?? daftarPlaceholder[indeks] ?? "";

  return (
    <View
      className="flex-row items-center gap-2 rounded-md border border-neutral-200 bg-white px-3"
      style={{ height: sizes.searchBar }}
      accessibilityRole="search"
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={teks.umum.kembali}
          hitSlop={sizes.hitSlop}
          className="-ml-1 items-center justify-center"
          style={{ width: 32, height: 44 }}
        >
          <ArrowLeft size={20} color={colors.neutral700} strokeWidth={1.75} />
        </Pressable>
      ) : (
        <Search size={20} color={colors.neutral400} strokeWidth={1.75} />
      )}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={labelPlaceholder}
        placeholderTextColor={colors.neutral400}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        className="flex-1 font-inter text-sm text-neutral-900"
        style={{ height: sizes.searchBar, paddingVertical: 0 }}
        accessibilityLabel={teks.judul.search}
        maxFontSizeMultiplier={1.3}
      />

      {adaIsi ? (
        <Pressable
          onPress={() => {
            onChangeText("");
            inputRef.current?.focus();
          }}
          accessibilityRole="button"
          accessibilityLabel={teks.a11y.hapusPencarian}
          hitSlop={sizes.hitSlop}
          className="items-center justify-center"
          style={{ width: 32, height: 44 }}
        >
          <X size={18} color={colors.neutral500} strokeWidth={2} />
        </Pressable>
      ) : tanpaAksiSuara ? null : (
        <View className="flex-row items-center">
          <Pressable
            onPress={onPressMic}
            accessibilityRole="button"
            accessibilityLabel="Pencarian suara"
            hitSlop={sizes.hitSlop}
            className="items-center justify-center"
            style={{ width: 32, height: 44 }}
          >
            <Mic size={18} color={colors.neutral500} strokeWidth={1.75} />
          </Pressable>
          <Pressable
            onPress={onPressCamera}
            accessibilityRole="button"
            accessibilityLabel="Pencarian dengan kamera"
            hitSlop={sizes.hitSlop}
            className="items-center justify-center"
            style={{ width: 32, height: 44 }}
          >
            <Camera size={18} color={colors.neutral500} strokeWidth={1.75} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default SearchBar;
