import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { fetchCustomerTransactions, Transaction } from "../../services/api";
import { verifyToken } from "../../services/auth";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

const OrderHistoryScreen = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("semua");

  const statusFilters = [
    { key: "semua", label: "Semua" },
    { key: "pending", label: "Menunggu" },
    { key: "confirmed", label: "Dikonfirmasi" },
    { key: "processing", label: "Diproses" },
    { key: "shipped", label: "Dikirim" },
    { key: "delivered", label: "Selesai" },
    { key: "cancelled", label: "Dibatalkan" },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      processing: "bg-indigo-100 text-indigo-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    const icons: { [key: string]: string } = {
      pending: "time-outline",
      confirmed: "checkmark-outline",
      processing: "construct-outline",
      shipped: "car-outline",
      delivered: "checkmark-circle-outline",
      cancelled: "close-circle-outline",
    };
    return (icons[status] as any) || "help-circle-outline";
  };

  const loadTransactions = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const isValidToken = await verifyToken();

      if (!isValidToken) {
        setError("Sesi Anda telah berakhir, akan diarahkan ke halaman login");
        await handleAuthError({ message: "Token expired or invalid" });
        return;
      }

      const params = filter !== "semua" ? { status: filter } : {};
      const result = await fetchCustomerTransactions(params);

      // Ensure result and result.data exist
      if (result && result.data && Array.isArray(result.data)) {
        setTransactions(result.data);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error("Error loading transactions:", error);
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
    await loadTransactions();
    setRefreshing(false);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    // Reload data with new filter
    setTimeout(loadTransactions, 100);
  };

  const handleOrderPress = (transaction: Transaction) => {
    router.push(`/orders/${transaction.id}` as any);
  };

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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
          ) : !transactions || transactions.length === 0 ? (
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
              {(transactions || []).map((transaction) => (
                <Pressable
                  key={transaction.id}
                  onPress={() => handleOrderPress(transaction)}
                  className="bg-white rounded-xl p-4"
                >
                  <View className="flex-row justify-between items-start mb-3">
                    <View>
                      <Text className="font-semibold text-gray-900">
                        {transaction.nomor_transaksi ||
                          `Order #${transaction.id}`}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {formatDate(transaction.tanggal_transaksi)}
                      </Text>
                    </View>
                    <View
                      className={`px-3 py-1 rounded-full ${getStatusColor(transaction.status_transaksi || transaction.status)}`}
                    >
                      <Text className="text-xs font-medium capitalize">
                        {transaction.status_transaksi || transaction.status}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <Ionicons
                      name={getStatusIcon(
                        transaction.status_transaksi || transaction.status
                      )}
                      size={16}
                      color="#6B7280"
                    />
                    <Text className="text-gray-600 text-sm ml-2 flex-1">
                      {(transaction.items || []).length} item •{" "}
                      {transaction.metode_pembayaran}
                    </Text>
                  </View>

                  {/* Order Items Preview */}
                  <View className="mb-3">
                    {(transaction.items || []).slice(0, 2).map((item) => (
                      <Text key={item.id} className="text-gray-600 text-sm">
                        {item.jumlah}x {item.nama_produk}
                      </Text>
                    ))}
                    {(transaction.items || []).length > 2 && (
                      <Text className="text-gray-500 text-sm">
                        +{(transaction.items || []).length - 2} item lainnya
                      </Text>
                    )}
                  </View>

                  <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
                    <Text className="text-gray-500 text-sm">
                      Total Pembayaran
                    </Text>
                    <Text className="font-bold text-primary">
                      {formatPrice(transaction.total_bayar)}
                    </Text>
                  </View>

                  {(transaction.status === "delivered" ||
                    transaction.status_transaksi === "delivered") && (
                    <View className="mt-3 pt-3 border-t border-gray-100">
                      <Pressable className="bg-gray-100 px-4 py-2 rounded-xl">
                        <Text className="text-center font-medium text-gray-700">
                          Beli Lagi
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderHistoryScreen;
