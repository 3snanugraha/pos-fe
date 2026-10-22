import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { apiService } from "../../services/apiService";
import { OrderDetail } from "../../services/types";
import { formatDateTime, useOrderExpiry } from "../../utils/orderExpiry";
import {
  buildPaymentInstruction,
  formatRupiah,
  isTransfer,
  jenisLabel,
  parseSplitFromCatatan,
  stripSplitFromCatatan,
} from "../../utils/payment";
import { printOrderReceipt } from "../../utils/printReceipt";

const formatPrice = formatRupiah;

const STATUS_COLORS: { [key: string]: { bg: string; text: string } } = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  selesai: { bg: "bg-green-100", text: "text-green-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  dibatalkan: { bg: "bg-red-100", text: "text-red-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" },
  retur: { bg: "bg-purple-100", text: "text-purple-700" },
  // status lama
  confirmed: { bg: "bg-blue-100", text: "text-blue-700" },
  processing: { bg: "bg-indigo-100", text: "text-indigo-700" },
  shipped: { bg: "bg-purple-100", text: "text-purple-700" },
  delivered: { bg: "bg-green-100", text: "text-green-700" },
};

const STATUS_LABELS: { [key: string]: string } = {
  pending: "Menunggu Verifikasi Kasir",
  selesai: "Selesai / Diterima Kasir",
  completed: "Selesai",
  dibatalkan: "Dibatalkan / Ditolak",
  cancelled: "Dibatalkan",
  retur: "Diretur",
  confirmed: "Dikonfirmasi",
  processing: "Diproses",
  shipped: "Dikirim",
  delivered: "Selesai",
};

const STATUS_ICONS: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  pending: "time-outline",
  selesai: "checkmark-done-circle-outline",
  completed: "checkmark-done-circle-outline",
  dibatalkan: "close-circle-outline",
  cancelled: "close-circle-outline",
  retur: "return-down-back-outline",
  confirmed: "checkmark-circle-outline",
  processing: "cog-outline",
  shipped: "car-outline",
  delivered: "checkmark-done-circle-outline",
};

const STATUS_TEXT_COLOR: { [key: string]: string } = {
  "text-yellow-700": "#B45309",
  "text-blue-700": "#1D4ED8",
  "text-indigo-700": "#4338CA",
  "text-purple-700": "#7C3AED",
  "text-green-700": "#15803D",
  "text-red-700": "#DC2626",
};

/** Tahapan status yang dilihat pelanggan. */
const TIMELINE = [
  { key: "pending", label: "Order dibuat", desc: "Menunggu verifikasi kasir" },
  { key: "selesai", label: "Diterima & diproses", desc: "Kasir memverifikasi pesanan" },
  { key: "finish", label: "Selesai", desc: "Pembayaran lunas" },
];

const OrderDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      const result = await apiService.getOrderDetails(parseInt(id, 10));
      const orderData = (result as any)?.data || result;
      setOrder(orderData as OrderDetail);
    } catch (error) {
      console.error("Error loading order:", error);
      Alert.alert("Error", "Gagal memuat detail pesanan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const status = (order?.status_transaksi ?? order?.status ?? "pending") as string;
  const expiry = useOrderExpiry(order?.order_expires_at, status);

  /** Segarkan otomatis saat kasir memverifikasi/menolak order. */
  useEffect(() => {
    if (!order) return;
    if (status !== "pending") return;

    const poll = setInterval(() => {
      loadOrder();
    }, 20000);

    return () => clearInterval(poll);
  }, [order, status, loadOrder]);

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
              await loadOrder();
              Alert.alert("Berhasil", "Pesanan telah dibatalkan");
            } catch (error: any) {
              console.error("Error cancelling order:", error);
              Alert.alert(
                "Error",
                error?.message || "Gagal membatalkan pesanan. Silakan coba lagi."
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handlePrint = async () => {
    if (!order) return;
    setPrinting(true);
    try {
      // `printReceipt` mengharapkan angka, sedangkan backend mengirim desimal
      // sebagai string — normalisasi dulu.
      const success = await printOrderReceipt({
        id: order.id,
        nomor_transaksi: order.nomor_transaksi,
        tanggal_transaksi: order.tanggal_transaksi,
        total_harga: Number(order.total_harga) || 0,
        total_diskon: Number(order.total_diskon) || 0,
        total_bayar: Number(order.total_bayar) || 0,
        status: order.status,
        metode_pembayaran: {
          nama: order.metode_pembayaran?.nama ?? "Tunai",
          jenis: order.metode_pembayaran?.jenis ?? "tunai",
        },
        alamat_pengiriman: order.alamat_pengiriman ?? null,
        catatan: stripSplitFromCatatan(order.catatan) || null,
        items: (order.items ?? []).map((item) => ({
          nama_produk: item.nama_produk,
          nama_varian: item.nama_varian ?? null,
          jumlah: item.jumlah,
          harga: Number(item.harga) || 0,
          subtotal: Number(item.subtotal) || 0,
        })),
      });
      if (!success) {
        Alert.alert(
          "Aplikasi Tidak Ditemukan",
          "Untuk mencetak struk, silakan install aplikasi RawBT atau Thermer dari Play Store.",
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Buka Play Store",
              onPress: () => {
                Linking.openURL("market://details?id=ru.a402d.rawbtprinter").catch(
                  () => {}
                );
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", "Gagal mencetak struk");
    } finally {
      setPrinting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrder();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <Navbar title="Detail Pesanan" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
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

  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const statusLabel = expiry.expired
    ? "Kedaluwarsa — menunggu pembatalan kasir"
    : STATUS_LABELS[status] || status;
  const statusIcon = STATUS_ICONS[status] || "help-circle-outline";
  const canCancel = status === "pending" || status === "confirmed";

  const metode = order.metode_pembayaran;
  const instruksi = metode
    ? buildPaymentInstruction({
        nama_metode: metode.nama,
        jenis_pembayaran: metode.jenis,
        nomor_rekening: metode.nomor_rekening ?? null,
        atas_nama: metode.atas_nama ?? null,
        instruksi: metode.instruksi ?? null,
      })
    : [];
  const splitInfo = parseSplitFromCatatan(order.catatan);
  const catatanBersih = stripSplitFromCatatan(order.catatan);

  const timelineIndex =
    status === "selesai" || status === "completed" || status === "delivered"
      ? 2
      : status === "pending"
        ? 0
        : -1;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Navbar title={`Pesanan #${order.id}`} showBackButton={true} />
      <ScrollView
        className="flex-1"
        refreshControl={
          <Pressable onPress={handleRefresh}>
            <Text className="text-center text-primary py-2 text-xs">
              {refreshing ? "Memuat ulang..." : "Tarik / ketuk untuk memuat ulang"}
            </Text>
          </Pressable>
        }
      >
        {/* Status Header */}
        <View className="bg-white p-4 mx-4 mt-4 rounded-xl">
          <View className="flex-row items-center mb-3">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${statusColor.bg}`}
            >
              <Ionicons
                name={statusIcon}
                size={24}
                color={STATUS_TEXT_COLOR[statusColor.text] ?? "#DC2626"}
              />
            </View>
            <View className="flex-1">
              <View className={`self-start px-3 py-1 rounded-full ${statusColor.bg} mb-1`}>
                <Text className={`text-sm font-medium ${statusColor.text}`}>
                  {statusLabel}
                </Text>
              </View>
              <Text className="text-gray-500 text-sm">
                {formatDateTime(order.tanggal_transaksi || order.created_at)}
              </Text>
            </View>
          </View>

          {order.nomor_transaksi && (
            <Text className="text-gray-400 text-xs">
              No. Transaksi: {order.nomor_transaksi}
            </Text>
          )}

          {/* Countdown kedaluwarsa */}
          {status === "pending" &&
            order.order_expires_at &&
            (expiry.expired ? (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <Text className="text-red-700 text-sm font-semibold">
                  Pesanan kedaluwarsa
                </Text>
                <Text className="text-red-600 text-xs mt-1">
                  Batas pembayaran {formatDateTime(order.order_expires_at)} sudah
                  terlewat. Pesanan akan otomatis dibatalkan oleh kasir.
                </Text>
              </View>
            ) : (
              <View className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-orange-800 text-xs">
                      Batas pembayaran
                    </Text>
                    <Text className="text-orange-900 font-bold text-lg">
                      {expiry.countdown}
                    </Text>
                  </View>
                  <Ionicons name="timer-outline" size={28} color="#C2410C" />
                </View>
                <Text className="text-orange-700 text-xs mt-1">
                  s.d. {formatDateTime(order.order_expires_at)}
                </Text>
              </View>
            ))}

          {/* Timeline status */}
          {timelineIndex >= 0 && (
            <View className="mt-4">
              {TIMELINE.map((tahap, idx) => {
                const selesaiTahap = idx <= timelineIndex;
                return (
                  <View key={tahap.key} className="flex-row">
                    <View className="items-center mr-3">
                      <View
                        className={`w-6 h-6 rounded-full items-center justify-center ${
                          selesaiTahap ? "bg-primary" : "bg-gray-200"
                        }`}
                      >
                        {selesaiTahap ? (
                          <Ionicons name="checkmark" size={14} color="white" />
                        ) : (
                          <View className="w-2 h-2 rounded-full bg-gray-400" />
                        )}
                      </View>
                      {idx < TIMELINE.length - 1 && (
                        <View
                          className={`w-0.5 h-8 ${
                            idx < timelineIndex ? "bg-primary" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </View>
                    <View className="flex-1 pb-3">
                      <Text
                        className={`text-sm font-medium ${
                          selesaiTahap ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {tahap.label}
                      </Text>
                      <Text className="text-gray-400 text-xs">{tahap.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {status === "dibatalkan" || status === "cancelled" ? (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <Text className="text-red-700 text-sm font-semibold">
                Pesanan ditolak / dibatalkan
              </Text>
              <Text className="text-red-600 text-xs mt-1">
                Poin yang terpakai sudah dikembalikan otomatis. Silakan buat pesanan
                baru atau hubungi kasir untuk informasi lebih lanjut.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Instruksi pembayaran */}
        {instruksi.length > 0 && status === "pending" && (
          <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
            <View className="flex-row items-center mb-2">
              <Ionicons name="wallet-outline" size={18} color="#1D4ED8" />
              <Text className="font-bold text-base ml-2">Instruksi Pembayaran</Text>
            </View>
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
                <Text className="text-base font-bold text-gray-900">
                  {metode.nomor_rekening}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  Atas Nama: {metode.atas_nama ?? "-"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Item */}
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

        {/* Alamat */}
        {order.alamat_pengiriman && (
          <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
            <View className="flex-row items-center mb-2">
              <Ionicons name="location-outline" size={18} color="#6B7280" />
              <Text className="font-bold text-base ml-2">Alamat Pengiriman</Text>
            </View>
            <Text className="text-gray-600 leading-5">{order.alamat_pengiriman}</Text>
          </View>
        )}

        {/* Metode pembayaran + split */}
        <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="card-outline" size={18} color="#6B7280" />
            <Text className="font-bold text-base ml-2">Metode Pembayaran</Text>
          </View>
          <Text className="text-gray-600">{metode?.nama || "Tunai"}</Text>
          {metode?.jenis && (
            <Text className="text-gray-400 text-sm capitalize">
              {jenisLabel(metode.jenis)}
            </Text>
          )}

          {splitInfo && (
            <View className="bg-gray-50 rounded-lg p-3 mt-2">
              <Text className="text-xs text-gray-500 mb-1">
                Rincian pembayaran campuran
              </Text>
              <Text className="text-gray-700 text-sm">{splitInfo}</Text>
            </View>
          )}

          {order.status_pembayaran && (
            <Text className="text-gray-400 text-xs mt-2">
              Status pembayaran: {order.status_pembayaran.replace(/_/g, " ")}
            </Text>
          )}
        </View>

        {/* Catatan */}
        {catatanBersih.length > 0 && (
          <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
            <View className="flex-row items-center mb-2">
              <Ionicons name="document-text-outline" size={18} color="#6B7280" />
              <Text className="font-bold text-base ml-2">Catatan</Text>
            </View>
            <Text className="text-gray-600 leading-5">{catatanBersih}</Text>
          </View>
        )}

        {/* Rincian harga */}
        <View className="bg-white p-4 mx-4 mt-3 rounded-xl">
          <Text className="font-bold text-base mb-3">Rincian Pembayaran</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-500">Subtotal Produk</Text>
            <Text className="text-gray-700">{formatPrice(order.total_harga)}</Text>
          </View>
          {Number(order.total_diskon) > 0 && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-500">Diskon (promo + poin)</Text>
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

        {/* Aksi */}
        <View className="mx-4 mt-4 mb-6">
          <Pressable
            onPress={handlePrint}
            disabled={printing}
            className={`bg-primary rounded-xl py-3 items-center mb-3 ${
              printing ? "opacity-50" : ""
            }`}
          >
            <View className="flex-row items-center">
              {printing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name="print-outline"
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text className="text-white font-semibold text-base">
                {printing ? "Mencetak..." : "Cetak Struk"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push("/orders")}
            className="border-2 border-gray-300 rounded-xl py-3 items-center mb-3"
          >
            <Text className="text-gray-700 font-semibold text-base">
              Kembali ke Riwayat
            </Text>
          </Pressable>

          {canCancel && (
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
          )}
        </View>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderDetailScreen;
