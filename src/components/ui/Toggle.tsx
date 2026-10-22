import { Pressable, View } from "react-native";
import { colors, sizes } from "../../theme/tokens";

export type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  /** Label aksesibilitas — wajib karena tidak ada teks di dalam kontrol. */
  accessibilityLabel: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Toggle Zovora — kontrol sakelar untuk opsi checkout (split payment, poin).
 * Track 48×28 `rounded-full` (primary-600 aktif / neutral-300 nonaktif) dengan
 * knob putih 20. Target sentuh diperluas ke 44 pt lewat `hitSlop`, dan status
 * diumumkan lewat `accessibilityState.checked` (bukan warna saja, §7).
 */
export function Toggle({
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  className = "",
}: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => onChange(!value)}
      hitSlop={sizes.hitSlop}
      className={`justify-center rounded-full px-1 ${
        value ? "bg-primary-600" : "bg-neutral-300"
      } ${disabled ? "opacity-50" : ""} ${className}`}
      style={{ width: 48, height: 28 }}
    >
      <View
        className="rounded-full bg-white"
        style={{
          width: 20,
          height: 20,
          alignSelf: value ? "flex-end" : "flex-start",
          shadowColor: colors.neutral900,
          shadowOpacity: 0.12,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </Pressable>
  );
}

export default Toggle;
