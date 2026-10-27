import { BellOff, CheckCheck } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorState, NotificationItem, Skeleton } from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button, Dialog, EmptyState } from "../../src/components/ui";
import { paddingBawahKonten } from "../../src/lib/inset";
import { teks } from "../../src/lib/i18n";
import { colors } from "../../src/theme/tokens";
import { apiService } from "../../services/apiService";
import type { Notification } from "../../services/types";
import { useNotifikasiMasuk, useRealtime, type PesanRealtime } from "../../src/lib/realtime/RealtimeProvider";
import { TombolSuara } from "../../src/components/notifikasi/TombolSuara";
import { getErrorMessage, handleAuthError } from "../../utils/auth";
import { kembaliAman } from "../../src/lib/navigasi";
import { getStaffUser } from "../../services/staffSession";

/**
 * Notifikasi Zovora — guideline §3.15 + §5.
 *
 * AppBar dengan menu ellipsis berisi "Tandai semua dibaca", chip filter
 * Semua/Belum dibaca, daftar `NotificationItem` (ikon 20 dalam lingkaran 36
 * dengan tint per tipe, judul semibold, isi maks 2 baris, waktu relatif, dot
 * unread danger-500), dan empty state "Belum Ada Notifikasi!".
 *
 * Normalisasi field dan navigasi per tipe dipertahankan dari versi lama
 * (backend mengirim `dibaca`/`jenis_notifikasi`/`isi_notifikasi`).
 */
const NotificationsScreen = () => {
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/");
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  /** null = tertutup, "menu" = pilihan, "konfirmasi" = konfirmasi tandai. */
  const [dialog, setDialog] = useState<"menu" | "konfirmasi" | null>(null);
  const [menandai, setMenandai] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await apiService.getNotifications({ per_page: 50 });
      // Backend mengirim flag `dibaca`; app memakai `is_read`.
      const rows = (result.data ?? []).map((n: any) => ({
        ...n,
        is_read: n.is_read ?? n.dibaca ?? false,
        tipe: n.tipe ?? n.jenis_notifikasi ?? "system",
        judul: n.judul ?? n.judul_tampil ?? "Notifikasi",
        pesan: n.pesan ?? n.isi_notifikasi ?? "",
        tanggal_kirim: n.tanggal_kirim ?? n.created_at,
      }));
      setNotifications(rows as Notification[]);
      setError(null);
    } catch (err: any) {
      console.error("Error loading notifications:", err);
      const isAuthError = await handleAuthError(err);
      if (!isAuthError) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Dipanggil dari effect sebagai promise (bukan setState sinkron di body).
  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  /**
   * Realtime: notifikasi baru masuk lewat Pusher (channel privat akun ini).
   *
   * Baris ditambahkan langsung ke daftar + badge dihitung ulang, lalu daftar
   * disegarkan sekali dari server supaya id/urutan resmi yang dipakai
   * (penting untuk "tandai dibaca"). Bell diputar sekali di provider, jadi di
   * sini tidak perlu memutarnya lagi (dulu berisiko dobel).
   */
  const tanganiRealtime = useCallback(
    (pesan: PesanRealtime) => {
      const notifikasi = pesan.notifikasi;

      setNotifications((prev) => {
        const sudahAda = prev.some(
          (n) => (notifikasi.notifikasiId && n.id === notifikasi.notifikasiId) ||
            (n.tipe === notifikasi.tipe && String(n.id) === String(notifikasi.orderId))
        );

        if (sudahAda) {
          return prev;
        }

        const waktu = notifikasi.waktu ?? new Date().toISOString();

        const baru: Notification = {
          // Id negatif = baris optimistis; diganti id server setelah refresh.
          id: notifikasi.notifikasiId ?? -Date.now(),
          judul: notifikasi.judul,
          pesan: notifikasi.pesan,
          tipe: keTipeNotifikasi(notifikasi.tipe),
          is_read: false,
          tanggal_kirim: waktu,
          created_at: waktu,
          updated_at: waktu,
        };

        return [baru, ...prev];
      });

      void loadNotifications();
    },
    [loadNotifications]
  );

  useNotifikasiMasuk(tanganiRealtime);

  const { status: statusRealtime, jumlahBelumDibaca, resetBelumDibaca, galat: galatRealtime } =
    useRealtime();

  // Badge ini milik layar notifikasi → begitu layar dibuka, hitungan live
  // dianggap sudah dilihat (server tetap sumber kebenaran untuk `dibaca`).
  useEffect(() => {
    resetBelumDibaca();
  }, [resetBelumDibaca]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await apiService.markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }

    switch (notification.tipe) {
      case "order":
      case "payment":
      case "shipping": {
        /**
         * Notifikasi bertipe order milik dua audiens berbeda:
         *  - perangkat KASIR (sesi staf tersimpan) → layar konfirmasi
         *    "Order Masuk" (`/kasir/orders`), tempat verifikasi + cetak struk;
         *  - PELANGGAN → riwayat pesanan mereka (`/orders`).
         * Sebelumnya keduanya dibuka ke `/orders`: kasir yang mengetuk
         * notifikasi "Order Baru" mendarat di riwayat pesanan pelanggan dan
         * tidak bisa memverifikasi apa pun.
         */
        const staf = await getStaffUser();
        router.push(staf ? "/kasir/orders" : "/orders");
        break;
      }
      case "promo":
        router.push("/(tabs)/products");
        break;
      default:
        break;
    }
  };

  const tandaiSemua = async () => {
    setMenandai(true);
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      await Promise.all(unreadIds.map((id) => apiService.markNotificationAsRead(id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setDialog(null);
    } catch (err) {
      console.error("Error marking all as read:", err);
      setDialog(null);
      setError(teks.notifikasi.gagalTandai);
    } finally {
      setMenandai(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const tampil = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications),
    [filter, notifications]
  );

  const chip = (kunci: "all" | "unread", label: string, jumlah: number) => {
    const aktif = filter === kunci;
    return (
      <Pressable
        key={kunci}
        onPress={() => setFilter(kunci)}
        accessibilityRole="tab"
        accessibilityState={{ selected: aktif }}
        accessibilityLabel={`${label}, ${jumlah}`}
        className={`min-h-[44px] items-center justify-center rounded-full px-4 ${
          aktif ? "bg-primary-100" : "bg-neutral-100"
        }`}
      >
        <Text
          className={`font-inter-medium text-xs ${
            aktif ? "text-primary-800" : "text-neutral-700"
          }`}
          maxFontSizeMultiplier={1.3}
        >
          {label} ({jumlah})
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <AppBar
        title={teks.judul.notifications}
        onBack={kembali}
        right={<TombolSuara />}
        onPressMenu={notifications.length > 0 ? () => setDialog("menu") : undefined}
      />

      {loading ? (
        <View className="px-4 pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} className="flex-row gap-3 py-4">
              <Skeleton width={36} height={36} radiusClassName="rounded-full" />
              <View className="flex-1">
                <Skeleton height={14} width="70%" />
                <Skeleton height={12} width="90%" className="mt-2" />
              </View>
            </View>
          ))}
        </View>
      ) : error && notifications.length === 0 ? (
        <ErrorState pesan={error} onRetry={loadNotifications} />
      ) : (
        <>
          <View className="flex-row gap-2 px-4 py-3">
            {chip("all", teks.notifikasi.semua, notifications.length)}
            {chip("unread", teks.notifikasi.belumDibaca, unreadCount)}
            {statusRealtime === "terhubung" || jumlahBelumDibaca > 0 ? (
              <View
                className="min-h-[44px] flex-1 flex-row items-center justify-end gap-1.5"
                accessibilityLabel={teks.notifikasi.realtimeAktif}
              >
                <View className="h-1.5 w-1.5 rounded-full bg-success-500" />
                <Text
                  className="font-inter-medium text-xs text-neutral-500"
                  maxFontSizeMultiplier={1.3}
                >
                  {jumlahBelumDibaca > 0
                    ? `${jumlahBelumDibaca} ${teks.notifikasi.baru}`
                    : teks.notifikasi.realtimeAktif}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Realtime gagal (auth channel ditolak / realtime dimatikan server):
              tampilkan sebabnya. Tanpa ini kegagalan hanya terlihat sebagai
              "tidak ada notifikasi masuk" tanpa penjelasan apa pun. */}
          {galatRealtime ? (
            <View className="mx-4 mb-2 rounded-md border border-warning-100 bg-warning-50 p-3">
              <Text className="font-inter text-xs text-warning-700" maxFontSizeMultiplier={1.3}>
                {teks.notifikasi.realtimeGagal}: {galatRealtime}
              </Text>
            </View>
          ) : null}

          {tampil.length === 0 ? (
            <EmptyState
              icon={<BellOff size={36} color={colors.primary600} strokeWidth={1.75} />}
              title={
                filter === "unread"
                  ? teks.notifikasi.belumAdaBaru
                  : teks.empty.notifikasi.judul
              }
              description={
                filter === "unread"
                  ? teks.notifikasi.semuaDibaca
                  : teks.empty.notifikasi.deskripsi
              }
              ctaLabel={filter === "unread" ? undefined : teks.empty.notifikasi.cta}
              onCtaPress={
                filter === "unread" ? undefined : () => router.push("/(tabs)/products")
              }
            />
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: paddingBawahKonten(insets, 16) }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary600]}
                  tintColor={colors.primary600}
                />
              }
            >
              <View className="divide-y divide-neutral-100">
                {tampil.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    judul={notification.judul}
                    pesan={notification.pesan}
                    tipe={notification.tipe}
                    waktu={notification.tanggal_kirim}
                    belumDibaca={!notification.is_read}
                    onPress={() => handleNotificationPress(notification)}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </>
      )}

      {/*
        Satu `Dialog` untuk menu dan konfirmasi. Di react-native-web dua Modal
        yang tampil bersamaan saling menutupi dan dialog pertama tidak pernah
        tertutup, jadi langkah menu → konfirmasi dibuat sebagai isi bertahap.
      */}
      <Dialog
        visible={dialog !== null}
        onClose={() => setDialog(null)}
        title={
          dialog === "konfirmasi" ? teks.notifikasi.tandaiSemuaJudul : teks.notifikasi.menu
        }
        description={
          dialog === "konfirmasi" ? teks.notifikasi.tandaiSemuaDeskripsi : undefined
        }
        actions={
          dialog === "konfirmasi" ? (
            <>
              <Button
                title={teks.umum.batal}
                variant="outline"
                size="md"
                className="flex-1"
                onPress={() => setDialog("menu")}
              />
              <Button
                title={teks.umum.ya}
                size="md"
                className="flex-1"
                loading={menandai}
                onPress={tandaiSemua}
              />
            </>
          ) : (
            <>
              <Button
                title={teks.umum.tutup}
                variant="outline"
                size="md"
                className="flex-1"
                onPress={() => setDialog(null)}
              />
              <Button
                title={teks.notifikasi.tandaiSemua}
                size="md"
                className="flex-1"
                disabled={unreadCount === 0}
                icon={<CheckCheck size={16} color={colors.white} strokeWidth={1.75} />}
                onPress={() => setDialog("konfirmasi")}
              />
            </>
          )
        }
      />
    </SafeAreaView>
  );
};

/**
 * Tipe notifikasi aplikasi (`order` | `promo` | `system` | ...) dari tipe
 * domain backend (`new_order`, `order_verified`, ...). Warna ikon
 * `NotificationItem` bergantung pada nilai ini.
 */
function keTipeNotifikasi(tipe: string): Notification["tipe"] {
  if (tipe.startsWith("order") || tipe === "new_order") {
    return "order";
  }

  if (tipe === "promo") {
    return "promo";
  }

  if (tipe === "payment") {
    return "payment";
  }

  return "system";
}

export default NotificationsScreen;
