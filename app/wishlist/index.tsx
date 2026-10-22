import { Heart } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ErrorState,
  ProductCardHorizontal,
  Skeleton,
} from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { EmptyState } from "../../src/components/ui";
import { teks } from "../../src/lib/i18n";
import type { ProdukApi } from "../../src/lib/produk";
import { colors } from "../../src/theme/tokens";
import { useCart } from "../../contexts/CartContext";
import { apiService } from "../../services/apiService";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

/**
 * Baris wishlist dari backend. `id` adalah id PRODUK (dipakai untuk membuka
 * detail & menambah ke keranjang), `harga_jual` berupa string desimal.
 */
interface BackendWishlistItem {
  id: number;
  nama_produk: string;
  harga_jual: string;
  gambar: string;
  kategori: string;
  flash_sale: boolean;
  harga_flash_sale: number | null;
  created_at?: string;
}

/** Normalisasi baris backend → bentuk yang dipakai `ProductCardHorizontal`. */
function keProduk(row: BackendWishlistItem): ProdukApi {
  return {
    id: row.id,
    nama_produk: row.nama_produk || "Produk",
    gambar_url: row.gambar || null,
    harga: row.harga_jual,
    is_flash_sale: !!row.flash_sale,
    harga_flash_sale: row.harga_flash_sale ?? null,
    kategori_nama: row.kategori ?? null,
  };
}

/**
 * Barang Disimpan Zovora — guideline §3.9 (kartu horizontal) + §5 (empty state).
 *
 * Kartu: thumbnail 72×80, judul Body medium maks 2 baris, rating, harga +
 * harga coret + badge diskon, heart terisi danger-500 (target 44). Empty state
 * memakai copy "Belum Ada Barang Disimpan!".
 *
 * Logika wishlist tidak berubah: endpoint `getWishlist`/`removeFromWishlist`,
 * serta tambah-ke-keranjang lewat varian pertama (supaya id baris keranjang
 * konsisten dengan halaman detail produk).
 */
const WishlistScreen = () => {
  const router = useRouter();
  const { addItem } = useCart();
  const [wishlistItems, setWishlistItems] = useState<BackendWishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ambilWishlist = useCallback(async () => {
    try {
      const result = (await apiService.getWishlist({ per_page: 50 })) as any;

      // API mengembalikan array langsung dari backend `response.data`.
      if (Array.isArray(result)) {
        return { baris: result as BackendWishlistItem[], galat: null };
      }
      if (result && Array.isArray(result.data)) {
        return { baris: result.data as BackendWishlistItem[], galat: null };
      }
      return { baris: [] as BackendWishlistItem[], galat: null };
    } catch (err: any) {
      console.error("Error loading wishlist:", err);
      const isAuthError = await handleAuthError(err);
      return {
        baris: [] as BackendWishlistItem[],
        galat: isAuthError ? null : getErrorMessage(err),
      };
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const hasil = await ambilWishlist();
      if (!aktif) return;
      setWishlistItems(hasil.baris);
      setError(hasil.galat);
      setLoading(false);
    })();
    return () => {
      aktif = false;
    };
  }, [ambilWishlist]);

  const onRefresh = async () => {
    setRefreshing(true);
    const hasil = await ambilWishlist();
    setWishlistItems(hasil.baris);
    setError(hasil.galat);
    setRefreshing(false);
  };

  const muatUlang = async () => {
    setLoading(true);
    const hasil = await ambilWishlist();
    setWishlistItems(hasil.baris);
    setError(hasil.galat);
    setLoading(false);
  };

  const hapus = async (item: BackendWishlistItem) => {
    try {
      await apiService.removeFromWishlist(item.id);
      setWishlistItems((prev) => prev.filter((row) => row.id !== item.id));
    } catch (err: any) {
      console.error("Error removing from wishlist:", err);
      Alert.alert("Error", "Gagal menghapus produk dari wishlist");
    }
  };

  const konfirmasiHapus = (item: BackendWishlistItem) => {
    Alert.alert(
      "Hapus dari Simpanan",
      `Hapus ${item.nama_produk || "produk ini"} dari barang tersimpan?`,
      [
        { text: teks.umum.batal, style: "cancel" },
        { text: teks.umum.hapus, style: "destructive", onPress: () => hapus(item) },
      ]
    );
  };

  const handleAddToCart = async (item: BackendWishlistItem) => {
    try {
      /**
       * Produk dengan varian wajib masuk keranjang lewat varian pertama.
       * Tanpa varian, id baris keranjang jadi `produkId` (bukan
       * `produkId+varianId`) sehingga muncul sebagai item duplikat dari
       * baris yang sama saat ditambahkan dari halaman detail produk.
       */
      const product = await apiService.getProduct(item.id);
      const varian = product.varian?.[0];
      const stok = varian ? Number(varian.stok) || 0 : Number(product.stok) || 0;

      if (stok <= 0) {
        Alert.alert(
          "Stok Habis",
          `${item.nama_produk || "Produk"} sedang tidak tersedia.`
        );
        return;
      }

      await addItem(
        { ...product, harga: Number(product.harga) || 0, stok },
        1,
        varian
          ? { ...varian, harga: Number(varian.harga_jual) || Number(product.harga) || 0 }
          : undefined
      );

      Alert.alert(
        "Berhasil!",
        `${item.nama_produk || "Produk"} ditambahkan ke keranjang`,
        [
          { text: "Lanjut Belanja", style: "cancel" },
          { text: "Lihat Keranjang", onPress: () => router.push("/(tabs)/cart") },
        ]
      );
    } catch (err: any) {
      console.error("Error adding to cart:", err);
      Alert.alert("Error", "Gagal menambahkan produk ke keranjang");
    }
  };

  const handleProductPress = (item: BackendWishlistItem) => {
    router.push(`/product/${item.id}`);
  };

  const judul =
    wishlistItems.length > 0
      ? `${teks.judul.saved} (${wishlistItems.length})`
      : teks.judul.saved;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <AppBar title={judul} onBack={() => router.back()} />

      {loading ? (
        <View className="px-4 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="flex-row gap-3 py-4">
              <Skeleton width={72} height={80} radiusClassName="rounded-md" />
              <View className="flex-1">
                <Skeleton height={14} width="85%" />
                <Skeleton height={12} width="40%" className="mt-2" />
                <Skeleton height={16} width="50%" className="mt-2" />
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <ErrorState pesan={error} onRetry={muatUlang} />
      ) : wishlistItems.length === 0 ? (
        <EmptyState
          icon={<Heart size={36} color={colors.primary600} strokeWidth={1.75} />}
          title={teks.empty.wishlist.judul}
          description={teks.empty.wishlist.deskripsi}
        />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary600]}
              tintColor={colors.primary600}
            />
          }
        >
          <View className="divide-y divide-neutral-100 px-4">
            {wishlistItems.map((item) => (
              <View key={item.id}>
                <ProductCardHorizontal
                  produk={keProduk(item)}
                  onPress={() => handleProductPress(item)}
                  onHapusSimpan={() => konfirmasiHapus(item)}
                />
                <Pressable
                  onPress={() => handleAddToCart(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${teks.tombol.tambahKeKeranjang} ${item.nama_produk}`}
                  className="-mt-1 min-h-[44px] justify-center pb-3"
                >
                  <Text className="font-inter-medium text-xs text-primary-700">
                    + {teks.tombol.tambahKeKeranjang}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default WishlistScreen;
