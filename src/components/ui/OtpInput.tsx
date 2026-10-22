import { useEffect, useRef, useState } from "react";
import {
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";

export type OtpInputProps = {
  /** Panjang kode (default 4 sesuai guideline §3.3). */
  length?: number;
  value: string;
  onChange: (kode: string) => void;
  /** Dipanggil saat semua kotak terisi. */
  onComplete?: (kode: string) => void;
  /** Semua kotak bergaris danger-500 saat kode salah. */
  error?: string;
  autoFocus?: boolean;
  editable?: boolean;
  accessibilityLabel?: string;
};

/**
 * OTP Zovora — guideline §3.3.
 * Empat kotak 48×48 gap 12 terpusat, radius md, border neutral-200; kotak aktif
 * border primary-500; digit Heading (20/26). Auto-advance, auto-backspace,
 * dukungan paste (tempel 4 digit sekaligus) dan `textContentType=oneTimeCode`.
 */
export function OtpInput({
  length = 4,
  value,
  onChange,
  onComplete,
  error,
  autoFocus = false,
  editable = true,
  accessibilityLabel = teks.judul.verifyCode,
}: OtpInputProps) {
  const [fokus, setFokus] = useState(autoFocus ? 0 : -1);
  const refs = useRef<(TextInput | null)[]>([]);
  const digit = value.padEnd(length, " ").slice(0, length).split("");
  const selesaiRef = useRef(false);

  useEffect(() => {
    if (value.length === length && !selesaiRef.current) {
      selesaiRef.current = true;
      onComplete?.(value);
    }
    if (value.length < length) selesaiRef.current = false;
  }, [value, length, onComplete]);

  /** Tangani input: bisa 1 digit (ketik) atau banyak (paste). */
  const terimaTeks = (teksInput: string, index: number) => {
    const bersih = teksInput.replace(/\D/g, "");
    if (!bersih) {
      const arr = value.split("");
      arr[index] = "";
      onChange(arr.join("").replace(/\s/g, ""));
      return;
    }

    if (bersih.length > 1) {
      // Paste: isi dari kotak saat ini lalu lanjut.
      const arr = value.padEnd(length, " ").split("");
      for (let i = 0; i < bersih.length && index + i < length; i += 1) {
        arr[index + i] = bersih[i];
      }
      const next = arr.join("").replace(/\s+$/g, "").replace(/ /g, "");
      onChange(next.slice(0, length));
      const target = Math.min(index + bersih.length, length - 1);
      setFokus(target);
      refs.current[target]?.focus();
      return;
    }

    const arr = value.padEnd(length, " ").split("");
    arr[index] = bersih;
    const next = arr.join("").replace(/ /g, "");
    onChange(next.slice(0, length));
    if (index < length - 1) {
      setFokus(index + 1);
      refs.current[index + 1]?.focus();
    }
  };

  const onKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key !== "Backspace") return;
    if (digit[index] && digit[index] !== " ") return;
    if (index > 0) {
      const arr = value.padEnd(length, " ").split("");
      arr[index - 1] = " ";
      onChange(arr.join("").replace(/ /g, ""));
      setFokus(index - 1);
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View className="items-center gap-3">
      <View className="flex-row justify-center" style={{ gap: 12 }}>
        {Array.from({ length }).map((_, i) => {
          const isi = digit[i]?.trim() ?? "";
          const aktif = fokus === i;
          const border = error
            ? "border-danger-500"
            : aktif
              ? "border-primary-500"
              : isi
                ? "border-neutral-300"
                : "border-neutral-200";
          return (
            <TextInput
              key={`otp-${i}`}
              ref={(r) => {
                refs.current[i] = r;
              }}
              value={isi}
              onChangeText={(txt) => terimaTeks(txt, i)}
              onKeyPress={(e) => onKeyPress(e, i)}
              onFocus={() => setFokus(i)}
              onBlur={() => setFokus((f) => (f === i ? -1 : f))}
              editable={editable}
              autoFocus={autoFocus && i === 0}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={length}
              selectTextOnFocus
              accessibilityLabel={
                accessibilityLabel
                  ? `${accessibilityLabel}, ${teks.a11y.kodeOtp.replace("{index}", String(i + 1))}`
                  : teks.a11y.kodeOtp.replace("{index}", String(i + 1))
              }
              className={`font-inter-semibold text-xl text-neutral-900 text-center rounded-md border ${border} ${editable ? "bg-white" : "bg-neutral-100"}`}
              style={{
                width: sizes.input,
                height: sizes.input,
                paddingVertical: 0,
                textAlign: "center",
              }}
              placeholderTextColor={colors.neutral300}
            />
          );
        })}
      </View>
      {error ? (
        <Text className="font-inter text-xs text-danger-700" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default OtpInput;
