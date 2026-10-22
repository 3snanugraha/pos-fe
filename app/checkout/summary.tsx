import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AddressCard,
  CartItemRow,
  ErrorState,
  PriceSummary,
  Skeleton,
  StickyBar,
  StickyTotal,
} from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button } from "../../src/components/ui";
import { rupiah } from "../../src/lib/format";
import { teks } from "../../src/lib/i18n";
import { useCheckout } from "../../src/screens/checkout/CheckoutContext";
import { formatAlamatLengkap } from "../../utils/formatters";

/**
 * Ringkasan Pesanan Zovora — guideline §3.12/§3.13 + §4 (Order Summary).
 *
 * Kartu alamat tinggi (nama, alamat multi-baris, telepon), item read-only,
 * price summary primary-50, dan sticky bar "Buat Pesanan". Ringkasan tidak
 * mengubah apa pun di keranjang; perubahan jumlah hanya lewat Keranjang.
 */
export default function OrderSummaryScreen() {
  const router = useRouter();
  const {
    items,
    cartLoading,
    loading,
    error,
    selectedAddress,
    totalAmount,
    promoDiscount,
    promoCode,
    poinValue,
    finalTotal,
    paymentMethods,
    isProcessingOrder,
    muatUlang,
  } = useCheckout();

  const memuat = (loading || cartLoading) && items.length > 0 && !selectedAddress;

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.judul.orderSummary} onBack={() => router.back()} />
        <ErrorState pesan={error} onRetry={muatUlang} />
      </SafeAreaView>
    );
  }

  if (memuat) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.judul.orderSummary} onBack={() => router.back()} />
        <View className="px-4 pt-4">
          <Skeleton height={110} radiusClassName="rounded-lg" width="100%" />
          {[0, 1].map((i) => (
            <View key={i} className="mt-4 flex-row gap-3">
              <Skeleton width={72} height={80} radiusClassName="rounded-md" />
              <View className="flex-1">
                <Skeleton height={14} width="80%" />
                <Skeleton height={12} width="40%" className="mt-2" />
                <Skeleton height={16} width="30%" className="mt-2" />
              </View>
            </View>
          ))}
          <Skeleton height={120} radiusClassName="rounded-lg" width="100%" className="mt-4" />
        </View>
      </SafeAreaView>
    );
  }

  const kePembayaran = () => router.push("/checkout/payment");

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar title={teks.judul.orderSummary} onBack={() => router.back()} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-4 pt-2">
          <AddressCard
            variant="lengkap"
            alamat={
              selectedAddress
                ? {
                    nama_penerima: selectedAddress.nama_penerima,
                    telepon_penerima: selectedAddress.telepon_penerima,
                    // `formatAlamatLengkap` sudah memuat kota/provinsi/kode pos.
                    alamat_lengkap: formatAlamatLengkap(selectedAddress),
                  }
                : null
            }
            kosong={teks.empty.alamat.judul}
            onGanti={() => router.push("/addresses")}
            onPress={() => router.push("/addresses")}
          />

          <View className="mt-6 rounded-lg border border-neutral-200 bg-white px-4">
            <Text
              className="pt-4 font-inter-semibold text-base text-neutral-900"
              maxFontSizeMultiplier={1.3}
            >
              {teks.checkout.itemPesanan}
            </Text>
            {items.map((item, i) => (
              <View key={item.id} className={i === 0 ? "" : "border-t border-neutral-100"}>
                <CartItemRow
                  readOnly
                  nama={item.nama_produk}
                  harga={item.harga}
                  jumlah={item.quantity}
                  subtotal={item.subtotal}
                  gambarUrl={item.gambar_url ?? null}
                  keterangan={
                    item.varian_nama
                      ? teks.keranjang.varian.replace("{nama}", item.varian_nama)
                      : item.kategori_nama ?? null
                  }
                />
              </View>
            ))}
          </View>

          <View className="mt-6">
            <PriceSummary
              baris={[
                { label: teks.checkout.subTotal, nilai: totalAmount },
                {
                  label: teks.checkout.ongkosKirim,
                  nilai: 0,
                  teksNilai: teks.checkout.ongkirGratis,
                },
                promoDiscount > 0
                  ? { label: teks.checkout.diskon, nilai: promoDiscount, potongan: true }
                  : { label: teks.checkout.diskon, nilai: null },
                poinValue.dipakai > 0
                  ? {
                      label: teks.checkout.diskonPoin.replace(
                        "{jumlah}",
                        String(poinValue.dipakai)
                      ),
                      nilai: poinValue.rupiah,
                      potongan: true,
                    }
                  : { label: teks.checkout.poin, nilai: null },
              ]}
              total={finalTotal}
            />
          </View>

          <Text className="mt-3 font-inter text-xs text-neutral-500" maxFontSizeMultiplier={1.3}>
            {promoCode
              ? `${teks.checkout.kodePromo}: ${promoCode.trim().toUpperCase()}`
              : teks.checkout.pilihPembayaran}
          </Text>
        </View>
      </ScrollView>

      <StickyBar>
        <StickyTotal
          nilai={rupiah(finalTotal)}
          catatan={
            items.length > 0
              ? teks.checkout.totalItem.replace(
                  "{jumlah}",
                  String(items.reduce((s, i) => s + i.quantity, 0))
                )
              : undefined
          }
        />
        <Button
          title={teks.tombol.placeOrder}
          size="lg"
          className="w-[150px]"
          accessibilityLabel={`${teks.tombol.placeOrder} — ${teks.checkout.lanjutPembayaran} ke ${teks.judul.payment.toLowerCase()}`}
          disabled={!selectedAddress || items.length === 0 || paymentMethods.length === 0}
          loading={isProcessingOrder}
          onPress={kePembayaran}
        />
      </StickyBar>
    </SafeAreaView>
  );
}
