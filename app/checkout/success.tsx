import { Check, Info } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StickyBar } from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button } from "../../src/components/ui";
import { rupiah } from "../../src/lib/format";
import { teks } from "../../src/lib/i18n";
import { colors, sizes } from "../../src/theme/tokens";
import { apiService } from "../../services/apiService";
import type { OrderDetail } from "../../services/types";
import { formatDateTime, useOrderExpiry } from "../../utils/orderExpiry";
import { buildPaymentInstruction, isTransfer, jenisLabel } from "../../utils/payment";

/**
 * Pesanan Berhasil Zovora — layar baru (belum ada di kit).
 *
 * Ikon centang di lingkaran success, nomor pesanan, ringkasan (total, poin),
 * batas waktu pembayaran, instruksi pembayaran, dan dua aksi: "Lacak Pesanan"
 * (primary) + "Kembali ke Beranda".
 *
 * Angka final tetap diambil dari respons server (`total_bayar`,
 * `poin_digunakan`) seperti versi sebelumnya — param URL hanya cadangan.
 */
export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderNumber?: string;
    orderId?: string;
    totalAmount?: string;
    poin?: string;
  }>();

  const [order, setOrder] = useState<OrderDetail | null>(null);

  const orderId = params.orderId ? parseInt(String(params.orderId), 10) : NaN;
  const totalParam = Number(params.totalAmount ?? 0) || 0;
  const poinParam = Number(params.poin ?? 0) || 0;

  /**
   * Nilai final diambil dari data order bila sudah termuat. Param URL berasal
   * dari perhitungan lokal dan bisa berbeda dengan angka server (mis. saat
   * server menolak pemakaian poin).
   */
  const total = Number((order as any)?.total_bayar) || totalParam;
  const poinDipakai = Number((order as any)?.poin_digunakan) || poinParam;

  const expiry = useOrderExpiry(order?.order_expires_at, order?.status ?? "pending");

  useEffect(() => {
    if (Number.isNaN(orderId)) return;
    let aktif = true;

    apiService
      .getOrderDetails(orderId)
      .then((result) => {
        if (!aktif) return;
        setOrder(((result as any)?.data ?? result) as OrderDetail);
      })
      .catch((err) => console.warn("Gagal memuat order setelah checkout:", err));

    return () => {
      aktif = false;
    };
  }, [orderId]);

  const metode = order?.metode_pembayaran;
  const instruksi = metode
    ? buildPaymentInstruction({
        nama_metode: metode.nama,
        jenis_pembayaran: metode.jenis,
        nomor_rekening: metode.nomor_rekening ?? null,
        atas_nama: metode.atas_nama ?? null,
        instruksi: metode.instruksi ?? null,
      })
    : [];

  const lacak = () => {
    if (orderId) router.replace(`/orders/${orderId}` as any);
    else router.replace("/orders");
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar title={teks.judul.orders} showBack={false} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-4 pt-6">
          <View className="items-center">
            <View
              className="items-center justify-center rounded-full bg-success-100"
              style={{ width: 80, height: 80 }}
              accessibilityElementsHidden
            >
              <Check size={40} color={colors.success700} strokeWidth={2.25} />
            </View>
            <Text
              className="mt-4 text-center font-inter-bold text-2xl text-neutral-900"
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
            >
              {teks.sukses.judul}
            </Text>
            <Text
              className="mt-2 text-center font-inter text-sm text-neutral-500"
              style={{ maxWidth: 280 }}
              maxFontSizeMultiplier={1.3}
            >
              {teks.sukses.deskripsi}
            </Text>
          </View>

          <View className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
            {params.orderNumber ? (
              <View className="mb-3 flex-row items-center justify-between gap-3">
                <Text className="font-inter text-sm text-neutral-500">
                  {teks.sukses.nomorPesanan}
                </Text>
                <Text
                  className="flex-1 text-right font-inter-semibold text-sm text-neutral-900 tabular-nums"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {params.orderNumber}
                </Text>
              </View>
            ) : null}

            {total > 0 ? (
              <View className="mb-3 flex-row items-center justify-between gap-3">
                <Text className="font-inter text-sm text-neutral-500">
                  {teks.sukses.totalBayar}
                </Text>
                <Text
                  className="font-inter-semibold text-base text-neutral-900 tabular-nums"
                  maxFontSizeMultiplier={1.3}
                >
                  {rupiah(total)}
                </Text>
              </View>
            ) : null}

            {poinDipakai > 0 ? (
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-inter text-sm text-neutral-500">
                  {teks.sukses.poinDigunakan}
                </Text>
                <Text className="font-inter-semibold text-sm text-success-700 tabular-nums">
                  {poinDipakai.toLocaleString("id-ID")} poin
                </Text>
              </View>
            ) : null}
          </View>

          {order?.order_expires_at && order?.status === "pending" ? (
            <View
              className={`mt-4 rounded-lg border p-4 ${
                expiry.expired
                  ? "border-danger-500 bg-danger-50"
                  : "border-warning-500 bg-warning-50"
              }`}
            >
              <Text
                className={`font-inter text-xs ${
                  expiry.expired ? "text-danger-700" : "text-warning-700"
                }`}
              >
                {expiry.expired ? teks.sukses.kedaluwarsa : teks.sukses.batasWaktu}
              </Text>
              <Text
                className={`mt-1 font-inter-bold text-xl tabular-nums ${
                  expiry.expired ? "text-danger-700" : "text-neutral-900"
                }`}
              >
                {expiry.expired ? "—" : expiry.countdown}
              </Text>
              <Text className="mt-1 font-inter text-caption text-neutral-500">
                {teks.sukses.sampaiDengan.replace(
                  "{waktu}",
                  formatDateTime(order.order_expires_at)
                )}
              </Text>
            </View>
          ) : null}

          {instruksi.length > 0 ? (
            <View className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
              <Text className="font-inter-semibold text-base text-neutral-900">
                {teks.checkout.instruksiPembayaran}
              </Text>
              <Text className="mt-1 font-inter text-xs text-neutral-500">
                {metode?.nama} · {jenisLabel(metode?.jenis)}
              </Text>
              <View className="mt-3 rounded-md bg-neutral-50 p-3">
                {instruksi.map((baris, i) => (
                  <Text
                    key={i}
                    className="mb-1 font-inter text-xs text-neutral-700"
                    maxFontSizeMultiplier={1.3}
                  >
                    • {baris}
                  </Text>
                ))}
              </View>

              {isTransfer(metode?.jenis) && metode?.nomor_rekening ? (
                <View className="mt-2 rounded-md border border-primary-100 bg-primary-50 p-3">
                  <Text className="font-inter text-caption text-neutral-500">
                    {teks.checkout.nomorRekening}
                  </Text>
                  <Text className="font-inter-bold text-base text-neutral-900 tabular-nums">
                    {metode.nomor_rekening}
                  </Text>
                  <Text className="mt-0.5 font-inter text-caption text-neutral-500">
                    {teks.checkout.atasNama}: {metode.atas_nama ?? "-"}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View className="mt-4 flex-row items-start gap-2 rounded-lg bg-primary-50 p-4">
            <Info size={20} color={colors.primary600} strokeWidth={1.75} />
            <View className="flex-1">
              <Text className="font-inter-semibold text-sm text-neutral-900">
                {teks.sukses.statusJudul}
              </Text>
              <Text className="mt-1 font-inter text-xs text-neutral-700">
                {teks.sukses.statusDeskripsi}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <StickyBar>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          accessibilityRole="button"
          accessibilityLabel={teks.sukses.kembaliBeranda}
          hitSlop={sizes.hitSlop}
          className="min-h-[44px] flex-1 items-start justify-center"
        >
          <Text className="font-inter-medium text-sm text-primary-700">
            {teks.sukses.kembaliBeranda}
          </Text>
        </Pressable>
        <Button
          title={teks.sukses.lacakPesanan}
          size="lg"
          className="w-[160px]"
          onPress={lacak}
        />
      </StickyBar>
    </SafeAreaView>
  );
}
