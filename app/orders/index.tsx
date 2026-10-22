import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { useCart } from "../../contexts/CartContext";
import { apiService } from "../../services/apiService";
import { Order } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";
import { formatDateTime, useOrderExpiry } from "../../utils/orderExpiry";

const formatPrice = (price: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(price) || 0);

/** `metode_pembayaran` bisa string (list) atau objek (detail). */
const metodeNama = (metode: Order["metode_pembayaran"]): string => {
  if (!metode) return "-";
  if (typeof metode === "string") return metode;
  return metode.nama_metode ?? "-";
};

const getStatusColor = (status: string) => {
  const colors: { [key: string]: string } = {
    pending: "bg-yellow-100 text-yellow-800",
    selesai: "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
    dibatalkan: "bg-red-100 text-red-800",
    cancelled: "bg-red-100 text-red-800",
    retur: "bg-purple-100 text-purple-800",
    // status lama (backend versi sebelumnya)
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const getStatusIcon = (status: string) => {
  const icons: { [key: string]: string } = {
    pending: "time-outline",
    selesai: "checkmark-circle-outline",
    completed: "checkmark-circle-outline",
    dibatalkan: "close-circle-outline",
    cancelled: "close-circle-outline",
    retur: "return-down-back-outline",
    confirmed: "checkmark-outline",
    processing: "construct-outline",
    shipped: "car-outline",
    delivered: "checkmark-done-circle-outline",
  };
  return (icons[status] as any) || "help-circle-outline";
};

const OrderHistoryScreen = () => {
  const router = useRouter();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("semua");
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  // Status mengikuti TransaksiPenjualan di backend:
  // pending | selesai | dibatalkan | retur
  const statusFilters = [
    { key: "semua", label: "Semua" },
    { key: "pending", label: "Menunggu" },
    { key: "selesai", label: "Selesai" },
    { key: "dibatalkan", label: "Dibatalkan" },
    { key: "retur", label: "Retur" },
  ];

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Backend `CustomerOrderController@index` — satu-satunya endpoint yang
      // mengirim `order_expires_at` + item per order.
      const result = await apiService.getCustomerOrders({
        ...(filter !== "semua" ? { status: filter } : {}),
        per_page: 30,
      });

      setOrders(Array.isArray(result.data) ? result.data : []);
    } catch (error: any) {
      console.error("Error loading orders:", error);
      const isAuthError = await handleAuthError(error);
      if (!isAuthError) {
        setError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
  };

  const handleOrderPress = (order: Order) => {
    router.push(`/orders/${order.id}` as any);
  };

  /**
   * "Beli Lagi" — masukkan ulang produk order ke keranjang.
   *
   * Order list tidak menyertakan harga/stok terkini, jadi tiap produk diambil
   * ulang lewat `getProduct` sebelum dimasukkan ke cart.
   */
  const handleReorder = async (order: Order) => {
    if (reorderingId) return;

    const items = order.items ?? [];
    if (items.length === 0) {
      Alert.alert("Tidak bisa membeli lagi", "Detail item pesanan tidak tersedia.");
      return;
    }

    setReorderingId(order.id);

    let berhasil = 0;
    const dilewati: string[] = [];

    for (const item of items) {
      try {
        const produk = await apiService.getProduct(item.produk_id, false);
        const varian = item.varian_id
          ? produk.varian?.find((v) => v.id === item.varian_id)
          : undefined;

        const stokTersedia = varian?.stok ?? produk.stok ?? produk.total_stok ?? 0;
        if (stokTersedia <= 0) {
          dilewati.push(item.nama_produk ?? `Produk #${item.produk_id}`);
          continue;
        }

        await addItem(
          produk,
          Math.min(item.jumlah, stokTersedia),
          varian ? { ...varian, harga: varian.harga_jual } : undefined
        );
        berhasil += 1;
      } catch (err) {
        console.warn("Reorder gagal untuk item", item.produk_id, err);
        dilewati.push(item.nama_produk ?? `Produk #${item.produk_id}`);
      }
    }

    setReorderingId(null);

    if (berhasil === 0) {
      Alert.alert(
        "Tidak ada produk yang bisa dibeli lagi",
        "Produk mungkin sudah tidak tersedia atau stok habis."
      );
      return;
    }

    Alert.alert(
      "Ditambahkan ke keranjang",
      `${berhasil} produk dimasukkan ke keranjang.` +
        (dilewati.length > 0
          ? `\n\nTidak tersedia: ${dilewati.slice(0, 3).join(", ")}`
          : ""),
      [
        { text: "Lanjut Belanja", style: "cancel" },
        {
          text: "Ke Keranjang",
          onPress: () => router.push("/(tabs)/cart"),
        },
      ]
    );
  };

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (error) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["top", "left", "right"]}
      >
        <Navbar title="Riwayat Pesanan" showBackButton={true} />
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 w-full">
            <Text className="text-red-700 text-center">{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <Navbar title="Riwayat Pesanan" showBackButton={true} />

      {/* Filter Tabs */}
      <View className="bg-white px-4 py-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {statusFilters.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => handleFilterChange(item.key)}
              className={`px-4 py-2 rounded-full mr-2 ${
                filter === item.key ? "bg-primary" : "bg-gray-100"
              }`}
            >
              <Text
                className={`font-medium ${
                  filter === item.key ? "text-white" : "text-gray-700"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {loading ? (
            <View className="space-y-3">
              {[1, 2, 3].map((item) => (
                <View key={item} className="bg-white rounded-xl p-4 space-y-3">
                  <View className="w-32 h-4 bg-gray-200 rounded" />
                  <View className="w-24 h-3 bg-gray-200 rounded" />
                  <View className="w-40 h-3 bg-gray-200 rounded" />
                </View>
              ))}
            </View>
          ) : orders.length === 0 ? (
            <View className="flex-1 justify-center items-center py-12">
              <Ionicons name="receipt-outline" size={80} color="#9CA3AF" />
              <Text className="text-xl font-semibold text-gray-600 mt-4 mb-2">
                Belum Ada Pesanan
              </Text>
              <Text className="text-gray-500 text-center mb-6">
                Anda belum memiliki riwayat pesanan
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/products")}
                className="bg-primary px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Mulai Belanja</Text>
              </Pressable>
            </View>
          ) : (
            <View className="space-y-3">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  reordering={reorderingId === order.id}
                  onPress={() => handleOrderPress(order)}
                  onReorder={() => handleReorder(order)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface OrderCardProps {
  order: Order;
  reordering: boolean;
  onPress: () => void;
  onReorder: () => void;
}

const OrderCard = ({ order, reordering, onPress, onReorder }: OrderCardProps) => {
  const status = (order.status_transaksi ?? order.status ?? "pending") as string;
  const expiry = useOrderExpiry(order.order_expires_at, status);
  const isDone =
    status === "selesai" ||
    status === "completed" ||
    status === "delivered" ||
    status === "dibatalkan";

  return (
    <Pressable onPress={onPress} className="bg-white rounded-xl p-4">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 pr-2">
          <Text className="font-semibold text-gray-900">
            {order.nomor_transaksi || `Order #${order.id}`}
          </Text>
          <Text className="text-gray-500 text-sm">
            {formatDateTime(order.tanggal_transaksi ?? order.created_at)}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${getStatusColor(status)}`}>
          <Text className="text-xs font-medium capitalize">
            {expiry.expired ? "kedaluwarsa" : status}
          </Text>
        </View>
      </View>

      {status === "pending" && !expiry.expired && expiry.countdown ? (
        <View className="flex-row items-center mb-3 bg-orange-50 rounded-lg px-2 py-1">
          <Ionicons name="timer-outline" size={14} color="#C2410C" />
          <Text className="text-orange-700 text-xs ml-1">
            Bayar dalam {expiry.countdown}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center mb-3">
        <Ionicons name={getStatusIcon(status) as any} size={16} color="#6B7280" />
        <Text className="text-gray-600 text-sm ml-2 flex-1">
          {(order.items || []).length} item • {metodeNama(order.metode_pembayaran)}
        </Text>
      </View>

      {/* Order Items Preview */}
      <View className="mb-3">
        {(order.items || []).slice(0, 2).map((item) => (
          <Text key={item.id} className="text-gray-600 text-sm">
            {item.jumlah}x {item.nama_produk}
          </Text>
        ))}
        {(order.items || []).length > 2 && (
          <Text className="text-gray-500 text-sm">
            +{(order.items || []).length - 2} item lainnya
          </Text>
        )}
      </View>

      <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
        <Text className="text-gray-500 text-sm">Total Pembayaran</Text>
        <Text className="font-bold text-primary">
          {formatPrice(order.total_bayar)}
        </Text>
      </View>

      {isDone && (order.items || []).length > 0 && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          <Pressable
            onPress={onReorder}
            disabled={reordering}
            className={`px-4 py-2 rounded-xl ${
              reordering ? "bg-gray-200" : "bg-gray-100"
            }`}
          >
            {reordering ? (
              <ActivityIndicator size="small" color="#374151" />
            ) : (
              <Text className="text-center font-medium text-gray-700">
                Beli Lagi
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </Pressable>
  );
};

export default OrderHistoryScreen;
