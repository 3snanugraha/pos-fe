import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Navbar from "../../components/Navbar";
import { apiService } from "../../services/apiService";

interface OrderDetail {
  id: number;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  total_harga: number;
  total_diskon: number;
  total_bayar: number;
  status: string;
  status_transaksi: string;
  metode_pembayaran: { id: number | null; nama: string; jenis: string };
  alamat_pengiriman: string | null;
  catatan: string | null;
  created_at: string;
  items: OrderDetailItem[];
}

interface OrderDetailItem {
  id: number;
  produk_id: number;
  varian_id: number | null;
  nama_produk: string;
  nama_varian: string | null;
  jumlah: number;
  harga: number;
  subtotal: number;
  gambar_url: string | null;
}

const STATUS_COLORS: { [key: string]: { bg: string; text: string } } = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  confirmed: { bg: "bg-blue-100", text: "text-blue-700" },
  processing: { bg: "bg-indigo-100", text: "text-indigo-700" },
  shipped: { bg: "bg-purple-100", text: "text-purple-700" },
  delivered: { bg: "bg-green-100", text: "text-green-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" },
};

const STATUS_LABELS: { [key: string]: string } = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_ICONS: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  pending: "time-outline",
  confirmed: "checkmark-circle-outline",
  processing: "cog-outline",
  shipped: "car-outline",
  delivered: "checkmark-done-circle-outline",
  cancelled: "close-circle-outline",
};

const formatPrice = (price: number | string | null | undefined) => {
  const numPrice = price ? Number(price) : 0;
  if (isNaN(numPrice)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(numPrice);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const OrderDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  const loadOrder = async () => {
    if (!id) return;
    try {
      const result = await apiService.getOrderDetails(parseInt(id));
      // The API returns data wrapped in response.data
      const orderData = (result as any)?.data || result;
      setOrder(orderData as OrderDetail);
    } catch (error) {
      console.error("Error loading order:", error);
      Alert.alert("Error", "Gagal memuat detail pesanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleCancelOrder = () => {
    if (!order) return;
    Alert.alert(
      "Batalkan Pesanan",
      "Apakah Anda yakin ingin membatalkan pesanan ini?",
      [
        { text: "Tidak", style: "cancel" },
        {
          text: "Ya, Batalkan",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await apiService.cancelOrder(order.id);
              setOrder({ ...order, status: "cancelled", status_transaksi: "cancelled" });
              Alert.alert("Berhasil", "Pesanan telah dibatalkan");
            } catch (error) {
              console.error("Error cancelling order:", error);
              Alert.alert("Error", "Gagal membatalkan pesanan. Silakan coba lagi.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["top", "left", "right"]}
      >
        <Navbar title="Detail Pesanan" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["top", "left", "right"]}
      >
        <Navbar title="Detail Pesanan" showBackButton={true} />
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
          <Text className="text-gray-500 mt-4 text-center">
            Pesanan tidak ditemukan
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const statusIcon = STATUS_ICONS[order.status] || "help-circle-outline";
  const canCancel = order.status === "pending" || order.status === "confirmed";

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <Navbar title={`Pesanan #${order.id}`} showBackButton={true} />
      <ScrollView className="flex-1">
        {/* Status Header */}
        <View className="bg-white p-4 mx-4 mt-4 rounded-xl">
          <View className="flex-row items-center mb-3">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${statusColor.bg}`}
            >
              <Ionicons
                name={statusIcon}
                size={24}
                color={statusColor.text === "text-yellow-700" ? "#B45309" :
                  statusColor.text === "text-blue-700" ? "#1D4ED8" :
                  statusColor.text === "text-indigo-700" ? "#4338CA" :
                  statusColor.text === "text-purple-700" ? "#7C3AED" :
                  statusColor.text === "text-green-700" ? "#15803D" :
                  "#DC2626"}
              />
            </View>
            <View className="flex-1">
              <View
                className={`self-start px-3 py-1 rounded-full ${statusColor.bg} mb-1`}
              >
                <Text className={`text-sm font-medium ${statusColor.text}`}>
                  {statusLabel}
                </Text>
              </View>
              <Text className="text-gray-500 text-sm">
                {formatDate(order.tanggal_transaksi || order.created_at)}
              </Text>
            </View>
          </View>
          {order.nomor_transaksi && (
            <Text className="text-gray-400 text-xs">
              No. Transaksi: {order.nomor_transaksi}
            </Text>
          )}
        </View>

        {/* Order Items */}
        <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
          <Text className="font-bold text-base mb-3">Produk Dipesan</Text>
          {order.items?.map((item, index) => (
            <View
              key={item.id}
              className={`flex-row py-3 ${
                index < (order.items?.length || 0) - 1
                  ? "border-b border-gray-100"
                  : ""
              }`}
            >
              {/* Product Image */}
              <View className="w-16 h-16 bg-gray-200 rounded-lg mr-3 overflow-hidden">
                {item.gambar_url ? (
                  <Image
                    source={{ uri: item.gambar_url }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View className="flex-1">
                <Text className="font-medium text-gray-900" numberOfLines={2}>
                  {item.nama_produk}
                </Text>
                {item.nama_varian && (
                  <Text className="text-gray-500 text-sm mt-0.5">
                    Varian: {item.nama_varian}
                  </Text>
                )}
                <View className="flex-row justify-between items-center mt-1">
                  <Text className="text-gray-500 text-sm">
                    {item.jumlah}x {formatPrice(item.harga)}
                  </Text>
                  <Text className="font-semibold text-primary">
                    {formatPrice(item.subtotal)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Shipping Address */}
        {order.alamat_pengiriman && (
          <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
            <View className="flex-row items-center mb-2">
              <Ionicons name="location-outline" size={18} color="#6B7280" />
              <Text className="font-bold text-base ml-2">
                Alamat Pengiriman
              </Text>
            </View>
            <Text className="text-gray-600 leading-5">
              {order.alamat_pengiriman}
            </Text>
          </View>
        )}

        {/* Payment Method */}
        <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="card-outline" size={18} color="#6B7280" />
            <Text className="font-bold text-base ml-2">Metode Pembayaran</Text>
          </View>
          <Text className="text-gray-600">
            {order.metode_pembayaran?.nama || "Tunai"}
          </Text>
          {order.metode_pembayaran?.jenis && (
            <Text className="text-gray-400 text-sm capitalize">
              {order.metode_pembayaran.jenis}
            </Text>
          )}
        </View>

        {/* Notes */}
        {order.catatan && (
          <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
            <View className="flex-row items-center mb-2">
              <Ionicons name="document-text-outline" size={18} color="#6B7280" />
              <Text className="font-bold text-base ml-2">Catatan</Text>
            </View>
            <Text className="text-gray-600 leading-5">{order.catatan}</Text>
          </View>
        )}

        {/* Price Summary */}
        <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
          <Text className="font-bold text-base mb-3">Rincian Pembayaran</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500">Subtotal Produk</Text>
            <Text className="text-gray-700">
              {formatPrice(order.total_harga)}
            </Text>
          </View>
          {Number(order.total_diskon) > 0 && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-500">Diskon</Text>
              <Text className="text-green-600">
                -{formatPrice(order.total_diskon)}
              </Text>
            </View>
          )}
          <View className="border-t border-gray-200 mt-2 pt-2">
            <View className="flex-row justify-between">
              <Text className="font-bold text-lg">Total Pembayaran</Text>
              <Text className="font-bold text-lg text-primary">
                {formatPrice(order.total_bayar)}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancel Button */}
        {canCancel && (
          <View className="mx-4 mt-4 mb-6">
            <Pressable
              onPress={handleCancelOrder}
              disabled={cancelling}
              className={`border-2 border-red-500 rounded-xl py-3 items-center ${
                cancelling ? "opacity-50" : ""
              }`}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text className="text-red-500 font-semibold text-base">
                  Batalkan Pesanan
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Bottom spacing */}
        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderDetailScreen;
