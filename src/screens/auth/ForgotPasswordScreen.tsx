import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Input } from "../../components/ui";
import { teks } from "../../lib/i18n";
import { mintaKodeReset } from "../../../services/passwordReset";
import { AuthShell } from "./AuthShell";
import { validasiEmail } from "./validasi";
import { kembaliAman } from "../../../src/lib/navigasi";

/**
 * Forgot Password Zovora — guideline §4 (satu CTA, AppBar auth, Input email).
 *
 * Backend: endpoint reset password pelanggan BELUM ADA (lihat
 * `services/passwordReset.ts`). Layar tetap mengirim permintaan ke kontrak yang
 * diusulkan; bila server menjawab 404/405 atau jaringan gagal, pengguna diberi
 * pesan jelas untuk menghubungi admin — tidak ada tombol mati.
 */
export function ForgotPasswordScreen() {
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/auth/login");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pesan, setPesan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const kirim = async () => {
    const err = validasiEmail(email);
    if (err) {
      setError(err);
      return;
    }
    setError(undefined);
    setPesan(null);
    setLoading(true);
    try {
      const hasil = await mintaKodeReset(email.trim());

      if (hasil.ok) {
        // Lanjut ke layar kode verifikasi dengan email sebagai parameter.
        router.push({
          pathname: "/auth/verify-code",
          params: { email: email.trim() },
        });
        return;
      }

      if (hasil.kode === "validasi" && hasil.errors?.email) {
        setError(hasil.errors.email[0]);
        return;
      }

      if (hasil.kode === "tidak_tersedia") {
        setPesan(teks.error.fiturBelumTersedia);
        return;
      }

      if (hasil.kode === "jaringan") {
        setPesan(teks.error.jaringan);
        return;
      }

      setPesan(hasil.message ?? teks.error.umum);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      onBack={kembali}
      judul={teks.judul.forgotPassword}
      subjudul={teks.subjudul.forgotPassword}
      footer={
        <View className="items-center">
          <Pressable
            onPress={() => router.replace("/auth/login")}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text className="font-inter-medium text-sm text-primary-700">
              {teks.tombol.masuk}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="gap-4">
        <Input
          label={teks.field.email}
          placeholder={teks.placeholder.email}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error) setError(undefined);
            if (pesan) setPesan(null);
          }}
          onBlur={() => setError(validasiEmail(email))}
          error={error}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={kirim}
          editable={!loading}
        />

        {pesan ? (
          <View className="rounded-md border border-danger-500 bg-danger-50 p-3">
            <Text className="font-inter text-xs text-danger-700" accessibilityLiveRegion="polite">
              {pesan}
            </Text>
          </View>
        ) : null}

        <Button
          title={teks.tombol.kirimInstruksi}
          onPress={kirim}
          loading={loading}
          loadingText={teks.umum.memuat}
          fullWidth
        />
      </View>
    </AuthShell>
  );
}

export default ForgotPasswordScreen;
