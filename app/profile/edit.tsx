import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Skeleton, StickyBar } from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button, Dialog, Input } from "../../src/components/ui";
import { teks } from "../../src/lib/i18n";
import { apiService } from "../../services/apiService";
import type { CustomerProfile } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

type Form = {
  nama_pelanggan: string;
  email: string;
  telepon: string;
  alamat: string;
  password: string;
  confirmPassword: string;
};

const FORM_KOSONG: Form = {
  nama_pelanggan: "",
  email: "",
  telepon: "",
  alamat: "",
  password: "",
  confirmPassword: "",
};

/**
 * Ubah Profil Zovora — guideline §3.2 (form) + §4 (pola form) + §5.
 *
 * Dua kartu: "Informasi Pribadi" (nama, email, telepon, alamat) dan
 * "Ubah Password" (password baru + konfirmasi, keduanya opsional). Validasi
 * per field dengan pesan danger-700 di bawah field; payload
 * `updateCustomerProfile` sama seperti versi lama (password hanya dikirim bila
 * diisi). Satu CTA primary di sticky bar.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const [form, setForm] = useState<Form>({ ...FORM_KOSONG });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [memuat, setMemuat] = useState(true);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<{ judul: string; isi: string; sukses: boolean } | null>(
    null
  );

  const ambilProfil = useCallback(async () => {
    try {
      const profil = (await apiService.getCustomerProfile()) as CustomerProfile;
      return { profil, galat: null };
    } catch (err: any) {
      console.error("Error loading profile:", err);
      const isAuthError = await handleAuthError(err);
      return {
        profil: null as CustomerProfile | null,
        galat: isAuthError ? null : getErrorMessage(err),
      };
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const hasil = await ambilProfil();
      if (!aktif) return;
      if (hasil.profil) {
        setForm({
          nama_pelanggan: hasil.profil.nama_pelanggan ?? "",
          email: hasil.profil.email ?? "",
          telepon: hasil.profil.telepon ?? "",
          alamat: hasil.profil.alamat ?? "",
          password: "",
          confirmPassword: "",
        });
      }
      setGalatMuat(hasil.galat);
      setMemuat(false);
    })();
    return () => {
      aktif = false;
    };
  }, [ambilProfil]);

  const muatUlang = async () => {
    setMemuat(true);
    const hasil = await ambilProfil();
    if (hasil.profil) {
      setForm({
        nama_pelanggan: hasil.profil.nama_pelanggan ?? "",
        email: hasil.profil.email ?? "",
        telepon: hasil.profil.telepon ?? "",
        alamat: hasil.profil.alamat ?? "",
        password: "",
        confirmPassword: "",
      });
    }
    setGalatMuat(hasil.galat);
    setMemuat(false);
  };

  const ubah = (field: keyof Form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (galat[field]) {
      setGalat((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validasi = (): Record<string, string> => {
    const hasil: Record<string, string> = {};
    if (!form.nama_pelanggan.trim()) hasil.nama_pelanggan = teks.profil.ubah.namaWajib;
    if (!form.email.trim()) hasil.email = teks.profil.ubah.emailWajib;
    if (!form.telepon.trim()) hasil.telepon = teks.profil.ubah.teleponWajib;
    if (form.password) {
      if (form.password.length < 8) hasil.password = teks.profil.ubah.passwordPendek;
      else if (form.password !== form.confirmPassword)
        hasil.confirmPassword = teks.profil.ubah.passwordTidakCocok;
    }
    return hasil;
  };

  const simpan = async () => {
    const hasil = validasi();
    setGalat(hasil);
    if (Object.keys(hasil).length > 0) {
      setPesan({ judul: teks.umum.gagal, isi: teks.profil.ubah.periksaField, sukses: false });
      return;
    }

    setMenyimpan(true);
    try {
      const data: {
        nama_pelanggan: string;
        email: string;
        telepon: string;
        alamat: string;
        password?: string;
      } = {
        nama_pelanggan: form.nama_pelanggan.trim(),
        email: form.email.trim(),
        telepon: form.telepon.trim(),
        alamat: form.alamat.trim(),
      };
      // Password hanya dikirim bila diisi (perilaku lama dipertahankan).
      if (form.password) data.password = form.password;

      await apiService.updateCustomerProfile(data);
      setPesan({ judul: teks.umum.berhasil, isi: teks.profil.ubah.berhasil, sukses: true });
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setPesan({ judul: teks.umum.gagal, isi: teks.profil.ubah.gagal, sukses: false });
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <AppBar title={teks.profil.ubah.judul} onBack={() => router.back()} />

      {memuat ? (
        <View className="flex-1 px-4 pt-4">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="mb-4">
              <Skeleton height={12} width={96} className="mb-1.5" />
              <Skeleton height={48} width="100%" />
            </View>
          ))}
        </View>
      ) : galatMuat ? (
        <ErrorState pesan={galatMuat} onRetry={muatUlang} />
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Informasi pribadi */}
            <Text
              className="mb-3 font-inter-semibold text-base text-neutral-900"
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
            >
              {teks.profil.ubah.infoPribadi}
            </Text>
            <View style={{ gap: 16 }}>
              <Input
                label={teks.field.namaLengkap}
                value={form.nama_pelanggan}
                onChangeText={(v) => ubah("nama_pelanggan", v)}
                placeholder={teks.placeholder.nama}
                error={galat.nama_pelanggan}
                autoCapitalize="words"
                autoComplete="name"
                editable={!menyimpan}
              />
              <Input
                label={teks.field.email}
                value={form.email}
                onChangeText={(v) => ubah("email", v)}
                placeholder={teks.placeholder.email}
                error={galat.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!menyimpan}
              />
              <Input
                label={teks.field.telepon}
                value={form.telepon}
                onChangeText={(v) => ubah("telepon", v)}
                placeholder={teks.placeholder.telepon}
                error={galat.telepon}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!menyimpan}
              />
              <Input
                label={teks.field.alamat}
                value={form.alamat}
                onChangeText={(v) => ubah("alamat", v)}
                placeholder={teks.field.detailAlamat}
                helper={teks.umum.opsional}
                multiline
                textAlignVertical="top"
                style={{ height: 88, paddingTop: 12 }}
                editable={!menyimpan}
              />
            </View>

            {/* Ubah password */}
            <Text
              className="mb-1 mt-6 font-inter-semibold text-base text-neutral-900"
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
            >
              {teks.profil.ubah.ubahPassword}
            </Text>
            <Text
              className="mb-3 font-inter text-xs text-neutral-500"
              maxFontSizeMultiplier={1.3}
            >
              {teks.profil.ubah.ubahPasswordDeskripsi}
            </Text>
            <View style={{ gap: 16 }}>
              <Input
                label={teks.field.passwordBaru}
                value={form.password}
                onChangeText={(v) => ubah("password", v)}
                placeholder={teks.placeholder.passwordBaru}
                error={galat.password}
                password
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!menyimpan}
              />
              <Input
                label={teks.field.konfirmasiPassword}
                value={form.confirmPassword}
                onChangeText={(v) => ubah("confirmPassword", v)}
                placeholder={teks.placeholder.konfirmasiPassword}
                error={galat.confirmPassword}
                password
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!menyimpan}
              />
            </View>
          </ScrollView>

          <StickyBar>
            <Button
              title={menyimpan ? teks.umum.memuat : teks.tombol.simpanPerubahan}
              loading={menyimpan}
              fullWidth
              onPress={simpan}
            />
          </StickyBar>
        </KeyboardAvoidingView>
      )}

      <Dialog
        visible={pesan !== null}
        onClose={() => {
          const sukses = pesan?.sukses;
          setPesan(null);
          if (sukses) router.back();
        }}
        title={pesan?.judul}
        description={pesan?.isi}
        actions={
          <Button
            title={teks.umum.selesai}
            size="md"
            className="flex-1"
            onPress={() => {
              const sukses = pesan?.sukses;
              setPesan(null);
              if (sukses) router.back();
            }}
          />
        }
      />
    </SafeAreaView>
  );
}
