import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";

const CheckoutSuccessScreen = () => {
  const router = useRouter();
  const { orderNumber, totalAmount } = useLocalSearchParams();

  const formatPrice = (price: string | string[] | undefined) => {
    if (!price) return "Rp 0";
    const priceStr = Array.isArray(price) ? price[0] : price;
    const numPrice = parseFloat(priceStr);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  useEffect(() => {
    // Optional: Auto redirect after some time
    const timer = setTimeout(() => {
      // router.replace('/orders');
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <Navbar title="Pesanan Berhasil" showBackButton={false} />

      <View className="flex-1 justify-center items-center px-6">
        {/* Success Icon */}
        <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6">
          <Ionicons name="checkmark" size={48} color="#10B981" />
        </View>

        {/* Success Message */}
        <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
          Pesanan Berhasil Dibuat!
        </Text>

        <Text className="text-gray-600 text-center mb-6 leading-relaxed">
          Terima kasih atas pesanan Anda. Tim kami akan segera memproses pesanan
          Anda.
        </Text>

        {/* Order Details */}
        <View className="bg-white rounded-xl p-4 mb-6 w-full">
          <Text className="font-semibold text-gray-900 mb-3">
            Detail Pesanan
          </Text>

          {orderNumber && (
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600">Nomor Pesanan</Text>
              <Text className="font-medium text-gray-900">{orderNumber}</Text>
            </View>
          )}

          {totalAmount && (
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Total Bayar</Text>
              <Text className="font-medium text-primary">
                {formatPrice(totalAmount)}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="w-full space-y-3">
          <Pressable
            onPress={() => router.replace("/orders")}
            className="bg-primary py-3 rounded-xl items-center"
          >
            <Text className="text-white font-semibold">
              Lihat Riwayat Pesanan
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/(tabs)/products")}
            className="bg-gray-100 py-3 rounded-xl items-center"
          >
            <Text className="text-gray-700 font-semibold">Lanjut Belanja</Text>
          </Pressable>
        </View>

        {/* Additional Info */}
        <View className="mt-8 p-4 bg-blue-50 rounded-xl">
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle"
              size={20}
              color="#3B82F6"
              className="mr-2 mt-0.5"
            />
            <View className="flex-1">
              <Text className="text-blue-800 font-medium mb-1">
                Status Pesanan
              </Text>
              <Text className="text-blue-700 text-sm leading-relaxed">
                Pesanan Anda sedang diproses. Kami akan mengirimkan notifikasi
                update status melalui aplikasi.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CheckoutSuccessScreen;
