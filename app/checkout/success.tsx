import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { apiService } from "../../services/apiService";
import { OrderDetail } from "../../services/types";
import { useOrderExpiry, formatDateTime } from "../../utils/orderExpiry";
import {
  buildPaymentInstruction,
  formatRupiah,
  isTransfer,
  jenisLabel,
} from "../../utils/payment";

const CheckoutSuccessScreen = () => {
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
   * Nilai final diambil dari data order bila sudah termuat.
   *
   * Param URL berasal dari perhitungan lokal checkout dan bisa berbeda dengan
   * angka server — mis. saat server menolak pemakaian poin sehingga order
   * tersimpan tanpa potongan poin. Menampilkan angka param saja membuat
   * pelanggan melihat total yang salah.
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Navbar title="Pesanan Berhasil" showBackButton={false} />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-6 pt-6">
          <View className="items-center mb-5">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark" size={42} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 text-center">
              Pesanan Berhasil Dibuat!
            </Text>
            <Text className="text-gray-600 text-center mt-2 leading-relaxed">
              Pesanan menunggu verifikasi kasir. Selesaikan pembayaran sesuai
              instruksi di bawah agar pesanan segera diproses.
            </Text>
          </View>

          {/* Countdown */}
          {order?.order_expires_at && order?.status === "pending" && (
            <View
              className={`rounded-xl p-4 mb-4 ${
                expiry.expired
                  ? "bg-red-50 border border-red-200"
                  : "bg-orange-50 border border-orange-200"
              }`}
            >
              <Text
                className={`text-xs ${
                  expiry.expired ? "text-red-700" : "text-orange-700"
                }`}
              >
                {expiry.expired ? "Pesanan kedaluwarsa" : "Batas waktu pembayaran"}
              </Text>
              <Text
                className={`text-2xl font-bold ${
                  expiry.expired ? "text-red-800" : "text-orange-900"
                }`}
              >
                {expiry.expired ? "—" : expiry.countdown}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  expiry.expired ? "text-red-600" : "text-orange-600"
                }`}
              >
                s.d. {formatDateTime(order.order_expires_at)}
              </Text>
            </View>
          )}

          {/* Rincian */}
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="font-semibold text-gray-900 mb-3">Detail Pesanan</Text>

            {params.orderNumber && (
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-600">Nomor Pesanan</Text>
                <Text className="font-medium text-gray-900">
                  {params.orderNumber}
                </Text>
              </View>
            )}

            {total > 0 && (
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-gray-600">Total Bayar</Text>
                <Text className="font-medium text-primary">{formatRupiah(total)}</Text>
              </View>
            )}

            {poinDipakai > 0 && (
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Poin digunakan</Text>
                <Text className="font-medium text-green-600">
                  {poinDipakai.toLocaleString("id-ID")} poin
                </Text>
              </View>
            )}
          </View>

          {/* Instruksi pembayaran */}
          {instruksi.length > 0 && (
            <View className="bg-white rounded-xl p-4 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="wallet-outline" size={18} color="#1D4ED8" />
                <Text className="font-semibold text-gray-900 ml-2">
                  Instruksi Pembayaran
                </Text>
              </View>
              <Text className="text-gray-500 text-xs mb-2">
                {metode?.nama} • {jenisLabel(metode?.jenis)}
              </Text>
              <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                {instruksi.map((line, idx) => (
                  <Text key={idx} className="text-blue-800 text-sm leading-5 mb-1">
                    • {line}
                  </Text>
                ))}
              </View>
              {isTransfer(metode?.jenis) && metode?.nomor_rekening && (
                <View className="bg-gray-50 rounded-lg p-3 mt-2">
                  <Text className="text-xs text-gray-500">Nomor Rekening</Text>
                  <Text className="text-lg font-bold text-gray-900">
                    {metode.nomor_rekening}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Atas Nama: {metode.atas_nama ?? "-"}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Aksi */}
          <View className="space-y-3">
            <Pressable
              onPress={() =>
                orderId
                  ? router.replace(`/orders/${orderId}` as any)
                  : router.replace("/orders")
              }
              className="bg-primary py-3 rounded-xl items-center"
            >
              <Text className="text-white font-semibold">Lihat Detail Pesanan</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace("/orders")}
              className="bg-gray-100 py-3 rounded-xl items-center"
            >
              <Text className="text-gray-700 font-semibold">Riwayat Pesanan</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace("/(tabs)/products")}
              className="py-3 rounded-xl items-center"
            >
              <Text className="text-primary font-semibold">Lanjut Belanja</Text>
            </Pressable>
          </View>

          <View className="mt-6 p-4 bg-blue-50 rounded-xl">
            <View className="flex-row items-start">
              <Ionicons
                name="information-circle"
                size={20}
                color="#3B82F6"
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text className="text-blue-800 font-medium mb-1">Status Pesanan</Text>
                <Text className="text-blue-700 text-sm leading-relaxed">
                  Pantau status di Riwayat Pesanan. Status berubah otomatis setelah
                  kasir memverifikasi (diproses/selesai) atau menolak pesanan.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CheckoutSuccessScreen;
