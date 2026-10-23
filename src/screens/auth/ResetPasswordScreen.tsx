import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Input } from "../../components/ui";
import { teks } from "../../lib/i18n";
import { simpanPasswordBaru } from "../../../services/passwordReset";
import { AuthShell } from "./AuthShell";
import { validasiKonfirmasi, validasiPassword } from "./validasi";
import { kembaliAman } from "../../../src/lib/navigasi";

/**
 * Reset Password Zovora — guideline §4 (satu CTA).
 * Input password baru + konfirmasi, error per field. Memakai `reset_token`
 * yang dibawa dari layar verifikasi kode.
 */
export function ResetPasswordScreen() {
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/auth/login");
  const params = useLocalSearchParams<{ email?: string; reset_token?: string }>();
  const email = (params.email ?? "").toString();
  const resetToken = (params.reset_token ?? "").toString();

  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [error, setError] = useState<{ password?: string; konfirmasi?: string }>({});
  const [pesan, setPesan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const simpan = async () => {
    const err = {
      password: validasiPassword(password),
      konfirmasi: validasiKonfirmasi(konfirmasi, password),
    };
    setError(err);
    if (err.password || err.konfirmasi) return;

    setPesan(null);
    setLoading(true);
    try {
      const hasil = await simpanPasswordBaru({
        email,
        resetToken,
        password,
        konfirmasi,
      });

      if (hasil.ok) {
        router.replace("/auth/login");
        return;
      }

      if (hasil.kode === "validasi") {
        setError({
          password: hasil.errors?.password?.[0],
          konfirmasi: hasil.errors?.password_confirmation?.[0],
        });
        if (!hasil.errors?.password && !hasil.errors?.password_confirmation) {
          setPesan(hasil.message ?? teks.error.umum);
        }
        return;
      }

      setPesan(
        hasil.kode === "tidak_tersedia"
          ? teks.error.fiturBelumTersedia
          : hasil.kode === "jaringan"
            ? teks.error.jaringan
            : (hasil.message ?? teks.error.umum),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      onBack={kembali}
      judul={teks.judul.resetPassword}
      subjudul={teks.subjudul.resetPassword}
      footer={
        <Button
          title={teks.tombol.resetPassword}
          onPress={simpan}
          loading={loading}
          loadingText={teks.umum.memuat}
          fullWidth
        />
      }
    >
      <View className="gap-4">
        <Input
          label={teks.field.passwordBaru}
          placeholder={teks.placeholder.passwordBaru}
          helper={teks.auth.kataSandiLemah}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (error.password) setError((e) => ({ ...e, password: undefined }));
          }}
          error={error.password}
          password
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          editable={!loading}
        />
        <Input
          label={teks.field.konfirmasiPassword}
          placeholder={teks.placeholder.konfirmasiPassword}
          value={konfirmasi}
          onChangeText={(v) => {
            setKonfirmasi(v);
            if (error.konfirmasi) setError((e) => ({ ...e, konfirmasi: undefined }));
          }}
          error={error.konfirmasi}
          password
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={simpan}
          editable={!loading}
        />

        {pesan ? (
          <View className="rounded-md border border-danger-500 bg-danger-50 p-3">
            <Text className="font-inter text-xs text-danger-700" accessibilityLiveRegion="polite">
              {pesan}
            </Text>
          </View>
        ) : null}
      </View>
    </AuthShell>
  );
}

export default ResetPasswordScreen;
