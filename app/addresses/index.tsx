import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Skeleton, StickyBar } from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button, Dialog, EmptyState } from "../../src/components/ui";
import { teks } from "../../src/lib/i18n";
import { colors, sizes } from "../../src/theme/tokens";
import { apiService } from "../../services/apiService";
import type { CustomerAddress } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

const alamatLengkap = (a: CustomerAddress) =>
  [
    a.alamat_lengkap,
    [a.kota, a.provinsi].filter(Boolean).join(", "),
    a.kode_pos,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * Daftar Alamat Pengiriman Zovora — guideline §3.13 (kartu alamat) + §5.
 *
 * Tiap kartu: label + badge "Alamat Utama" (ikon bintang, bukan warna saja),
 * nama penerima, telepon, alamat multi-baris, lalu aksi teks "Jadikan Utama" /
 * "Ubah" / "Hapus" (target 44). Aksi hanya lewat `Dialog` konfirmasi, tidak
 * memakai `Alert` (callback Alert tidak jalan di web). Tombol tambah berada di
 * sticky bar sebagai satu-satunya CTA primary layar.
 */
export default function AddressListScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState<number | null>(null);
  const [hapusTarget, setHapusTarget] = useState<CustomerAddress | null>(null);
  const [pesan, setPesan] = useState<{ judul: string; isi: string } | null>(null);

  const ambilAlamat = useCallback(async () => {
    try {
      const data = await apiService.getCustomerAddresses();
      return { baris: Array.isArray(data) ? data : [], galat: null };
    } catch (err: any) {
      console.error("Error loading addresses:", err);
      const isAuthError = await handleAuthError(err);
      return {
        baris: [] as CustomerAddress[],
        galat: isAuthError ? null : getErrorMessage(err),
      };
    }
  }, []);

  /**
   * Muat ulang daftar setiap layar difokuskan kembali.
   *
   * Sebelumnya hanya `useEffect` saat mount: setelah "Ubah" alamat, layar form
   * memanggil `router.back()` dan daftar tetap menampilkan data lama (cache
   * AsyncStorage masih menyimpan versi sebelum perubahan) sampai aplikasi
   * di-reload. `useFocusEffect` memastikan data diambil ulang saat kembali.
   */
  useFocusEffect(
    useCallback(() => {
      let aktif = true;
      (async () => {
        const hasil = await ambilAlamat();
        if (!aktif) return;
        setAddresses(hasil.baris);
        setError(hasil.galat);
        setLoading(false);
      })();
      return () => {
        aktif = false;
      };
    }, [ambilAlamat])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const hasil = await ambilAlamat();
    setAddresses(hasil.baris);
    setError(hasil.galat);
    setRefreshing(false);
  };

  const muatUlang = async () => {
    setLoading(true);
    const hasil = await ambilAlamat();
    setAddresses(hasil.baris);
    setError(hasil.galat);
    setLoading(false);
  };

  const jadikanUtama = async (alamat: CustomerAddress) => {
    if (alamat.is_default || menyimpan !== null) return;
    setMenyimpan(alamat.id);
    try {
      await apiService.updateCustomerAddress(alamat.id, { is_default: true });
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === alamat.id }))
      );
      setPesan({
        judul: teks.umum.berhasil,
        isi: teks.alamat.berhasilUtama.replace("{label}", alamat.label),
      });
    } catch (err: any) {
      console.error("Error setting default address:", err);
      setPesan({ judul: teks.umum.gagal, isi: teks.alamat.gagalUtama });
    } finally {
      setMenyimpan(null);
    }
  };

  const konfirmasiHapus = (alamat: CustomerAddress) => {
    if (alamat.is_default) {
      setPesan({ judul: teks.umum.gagal, isi: teks.alamat.utamaTidakBisaDihapus });
      return;
    }
    setHapusTarget(alamat);
  };

  const hapus = async () => {
    if (!hapusTarget) return;
    const target = hapusTarget;
    setMenyimpan(target.id);
    try {
      await apiService.deleteCustomerAddress(target.id);
      setAddresses((prev) => prev.filter((a) => a.id !== target.id));
      setHapusTarget(null);
      setPesan({ judul: teks.umum.berhasil, isi: teks.alamat.berhasilHapus });
    } catch (err: any) {
      console.error("Error deleting address:", err);
      setHapusTarget(null);
      setPesan({ judul: teks.umum.gagal, isi: teks.alamat.gagalHapus });
    } finally {
      setMenyimpan(null);
    }
  };

  const judul = loading
    ? teks.alamat.judul
    : addresses.length > 0
      ? teks.alamat.judulDenganJumlah.replace("{jumlah}", String(addresses.length))
      : teks.alamat.judul;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar title={judul} onBack={() => router.back()} />

      {loading ? (
        <View className="flex-1 px-4 pt-4">
          {[0, 1].map((i) => (
            <View
              key={i}
              className="mb-3 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <Skeleton height={14} width="35%" />
              <Skeleton height={12} width="55%" className="mt-2" />
              <Skeleton height={12} width="80%" className="mt-2" />
              <Skeleton height={12} width="70%" className="mt-1.5" />
              <Skeleton height={16} width="45%" className="mt-4" />
            </View>
          ))}
        </View>
      ) : error && addresses.length === 0 ? (
        <ErrorState pesan={error} onRetry={muatUlang} />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin size={36} color={colors.primary600} strokeWidth={1.75} />}
          title={teks.empty.alamat.judul}
          description={teks.empty.alamat.deskripsi}
          ctaLabel={teks.empty.alamat.cta}
          onCtaPress={() => router.push("/addresses/add")}
        />
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary600]}
                tintColor={colors.primary600}
              />
            }
          >
            {error ? (
              <View className="mb-3">
                <ErrorState pesan={error} onRetry={muatUlang} kompak />
              </View>
            ) : null}

            {addresses.map((alamat) => {
              const sibuk = menyimpan === alamat.id;
              return (
                <View
                  key={alamat.id}
                  className="mb-3 overflow-hidden rounded-lg border border-neutral-200 bg-white"
                >
                  <View className="p-4">
                    <View className="mb-2 flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text
                            className="font-inter-semibold text-sm text-neutral-900"
                            maxFontSizeMultiplier={1.3}
                          >
                            {alamat.label}
                          </Text>
                          {alamat.is_default ? (
                            <View className="flex-row items-center gap-1 rounded-full bg-success-100 px-2 py-0.5">
                              <Star
                                size={10}
                                color={colors.success700}
                                fill={colors.success700}
                                strokeWidth={0}
                              />
                              <Text
                                className="font-inter-medium text-caption text-success-700"
                                maxFontSizeMultiplier={1.3}
                              >
                                {teks.alamat.utama}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text
                          className="mt-1 font-inter-medium text-sm text-neutral-900"
                          maxFontSizeMultiplier={1.3}
                        >
                          {alamat.nama_penerima || alamat.penerima}
                        </Text>
                        <Text
                          className="font-inter text-sm text-neutral-500 tabular-nums"
                          maxFontSizeMultiplier={1.3}
                        >
                          {alamat.telepon_penerima}
                        </Text>
                        <Text
                          className="mt-1 font-inter text-sm text-neutral-700"
                          maxFontSizeMultiplier={1.3}
                        >
                          {alamatLengkap(alamat)}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => router.push(`/addresses/edit/${alamat.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`${teks.umum.ubah} ${alamat.label}`}
                        hitSlop={sizes.hitSlop}
                        className="items-center justify-center rounded-md active:bg-neutral-100"
                        style={{ width: sizes.minTouchTarget, height: sizes.minTouchTarget }}
                      >
                        <Pencil size={20} color={colors.primary700} strokeWidth={1.75} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Aksi baris — teks primary-700 / danger-700, target 44. */}
                  <View className="flex-row items-center gap-2 border-t border-neutral-100 px-2 py-1">
                    {!alamat.is_default ? (
                      <Pressable
                        onPress={() => jadikanUtama(alamat)}
                        disabled={sibuk}
                        accessibilityRole="button"
                        accessibilityLabel={`${teks.alamat.jadikanUtama} ${alamat.label}`}
                        accessibilityState={{ disabled: sibuk, busy: sibuk }}
                        className={`min-h-[44px] flex-1 items-center justify-center rounded-md active:bg-primary-50 ${
                          sibuk ? "opacity-50" : ""
                        }`}
                      >
                        <Text
                          className="font-inter-medium text-xs text-primary-700"
                          maxFontSizeMultiplier={1.3}
                        >
                          {teks.alamat.jadikanUtama}
                        </Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      onPress={() => router.push(`/addresses/edit/${alamat.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`${teks.umum.ubah} ${alamat.label}`}
                      className="min-h-[44px] flex-1 items-center justify-center rounded-md active:bg-neutral-100"
                    >
                      <Text
                        className="font-inter-medium text-xs text-neutral-700"
                        maxFontSizeMultiplier={1.3}
                      >
                        {teks.umum.ubah}
                      </Text>
                    </Pressable>

                    {!alamat.is_default ? (
                      <Pressable
                        onPress={() => konfirmasiHapus(alamat)}
                        disabled={sibuk}
                        accessibilityRole="button"
                        accessibilityLabel={`${teks.umum.hapus} ${alamat.label}`}
                        accessibilityState={{ disabled: sibuk }}
                        className={`min-h-[44px] flex-1 items-center justify-center rounded-md active:bg-danger-50 ${
                          sibuk ? "opacity-50" : ""
                        }`}
                      >
                        <View className="flex-row items-center gap-1">
                          <Trash2 size={14} color={colors.danger700} strokeWidth={1.75} />
                          <Text
                            className="font-inter-medium text-xs text-danger-700"
                            maxFontSizeMultiplier={1.3}
                          >
                            {teks.umum.hapus}
                          </Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Satu CTA primary layar. */}
          <StickyBar>
            <Button
              title={teks.alamat.tambahBaru}
              icon={<Plus size={20} color={colors.white} strokeWidth={1.75} />}
              fullWidth
              onPress={() => router.push("/addresses/add")}
            />
          </StickyBar>
        </>
      )}

      {/* Konfirmasi hapus */}
      <Dialog
        visible={hapusTarget !== null}
        onClose={() => setHapusTarget(null)}
        title={teks.alamat.dialogHapus.judul}
        description={teks.alamat.dialogHapus.deskripsi.replace(
          "{label}",
          hapusTarget?.label ?? ""
        )}
        actions={
          <>
            <Button
              title={teks.umum.batal}
              variant="outline"
              size="md"
              className="flex-1"
              onPress={() => setHapusTarget(null)}
            />
            <Button
              title={teks.umum.hapus}
              size="md"
              className="flex-1"
              loading={menyimpan !== null}
              onPress={hapus}
            />
          </>
        }
      />

      {/* Umpan balik aksi */}
      <Dialog
        visible={pesan !== null}
        onClose={() => setPesan(null)}
        title={pesan?.judul}
        description={pesan?.isi}
        actions={
          <Button
            title={teks.umum.tutup}
            variant="outline"
            size="md"
            className="flex-1"
            onPress={() => setPesan(null)}
          />
        }
      />
    </SafeAreaView>
  );
}
