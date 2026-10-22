import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBar } from "../../components/layout/AppBar";

export type AuthShellProps = {
  /** Judul Title (24/30) — dirender AppBar varian auth. */
  judul?: string;
  subjudul?: string;
  onBack?: () => void;
  children: ReactNode;
  /** Blok menempel di bawah (CTA tunggal + teks navigasi akun). */
  footer?: ReactNode;
  /** Nonaktifkan scroll (layar pendek seperti OTP). */
  scroll?: boolean;
  className?: string;
};

/**
 * Kerangka layar auth Zovora — guideline §4 "Pola layar auth".
 * Margin horizontal 24, judul Title + subjudul Small neutral-500 di kiri atas,
 * KeyboardAvoidingView sehingga CTA tunggal ikut naik di atas keyboard,
 * dan area footer yang menempel di atas safe area bawah.
 */
export function AuthShell({
  judul,
  subjudul,
  onBack,
  children,
  footer,
  scroll = true,
  className = "",
}: AuthShellProps) {
  const insets = useSafeAreaInsets();

  const isi = (
    <>
      <View className="flex-1 px-6 pt-4">{children}</View>

      {footer ? (
        <View className="px-6 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <View className={`flex-1 bg-white ${className}`} style={{ paddingTop: insets.top }}>
      {judul ? (
        <AppBar
          variant="auth"
          title={judul}
          subtitle={subjudul}
          showBack={!!onBack}
          onBack={onBack}
        />
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        className="flex-1"
      >
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isi}
          </ScrollView>
        ) : (
          <View className="flex-1">{isi}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export default AuthShell;
