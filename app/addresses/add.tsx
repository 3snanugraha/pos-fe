import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StickyBar } from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button, Dialog } from "../../src/components/ui";
import {
  FORM_ALAMAT_KOSONG,
  FormAlamat,
  ScrollFormAlamat,
  ikonSimpanAlamat,
  validasiAlamat,
} from "../../src/components/akun/FormAlamat";
import { teks } from "../../src/lib/i18n";
import { apiService } from "../../services/apiService";
import type { AddressCreateData } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

/**
 * Tambah Alamat Zovora — guideline §3.2 (form) + §5.
 *
 * Field memakai `Input` W1 dengan validasi saat submit (pesan error per field,
 * danger-700). Payload ke `addCustomerAddress` sama persis dengan versi lama;
 * keberhasilan ditampilkan lewat `Dialog` lalu kembali ke daftar alamat.
 */
export default function AddAddressScreen() {
  const router = useRouter();
  const [form, setForm] = useState<AddressCreateData>({ ...FORM_ALAMAT_KOSONG });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<{ judul: string; isi: string; sukses: boolean } | null>(
    null
  );

  const ubah = (field: keyof AddressCreateData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (galat[field]) {
      setGalat((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const simpan = async () => {
    const hasil = validasiAlamat(form);
    setGalat(hasil);
    if (Object.keys(hasil).length > 0) {
      setPesan({
        judul: teks.umum.gagal,
        isi: teks.alamat.validasi.lengkapi,
        sukses: false,
      });
      return;
    }

    setMenyimpan(true);
    try {
      await apiService.addCustomerAddress(form);
      setPesan({
        judul: teks.umum.berhasil,
        isi: teks.alamat.berhasilTambah,
        sukses: true,
      });
    } catch (err: any) {
      console.error("Error adding address:", err);
      const isAuthError = await handleAuthError(err);
      if (!isAuthError) {
        setPesan({
          judul: teks.umum.gagal,
          isi: getErrorMessage(err),
          sukses: false,
        });
      }
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <AppBar title={teks.alamat.tambah} onBack={() => router.back()} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollFormAlamat>
          <FormAlamat nilai={form} onUbah={ubah} galat={galat} disabled={menyimpan} />
        </ScrollFormAlamat>

        <StickyBar>
          <Button
            title={menyimpan ? teks.alamat.menyimpan : teks.alamat.simpan}
            icon={ikonSimpanAlamat}
            loading={menyimpan}
            fullWidth
            onPress={simpan}
          />
        </StickyBar>
      </KeyboardAvoidingView>

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
