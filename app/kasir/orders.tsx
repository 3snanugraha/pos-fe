import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import {
  StaffApiError,
  StaffSessionUnavailableError,
  clearStaffSession,
  fetchPendingOnlineOrders,
  fetchStaffOrderDetail,
  getStaffUser,
  isCrossOriginWeb,
  loginStaff,
  loginStaffSession,
  onlineOrdersPageUrl,
  rejectOnlineOrder,
  verifyOnlineOrder,
  type StaffUser,
} from "../../services/staffSession";
import { Transaction } from "../../services/types";
import { formatDateTime, useOrderExpiry } from "../../utils/orderExpiry";
import { formatRupiah } from "../../utils/payment";

interface KasirOrder {
  transaction: Transaction;
  items: {
    id: number;
    nama_produk: string;
    nama_varian?: string | null;
    jumlah: number;
    harga: number | string;
    subtotal: number | string;
  }[];
  alamat?: string | null;
  catatan?: string | null;
  total: number;
}

const KasirOrdersScreen = () => {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [orders, setOrders] = useState<KasirOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionMessage, setActionMessage] = useState<{
    tipe: "sukses" | "error";
    teks: string;
  } | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pending = await fetchPendingOnlineOrders();

      // Ambil detail (item + alamat) untuk setiap order pending.
      const details = await Promise.all(
        pending.map(async (trx) => {
          try {
            const detail = await fetchStaffOrderDetail(trx.id);
            return {
              transaction: trx,
              items: detail?.detail_transaksi ?? detail?.items ?? [],
              alamat: detail?.alamat_pengiriman ?? trx.alamat_pengiriman ?? null,
              catatan: detail?.catatan ?? trx.catatan ?? null,
              total: Number(detail?.total_bayar ?? trx.total_bayar) || 0,
            } as KasirOrder;
          } catch {
            return {
              transaction: trx,
              items: [],
              alamat: null,
              catatan: trx.catatan ?? null,
              total: Number(trx.total_bayar) || 0,
            } as KasirOrder;
          }
        })
      );

      setOrders(details);
    } catch (err: any) {
      if (err instanceof StaffSessionUnavailableError) {
        await clearStaffSession();
        setStaff(null);
        setError(err.message);
      } else if (err instanceof StaffApiError && err.status === 401) {
        await clearStaffSession();
        setStaff(null);
        setError("Sesi staf berakhir, silakan login ulang.");
      } else {
        setError(err?.message ?? "Gagal memuat order masuk.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const user = await getStaffUser();
      setStaff(user);
      setCheckingSession(false);
      if (user) loadOrders();
    })();
  }, [loadOrders]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Login", "Email dan password wajib diisi.");
      return;
    }

    setLoggingIn(true);
    setError(null);

    try {
      const user = await loginStaff(email.trim(), password);
      setStaff(user);
      setPassword("");

      // Coba buka sesi web (cookie+CSRF) supaya tombol verify/reject berfungsi.
      try {
        await loginStaffSession(email.trim(), password);
      } catch (sessionError: any) {
        // Tidak fatal: daftar order tetap bisa dibaca via API token.
        Alert.alert(
          "Catatan",
          sessionError?.message ??
            "Sesi web kasir tidak dapat dibuka; verifikasi mungkin gagal."
        );
      }

      await loadOrders();
    } catch (err: any) {
      setError(
        err instanceof StaffApiError
          ? err.message
          : "Login staf gagal. Periksa email/password."
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await clearStaffSession();
    setStaff(null);
    setOrders([]);
    setEmail("");
    setPassword("");
  };

  /**
   * Verifikasi langsung tanpa dialog konfirmasi.
   *
   * Konfirmasi dibuat inline (tombol "Verifikasi" + status baris), bukan
   * `Alert.alert` dengan callback: di web callback Alert tidak selalu jalan,
   * sehingga tombol terasa mati. Inline juga lebih cepat untuk kasir.
   */
  const handleVerify = async (order: KasirOrder) => {
    setBusyId(order.transaction.id);
    setActionMessage(null);

    try {
      const result = await verifyOnlineOrder(order.transaction.id);
      setActionMessage({
        tipe: "sukses",
        teks: `${order.transaction.nomor_transaksi}: ${result.message}`,
      });
      await loadOrders();
    } catch (err: any) {
      if (err instanceof StaffSessionUnavailableError) {
        setActionMessage({
          tipe: "error",
          teks: isCrossOriginWeb()
            ? `${err.message} Rute verifikasi adalah rute web Laravel (cookie + CSRF), sedangkan CORS backend hanya mengizinkan path api/*. Buka halaman kasir backend untuk memverifikasi pesanan ini.`
            : err.message,
        });
      } else {
        setActionMessage({
          tipe: "error",
          teks: err?.message ?? "Verifikasi gagal.",
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (order: KasirOrder) => {
    setBusyId(order.transaction.id);
    setActionMessage(null);
    try {
      const result = await rejectOnlineOrder(order.transaction.id, rejectReason.trim());
      setActionMessage({
        tipe: "sukses",
        teks: `${order.transaction.nomor_transaksi}: ${result.message}`,
      });
      setRejectingId(null);
      setRejectReason("");
      await loadOrders();
    } catch (err: any) {
      if (err instanceof StaffSessionUnavailableError) {
        setActionMessage({ tipe: "error", teks: err.message });
      } else {
        setActionMessage({
          tipe: "error",
          teks: err?.message ?? "Penolakan gagal.",
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  // ---- Login gate --------------------------------------------------------

  if (checkingSession) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <Navbar title="Order Masuk" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!staff) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <Navbar title="Order Masuk (Kasir)" showBackButton={true} />
        <ScrollView className="flex-1 p-4">
          <View className="bg-white rounded-xl p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="shield-checkmark-outline" size={22} color="#1E40AF" />
              <Text className="font-bold text-lg ml-2">Login Kasir / Admin</Text>
            </View>
            <Text className="text-gray-500 text-sm mb-4">
              Hanya akun Admin atau Super Admin yang dapat memakai endpoint API
              staf. Akun kasir dapat memverifikasi lewat halaman web kasir.
            </Text>

            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="admin@toko.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-gray-300 rounded-xl px-3 py-2 bg-gray-50 mb-3"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              className="border border-gray-300 rounded-xl px-3 py-2 bg-gray-50 mb-4"
            />

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <Text className="text-red-700 text-sm">{error}</Text>
              </View>
            )}

            <Pressable
              onPress={handleLogin}
              disabled={loggingIn}
              className={`py-3 rounded-xl items-center ${
                loggingIn ? "bg-gray-300" : "bg-primary"
              }`}
            >
              {loggingIn ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">Masuk</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Daftar order ------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Navbar
        title="Order Masuk"
        showBackButton={true}
        rightAction={
          <Pressable onPress={handleLogout} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color="white" />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          <View className="bg-white rounded-xl p-3 mb-4 flex-row items-center">
            <Ionicons name="person-circle-outline" size={22} color="#1E40AF" />
            <View className="ml-2 flex-1">
              <Text className="font-medium text-gray-900 text-sm">
                {staff.name}
              </Text>
              <Text className="text-gray-500 text-xs">{staff.role}</Text>
            </View>
            <Pressable onPress={onRefresh} className="p-1">
              <Ionicons name="refresh" size={18} color="#1E40AF" />
            </Pressable>
          </View>

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          )}

          {actionMessage && (
            <View
              className={`border rounded-lg p-3 mb-4 ${
                actionMessage.tipe === "sukses"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <Text
                className={`text-sm ${
                  actionMessage.tipe === "sukses"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {actionMessage.teks}
              </Text>
              {actionMessage.tipe === "error" && (
                <Pressable
                  onPress={() =>
                    Linking.openURL(onlineOrdersPageUrl()).catch(() => {})
                  }
                  className="mt-2 self-start px-3 py-1.5 bg-red-600 rounded-lg"
                >
                  <Text className="text-white text-xs font-semibold">
                    Buka Halaman Kasir Backend
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {loading && orders.length === 0 ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-gray-500 mt-3">Memuat order masuk...</Text>
            </View>
          ) : orders.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons name="checkmark-done-circle-outline" size={64} color="#9CA3AF" />
              <Text className="text-gray-600 font-semibold mt-4">
                Tidak ada order menunggu
              </Text>
              <Text className="text-gray-400 text-sm mt-1 text-center">
                Semua pesanan online sudah diverifikasi atau ditolak.
              </Text>
            </View>
          ) : (
            orders.map((order) => (
              <KasirOrderCard
                key={order.transaction.id}
                order={order}
                busy={busyId === order.transaction.id}
                rejecting={rejectingId === order.transaction.id}
                rejectReason={rejectReason}
                onChangeRejectReason={setRejectReason}
                onVerify={() => handleVerify(order)}
                onStartReject={() =>
                  setRejectingId(
                    rejectingId === order.transaction.id
                      ? null
                      : order.transaction.id
                  )
                }
                onConfirmReject={() => handleReject(order)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface KasirOrderCardProps {
  order: KasirOrder;
  busy: boolean;
  rejecting: boolean;
  rejectReason: string;
  onChangeRejectReason: (v: string) => void;
  onVerify: () => void;
  onStartReject: () => void;
  onConfirmReject: () => void;
}

const KasirOrderCard = ({
  order,
  busy,
  rejecting,
  rejectReason,
  onChangeRejectReason,
  onVerify,
  onStartReject,
  onConfirmReject,
}: KasirOrderCardProps) => {
  const expiry = useOrderExpiry(order.transaction.order_expires_at, "pending");
  const trx = order.transaction;

  return (
    <View className="bg-white rounded-xl p-4 mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">
            {trx.nomor_transaksi}
          </Text>
          <Text className="text-gray-500 text-xs">
            {formatDateTime(trx.tanggal_transaksi)}
          </Text>
          {trx.pelanggan?.nama_pelanggan && (
            <Text className="text-gray-600 text-xs mt-1">
              {trx.pelanggan.nama_pelanggan}
              {trx.pelanggan.telepon ? ` • ${trx.pelanggan.telepon}` : ""}
            </Text>
          )}
        </View>
        <View className="bg-yellow-100 px-2 py-1 rounded-full">
          <Text className="text-yellow-800 text-xs font-medium">Menunggu</Text>
        </View>
      </View>

      {expiry.expired ? (
        <Text className="text-red-600 text-xs mb-2">Order sudah kedaluwarsa</Text>
      ) : expiry.countdown ? (
        <Text className="text-orange-600 text-xs mb-2">
          Sisa waktu bayar {expiry.countdown}
        </Text>
      ) : null}

      <View className="border-t border-gray-100 pt-2 mb-2">
        {order.items.length === 0 ? (
          <Text className="text-gray-400 text-xs">Detail item tidak tersedia</Text>
        ) : (
          order.items.map((item) => (
            <View key={item.id} className="flex-row justify-between py-1">
              <Text className="text-gray-700 text-sm flex-1 pr-2" numberOfLines={1}>
                {item.jumlah}x {item.nama_produk}
                {item.nama_varian ? ` (${item.nama_varian})` : ""}
              </Text>
              <Text className="text-gray-600 text-sm">
                {formatRupiah(Number(item.subtotal) || 0)}
              </Text>
            </View>
          ))
        )}
      </View>

      {order.alamat && (
        <View className="bg-gray-50 rounded-lg p-2 mb-2">
          <Text className="text-gray-500 text-xs">Kirim ke</Text>
          <Text className="text-gray-700 text-xs">{order.alamat}</Text>
        </View>
      )}

      {order.catatan && (
        <View className="bg-yellow-50 rounded-lg p-2 mb-2">
          <Text className="text-gray-500 text-xs">Catatan pelanggan</Text>
          <Text className="text-gray-700 text-xs">{order.catatan}</Text>
        </View>
      )}

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-gray-500 text-sm">
          {trx.metode_pembayaran || "Tunai"}
        </Text>
        <Text className="font-bold text-primary">{formatRupiah(order.total)}</Text>
      </View>

      {rejecting && (
        <View className="mb-2">
          <TextInput
            value={rejectReason}
            onChangeText={onChangeRejectReason}
            placeholder="Alasan penolakan (opsional)"
            className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 mb-2"
          />
          <Pressable
            onPress={onConfirmReject}
            disabled={busy}
            className={`py-2 rounded-lg items-center ${
              busy ? "bg-gray-300" : "bg-red-500"
            }`}
          >
            <Text className="text-white text-sm font-semibold">
              Tolak Pesanan
            </Text>
          </Pressable>
        </View>
      )}

      <View className="flex-row space-x-2">
        <Pressable
          onPress={onStartReject}
          disabled={busy}
          className={`flex-1 py-2 rounded-lg items-center border border-red-400 ${
            busy ? "opacity-50" : ""
          }`}
        >
          <Text className="text-red-500 text-sm font-semibold">
            {rejecting ? "Batal Tolak" : "Tolak"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onVerify}
          disabled={busy}
          className={`flex-1 py-2 rounded-lg items-center ${
            busy ? "bg-gray-300" : "bg-primary"
          }`}
        >
          {busy ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-white text-sm font-semibold">Verifikasi</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default KasirOrdersScreen;
