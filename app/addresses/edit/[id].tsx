import { MapPin } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Skeleton, StickyBar } from "../../../src/components/commerce";
import { AppBar } from "../../../src/components/layout";
import { Button, Dialog, EmptyState } from "../../../src/components/ui";
import { kembaliAman } from "../../../src/lib/navigasi";
import {
  FORM_ALAMAT_KOSONG,
  FormAlamat,
  ScrollFormAlamat,
  ikonSimpanAlamat,
  validasiAlamat,
} from "../../../src/components/akun/FormAlamat";
import { teks } from "../../../src/lib/i18n";
import { colors } from "../../../src/theme/tokens";
import { apiService } from "../../../services/apiService";
import type { AddressCreateData, CustomerAddress } from "../../../services/types";
import { getErrorMessage, handleAuthError } from "../../../utils/auth";

/**
 * Ubah Alamat Zovora — guideline §3.2 (form) + §5.
 *
 * Memuat seluruh alamat lalu memilih yang sesuai `id` (endpoint detail tidak
 * tersedia di backend), sama seperti versi lama. Form, validasi, dan payload
 * `updateCustomerAddress` identik; hanya tampilan yang berubah.
 */
export default function EditAddressScreen() {
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/addresses");
  const { id } = useLocalSearchParams<{ id: string }>();
  const [alamat, setAlamat] = useState<CustomerAddress | null>(null);
  const [form, setForm] = useState<AddressCreateData>({ ...FORM_ALAMAT_KOSONG });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [memuat, setMemuat] = useState(true);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<{ judul: string; isi: string; sukses: boolean } | null>(
    null
  );

  const muat = useCallback(async () => {
    if (!id) return { alamat: null as CustomerAddress | null, galat: teks.error.muatGagal };
    try {
      const daftar = await apiService.getCustomerAddresses();
      const target = daftar.find((a) => a.id === parseInt(id, 10)) ?? null;
      return { alamat: target, galat: target ? null : teks.alamat.tidakDitemukan.deskripsi };
    } catch (err: any) {
      console.error("Error loading address:", err);
      const isAuthError = await handleAuthError(err);
      return {
        alamat: null as CustomerAddress | null,
        galat: isAuthError ? null : getErrorMessage(err),
      };
    }
  }, [id]);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const hasil = await muat();
      if (!aktif) return;
      setAlamat(hasil.alamat);
      setGalatMuat(hasil.galat);
      if (hasil.alamat) {
        setForm({
          label: hasil.alamat.label || "",
          nama_penerima: hasil.alamat.nama_penerima || hasil.alamat.penerima || "",
          telepon_penerima: hasil.alamat.telepon_penerima || "",
          alamat_lengkap: hasil.alamat.alamat_lengkap || "",
          kota: hasil.alamat.kota || "",
          provinsi: hasil.alamat.provinsi || "",
          kode_pos: hasil.alamat.kode_pos || "",
          is_default: hasil.alamat.is_default || false,
        });
      }
      setMemuat(false);
    })();
    return () => {
      aktif = false;
    };
  }, [muat]);

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
    if (!alamat) return;
    const hasil = validasiAlamat(form);
    setGalat(hasil);
    if (Object.keys(hasil).length > 0) {
      setPesan({ judul: teks.umum.gagal, isi: teks.alamat.validasi.lengkapi, sukses: false });
      return;
    }

    setMenyimpan(true);
    try {
      await apiService.updateCustomerAddress(alamat.id, form);
      setPesan({ judul: teks.umum.berhasil, isi: teks.alamat.berhasilUbah, sukses: true });
    } catch (err: any) {
      console.error("Error updating address:", err);
      const isAuthError = await handleAuthError(err);
      if (!isAuthError) {
        setPesan({ judul: teks.umum.gagal, isi: getErrorMessage(err), sukses: false });
      }
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <AppBar title={teks.tombol.ubahAlamat} onBack={kembali} />

      {memuat ? (
        <View className="flex-1 px-4 pt-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} className="mb-4">
              <Skeleton height={12} width={96} className="mb-1.5" />
              <Skeleton height={48} width="100%" />
            </View>
          ))}
        </View>
      ) : galatMuat && !alamat ? (
        <ErrorState
          pesan={galatMuat}
          judul={teks.alamat.tidakDitemukan.judul}
          onRetry={() => {
            setMemuat(true);
            void muat().then((hasil) => {
              setAlamat(hasil.alamat);
              setGalatMuat(hasil.galat);
              setMemuat(false);
            });
          }}
        />
      ) : !alamat ? (
        <EmptyState
          icon={<MapPin size={36} color={colors.primary600} strokeWidth={1.75} />}
          title={teks.alamat.tidakDitemukan.judul}
          description={teks.alamat.tidakDitemukan.deskripsi}
          ctaLabel={teks.pesanan.kembaliRiwayat}
          onCtaPress={kembali}
        />
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollFormAlamat>
            <FormAlamat nilai={form} onUbah={ubah} galat={galat} disabled={menyimpan} />
          </ScrollFormAlamat>

          <StickyBar>
            <Button
              title={menyimpan ? teks.alamat.menyimpan : teks.tombol.simpanPerubahan}
              icon={ikonSimpanAlamat}
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
          if (sukses) kembali();
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
              if (sukses) kembali();
            }}
          />
        }
      />
    </SafeAreaView>
  );
}
