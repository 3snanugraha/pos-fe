import {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  Wallet,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Skeleton } from "../src/components/commerce";
import { AppBar } from "../src/components/layout";
import { EmptyState } from "../src/components/ui";
import { rupiah } from "../src/lib/format";
import { teks } from "../src/lib/i18n";
import { colors } from "../src/theme/tokens";
import { apiService } from "../services/apiService";
import type { PaymentMethod } from "../services/types";
import { getErrorMessage, handleAuthError } from "../utils/auth";
import { buildPaymentInstruction, isTransfer, jenisLabel } from "../utils/payment";

/**
 * Ikon per jenis pembayaran (Lucide 20, primary-600) — bukan warna saja,
 * sehingga jenis metode tetap terbaca oleh pembaca layar dan pengguna
 * buta warna (§7).
 */
const ikonJenis = (jenis?: string | null) => {
  switch ((jenis ?? "").toLowerCase()) {
    case "tunai":
      return Banknote;
    case "transfer":
      return Landmark;
    case "ewallet":
      return Smartphone;
    case "kartu":
      return CreditCard;
    default:
      return Wallet;
  }
};

/**
 * Metode Pembayaran Zovora — guideline §3.14 (banner/instruksi) + §5.
 *
 * Layar ini bersifat informatif (bukan pemilih metode: pemilihan terjadi di
 * checkout). Tiap metode tampil sebagai kartu berisi nama, jenis, biaya admin,
 * nomor rekening + atas nama untuk transfer, dan instruksi pembayaran yang
 * disusun `buildPaymentInstruction()` — sumber yang sama dengan checkout.
 */
export default function PaymentMethodsScreen() {
  const router = useRouter();
  const [metode, setMetode] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ambil = useCallback(async () => {
    try {
      const daftar = await apiService.getPaymentMethods();
      return { daftar: Array.isArray(daftar) ? daftar : [], galat: null };
    } catch (err: any) {
      console.error("Error loading payment methods:", err);
      const isAuthError = await handleAuthError(err);
      return {
        daftar: [] as PaymentMethod[],
        galat: isAuthError ? null : getErrorMessage(err),
      };
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const hasil = await ambil();
      if (!aktif) return;
      setMetode(hasil.daftar);
      setError(hasil.galat);
      setLoading(false);
    })();
    return () => {
      aktif = false;
    };
  }, [ambil]);

  const onRefresh = async () => {
    setRefreshing(true);
    const hasil = await ambil();
    setMetode(hasil.daftar);
    setError(hasil.galat);
    setRefreshing(false);
  };

  const muatUlang = async () => {
    setLoading(true);
    const hasil = await ambil();
    setMetode(hasil.daftar);
    setError(hasil.galat);
    setLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar title={teks.metodeBayar.judul} onBack={() => router.back()} />

      {loading ? (
        <View className="flex-1 px-4 pt-4">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="mb-3 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <View className="flex-row items-center gap-3">
                <Skeleton width={36} height={36} radiusClassName="rounded-full" />
                <View className="flex-1">
                  <Skeleton height={14} width="55%" />
                  <Skeleton height={12} width="35%" className="mt-2" />
                </View>
              </View>
              <Skeleton height={56} radiusClassName="rounded-md" className="mt-3" />
            </View>
          ))}
        </View>
      ) : error && metode.length === 0 ? (
        <ErrorState pesan={error} onRetry={muatUlang} />
      ) : metode.length === 0 ? (
        <EmptyState
          icon={<Wallet size={36} color={colors.primary600} strokeWidth={1.75} />}
          title={teks.metodeBayar.tidakAda.judul}
          description={teks.metodeBayar.tidakAda.deskripsi}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary600]}
              tintColor={colors.primary600}
            />
          }
        >
          <Text
            className="mb-3 font-inter text-xs text-neutral-500"
            maxFontSizeMultiplier={1.3}
          >
            {teks.metodeBayar.deskripsi}
          </Text>

          {error ? (
            <View className="mb-3">
              <ErrorState pesan={error} onRetry={muatUlang} kompak />
            </View>
          ) : null}

          {metode.map((m) => {
            const Ikon = ikonJenis(m.jenis_pembayaran);
            const transfer = isTransfer(m.jenis_pembayaran);
            const instruksi = buildPaymentInstruction({
              nama_metode: m.nama_metode,
              jenis_pembayaran: m.jenis_pembayaran,
              nomor_rekening: m.nomor_rekening ?? null,
              atas_nama: m.atas_nama ?? null,
              instruksi: m.instruksi ?? null,
            });
            const biaya = Number(m.biaya_admin) || 0;
            const persen = Number(m.persentase_biaya) || 0;

            return (
              <View
                key={m.id}
                className="mb-3 overflow-hidden rounded-lg border border-neutral-200 bg-white"
              >
                <View className="flex-row items-start gap-3 p-4">
                  <View
                    className="items-center justify-center rounded-full bg-primary-100"
                    style={{ width: 36, height: 36 }}
                  >
                    <Ikon size={20} color={colors.primary600} strokeWidth={1.75} />
                  </View>

                  <View className="flex-1">
                    <Text
                      className="font-inter-semibold text-sm text-neutral-900"
                      maxFontSizeMultiplier={1.3}
                    >
                      {m.nama_metode}
                    </Text>
                    <Text
                      className="font-inter text-xs text-neutral-500"
                      maxFontSizeMultiplier={1.3}
                    >
                      {jenisLabel(m.jenis_pembayaran)}
                      {biaya > 0
                        ? ` · ${teks.metodeBayar.biayaAdmin.replace("{nilai}", rupiah(biaya))}`
                        : ` · ${teks.metodeBayar.tanpaBiaya}`}
                      {persen > 0
                        ? ` · ${teks.metodeBayar.persentase.replace("{persen}", String(persen))}`
                        : ""}
                    </Text>
                  </View>
                </View>

                {transfer && m.nomor_rekening ? (
                  <View className="mx-4 mb-3 rounded-md bg-neutral-50 p-3">
                    <Text className="font-inter text-caption text-neutral-500">
                      {teks.metodeBayar.rekening}
                    </Text>
                    <Text
                      className="font-inter-bold text-base text-neutral-900 tabular-nums"
                      selectable
                      maxFontSizeMultiplier={1.3}
                    >
                      {m.nomor_rekening}
                    </Text>
                    <Text
                      className="mt-0.5 font-inter text-xs text-neutral-500"
                      maxFontSizeMultiplier={1.3}
                    >
                      {teks.pesanan.atasNama}: {m.atas_nama ?? "-"}
                    </Text>
                  </View>
                ) : null}

                <View className="border-t border-neutral-100 px-4 py-3">
                  <Text
                    className="mb-1 font-inter-medium text-xs text-neutral-700"
                    maxFontSizeMultiplier={1.3}
                  >
                    {teks.metodeBayar.instruksiJudul}
                  </Text>
                  {(instruksi.length > 0
                    ? instruksi
                    : [teks.metodeBayar.instruksiKosong]
                  ).map((baris, i) => (
                    <Text
                      key={i}
                      className="mb-1 font-inter text-xs text-neutral-500"
                      maxFontSizeMultiplier={1.3}
                    >
                      • {baris}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
