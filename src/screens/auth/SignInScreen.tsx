import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { teks, t } from "../../lib/i18n";
import { Button, Input } from "../../components/ui";
import { login } from "../../../services/auth";
import { AuthShell } from "./AuthShell";
import { validasiEmail } from "./validasi";

type ErrorField = { email?: string; password?: string };

/**
 * Sign In Zovora — guideline §4 pola layar auth.
 * Input ×2 (email, password) dengan error per field, KeyboardAvoidingView,
 * link "Lupa Password?", satu CTA primary. Tombol social TIDAK dirender:
 * backend tidak menyediakan OAuth pelanggan (`routes/api.php` hanya
 * `/customer/login` + `/customer/register`).
 */
export function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ErrorField>({});
  const [pesanUmum, setPesanUmum] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const kirim = async () => {
    const errEmail = validasiEmail(email);
    const errPassword = password ? undefined : t("error.wajib", { field: teks.field.password });

    if (errEmail || errPassword) {
      setError({ email: errEmail, password: errPassword });
      setPesanUmum(null);
      return;
    }

    setError({});
    setPesanUmum(null);
    setLoading(true);
    try {
      const hasil = await login(email.trim(), password);
      if (hasil.success) {
        router.replace("/(tabs)");
        return;
      }

      // 422 dari backend: pesan per field.
      if (hasil.errors?.email) {
        setError({ email: hasil.errors.email[0] });
      } else if (hasil.errors?.password) {
        setError({ password: hasil.errors.password[0] });
      } else {
        // 401 / 403: backend hanya mengirim `message`.
        setError({ password: hasil.message || teks.error.passwordSalah });
      }
    } catch {
      setPesanUmum(teks.error.jaringan);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      judul={teks.judul.signIn}
      subjudul={teks.subjudul.signIn}
      footer={
        <View className="items-center">
          <View className="flex-row items-center gap-1">
            <Text className="font-inter text-sm text-neutral-500">
              {teks.auth.belumPunyaAkun}
            </Text>
            <Pressable
              onPress={() => router.push("/auth/register")}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text className="font-inter-medium text-sm text-primary-700">
                {teks.auth.daftarSekarang}
              </Text>
            </Pressable>
          </View>
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
            if (error.email) setError((e) => ({ ...e, email: undefined }));
          }}
          onBlur={() => setError((e) => ({ ...e, email: validasiEmail(email) }))}
          error={error.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="next"
          editable={!loading}
        />

        <View className="gap-1">
          <Input
            label={teks.field.password}
            placeholder={teks.placeholder.password}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error.password) setError((e) => ({ ...e, password: undefined }));
            }}
            onBlur={() =>
              setError((e) => ({
                ...e,
                password: password ? undefined : t("error.wajib", { field: teks.field.password }),
              }))
            }
            error={error.password}
            password
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={kirim}
            editable={!loading}
          />
          <Pressable
            onPress={() => router.push("/auth/forgot-password")}
            accessibilityRole="link"
            className="self-end py-1"
            hitSlop={8}
          >
            <Text className="font-inter-medium text-xs text-primary-700">
              {teks.tombol.lupaPassword}
            </Text>
          </Pressable>
        </View>

        {pesanUmum ? (
          <Text className="font-inter text-xs text-danger-700" accessibilityLiveRegion="polite">
            {pesanUmum}
          </Text>
        ) : null}

        <Button
          title={teks.tombol.masuk}
          onPress={kirim}
          loading={loading}
          loadingText={teks.umum.memuat}
          fullWidth
          className="mt-2"
        />
      </View>
    </AuthShell>
  );
}

export default SignInScreen;
