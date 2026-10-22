import {
  CheckCheck,
  Clock,
  LogOut,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Skeleton, StickyBar } from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button, EmptyState, Input } from "../../src/components/ui";
import { rupiah, tanggalWaktu } from "../../src/lib/format";
import { teks } from "../../src/lib/i18n";
import { colors, sizes } from "../../src/theme/tokens";
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
import type { Transaction } from "../../services/types";
import { useOrderExpiry } from "../../utils/orderExpiry";

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

/**
 * Order Masuk (Kasir) Zovora — guideline §3.2 (form login) + §3.9 (kartu) + §5.
 *
 * Dua keadaan: gate login staf (form email + password di kartu putih) dan
 * daftar order pending dengan aksi Verifikasi / Tolak inline. Semua logika
 * sesi staf (`loginStaff`, `loginStaffSession`, `verifyOnlineOrder`,
 * `rejectOnlineOrder`) tidak berubah — hanya tampilan dan copy yang
 * dilokalisasi. Konfirmasi tidak memakai `Alert` (callback tidak jalan di web).
 */
export default function KasirOrdersScreen() {
  const router = useRouter();
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
        setError(teks.kasir.sesiBerakhir);
      } else {
        setError(err?.message ?? teks.kasir.muatGagal);
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
      setError(teks.kasir.emailWajib);
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
        setActionMessage({
          tipe: "error",
          teks:
            sessionError?.message ??
            teks.kasir.loginDeskripsi,
        });
      }

      await loadOrders();
    } catch (err: any) {
      setError(
        err instanceof StaffApiError ? err.message : teks.kasir.loginGagal
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
          teks: err?.message ?? teks.kasir.verifikasiGagal,
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
      const result = await rejectOnlineOrder(
        order.transaction.id,
        rejectReason.trim()
      );
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
          teks: err?.message ?? teks.kasir.tolakGagal,
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

  // ---- Gate login staf ---------------------------------------------------

  if (checkingSession) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.kasir.judul} onBack={() => router.back()} />
        <View className="px-4 pt-4">
          <View className="rounded-lg border border-neutral-200 bg-white p-4">
            <Skeleton height={16} width="45%" />
            <Skeleton height={12} width="90%" className="mt-3" />
            <Skeleton height={48} width="100%" className="mt-4" />
            <Skeleton height={48} width="100%" className="mt-4" />
            <Skeleton height={48} width="100%" className="mt-4" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!staff) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.kasir.judulLengkap} onBack={() => router.back()} />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-lg border border-neutral-200 bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <View
                className="items-center justify-center rounded-full bg-primary-100"
                style={{ width: 36, height: 36 }}
              >
                <ShieldCheck size={20} color={colors.primary600} strokeWidth={1.75} />
              </View>
              <Text
                className="flex-1 font-inter-semibold text-base text-neutral-900"
                accessibilityRole="header"
                maxFontSizeMultiplier={1.3}
              >
                {teks.kasir.loginJudul}
              </Text>
            </View>
            <Text
              className="mb-4 font-inter text-xs text-neutral-500"
              maxFontSizeMultiplier={1.3}
            >
              {teks.kasir.loginDeskripsi}
            </Text>

            <View style={{ gap: 16 }}>
              <Input
                label={teks.field.email}
                value={email}
                onChangeText={setEmail}
                placeholder={teks.kasir.emailPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loggingIn}
              />
              <Input
                label={teks.field.password}
                value={password}
                onChangeText={setPassword}
                placeholder={teks.kasir.passwordPlaceholder}
                password
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!loggingIn}
                onSubmitEditing={handleLogin}
              />
            </View>

            {error ? (
              <View className="mt-4 rounded-md border border-danger-100 bg-danger-50 p-3">
                <Text className="font-inter text-xs text-danger-700">{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <StickyBar>
          <Button
            title={teks.kasir.masuk}
            loading={loggingIn}
            fullWidth
            onPress={handleLogin}
          />
        </StickyBar>
      </SafeAreaView>
    );
  }

  // ---- Daftar order ------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar
        title={teks.kasir.judul}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel={teks.kasir.keluar}
            hitSlop={sizes.hitSlop}
            className="h-11 w-11 items-center justify-center"
          >
            <LogOut size={22} color={colors.neutral700} strokeWidth={1.75} />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary600]}
            tintColor={colors.primary600}
          />
        }
      >
        {/* Identitas staf */}
        <View className="mb-4 flex-row items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
          <View
            className="items-center justify-center rounded-full bg-primary-100"
            style={{ width: 36, height: 36 }}
          >
            <ShieldCheck size={20} color={colors.primary600} strokeWidth={1.75} />
          </View>
          <View className="flex-1">
            <Text
              className="font-inter-medium text-sm text-neutral-900"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {staff.name}
            </Text>
            <Text
              className="font-inter text-xs text-neutral-500"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {staff.role}
            </Text>
          </View>
          <Pressable
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel={teks.a11y.muatUlang}
            hitSlop={sizes.hitSlop}
            className="h-11 w-11 items-center justify-center"
          >
            <RefreshCw size={18} color={colors.primary700} strokeWidth={1.75} />
          </Pressable>
        </View>

        {error ? (
          <View className="mb-4">
            <ErrorState pesan={error} onRetry={loadOrders} kompak />
          </View>
        ) : null}

        {actionMessage ? (
          <View
            className={`mb-4 rounded-md border p-3 ${
              actionMessage.tipe === "sukses"
                ? "border-success-100 bg-success-100"
                : "border-danger-100 bg-danger-50"
            }`}
            accessibilityRole="alert"
          >
            <Text
              className={`font-inter text-xs ${
                actionMessage.tipe === "sukses" ? "text-success-700" : "text-danger-700"
              }`}
            >
              {actionMessage.teks}
            </Text>
            {actionMessage.tipe === "error" ? (
              <Pressable
                onPress={() => Linking.openURL(onlineOrdersPageUrl()).catch(() => {})}
                accessibilityRole="link"
                accessibilityLabel={teks.kasir.bukaHalamanKasir}
                className="mt-2 min-h-[44px] justify-center self-start"
              >
                <Text className="font-inter-medium text-xs text-primary-700">
                  {teks.kasir.bukaHalamanKasir}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {loading && orders.length === 0 ? (
          <View>
            {[0, 1].map((i) => (
              <View
                key={i}
                className="mb-3 rounded-lg border border-neutral-200 bg-white p-4"
              >
                <Skeleton height={14} width="50%" />
                <Skeleton height={12} width="35%" className="mt-2" />
                <Skeleton height={12} width="80%" className="mt-4" />
                <Skeleton height={40} width="100%" className="mt-4" />
              </View>
            ))}
          </View>
        ) : orders.length === 0 ? (
          <View className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <EmptyState
              icon={<PackageCheck size={36} color={colors.primary600} strokeWidth={1.75} />}
              title={teks.kasir.kosong.judul}
              description={teks.kasir.kosong.deskripsi}
            />
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
                  rejectingId === order.transaction.id ? null : order.transaction.id
                )
              }
              onConfirmReject={() => handleReject(order)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
    <View className="mb-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <View className="p-4">
        <View className="mb-2 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text
              className="font-inter-semibold text-sm text-neutral-900"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {trx.nomor_transaksi}
            </Text>
            <Text
              className="font-inter text-xs text-neutral-500"
              maxFontSizeMultiplier={1.3}
            >
              {tanggalWaktu(trx.tanggal_transaksi)}
            </Text>
            {trx.pelanggan?.nama_pelanggan ? (
              <Text
                className="mt-1 font-inter text-xs text-neutral-700"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {trx.pelanggan.nama_pelanggan}
                {trx.pelanggan.telepon ? ` · ${trx.pelanggan.telepon}` : ""}
              </Text>
            ) : null}
          </View>
          <View className="rounded-full bg-warning-100 px-2.5 py-1">
            <Text
              className="font-inter-medium text-xs text-warning-700"
              maxFontSizeMultiplier={1.3}
            >
              {teks.kasir.menunggu}
            </Text>
          </View>
        </View>

        {expiry.expired ? (
          <View className="mb-2 flex-row items-center gap-1.5">
            <XCircle size={14} color={colors.danger700} strokeWidth={1.75} />
            <Text className="font-inter text-xs text-danger-700">
              {teks.kasir.kedaluwarsa}
            </Text>
          </View>
        ) : expiry.countdown ? (
          <View className="mb-2 flex-row items-center gap-1.5">
            <Clock size={14} color={colors.warning700} strokeWidth={1.75} />
            <Text className="font-inter text-xs text-warning-700 tabular-nums">
              {teks.kasir.sisaWaktu.replace("{waktu}", expiry.countdown)}
            </Text>
          </View>
        ) : null}

        <View className="mb-2 border-t border-neutral-100 pt-2">
          {order.items.length === 0 ? (
            <Text className="font-inter text-xs text-neutral-500">
              {teks.kasir.itemTidakAda}
            </Text>
          ) : (
            order.items.map((item) => (
              <View key={item.id} className="flex-row justify-between gap-2 py-1">
                <Text
                  className="flex-1 font-inter text-sm text-neutral-700"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {item.jumlah}× {item.nama_produk}
                  {item.nama_varian ? ` (${item.nama_varian})` : ""}
                </Text>
                <Text
                  className="font-inter text-sm text-neutral-700 tabular-nums"
                  maxFontSizeMultiplier={1.3}
                >
                  {rupiah(Number(item.subtotal) || 0)}
                </Text>
              </View>
            ))
          )}
        </View>

        {order.alamat ? (
          <View className="mb-2 rounded-md bg-neutral-50 p-2">
            <Text className="font-inter text-caption text-neutral-500">
              {teks.kasir.kirimKe}
            </Text>
            <Text className="font-inter text-xs text-neutral-700">{order.alamat}</Text>
          </View>
        ) : null}

        {order.catatan ? (
          <View className="mb-2 rounded-md bg-warning-50 p-2">
            <Text className="font-inter text-caption text-neutral-500">
              {teks.kasir.catatanPelanggan}
            </Text>
            <Text className="font-inter text-xs text-neutral-700">{order.catatan}</Text>
          </View>
        ) : null}

        <View className="mb-3 flex-row items-center justify-between gap-2">
          <Text
            className="flex-1 font-inter text-xs text-neutral-500"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {trx.metode_pembayaran || teks.checkout.cod}
          </Text>
          <Text
            className="font-inter-bold text-base text-neutral-900 tabular-nums"
            maxFontSizeMultiplier={1.3}
          >
            {rupiah(order.total)}
          </Text>
        </View>

        {rejecting ? (
          <View className="mb-2">
            <TextInput
              value={rejectReason}
              onChangeText={onChangeRejectReason}
              placeholder={teks.kasir.alasanPlaceholder}
              placeholderTextColor={colors.neutral400}
              accessibilityLabel={teks.kasir.alasanPlaceholder}
              multiline
              className="mb-2 rounded-md border border-neutral-200 bg-white px-3 py-2 font-inter text-sm text-neutral-900"
              style={{ minHeight: 56 }}
            />
            <Button
              title={teks.kasir.tolakPesanan}
              variant="outline"
              size="md"
              fullWidth
              loading={busy}
              className="border-danger-500"
              onPress={onConfirmReject}
            />
          </View>
        ) : null}

        <View className="flex-row gap-2">
          <Button
            title={rejecting ? teks.kasir.batalTolak : teks.kasir.tolak}
            variant="outline"
            size="md"
            className="flex-1 border-danger-500"
            disabled={busy}
            icon={<XCircle size={16} color={colors.danger700} strokeWidth={1.75} />}
            onPress={onStartReject}
          />
          <Button
            title={teks.kasir.verifikasi}
            size="md"
            className="flex-1"
            loading={busy}
            icon={<CheckCheck size={16} color={colors.white} strokeWidth={1.75} />}
            onPress={onVerify}
          />
        </View>
      </View>
    </View>
  );
};
