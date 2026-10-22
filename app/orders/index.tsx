import { Receipt } from "lucide-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, OrderCard, Skeleton } from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button, Dialog, EmptyState } from "../../src/components/ui";
import { teks } from "../../src/lib/i18n";
import { colors } from "../../src/theme/tokens";
import { useCart } from "../../contexts/CartContext";
import { apiService } from "../../services/apiService";
import type { Order } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

type FilterKunci = "semua" | "pending" | "selesai" | "dibatalkan" | "retur";

const FILTER: { key: FilterKunci; label: string }[] = [
  { key: "semua", label: teks.pesanan.filter.semua },
  { key: "pending", label: teks.pesanan.filter.pending },
  { key: "selesai", label: teks.pesanan.filter.selesai },
  { key: "dibatalkan", label: teks.pesanan.filter.dibatalkan },
  { key: "retur", label: teks.pesanan.filter.retur },
];

type Pesan = { tipe: "sukses" | "gagal"; isi: string } | null;

/**
 * Riwayat Pesanan Zovora — guideline §3.8 (chip filter), §3.9 (kartu), §5.
 *
 * Chip filter status (role tab, target 44) → daftar `OrderCard` (nomor,
 * tanggal, badge status, countdown, pratinjau item, total bold). Loading
 * memakai skeleton kartu, kosong/galat memakai pola §5, dan "Beli Lagi"
 * memakai logika reorder yang sama seperti versi lama (produk diambil ulang
 * lewat `getProduct` supaya harga/stok yang dipakai adalah yang terkini).
 */
export default function OrderHistoryScreen() {
  const router = useRouter();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKunci>("semua");
  const [reorderingId, setReorderingId] = useState<number | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);

  const loadOrders = useCallback(async (kunci: FilterKunci) => {
    try {
      // Backend `CustomerOrderController@index` — satu-satunya endpoint yang
      // mengirim `order_expires_at` + item per order.
      const result = await apiService.getCustomerOrders({
        ...(kunci !== "semua" ? { status: kunci } : {}),
        per_page: 30,
      });
      return { baris: Array.isArray(result.data) ? result.data : [], galat: null };
    } catch (err: any) {
      console.error("Error loading orders:", err);
      const isAuthError = await handleAuthError(err);
      return { baris: [] as Order[], galat: isAuthError ? null : getErrorMessage(err) };
    }
  }, []);

  /**
   * Muat ulang tiap filter berubah DAN setiap layar difokuskan kembali.
   *
   * `useFocusEffect` diperlukan karena detail pesanan bisa mengubah status
   * (batalkan / verifikasi kasir) lalu memanggil `router.back()`; tanpa muat
   * ulang saat fokus, daftar menampilkan status lama sampai app di-reload.
   * State hanya diubah di callback async (bukan body effect) agar tidak
   * memicu render berantai — pola yang sama dipakai layar W3/W4.
   */
  useFocusEffect(
    useCallback(() => {
      let aktif = true;
      (async () => {
        const hasil = await loadOrders(filter);
        if (!aktif) return;
        setOrders(hasil.baris);
        setError(hasil.galat);
        setLoading(false);
      })();
      return () => {
        aktif = false;
      };
    }, [filter, loadOrders])
  );

  const gantiFilter = (kunci: FilterKunci) => {
    if (kunci === filter) return;
    setLoading(true);
    setFilter(kunci);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const hasil = await loadOrders(filter);
    setOrders(hasil.baris);
    setError(hasil.galat);
    setRefreshing(false);
  };

  const muatUlang = async () => {
    setLoading(true);
    const hasil = await loadOrders(filter);
    setOrders(hasil.baris);
    setError(hasil.galat);
    setLoading(false);
  };

  /**
   * "Beli Lagi" — masukkan ulang produk order ke keranjang.
   *
   * Order list tidak menyertakan harga/stok terkini, jadi tiap produk diambil
   * ulang lewat `getProduct` sebelum dimasukkan ke cart. Stok diambil dari
   * varian bila item punya varian: `produk.stok` adalah total seluruh varian,
   * sehingga item varian tertentu bisa lolos meski stok variannya 0. Varian
   * juga wajib dikirim ke `addItem` supaya id baris keranjang konsisten
   * (produkId+varianId) dan tidak menghasilkan baris duplikat.
   */
  const handleReorder = async (order: Order) => {
    if (reorderingId) return;

    const items = order.items ?? [];
    if (items.length === 0) {
      setPesan({ tipe: "gagal", isi: teks.pesanan.reorder.tidakAdaDeskripsi });
      return;
    }

    setReorderingId(order.id);

    let berhasil = 0;
    const dilewati: string[] = [];

    for (const item of items) {
      try {
        const produk = await apiService.getProduct(item.produk_id, false);
        const varian = item.varian_id
          ? produk.varian?.find((v) => v.id === item.varian_id)
          : undefined;

        const stokTersedia = varian
          ? Number(varian.stok) || 0
          : Number(produk.stok ?? produk.total_stok ?? 0) || 0;

        if (stokTersedia <= 0) {
          dilewati.push(item.nama_produk ?? `#${item.produk_id}`);
          continue;
        }

        await addItem(
          { ...produk, stok: produk.stok ?? stokTersedia },
          Math.min(item.jumlah, stokTersedia),
          varian ? { ...varian, harga: Number(varian.harga_jual) } : undefined
        );
        berhasil += 1;
      } catch (err) {
        console.warn("Reorder gagal untuk item", item.produk_id, err);
        dilewati.push(item.nama_produk ?? `#${item.produk_id}`);
      }
    }

    setReorderingId(null);

    if (berhasil === 0) {
      setPesan({ tipe: "gagal", isi: teks.pesanan.reorder.gagalDeskripsi });
      return;
    }

    const tambahan =
      dilewati.length > 0
        ? ` ${teks.pesanan.reorder.dilewati.replace(
            "{daftar}",
            dilewati.slice(0, 3).join(", ")
          )}`
        : "";
    setPesan({
      tipe: "sukses",
      isi:
        teks.pesanan.reorder.berhasilDeskripsi.replace("{jumlah}", String(berhasil)) +
        tambahan,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar title={teks.pesanan.riwayat} onBack={() => router.back()} />

      {/* Chip filter status — role tab agar status aktif diumumkan (§7). */}
      <View className="border-b border-neutral-100 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
        >
          {FILTER.map((f) => {
            const aktif = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => gantiFilter(f.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: aktif }}
                accessibilityLabel={f.label}
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
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 px-4 pt-4">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="mb-3 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <Skeleton height={14} width="55%" />
              <Skeleton height={12} width="35%" className="mt-2" />
              <Skeleton height={12} width="70%" className="mt-4" />
              <Skeleton height={16} width="40%" className="mt-3" />
            </View>
          ))}
        </View>
      ) : error && orders.length === 0 ? (
        <ErrorState pesan={error} onRetry={muatUlang} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Receipt size={36} color={colors.primary600} strokeWidth={1.75} />}
          title={teks.empty.pesanan.judul}
          description={
            filter === "semua"
              ? teks.empty.pesanan.deskripsi
              : teks.beranda.kosongProdukDeskripsi
          }
          ctaLabel={filter === "semua" ? teks.empty.pesanan.cta : teks.tombol.lihatSemua}
          onCtaPress={() =>
            filter === "semua" ? router.push("/(tabs)/products") : gantiFilter("semua")
          }
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
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

          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              className="mb-3"
              reordering={reorderingId === order.id}
              onPress={() => router.push(`/orders/${order.id}` as never)}
              onReorder={() => handleReorder(order)}
            />
          ))}
        </ScrollView>
      )}

      {/* Umpan balik "Beli Lagi" memakai Dialog (pola §3.17). */}
      <Dialog
        visible={pesan !== null}
        onClose={() => setPesan(null)}
        title={
          pesan?.tipe === "sukses"
            ? teks.pesanan.reorder.berhasilJudul
            : teks.pesanan.reorder.gagalJudul
        }
        description={pesan?.isi}
        actions={
          <>
            <Button
              title={
                pesan?.tipe === "sukses"
                  ? teks.pesanan.reorder.lanjutBelanja
                  : teks.umum.tutup
              }
              variant="outline"
              size="md"
              className="flex-1"
              onPress={() => setPesan(null)}
            />
            {pesan?.tipe === "sukses" ? (
              <Button
                title={teks.pesanan.reorder.keKeranjang}
                size="md"
                className="flex-1"
                onPress={() => {
                  setPesan(null);
                  router.push("/(tabs)/cart");
                }}
              />
            ) : null}
          </>
        }
      />
    </SafeAreaView>
  );
}
