import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { useCart } from "../../contexts/CartContext";
import {
  createCustomerOrder,
  CustomerAddress,
  fetchCustomerAddresses,
  fetchPaymentMethods,
  PaymentMethod,
  validatePromotion,
} from "../../services/api";
import { verifyToken } from "../../services/auth";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

const CheckoutScreen = () => {
  const router = useRouter();
  const { items, totalAmount, clearCart } = useCart();

  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Order Summary
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedAddress, setSelectedAddress] =
    useState<CustomerAddress | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(
    null
  );
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const loadCheckoutData = async () => {
    setLoading(true);
    setError(null);

    try {
      const isValidToken = await verifyToken();

      if (!isValidToken) {
        setError("Sesi Anda telah berakhir, akan diarahkan ke halaman login");
        await handleAuthError({ message: "Token expired or invalid" });
        return;
      }

      const [addressesData, paymentMethodsData] = await Promise.all([
        fetchCustomerAddresses(),
        fetchPaymentMethods(),
      ]);

      setAddresses(addressesData);
      setPaymentMethods(paymentMethodsData);

      // Set default address
      const defaultAddress = addressesData.find((addr) => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      } else if (addressesData.length > 0) {
        setSelectedAddress(addressesData[0]);
      }

      // Set default payment method
      if (paymentMethodsData.length > 0) {
        setSelectedPayment(paymentMethodsData[0]);
      }
    } catch (error: any) {
      console.error("Error loading checkout data:", error);
      const isAuthError = await handleAuthError(error);
      if (!isAuthError) {
        setError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      Alert.alert("Error", "Masukkan kode promo");
      return;
    }

    try {
      const promoData = await validatePromotion(promoCode, totalAmount);
      setPromoDiscount(promoData.nilai_diskon);
      Alert.alert(
        "Berhasil!",
        `Kode promo berhasil diterapkan. Diskon ${formatPrice(promoData.nilai_diskon)}`
      );
    } catch (error: any) {
      console.error("Error applying promo:", error);
      Alert.alert("Error", "Kode promo tidak valid atau sudah tidak berlaku");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert("Error", "Pilih alamat pengiriman");
      return;
    }

    if (!selectedPayment) {
      Alert.alert("Error", "Pilih metode pembayaran");
      return;
    }

    if (isProcessingOrder) {
      return; // Prevent double submission
    }

    setIsProcessingOrder(true);

    try {
      // Format alamat lengkap untuk dikirim ke backend
      const fullAddress = `${selectedAddress.alamat_lengkap}, ${selectedAddress.kota}, ${selectedAddress.provinsi} ${selectedAddress.kode_pos}`;

      const orderData = {
        items: items.map((item) => ({
          produk_id: item.produk_id,
          varian_id: item.varian_id || undefined,
          jumlah: item.quantity,
        })),
        metode_pembayaran_id: selectedPayment.id,
        alamat_pengiriman: fullAddress,
        catatan: notes.trim() || undefined,
        promo_code: promoCode.trim() || undefined,
        poin_digunakan: 0, // TODO: Implement points usage if needed
      };

      console.log("=== DEBUG: Creating Order ===");
      console.log("Order data:", JSON.stringify(orderData, null, 2));

      const result = await createCustomerOrder(orderData);

      console.log("Order creation result:", JSON.stringify(result, null, 2));

      // Clear cart after successful order
      await clearCart();

      // Redirect to success page with order details
      router.replace({
        pathname: "/checkout/success",
        params: {
          orderNumber: result.nomor_transaksi || "N/A",
          totalAmount: finalTotal.toString(),
        },
      });
    } catch (error: any) {
      console.error("Error placing order:", error);
      Alert.alert(
        "Error",
        getErrorMessage(error) || "Gagal membuat pesanan. Silakan coba lagi."
      );
    } finally {
      setIsProcessingOrder(false);
    }
  };

  useEffect(() => {
    if (items.length === 0) {
      Alert.alert(
        "Keranjang Kosong",
        "Keranjang belanja Anda kosong. Silakan tambahkan produk terlebih dahulu.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/products"),
          },
        ]
      );
      return;
    }

    loadCheckoutData();
  }, [items.length, router]);

  const finalTotal = totalAmount - promoDiscount;

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["top", "left", "right"]}
      >
        <Navbar title="Checkout" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Memuat data checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["top", "left", "right"]}
      >
        <Navbar title="Checkout" showBackButton={true} />
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
      <Navbar title="Checkout" showBackButton={true} />

      {/* Step Indicator */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white">
        {[1, 2, 3].map((stepNum) => (
          <View key={stepNum} className="flex-1 flex-row items-center">
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                step >= stepNum ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  step >= stepNum ? "text-white" : "text-gray-500"
                }`}
              >
                {stepNum}
              </Text>
            </View>
            {stepNum < 3 && (
              <View
                className={`flex-1 h-0.5 mx-2 ${
                  step > stepNum ? "bg-primary" : "bg-gray-300"
                }`}
              />
            )}
          </View>
        ))}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View className="p-4">
            <Text className="text-xl font-bold mb-4">Alamat Pengiriman</Text>

            {addresses.length === 0 ? (
              <View className="bg-white rounded-xl p-4 items-center">
                <Ionicons name="location-outline" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 text-center mt-2 mb-4">
                  Belum ada alamat tersimpan
                </Text>
                <Pressable
                  onPress={() => router.push("/addresses/add")}
                  className="bg-primary px-6 py-3 rounded-xl"
                >
                  <Text className="text-white font-semibold">
                    Tambah Alamat
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                {addresses.map((address) => (
                  <Pressable
                    key={address.id}
                    onPress={() => setSelectedAddress(address)}
                    className={`bg-white rounded-xl p-4 mb-3 ${
                      selectedAddress?.id === address.id
                        ? "border-2 border-primary"
                        : ""
                    }`}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Text className="font-semibold text-gray-900 mr-2">
                            {address.label}
                          </Text>
                          {address.is_default && (
                            <View className="bg-green-100 px-2 py-1 rounded">
                              <Text className="text-green-700 text-xs font-medium">
                                Default
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-gray-900 mb-1">
                          {address.nama_penerima}
                        </Text>
                        <Text className="text-gray-600 mb-1">
                          {address.telepon_penerima}
                        </Text>
                        <Text className="text-gray-600">
                          {address.alamat_lengkap}
                        </Text>
                        <Text className="text-gray-600">
                          {address.kota}, {address.provinsi} {address.kode_pos}
                        </Text>
                      </View>
                      <Ionicons
                        name={
                          selectedAddress?.id === address.id
                            ? "radio-button-on"
                            : "radio-button-off"
                        }
                        size={24}
                        color={
                          selectedAddress?.id === address.id
                            ? "#1E40AF"
                            : "#9CA3AF"
                        }
                      />
                    </View>
                  </Pressable>
                ))}

                <Pressable
                  onPress={() => router.push("/addresses/add")}
                  className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 items-center"
                >
                  <Ionicons name="add-outline" size={24} color="#6B7280" />
                  <Text className="text-gray-500 font-medium mt-1">
                    Tambah Alamat Baru
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {step === 2 && (
          <View className="p-4">
            <Text className="text-xl font-bold mb-4">Metode Pembayaran</Text>

            {paymentMethods.map((method) => (
              <Pressable
                key={method.id}
                onPress={() => setSelectedPayment(method)}
                className={`bg-white rounded-xl p-4 mb-3 ${
                  selectedPayment?.id === method.id
                    ? "border-2 border-primary"
                    : ""
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900 mb-1">
                      {method.nama_metode}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      {method.jenis_pembayaran}
                    </Text>
                    {method.biaya_admin > 0 && (
                      <Text className="text-gray-500 text-xs mt-1">
                        Biaya admin: {formatPrice(method.biaya_admin)}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name={
                      selectedPayment?.id === method.id
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={24}
                    color={
                      selectedPayment?.id === method.id ? "#1E40AF" : "#9CA3AF"
                    }
                  />
                </View>
              </Pressable>
            ))}

            {/* Promo Code */}
            <View className="bg-white rounded-xl p-4 mt-4">
              <Text className="font-semibold mb-3">Kode Promo</Text>
              <View className="flex-row">
                <TextInput
                  value={promoCode}
                  onChangeText={setPromoCode}
                  placeholder="Masukkan kode promo"
                  className="flex-1 border border-gray-300 rounded-l-xl px-3 py-2 bg-gray-50"
                />
                <Pressable
                  onPress={handleApplyPromo}
                  className="bg-primary px-4 py-2 rounded-r-xl items-center justify-center"
                >
                  <Text className="text-white font-semibold">Pakai</Text>
                </Pressable>
              </View>
              {promoDiscount > 0 && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text className="text-green-600 text-sm ml-1">
                    Diskon {formatPrice(promoDiscount)} telah diterapkan
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="p-4">
            <Text className="text-xl font-bold mb-4">Ringkasan Pesanan</Text>

            {/* Order Items */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="font-semibold mb-3">Item Pesanan</Text>
              {items.map((item) => (
                <View
                  key={item.id}
                  className="flex-row justify-between items-center py-2"
                >
                  <View className="flex-1">
                    <Text className="font-medium" numberOfLines={2}>
                      {item.nama_produk}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {item.quantity} x {formatPrice(item.harga)}
                    </Text>
                  </View>
                  <Text className="font-medium">
                    {formatPrice(item.subtotal)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Delivery Address */}
            {selectedAddress && (
              <View className="bg-white rounded-xl p-4 mb-4">
                <Text className="font-semibold mb-3">Alamat Pengiriman</Text>
                <Text className="font-medium">
                  {selectedAddress.nama_penerima}
                </Text>
                <Text className="text-gray-600">
                  {selectedAddress.telepon_penerima}
                </Text>
                <Text className="text-gray-600 mt-1">
                  {selectedAddress.alamat_lengkap}
                </Text>
                <Text className="text-gray-600">
                  {selectedAddress.kota}, {selectedAddress.provinsi}{" "}
                  {selectedAddress.kode_pos}
                </Text>
              </View>
            )}

            {/* Payment Method */}
            {selectedPayment && (
              <View className="bg-white rounded-xl p-4 mb-4">
                <Text className="font-semibold mb-3">Metode Pembayaran</Text>
                <Text className="font-medium">
                  {selectedPayment.nama_metode}
                </Text>
                <Text className="text-gray-600">
                  {selectedPayment.jenis_pembayaran}
                </Text>
              </View>
            )}

            {/* Order Notes */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="font-semibold mb-3">
                Catatan Pesanan (Opsional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Tulis catatan untuk pesanan Anda..."
                multiline
                numberOfLines={3}
                className="border border-gray-300 rounded-xl p-3 bg-gray-50"
                textAlignVertical="top"
              />
            </View>

            {/* Price Summary */}
            <View className="bg-white rounded-xl p-4 mb-24">
              <Text className="font-semibold mb-3">Rincian Pembayaran</Text>

              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Subtotal</Text>
                <Text className="font-medium">{formatPrice(totalAmount)}</Text>
              </View>

              {promoDiscount > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-green-600">Diskon Promo</Text>
                  <Text className="text-green-600 font-medium">
                    -{formatPrice(promoDiscount)}
                  </Text>
                </View>
              )}

              <View className="border-t border-gray-200 my-2" />

              <View className="flex-row justify-between">
                <Text className="font-bold text-lg">Total Bayar</Text>
                <Text className="font-bold text-lg text-primary">
                  {formatPrice(finalTotal)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <View className="flex-row space-x-3">
          {step > 1 && (
            <Pressable
              onPress={() => setStep(step - 1)}
              className="flex-1 bg-gray-200 py-3 rounded-xl items-center"
            >
              <Text className="text-gray-700 font-semibold">Kembali</Text>
            </Pressable>
          )}

          <Pressable
            onPress={step === 3 ? handlePlaceOrder : () => setStep(step + 1)}
            disabled={
              (step === 1 && !selectedAddress) ||
              (step === 2 && !selectedPayment) ||
              (step === 3 && isProcessingOrder)
            }
            className={`flex-1 py-3 rounded-xl items-center ${
              (step === 1 && !selectedAddress) ||
              (step === 2 && !selectedPayment) ||
              (step === 3 && isProcessingOrder)
                ? "bg-gray-300"
                : "bg-primary"
            }`}
          >
            <Text
              className={`font-semibold ${
                (step === 1 && !selectedAddress) ||
                (step === 2 && !selectedPayment) ||
                (step === 3 && isProcessingOrder)
                  ? "text-gray-500"
                  : "text-white"
              }`}
            >
              {step === 3 && isProcessingOrder
                ? "Memproses..."
                : step === 3
                  ? "Buat Pesanan"
                  : "Lanjutkan"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CheckoutScreen;
