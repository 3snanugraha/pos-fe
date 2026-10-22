import { Image } from "expo-image";
import {
  Ban,
  CreditCard,
  ImageIcon,
  MapPin,
  Printer,
  Receipt,
  StickyNote,
  Wallet,
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ErrorState,
  OrderTimeline,
  PriceSummary,
  Skeleton,
  StatusBadge,
} from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button, Dialog } from "../../src/components/ui";
import { rupiah, tanggalWaktu } from "../../src/lib/format";
import { teks } from "../../src/lib/i18n";
import {
  bisaDibatalkan,
  indeksTimeline,
  infoStatus,
  latarNada,
  warnaNada,
} from "../../src/lib/pesanan";
import { colors } from "../../src/theme/tokens";
import { apiService } from "../../services/apiService";
import type { OrderDetail } from "../../services/types";
import { useOrderExpiry } from "../../utils/orderExpiry";
import {
  buildPaymentInstruction,
  isTransfer,
  jenisLabel,
  parseSplitFromCatatan,
  stripSplitFromCatatan,
} from "../../utils/payment";
import { printOrderReceipt } from "../../utils/printReceipt";

type DialogBatal = "konfirmasi" | null;

/**
 * Detail Pesanan Zovora — guideline §3.12 (ringkasan harga), §3.13 (alamat),
 * §3.14 (instruksi pembayaran), §5 (state).
 *
 * Susunan: kartu status (badge + tanggal + nomor, countdown kedaluwarsa,
 * timeline 3 tahap) → instruksi pembayaran (bila masih `pending`) → daftar
 * produk → alamat → metode pembayaran + rincian split → catatan → ringkasan
 * harga (`PriceSummary`) → aksi (primary "Cetak Struk", outline "Kembali ke
 * Riwayat", danger "Batalkan Pesanan"). Semua logika (polling status,
 * `cancelOrder`, `printOrderReceipt`, instruksi rekening) dipertahankan.
 */
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [dialogBatal, setDialogBatal] = useState<DialogBatal>(null);
  const [pesanAksi, setPesanAksi] = useState<{
    judul: string;
    isi: string;
    aksi?: { label: string; onPress: () => void };
  } | null>(null);

  const loadOrder = useCallback(async (): Promise<{
    order: OrderDetail | null;
    galat: string | null;
  }> => {
    if (!id) return { order: null, galat: teks.error.muatGagal };
    try {
      const result = await apiService.getOrderDetails(parseInt(id, 10));
      const data =
        (result as unknown as { data?: OrderDetail })?.data ??
        (result as unknown as OrderDetail);
      return { order: data as OrderDetail, galat: null };
    } catch (err: any) {
      console.error("Error loading order:", err);
      return { order: null, galat: teks.error.muatGagal };
    }
  }, [id]);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const hasil = await loadOrder();
      if (!aktif) return;
      setOrder(hasil.order);
      setError(hasil.galat);
      setLoading(false);
    })();
    return () => {
      aktif = false;
    };
  }, [loadOrder]);

  const status = (order?.status_transaksi ?? order?.status ?? "pending") as string;
  const expiry = useOrderExpiry(order?.order_expires_at, status);

  /** Segarkan otomatis saat kasir memverifikasi/menolak order. */
  useEffect(() => {
    if (!order || status !== "pending") return;
    const poll = setInterval(() => {
      void loadOrder().then((hasil) => {
        if (hasil.order) setOrder(hasil.order);
      });
    }, 20000);
    return () => clearInterval(poll);
  }, [order, status, loadOrder]);

  const muatUlang = async () => {
    setLoading(true);
    const hasil = await loadOrder();
    setOrder(hasil.order);
    setError(hasil.galat);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const hasil = await loadOrder();
    setOrder(hasil.order);
    setError(hasil.galat);
    setRefreshing(false);
  };

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await apiService.cancelOrder(order.id);
      const hasil = await loadOrder();
      setOrder(hasil.order);
      setDialogBatal(null);
      setPesanAksi({ judul: teks.umum.berhasil, isi: teks.pesanan.batalBerhasil });
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      setDialogBatal(null);
      setPesanAksi({
        judul: teks.umum.gagal,
        isi: err?.message || teks.pesanan.batalGagal,
      });
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = async () => {
    if (!order) return;
    setPrinting(true);
    try {
      // `printReceipt` mengharapkan angka, sedangkan backend mengirim desimal
      // sebagai string — normalisasi dulu.
      const hasil = await printOrderReceipt({
        id: order.id,
        nomor_transaksi: order.nomor_transaksi,
        tanggal_transaksi: order.tanggal_transaksi,
        total_harga: Number(order.total_harga) || 0,
        total_diskon: Number(order.total_diskon) || 0,
        total_bayar: Number(order.total_bayar) || 0,
        status: order.status,
        metode_pembayaran: {
          nama: order.metode_pembayaran?.nama ?? teks.checkout.cod,
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

      if (hasil.ok) {
        if (hasil.mode === "browser") {
          setPesanAksi({
            judul: teks.pesanan.struk.diunduhJudul,
            isi: teks.pesanan.struk.diunduhDeskripsi,
          });
        }
        return;
      }

      if (hasil.reason === "no-app") {
        setPesanAksi({
          judul: teks.pesanan.struk.appJudul,
          isi: teks.pesanan.struk.appDeskripsi,
          aksi: {
            label: teks.pesanan.struk.bukaPlayStore,
            onPress: () => {
              Linking.openURL("market://details?id=ru.a402d.rawbtprinter").catch(() => {});
            },
          },
        });
        return;
      }

      setPesanAksi({
        judul: teks.umum.gagal,
        isi: hasil.message || teks.pesanan.struk.gagal,
      });
    } catch (err) {
      console.error("Print error:", err);
      setPesanAksi({ judul: teks.umum.gagal, isi: teks.pesanan.struk.gagal });
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.pesanan.detail} onBack={() => router.back()} />
        <View className="px-4 pt-4">
          <View className="rounded-lg border border-neutral-200 bg-white p-4">
            <Skeleton height={16} width="60%" />
            <Skeleton height={12} width="40%" className="mt-2" />
            <Skeleton height={48} width="100%" className="mt-4" />
          </View>
          <View className="mt-3 rounded-lg border border-neutral-200 bg-white p-4">
            {[0, 1].map((i) => (
              <View key={i} className="mb-3 flex-row gap-3">
                <Skeleton width={56} height={56} radiusClassName="rounded-md" />
                <View className="flex-1">
                  <Skeleton height={14} width="80%" />
                  <Skeleton height={12} width="40%" className="mt-2" />
                </View>
              </View>
            ))}
          </View>
          <Skeleton height={120} radiusClassName="rounded-lg" width="100%" className="mt-3" />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !order) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.pesanan.detail} onBack={() => router.back()} />
        <ErrorState pesan={error} onRetry={muatUlang} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.pesanan.detail} onBack={() => router.back()} />
        <ErrorState
          judul={teks.pesanan.tidakDitemukan.judul}
          pesan={teks.pesanan.tidakDitemukan.deskripsi}
          onRetry={muatUlang}
          ikon={<Receipt size={36} color={colors.danger700} strokeWidth={1.75} />}
        />
      </SafeAreaView>
    );
  }

  const info = infoStatus(status);
  const IkonStatus = info.ikon;
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
  const timeline = indeksTimeline(status);
  const bisaBatal = bisaDibatalkan(status);
  const nomor = order.nomor_transaksi || `#${order.id}`;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar title={teks.pesanan.detail} onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary600]}
            tintColor={colors.primary600}
          />
        }
      >
        {error ? (
          <View className="mb-3">
            <ErrorState pesan={error} onRetry={muatUlang} kompak />
          </View>
        ) : null}

        {/* Kartu status + timeline */}
        <View className="rounded-lg border border-neutral-200 bg-white p-4">
          <View className="flex-row items-start gap-3">
            <View
              className={`items-center justify-center rounded-full ${latarNada[info.nada]}`}
              style={{ width: 44, height: 44 }}
            >
              <IkonStatus size={22} color={warnaNada[info.nada]} strokeWidth={1.75} />
            </View>
            <View className="flex-1">
              <StatusBadge
                status={status}
                label={expiry.expired ? teks.status.kedaluwarsa : undefined}
                nada={expiry.expired ? "batal" : undefined}
                className="mb-1.5"
              />
              <Text
                className="font-inter text-xs text-neutral-500"
                maxFontSizeMultiplier={1.3}
              >
                {tanggalWaktu(order.tanggal_transaksi || order.created_at)}
              </Text>
              <Text
                className="mt-0.5 font-inter text-xs text-neutral-500"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {teks.pesanan.nomorTransaksi}: {nomor}
              </Text>
            </View>
          </View>

          {/* Countdown / kedaluwarsa */}
          {status === "pending" && order.order_expires_at ? (
            expiry.expired ? (
              <View className="mt-3 rounded-md border border-danger-100 bg-danger-50 p-3">
                <Text className="font-inter-semibold text-sm text-danger-700">
                  {teks.pesanan.kedaluwarsaJudul}
                </Text>
                <Text className="mt-1 font-inter text-xs text-danger-700">
                  {teks.pesanan.kedaluwarsaDeskripsi.replace(
                    "{waktu}",
                    tanggalWaktu(order.order_expires_at)
                  )}
                </Text>
              </View>
            ) : (
              <View className="mt-3 rounded-md border border-warning-500 bg-warning-50 p-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-inter text-caption text-warning-700">
                      {teks.pesanan.batasPembayaran}
                    </Text>
                    <Text
                      className="font-inter-bold text-lg text-neutral-900 tabular-nums"
                      maxFontSizeMultiplier={1.3}
                    >
                      {expiry.countdown}
                    </Text>
                  </View>
                  <Wallet size={24} color={warnaNada.menunggu} strokeWidth={1.75} />
                </View>
                <Text className="mt-1 font-inter text-caption text-warning-700">
                  {teks.pesanan.batasSampai.replace(
                    "{waktu}",
                    tanggalWaktu(order.order_expires_at)
                  )}
                </Text>
              </View>
            )
          ) : null}

          {/* Timeline 3 tahap */}
          <OrderTimeline indeks={timeline} className="mt-4" />

          {status === "dibatalkan" || status === "cancelled" ? (
            <View className="mt-1 rounded-md border border-danger-100 bg-danger-50 p-3">
              <Text className="font-inter-semibold text-sm text-danger-700">
                {teks.pesanan.dibatalkanJudul}
              </Text>
              <Text className="mt-1 font-inter text-xs text-danger-700">
                {teks.pesanan.dibatalkanDeskripsi}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Instruksi pembayaran (hanya selama pending) */}
        {instruksi.length > 0 && status === "pending" ? (
          <View className="mt-3 rounded-lg border border-neutral-200 bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Wallet size={18} color={colors.primary600} strokeWidth={1.75} />
              <Text
                className="flex-1 font-inter-semibold text-base text-neutral-900"
                maxFontSizeMultiplier={1.3}
              >
                {teks.pesanan.instruksiPembayaran}
              </Text>
            </View>
            <View className="rounded-md border border-primary-100 bg-primary-50 p-3">
              {instruksi.map((baris, i) => (
                <Text
                  key={i}
                  className="mb-1 font-inter text-xs text-primary-800"
                  maxFontSizeMultiplier={1.3}
                >
                  • {baris}
                </Text>
              ))}
            </View>
            {isTransfer(metode?.jenis) && metode?.nomor_rekening ? (
              <View className="mt-2 rounded-md bg-neutral-50 p-3">
                <Text className="font-inter text-caption text-neutral-500">
                  {teks.pesanan.nomorRekening}
                </Text>
                <Text
                  className="font-inter-bold text-base text-neutral-900 tabular-nums"
                  selectable
                  maxFontSizeMultiplier={1.3}
                >
                  {metode.nomor_rekening}
                </Text>
                <Text className="mt-1 font-inter text-caption text-neutral-500">
                  {teks.pesanan.atasNama}: {metode.atas_nama ?? "-"}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Produk dipesan */}
        <View className="mt-3 rounded-lg border border-neutral-200 bg-white p-4">
          <Text
            className="mb-2 font-inter-semibold text-base text-neutral-900"
            accessibilityRole="header"
            maxFontSizeMultiplier={1.3}
          >
            {teks.pesanan.produkDipesan}
          </Text>
          {(order.items ?? []).map((item, index, arr) => (
            <View
              key={item.id}
              className={`flex-row py-3 ${
                index < arr.length - 1 ? "border-b border-neutral-100" : ""
              }`}
            >
              <View
                className="mr-3 overflow-hidden rounded-md bg-neutral-50"
                style={{ width: 56, height: 56 }}
              >
                {item.gambar_url ? (
                  <Image
                    source={{ uri: item.gambar_url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={150}
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <ImageIcon size={22} color={colors.neutral300} strokeWidth={1.75} />
                  </View>
                )}
              </View>

              <View className="flex-1">
                <Text
                  className="font-inter-medium text-sm text-neutral-900"
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.3}
                >
                  {item.nama_produk}
                </Text>
                {item.nama_varian ? (
                  <Text
                    className="mt-0.5 font-inter text-xs text-neutral-500"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    {teks.keranjang.varian.replace("{nama}", item.nama_varian)}
                  </Text>
                ) : null}
                <View className="mt-1 flex-row items-center justify-between gap-2">
                  <Text
                    className="font-inter text-xs text-neutral-500 tabular-nums"
                    maxFontSizeMultiplier={1.3}
                  >
                    {item.jumlah}× {rupiah(Number(item.harga) || 0)}
                  </Text>
                  <Text
                    className="font-inter-semibold text-sm text-neutral-900 tabular-nums"
                    maxFontSizeMultiplier={1.3}
                  >
                    {rupiah(Number(item.subtotal) || 0)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Alamat */}
        {order.alamat_pengiriman ? (
          <View className="mt-3 rounded-lg border border-neutral-200 bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <MapPin size={18} color={colors.neutral600} strokeWidth={1.75} />
              <Text
                className="flex-1 font-inter-semibold text-base text-neutral-900"
                maxFontSizeMultiplier={1.3}
              >
                {teks.judul.deliveryAddress}
              </Text>
            </View>
            <Text
              className="font-inter text-sm text-neutral-700"
              maxFontSizeMultiplier={1.3}
            >
              {order.alamat_pengiriman}
            </Text>
          </View>
        ) : null}

        {/* Metode pembayaran + split */}
        <View className="mt-3 rounded-lg border border-neutral-200 bg-white p-4">
          <View className="mb-2 flex-row items-center gap-2">
            <CreditCard size={18} color={colors.neutral600} strokeWidth={1.75} />
            <Text
              className="flex-1 font-inter-semibold text-base text-neutral-900"
              maxFontSizeMultiplier={1.3}
            >
              {teks.judul.paymentMethod}
            </Text>
          </View>
          <Text className="font-inter text-sm text-neutral-900" maxFontSizeMultiplier={1.3}>
            {metode?.nama ?? teks.checkout.cod}
          </Text>
          {metode?.jenis ? (
            <Text className="font-inter text-xs text-neutral-500" maxFontSizeMultiplier={1.3}>
              {jenisLabel(metode.jenis)}
            </Text>
          ) : null}

          {splitInfo ? (
            <View className="mt-2 rounded-md bg-neutral-50 p-3">
              <Text className="font-inter text-caption text-neutral-500">
                {teks.pesanan.rincianSplit}
              </Text>
              <Text className="mt-1 font-inter text-sm text-neutral-700">
                {splitInfo}
              </Text>
            </View>
          ) : null}

          {order.status_pembayaran ? (
            <Text className="mt-2 font-inter text-caption text-neutral-500">
              {teks.pesanan.statusPembayaran.replace(
                "{status}",
                order.status_pembayaran.replace(/_/g, " ")
              )}
            </Text>
          ) : null}
        </View>

        {/* Catatan */}
        {catatanBersih.length > 0 ? (
          <View className="mt-3 rounded-lg border border-neutral-200 bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <StickyNote size={18} color={colors.neutral600} strokeWidth={1.75} />
              <Text
                className="flex-1 font-inter-semibold text-base text-neutral-900"
                maxFontSizeMultiplier={1.3}
              >
                {teks.checkout.catatan}
              </Text>
            </View>
            <Text className="font-inter text-sm text-neutral-700">{catatanBersih}</Text>
          </View>
        ) : null}

        {/* Ringkasan harga */}
        <View className="mt-3">
          <PriceSummary
            baris={[
              {
                label: teks.pesanan.subtotalProduk,
                nilai: Number(order.total_harga) || 0,
              },
              {
                label: teks.pesanan.diskonTotal,
                nilai: Number(order.total_diskon) || 0,
                potongan: true,
              },
            ]}
            total={Number(order.total_bayar) || 0}
            totalLabel={teks.pesanan.totalPembayaran}
          />
        </View>

        {/* Aksi — satu CTA primary per layar */}
        <View className="mt-4 gap-3">
          <Button
            title={printing ? teks.pesanan.mencetak : teks.pesanan.cetakStruk}
            loading={printing}
            icon={<Printer size={20} color={colors.white} strokeWidth={1.75} />}
            fullWidth
            onPress={handlePrint}
          />
          <Button
            title={teks.pesanan.kembaliRiwayat}
            variant="outline"
            fullWidth
            onPress={() => {
              /**
               * Harus kembali ke layar riwayat yang sudah ada, bukan `push`
               * route baru: push membuat instance /orders kedua dengan filter
               * default "Semua", sehingga filter pengguna hilang dan tumpukan
               * navigasi terus bertambah setiap kali kembali dari detail.
               * Bila detail dibuka langsung (mis. dari notifikasi/URL),
               * `canGoBack` false → ganti layar alih-alih menumpuk.
               */
              if (router.canGoBack()) router.back();
              else router.replace("/orders");
            }}
          />
          {bisaBatal ? (
            <Button
              title={teks.pesanan.batalkan}
              variant="social"
              fullWidth
              icon={<Ban size={20} color={colors.danger700} strokeWidth={1.75} />}
              className="border-danger-500"
              onPress={() => setDialogBatal("konfirmasi")}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Konfirmasi batal */}
      <Dialog
        visible={dialogBatal !== null}
        onClose={() => setDialogBatal(null)}
        title={teks.pesanan.dialogBatal.judul}
        description={teks.pesanan.dialogBatal.deskripsi}
        actions={
          <>
            <Button
              title={teks.pesanan.dialogBatal.tidak}
              variant="outline"
              size="md"
              className="flex-1"
              onPress={() => setDialogBatal(null)}
            />
            <Button
              title={teks.pesanan.dialogBatal.ya}
              size="md"
              className="flex-1"
              loading={cancelling}
              onPress={handleCancel}
            />
          </>
        }
      />

      {/* Hasil aksi (batal / cetak struk) */}
      <Dialog
        visible={pesanAksi !== null}
        onClose={() => setPesanAksi(null)}
        title={pesanAksi?.judul}
        description={pesanAksi?.isi}
        actions={
          <>
            <Button
              title={teks.umum.tutup}
              variant="outline"
              size="md"
              className="flex-1"
              onPress={() => setPesanAksi(null)}
            />
            {pesanAksi?.aksi ? (
              <Button
                title={pesanAksi.aksi.label}
                size="md"
                className="flex-1"
                onPress={() => {
                  pesanAksi.aksi?.onPress();
                  setPesanAksi(null);
                }}
              />
            ) : null}
          </>
        }
      />
    </SafeAreaView>
  );
}
