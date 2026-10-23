import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Input } from "../../components/ui";
import { teks } from "../../lib/i18n";
import { register } from "../../../services/auth";
import { AuthShell } from "./AuthShell";
import { kembaliAman } from "../../../src/lib/navigasi";
import {
  validasiEmail,
  validasiKonfirmasi,
  validasiPassword,
  validasiTelepon,
  validasiWajib,
} from "./validasi";

type ErrorField = {
  nama_pelanggan?: string;
  telepon?: string;
  email?: string;
  password?: string;
  konfirmasi?: string;
};

/**
 * Create Account Zovora — guideline §4.
 * Input nama, telepon, email, password, konfirmasi (semua wajib di backend
 * kecuali alamat). Satu CTA primary. Tanpa divider/social karena backend
 * pelanggan tidak punya OAuth.
 */
export function SignUpScreen() {
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/auth/login");
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [error, setError] = useState<ErrorField>({});
  const [pesanUmum, setPesanUmum] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const kirim = async () => {
    const err: ErrorField = {
      nama_pelanggan: validasiWajib(nama, teks.field.namaLengkap),
      telepon: validasiTelepon(telepon),
      email: validasiEmail(email),
      password: validasiPassword(password),
      konfirmasi: validasiKonfirmasi(konfirmasi, password),
    };
    setError(err);
    if (Object.values(err).some(Boolean)) return;

    setPesanUmum(null);
    setLoading(true);
    try {
      const hasil = await register({
        nama_pelanggan: nama.trim(),
        telepon: telepon.trim(),
        email: email.trim(),
        password,
        alamat: "",
      });

      if (hasil.success) {
        router.replace("/(tabs)");
        return;
      }

      if (hasil.errors) {
        setError({
          nama_pelanggan: hasil.errors.nama_pelanggan?.[0],
          telepon: hasil.errors.telepon?.[0],
          email: hasil.errors.email?.[0],
          password: hasil.errors.password?.[0],
        });
        if (!Object.values(hasil.errors).flat().length) {
          setPesanUmum(hasil.message ?? teks.error.umum);
        }
      } else {
        setPesanUmum(hasil.message ?? teks.error.umum);
      }
    } catch {
      setPesanUmum(teks.error.jaringan);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      onBack={kembali}
      judul={teks.judul.signUp}
      subjudul={teks.subjudul.signUp}
      footer={
        <View className="items-center">
          <View className="flex-row items-center gap-1">
            <Text className="font-inter text-sm text-neutral-500">
              {teks.auth.sudahPunyaAkun}
            </Text>
            <Pressable
              onPress={() => router.replace("/auth/login")}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text className="font-inter-medium text-sm text-primary-700">
                {teks.auth.masukSekarang}
              </Text>
            </Pressable>
          </View>
        </View>
      }
    >
      {/* AuthShell sudah membungkus ScrollView — jangan sarang ScrollView lain
          (gestur scroll bertabrakan di iOS/Android). */}
      <View style={{ gap: 16, paddingBottom: 16 }}>
        <Input
          label={teks.field.namaLengkap}
          placeholder={teks.placeholder.nama}
          value={nama}
          onChangeText={(v) => {
            setNama(v);
            if (error.nama_pelanggan) setError((e) => ({ ...e, nama_pelanggan: undefined }));
          }}
          error={error.nama_pelanggan}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          editable={!loading}
        />
        <Input
          label={teks.field.telepon}
          placeholder={teks.placeholder.telepon}
          value={telepon}
          onChangeText={(v) => {
            setTelepon(v);
            if (error.telepon) setError((e) => ({ ...e, telepon: undefined }));
          }}
          error={error.telepon}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          editable={!loading}
        />
        <Input
          label={teks.field.email}
          placeholder={teks.placeholder.email}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error.email) setError((e) => ({ ...e, email: undefined }));
          }}
          error={error.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!loading}
        />
        <Input
          label={teks.field.password}
          placeholder={teks.placeholder.passwordBaru}
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
          editable={!loading}
        />

        {pesanUmum ? (
          <Text className="font-inter text-xs text-danger-700" accessibilityLiveRegion="polite">
            {pesanUmum}
          </Text>
        ) : null}

        <Text className="font-inter text-caption text-neutral-500">
          {teks.auth.syaratKetentuan}
        </Text>

        <Button
          title={teks.tombol.daftar}
          onPress={kirim}
          loading={loading}
          loadingText={teks.umum.memuat}
          fullWidth
        />
      </View>
    </AuthShell>
  );
}

export default SignUpScreen;
