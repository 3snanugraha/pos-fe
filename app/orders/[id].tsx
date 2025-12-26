import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { fetchCustomerTransactionById, Transaction } from "../../services/api";

const OrderDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;
      try {
        const data = await fetchCustomerTransactionById(parseInt(id));
        setOrder(data);
      } catch (error) {
        console.error("Error loading order:", error);
        Alert.alert("Error", "Gagal memuat detail pesanan");
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [id]);

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
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Pesanan tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <Navbar title={`Pesanan #${order.id}`} showBackButton={true} />
      <ScrollView className="p-4">
        <View className="bg-white p-4 rounded-xl mb-4">
          <Text className="font-bold text-lg mb-2">Status: {order.status}</Text>
          <Text>Tanggal: {order.tanggal_transaksi}</Text>
          <Text>Total: {order.total_bayar}</Text>
        </View>
        {/* Add more details here as needed */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderDetailScreen;
