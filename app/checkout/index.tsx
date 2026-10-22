import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { CartItem, useCart } from "../../contexts/CartContext";
import { apiService } from "../../services/apiService";
import { CustomerAddress, CustomerProfile, PaymentMethod } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";
import {
  buildCatatanWithSplit,
  buildPaymentInstruction,
  formatRupiah,
  isTransfer,
  jenisLabel,
  RUPIAH_PER_POIN,
  validasiSplitPembayaran,
} from "../../utils/payment";

const formatPrice = formatRupiah;

interface SplitRow {
  metode: PaymentMethod;
  nominal: string;
}

const CheckoutScreen = () => {
  const router = useRouter();
  const { items, totalAmount, clearCart, removeItem, updateItemQuantity } =
    useCart();

  const [step, setStep] = useState(1); // 1: Address, 2: Payment, 3: Order Summary
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(
    null
  );
  const [primaryPayment, setPrimaryPayment] = useState<PaymentMethod | null>(null);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [useSplit, setUseSplit] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [poinDigunakan, setPoinDigunakan] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const saldoPoin = Number(profile?.total_poin ?? 0);

  const loadCheckoutData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [addressesData, paymentMethodsData, profileData] = await Promise.all([
        apiService.getCustomerAddresses(),
        apiService.getPaymentMethods(),
        apiService.getCustomerProfile().catch(() => null),
      ]);

      setAddresses(addressesData);
      setPaymentMethods(paymentMethodsData);
      setProfile(profileData);

      const defaultAddress = addressesData.find((addr) => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      } else if (addressesData.length > 0) {
        setSelectedAddress(addressesData[0]);
      }

      if (paymentMethodsData.length > 0) {
        setPrimaryPayment(paymentMethodsData[0]);
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

  useEffect(() => {
    if (items.length === 0) {
      Alert.alert(
        "Keranjang Kosong",
        "Keranjang belanja Anda kosong. Silakan tambahkan produk terlebih dahulu.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/products") }]
      );
      return;
    }

    loadCheckoutData();
  }, [items.length, router]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      Alert.alert("Error", "Masukkan kode promo");
      return;
    }

    try {
      const promoData = await apiService.validatePromoCode(promoCode, totalAmount);
      const diskon = promoData.nilai_diskon ?? promoData.total_diskon ?? 0;
      setPromoDiscount(diskon);
      Alert.alert(
        "Berhasil!",
        `Kode promo berhasil diterapkan. Diskon ${formatPrice(diskon)}`
      );
    } catch (error: any) {
      console.error("Error applying promo:", error);
      Alert.alert("Error", "Kode promo tidak valid atau sudah tidak berlaku");
    }
  };

  // ---- Perhitungan -------------------------------------------------------

  const setelahPromo = Math.max(0, totalAmount - promoDiscount);

  /** Poin: 1 poin = Rp 1, dibatasi saldo & tagihan (CustomerOrderController@hitungPoin). */
  const poinValue = useMemo(() => {
    const maxSaldo = Math.max(0, Math.floor(saldoPoin));
    const maxTagihan = Math.floor(setelahPromo / RUPIAH_PER_POIN);
    const dipakai = Math.max(0, Math.min(poinDigunakan, maxSaldo, maxTagihan));
    return { dipakai, rupiah: dipakai * RUPIAH_PER_POIN, maxSaldo, maxTagihan };
  }, [poinDigunakan, saldoPoin, setelahPromo]);

  const finalTotal = Math.max(0, setelahPromo - poinValue.rupiah);

  const activeSplits = useMemo(
    () =>
      splits
        .map((row) => ({
          metode: row.metode,
          nominal: parseInt(row.nominal, 10) || 0,
        }))
        .filter((row) => row.nominal > 0),
    [splits]
  );

  const splitTotal = activeSplits.reduce((sum, row) => sum + row.nominal, 0);
  const sisaSplit = finalTotal - splitTotal;

  const paymentError = useSplit
    ? validasiSplitPembayaran(
        finalTotal,
        activeSplits.map((row) => ({
          nominal: row.nominal,
          jenis_pembayaran: row.metode.jenis_pembayaran,
        }))
      )
    : null;

  const splitBelumLengkap = useSplit && activeSplits.length < 2;

  const canProceedPayment = useSplit
    ? !paymentError && !splitBelumLengkap
    : !!primaryPayment;

  // ---- Split payment -----------------------------------------------------

  const toggleSplit = () => {
    const next = !useSplit;
    setUseSplit(next);

    if (next && splits.length === 0) {
      const utama = primaryPayment ?? paymentMethods[0];
      const kedua = paymentMethods.find((m) => m.id !== utama?.id);
      if (utama) {
        setSplits([
          { metode: utama, nominal: String(finalTotal) },
          ...(kedua ? [{ metode: kedua, nominal: "" }] : []),
        ]);
      }
    } else if (!next) {
      setSplits([]);
    }
  };

  const addSplitRow = () => {
    if (splits.length >= 4) {
      Alert.alert("Maksimal 4 metode", "Split pembayaran dibatasi 4 metode.");
      return;
    }
    const dipakai = new Set(splits.map((row) => row.metode.id));
    const sisa = paymentMethods.find((m) => !dipakai.has(m.id));
    if (!sisa) {
      Alert.alert("Tidak ada metode lain", "Semua metode sudah dipakai.");
      return;
    }
    setSplits((prev) => [...prev, { metode: sisa, nominal: "" }]);
  };

  const updateSplitNominal = (index: number, value: string) => {
    const bersih = value.replace(/[^0-9]/g, "");
    setSplits((prev) =>
      prev.map((row, i) => (i === index ? { ...row, nominal: bersih } : row))
    );
  };

  const updateSplitMetode = (index: number, metode: PaymentMethod) => {
    setSplits((prev) =>
      prev.map((row, i) => (i === index ? { ...row, metode } : row))
    );
  };

  const removeSplitRow = (index: number) => {
    setSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const isiSisaOtomatis = (index: number) => {
    const lain = splits.reduce(
      (sum, row, i) =>
        i === index ? sum : sum + (parseInt(row.nominal, 10) || 0),
      0
    );
    updateSplitNominal(index, String(Math.max(0, finalTotal - lain)));
  };

  // ---- Poin --------------------------------------------------------------

  const handlePoinChange = (value: string) => {
    const angka = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(angka)) {
      setPoinDigunakan(0);
      return;
    }
    setPoinDigunakan(
      Math.max(0, Math.min(angka, poinValue.maxSaldo, poinValue.maxTagihan))
    );
  };

  const pakaiPoinMaksimal = () => {
    setPoinDigunakan(Math.min(poinValue.maxSaldo, poinValue.maxTagihan));
  };

  // ---- Submit ------------------------------------------------------------

  const metodeTerpilih: PaymentMethod | null = useSplit
    ? (activeSplits[0]?.metode ?? null)
    : primaryPayment;
  const instruksi = metodeTerpilih ? buildPaymentInstruction(metodeTerpilih) : [];

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert("Error", "Pilih alamat pengiriman");
      return;
    }

    if (!useSplit && !primaryPayment) {
      Alert.alert("Error", "Pilih metode pembayaran");
      return;
    }

    if (useSplit && splitBelumLengkap) {
      Alert.alert(
        "Pembayaran belum lengkap",
        "Pembayaran campuran butuh minimal 2 metode dengan nominal."
      );
      return;
    }

    if (useSplit && paymentError) {
      Alert.alert("Pembayaran belum valid", paymentError);
      return;
    }

    const metodeId = useSplit
      ? activeSplits[0]?.metode.id
      : primaryPayment?.id;

    if (!metodeId) {
      Alert.alert("Error", "Pilih metode pembayaran");
      return;
    }

    if (isProcessingOrder) return;

    setIsProcessingOrder(true);

    const fullAddress = `${selectedAddress.alamat_lengkap}, ${selectedAddress.kota}, ${selectedAddress.provinsi} ${selectedAddress.kode_pos}`;

    try {
      const catatanAkhir = useSplit
        ? buildCatatanWithSplit(
            notes,
            activeSplits.map((row) => ({
              nama_metode: row.metode.nama_metode,
              nominal: row.nominal,
            }))
          )
        : notes.trim() || undefined;

      const payload = {
        items: items.map((item) => ({
          produk_id: item.produk_id,
          varian_id: item.varian_id || undefined,
          jumlah: item.quantity,
        })),
        metode_pembayaran_id: metodeId,
        alamat_pengiriman: fullAddress,
        catatan: catatanAkhir,
        promo_code: promoCode.trim() || undefined,
        poin_digunakan: poinValue.dipakai,
      };

      let result;
      try {
        result = await apiService.createOrder(payload);
      } catch (err: any) {
        // Backend punya bug: `riwayat_poin_pelanggan.jenis_transaksi` enum-nya
        // ('dapat','pakai','kadaluarsa','koreksi') tetapi controller menulis
        // 'penggunaan' → MySQL "Data truncated" dan seluruh order 422.
        // Order tanpa poin tetap harus jalan, jadi coba ulang tanpa poin.
        const pesan = String(err?.message ?? "").toLowerCase();
        const gagalKarenaPoin =
          poinValue.dipakai > 0 &&
          (pesan.includes("data truncated") || pesan.includes("poin"));

        if (!gagalKarenaPoin) throw err;

        console.warn("Order dengan poin ditolak backend, ulangi tanpa poin:", err);
        result = await apiService.createOrder({ ...payload, poin_digunakan: 0 });
        Alert.alert(
          "Poin belum bisa dipakai",
          "Server menolak penggunaan poin (bug pencatatan riwayat poin di backend). Pesanan tetap dibuat tanpa poin — poin Anda tidak berkurang."
        );
      }

      await clearCart();

      router.replace({
        pathname: "/checkout/success",
        params: {
          orderNumber: result.nomor_transaksi || "N/A",
          orderId: String(result.id ?? ""),
          totalAmount: String(finalTotal),
          poin: String(poinValue.dipakai),
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

  const handleEditQuantity = async (item: CartItem, next: number) => {
    if (next <= 0) {
      await removeItem(item.id);
      return;
    }
    await updateItemQuantity(item.id, next);
  };

  // ---- Render ------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <Navbar title="Checkout" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Memuat data checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
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
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
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
                  <Text className="text-white font-semibold">Tambah Alamat</Text>
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
                        <Text className="text-gray-600">{address.alamat_lengkap}</Text>
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
                          selectedAddress?.id === address.id ? "#1E40AF" : "#9CA3AF"
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

            {/* Split payment toggle */}
            <View className="bg-white rounded-xl p-4 mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-semibold text-gray-900">
                    Pembayaran Campuran
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    Gabungkan beberapa metode (mis. tunai + transfer).
                  </Text>
                </View>
                <Pressable
                  onPress={toggleSplit}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: useSplit }}
                  className={`w-12 h-7 rounded-full justify-center px-1 ${
                    useSplit ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full bg-white ${
                      useSplit ? "self-end" : "self-start"
                    }`}
                  />
                </Pressable>
              </View>
            </View>

            {!useSplit &&
              paymentMethods.map((method) => (
                <Pressable
                  key={method.id}
                  onPress={() => setPrimaryPayment(method)}
                  className={`bg-white rounded-xl p-4 mb-3 ${
                    primaryPayment?.id === method.id ? "border-2 border-primary" : ""
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900 mb-1">
                        {method.nama_metode}
                      </Text>
                      <Text className="text-gray-600 text-sm">
                        {jenisLabel(method.jenis_pembayaran)}
                      </Text>
                      {Number(method.biaya_admin) > 0 && (
                        <Text className="text-gray-500 text-xs mt-1">
                          Biaya admin: {formatPrice(method.biaya_admin)}
                        </Text>
                      )}
                      {isTransfer(method.jenis_pembayaran) && (
                        <Text
                          className={`text-xs mt-1 ${
                            method.nomor_rekening
                              ? "text-blue-600"
                              : "text-orange-600"
                          }`}
                        >
                          {method.nomor_rekening
                            ? `${method.nomor_rekening} a.n. ${method.atas_nama ?? "-"}`
                            : "Rekening belum diatur admin"}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name={
                        primaryPayment?.id === method.id
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={24}
                      color={primaryPayment?.id === method.id ? "#1E40AF" : "#9CA3AF"}
                    />
                  </View>
                </Pressable>
              ))}

            {useSplit && (
              <View className="bg-white rounded-xl p-4 mb-3">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="font-semibold text-gray-900">
                    Rincian Pembayaran
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Tagihan {formatPrice(finalTotal)}
                  </Text>
                </View>

                {splits.map((row, index) => (
                  <View
                    key={`split-${index}`}
                    className="border border-gray-200 rounded-lg p-3 mb-3"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs font-medium text-gray-500">
                        Metode {index + 1}
                      </Text>
                      {splits.length > 2 && (
                        <Pressable onPress={() => removeSplitRow(index)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </Pressable>
                      )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {paymentMethods.map((method) => (
                        <Pressable
                          key={method.id}
                          onPress={() => updateSplitMetode(index, method)}
                          className={`px-3 py-1.5 rounded-full mr-2 ${
                            row.metode.id === method.id ? "bg-primary" : "bg-gray-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              row.metode.id === method.id
                                ? "text-white"
                                : "text-gray-700"
                            }`}
                          >
                            {method.nama_metode}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <View className="flex-row items-center mt-3">
                      <Text className="text-gray-500 text-sm mr-2">Rp</Text>
                      <TextInput
                        value={row.nominal}
                        onChangeText={(v) => updateSplitNominal(index, v)}
                        keyboardType="number-pad"
                        placeholder="0"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                      />
                      <Pressable
                        onPress={() => isiSisaOtomatis(index)}
                        className="ml-2 px-3 py-2 bg-blue-50 rounded-lg"
                      >
                        <Text className="text-primary text-xs font-semibold">Sisa</Text>
                      </Pressable>
                    </View>

                    {isTransfer(row.metode.jenis_pembayaran) && (
                      <Text className="text-blue-700 text-xs mt-2">
                        {row.metode.nomor_rekening
                          ? `Transfer ke ${row.metode.nomor_rekening} a.n. ${row.metode.atas_nama ?? "-"}`
                          : "Rekening tujuan belum diatur admin"}
                      </Text>
                    )}
                  </View>
                ))}

                <Pressable
                  onPress={addSplitRow}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-3 items-center"
                >
                  <Text className="text-gray-600 text-sm font-medium">
                    + Tambah Metode
                  </Text>
                </Pressable>

                <View className="border-t border-gray-200 mt-3 pt-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-500 text-sm">Sudah dialokasikan</Text>
                    <Text className="text-gray-700 text-sm">
                      {formatPrice(splitTotal)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text
                      className={`text-sm ${
                        sisaSplit > 0 ? "text-orange-600" : "text-green-600"
                      }`}
                    >
                      {sisaSplit > 0 ? "Kurang" : "Kembalian"}
                    </Text>
                    <Text
                      className={`text-sm font-semibold ${
                        sisaSplit > 0 ? "text-orange-600" : "text-green-600"
                      }`}
                    >
                      {formatPrice(Math.abs(sisaSplit))}
                    </Text>
                  </View>
                  {paymentError && (
                    <Text className="text-red-600 text-xs mt-2">{paymentError}</Text>
                  )}
                  {splitBelumLengkap && (
                    <Text className="text-orange-600 text-xs mt-2">
                      Pembayaran campuran butuh minimal 2 metode dengan nominal.
                    </Text>
                  )}
                  <Text className="text-gray-400 text-xs mt-2">
                    Rincian ini ikut tercatat di catatan pesanan agar kasir dapat
                    mencocokkan pembayaran saat verifikasi.
                  </Text>
                </View>
              </View>
            )}

            {/* Instruksi pembayaran */}
            {metodeTerpilih && instruksi.length > 0 && (
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="information-circle" size={18} color="#1D4ED8" />
                  <Text className="font-semibold text-blue-900 ml-2">
                    Instruksi Pembayaran
                  </Text>
                </View>
                {instruksi.map((line, idx) => (
                  <Text key={idx} className="text-blue-800 text-sm leading-5 mb-1">
                    • {line}
                  </Text>
                ))}
                {isTransfer(metodeTerpilih.jenis_pembayaran) &&
                  metodeTerpilih.nomor_rekening && (
                    <View className="bg-white rounded-lg p-3 mt-2">
                      <Text className="text-xs text-gray-500">Nomor Rekening</Text>
                      <Text className="text-base font-bold text-gray-900">
                        {metodeTerpilih.nomor_rekening}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-1">
                        Atas Nama: {metodeTerpilih.atas_nama ?? "-"}
                      </Text>
                    </View>
                  )}
              </View>
            )}

            {/* Promo */}
            <View className="bg-white rounded-xl p-4">
              <Text className="font-semibold mb-3">Kode Promo</Text>
              <View className="flex-row">
                <TextInput
                  value={promoCode}
                  onChangeText={setPromoCode}
                  placeholder="Masukkan kode promo"
                  autoCapitalize="characters"
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

            {/* Poin */}
            <View className="bg-white rounded-xl p-4 mt-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="font-semibold">Gunakan Poin</Text>
                <Text className="text-xs text-gray-500">
                  Saldo {poinValue.maxSaldo.toLocaleString("id-ID")} poin
                </Text>
              </View>
              <Text className="text-gray-500 text-xs mb-3">
                1 poin = {formatPrice(RUPIAH_PER_POIN)}. Maksimal{" "}
                {Math.min(poinValue.maxSaldo, poinValue.maxTagihan).toLocaleString(
                  "id-ID"
                )}{" "}
                poin untuk pesanan ini.
              </Text>

              <View className="flex-row items-center">
                <TextInput
                  value={poinDigunakan > 0 ? String(poinDigunakan) : ""}
                  onChangeText={handlePoinChange}
                  keyboardType="number-pad"
                  placeholder="0"
                  editable={poinValue.maxSaldo > 0}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 bg-gray-50"
                />
                <Pressable
                  onPress={pakaiPoinMaksimal}
                  disabled={poinValue.maxSaldo <= 0}
                  className={`ml-2 px-3 py-2 rounded-xl ${
                    poinValue.maxSaldo > 0 ? "bg-primary" : "bg-gray-300"
                  }`}
                >
                  <Text className="text-white text-xs font-semibold">Maks</Text>
                </Pressable>
              </View>

              {poinValue.dipakai > 0 && (
                <Text className="text-green-600 text-sm mt-2">
                  {poinValue.dipakai.toLocaleString("id-ID")} poin = -
                  {formatPrice(poinValue.rupiah)}
                </Text>
              )}
              {poinValue.maxSaldo <= 0 && (
                <Text className="text-gray-400 text-xs mt-2">
                  Belum ada poin tersedia.
                </Text>
              )}
              {poinValue.maxSaldo > 0 && poinValue.maxTagihan === 0 && (
                <Text className="text-orange-500 text-xs mt-2">
                  Tagihan sudah 0 setelah promo — poin tidak dapat dipakai.
                </Text>
              )}
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="p-4">
            <Text className="text-xl font-bold mb-4">Ringkasan Pesanan</Text>

            {/* Item + edit/hapus */}
            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="font-semibold mb-3">Item Pesanan</Text>
              {items.map((item) => (
                <View key={item.id} className="py-2 border-b border-gray-100">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 pr-2">
                      <Text className="font-medium" numberOfLines={2}>
                        {item.nama_produk}
                      </Text>
                      {item.varian_nama && (
                        <Text className="text-gray-500 text-xs">
                          {item.varian_nama}
                        </Text>
                      )}
                      <Text className="text-gray-500 text-sm">
                        {formatPrice(item.harga)} / item
                      </Text>
                    </View>
                    <Text className="font-medium">{formatPrice(item.subtotal)}</Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-2">
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => handleEditQuantity(item, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full items-center justify-center"
                      >
                        <Ionicons name="remove" size={16} color="#374151" />
                      </Pressable>
                      <Text className="mx-3 font-semibold min-w-[28px] text-center">
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => handleEditQuantity(item, item.quantity + 1)}
                        disabled={item.quantity >= item.stok_tersedia}
                        className={`w-8 h-8 rounded-full items-center justify-center ${
                          item.quantity >= item.stok_tersedia
                            ? "bg-gray-200"
                            : "bg-primary"
                        }`}
                      >
                        <Ionicons
                          name="add"
                          size={16}
                          color={
                            item.quantity >= item.stok_tersedia ? "#9CA3AF" : "white"
                          }
                        />
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => removeItem(item.id)}
                      className="flex-row items-center px-2 py-1"
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text className="text-red-500 text-xs ml-1">Hapus</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            {selectedAddress && (
              <View className="bg-white rounded-xl p-4 mb-4">
                <Text className="font-semibold mb-3">Alamat Pengiriman</Text>
                <Text className="font-medium">{selectedAddress.nama_penerima}</Text>
                <Text className="text-gray-600">{selectedAddress.telepon_penerima}</Text>
                <Text className="text-gray-600 mt-1">
                  {selectedAddress.alamat_lengkap}
                </Text>
                <Text className="text-gray-600">
                  {selectedAddress.kota}, {selectedAddress.provinsi}{" "}
                  {selectedAddress.kode_pos}
                </Text>
              </View>
            )}

            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="font-semibold mb-3">Metode Pembayaran</Text>
              {useSplit ? (
                activeSplits.map((row, idx) => (
                  <View key={idx} className="flex-row justify-between py-1">
                    <Text className="text-gray-700">{row.metode.nama_metode}</Text>
                    <Text className="font-medium">{formatPrice(row.nominal)}</Text>
                  </View>
                ))
              ) : (
                <>
                  <Text className="font-medium">{primaryPayment?.nama_metode}</Text>
                  <Text className="text-gray-600">
                    {jenisLabel(primaryPayment?.jenis_pembayaran)}
                  </Text>
                </>
              )}

              {instruksi.length > 0 && (
                <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                  {instruksi.map((line, idx) => (
                    <Text key={idx} className="text-blue-800 text-xs leading-5 mb-1">
                      • {line}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View className="bg-white rounded-xl p-4 mb-4">
              <Text className="font-semibold mb-3">Catatan Pesanan (Opsional)</Text>
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

              {poinValue.dipakai > 0 && (
                <View className="flex-row justify-between mb-2">
                  <Text className="text-green-600">
                    Poin ({poinValue.dipakai.toLocaleString("id-ID")} poin)
                  </Text>
                  <Text className="text-green-600 font-medium">
                    -{formatPrice(poinValue.rupiah)}
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
              (step === 2 && !canProceedPayment) ||
              (step === 3 && (isProcessingOrder || items.length === 0))
            }
            className={`flex-1 py-3 rounded-xl items-center ${
              (step === 1 && !selectedAddress) ||
              (step === 2 && !canProceedPayment) ||
              (step === 3 && (isProcessingOrder || items.length === 0))
                ? "bg-gray-300"
                : "bg-primary"
            }`}
          >
            {step === 3 && isProcessingOrder ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                className={`font-semibold ${
                  (step === 1 && !selectedAddress) ||
                  (step === 2 && !canProceedPayment)
                    ? "text-gray-500"
                    : "text-white"
                }`}
              >
                {step === 3 ? "Buat Pesanan" : "Lanjutkan"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CheckoutScreen;
