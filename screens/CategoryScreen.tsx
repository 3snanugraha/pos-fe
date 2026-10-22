import { LayoutGrid, Package } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ErrorState,
  KategoriAvatar,
  ProductCardGrid,
  Skeleton,
  SkeletonGridProduk,
} from "../src/components/commerce";
import { AppBar } from "../src/components/layout";
import { EmptyState } from "../src/components/ui";
import { teks } from "../src/lib/i18n";
import { colors } from "../src/theme/tokens";
import { apiService } from "../services/apiService";
import type { Product, ProductCategory } from "../services/types";
import { getErrorMessage, handleAuthError } from "../utils/auth";

/**
 * Kategori Zovora — guideline §3.6 (tab kategori) + §3.9 (grid) + §5.
 *
 * Susunan: rail avatar kategori 56 (dapat digeser) → chip "Semua" + nama
 * kategori aktif → grid produk 2 kolom gap 12 dengan kartu `ProductCardGrid`.
 * Filter mengirim `kategori_id` ke endpoint pencarian yang sama seperti versi
 * lama, sehingga perilaku backend tidak berubah.
 */
export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const kategoriAwal = params.categoryId ? parseInt(params.categoryId, 10) : null;

  const [kategori, setKategori] = useState<ProductCategory[]>([]);
  const [produk, setProduk] = useState<Product[]>([]);
  const [dipilih, setDipilih] = useState<number | null>(kategoriAwal);
  const [loading, setLoading] = useState(true);
  const [memuatProduk, setMemuatProduk] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [galatProduk, setGalatProduk] = useState<string | null>(null);

  /** Muat daftar kategori (sekali) + produk untuk kategori terpilih. */
  const muat = useCallback(async (kategoriId: number | null) => {
    try {
      const [daftarKategori, hasilProduk] = await Promise.all([
        apiService.getProductCategories(),
        apiService.searchProducts({
          kategori_id: kategoriId ?? undefined,
          per_page: 20,
        }),
      ]);
      return {
        kategori: Array.isArray(daftarKategori) ? daftarKategori : [],
        produk: Array.isArray(hasilProduk.data) ? hasilProduk.data : [],
        galat: null,
        galatProduk: null,
      };
    } catch (err: any) {
      console.error("Error loading category data:", err);
      const isAuthError = await handleAuthError(err);
      return {
        kategori: [] as ProductCategory[],
        produk: [] as Product[],
        galat: isAuthError ? null : getErrorMessage(err),
        galatProduk: isAuthError ? null : getErrorMessage(err),
      };
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const hasil = await muat(kategoriAwal);
      if (!aktif) return;
      setKategori(hasil.kategori);
      setProduk(hasil.produk);
      setError(hasil.galat);
      setGalatProduk(hasil.galatProduk);
      setLoading(false);
    })();
    return () => {
      aktif = false;
    };
  }, [muat, kategoriAwal]);

  /** Ganti kategori: skeleton grid, bukan spinner layar penuh (§5). */
  const pilihKategori = async (kategoriId: number | null) => {
    if (kategoriId === dipilih || memuatProduk) return;
    setDipilih(kategoriId);
    setMemuatProduk(true);
    setGalatProduk(null);
    try {
      const hasil = await apiService.searchProducts({
        kategori_id: kategoriId ?? undefined,
        per_page: 20,
      });
      setProduk(Array.isArray(hasil.data) ? hasil.data : []);
    } catch (err: any) {
      console.error("Error loading products by category:", err);
      const isAuthError = await handleAuthError(err);
      if (!isAuthError) {
        setProduk([]);
        setGalatProduk(getErrorMessage(err));
      }
    } finally {
      setMemuatProduk(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const hasil = await muat(dipilih);
    setKategori(hasil.kategori);
    setProduk(hasil.produk);
    setError(hasil.galat);
    setGalatProduk(hasil.galatProduk);
    setRefreshing(false);
  };

  const muatUlang = async () => {
    setLoading(true);
    const hasil = await muat(dipilih);
    setKategori(hasil.kategori);
    setProduk(hasil.produk);
    setError(hasil.galat);
    setGalatProduk(hasil.galatProduk);
    setLoading(false);
  };

  const namaAktif = useMemo(
    () => kategori.find((k) => k.id === dipilih)?.nama_kategori ?? teks.kategori.semua,
    [kategori, dipilih]
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <AppBar
        title={teks.kategori.judul}
        showBack={false}
        right={
          <Pressable
            onPress={() => router.push("/search")}
            accessibilityRole="button"
            accessibilityLabel={teks.nav.pencarian}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center"
          >
            <LayoutGrid size={22} color={colors.neutral700} strokeWidth={1.75} />
          </Pressable>
        }
      />

      {loading ? (
        <View className="flex-1 px-4 pt-4">
          <View className="flex-row gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} className="items-center gap-1.5">
                <Skeleton width={56} height={56} radiusClassName="rounded-full" />
                <Skeleton width={48} height={10} />
              </View>
            ))}
          </View>
          <View className="mt-6">
            <SkeletonGridProduk jumlah={4} />
          </View>
        </View>
      ) : error && kategori.length === 0 ? (
        <ErrorState pesan={error} onRetry={muatUlang} />
      ) : (
        <>
          {/* Rail avatar kategori 56 */}
          {kategori.length > 0 ? (
            <View className="border-b border-neutral-100 pb-2 pt-3">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
              >
                <KategoriAvatar
                  nama={teks.kategori.semua}
                  onPress={() => pilihKategori(null)}
                  ikon={<Package size={22} color={colors.primary600} strokeWidth={1.75} />}
                />
                {kategori.map((k) => (
                  <KategoriAvatar
                    key={k.id}
                    nama={k.nama_kategori}
                    gambarUrl={k.gambar_url}
                    onPress={() => pilihKategori(k.id)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Chip kategori aktif + jumlah produk */}
          <View className="flex-row items-center justify-between px-4 pt-3">
            <Text
              className="flex-1 font-inter-semibold text-base text-neutral-900"
              accessibilityRole="header"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {namaAktif}
            </Text>
            {!memuatProduk && galatProduk === null ? (
              <Text
                className="font-inter text-xs text-neutral-500 tabular-nums"
                maxFontSizeMultiplier={1.3}
              >
                {teks.kategori.jumlah.replace("{jumlah}", String(produk.length))}
              </Text>
            ) : null}
          </View>

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
            {memuatProduk ? (
              <SkeletonGridProduk jumlah={4} />
            ) : galatProduk ? (
              <ErrorState pesan={galatProduk} onRetry={() => pilihKategori(dipilih)} />
            ) : produk.length === 0 ? (
              <View className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <EmptyState
                  icon={<Package size={36} color={colors.primary600} strokeWidth={1.75} />}
                  title={teks.kategori.kosong.judul}
                  description={teks.kategori.kosong.deskripsi}
                  ctaLabel={teks.kategori.kosong.cta}
                  onCtaPress={() => pilihKategori(null)}
                />
              </View>
            ) : (
              <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                {produk.map((p) => (
                  <View
                    key={p.id}
                    style={{ width: "47.5%", flexGrow: 1, maxWidth: "48.5%" }}
                  >
                    <ProductCardGrid
                      produk={p}
                      onPress={() => router.push(`/product/${p.id}`)}
                    />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
