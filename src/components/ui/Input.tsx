import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInput as RNTextInput,
  type TextInputProps,
} from "react-native";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";

export type InputProps = TextInputProps & {
  label: string;
  /** Pesan error — dirender Small danger-700 (guideline §7). */
  error?: string;
  /** Teks bantuan di bawah field saat tidak ada error. */
  helper?: string;
  /** Tampilkan toggle eye/eye-off dan set secureTextEntry. */
  password?: boolean;
  /** Ikon di kiri field. */
  icon?: React.ReactNode;
  containerClassName?: string;
  inputRef?: React.Ref<RNTextInput>;
};

/**
 * Input Zovora — guideline §3.2.
 * Tinggi 48, radius md, border neutral-200; fokus border primary-500 +
 * ring 2pt primary-100; error border danger-500 dengan pesan danger-700.
 * Label Body medium neutral-900, jarak 6 ke field.
 */
export function Input({
  label,
  error,
  helper,
  password = false,
  icon,
  containerClassName = "",
  inputRef,
  onFocus,
  onBlur,
  editable = true,
  className = "",
  ...rest
}: InputProps) {
  const [tersembunyi, setTersembunyi] = useState(password);
  const [fokus, setFokus] = useState(false);

  const border = error
    ? "border-danger-500"
    : fokus
      ? "border-primary-500"
      : "border-neutral-200";
  const disabledCls = editable === false ? "bg-neutral-100" : "bg-white";
  const inputTextCls = editable === false ? "text-neutral-400" : "text-neutral-900";

  return (
    <View className={`gap-1.5 ${containerClassName}`}>
      <Text className="font-inter-medium text-sm text-neutral-900">{label}</Text>
      <View
        className={`flex-row items-center gap-2 rounded-md border px-3 ${border} ${disabledCls}`}
        style={{ height: sizes.input }}
      >
        {icon}
        <TextInput
          ref={inputRef}
          {...rest}
          className={`flex-1 font-inter text-sm ${inputTextCls} ${className}`}
          style={{ height: sizes.input - 2 }}
          secureTextEntry={password ? tersembunyi : rest.secureTextEntry}
          placeholderTextColor={colors.neutral400}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          onFocus={(e) => {
            setFokus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFokus(false);
            onBlur?.(e);
          }}
        />
        {password ? (
          <Pressable
            hitSlop={sizes.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={
              tersembunyi ? teks.a11y.tampilkanPassword : teks.a11y.sembunyikanPassword
            }
            onPress={() => setTersembunyi((v) => !v)}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            {tersembunyi ? (
              <EyeOff size={20} color={colors.neutral400} strokeWidth={1.75} />
            ) : (
              <Eye size={20} color={colors.neutral400} strokeWidth={1.75} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="font-inter text-xs text-danger-700" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text className="font-inter text-xs text-neutral-500">{helper}</Text>
      ) : null}
    </View>
  );
}

export default Input;
