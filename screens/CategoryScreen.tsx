import { LayoutGrid, Package } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
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
import { angka } from "../src/lib/format";
import { teks } from "../src/lib/i18n";
import { useProdukPaginasi } from "../src/screens/produk/useProdukPaginasi";
import { colors } from "../src/theme/tokens";
import { apiService } from "../services/apiService";
import type { Product, ProductCategory } from "../services/types";
import { handleAuthError } from "../utils/auth";

/**
 * Kategori Zovora — guideline §3.6 (tab kategori) + §3.9 (grid) + §5.
 *
 * Susunan: rail avatar kategori 56 (dapat digeser) → chip "Semua" + nama
 * kategori aktif + jumlah produk → grid produk 2 kolom gap 12 dengan kartu
 * `ProductCardGrid`.
 *
 * Dua perbaikan penting (lihat docs/fix-kategori-total-infinite.md):
 * 1. Jumlah produk memakai `meta.total` dari respons API, bukan
 *    `produk.length` (satu halaman hanya 20 item dari ribuan produk).
 * 2. Grid 2 kolom memakai `FlatList` + `onEndReached` sehingga halaman
 *    berikutnya termuat saat mendekati bawah; berhenti di `meta.last_page`.
 */
export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const kategoriAwal = useMemo(() => {
    const n = params.categoryId ? parseInt(params.categoryId, 10) : NaN;
    return Number.isNaN(n) ? null : n;
  }, [params.categoryId]);

  const [kategori, setKategori] = useState<ProductCategory[]>([]);

  const {
    produk,
    total,
    status,
    pesanGalat,
    memuatLagi,
    galatLagi,
    habis,
    menyegarkan,
    kategoriId,
    pilihKategori,
    muatLagi,
    segarkan,
    cobaLagi,
  } = useProdukPaginasi(kategoriAwal);

  /* Daftar kategori hanya pelengkap rail; kegagalannya tidak mengosongkan grid. */
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const daftar = await apiService.getProductCategories();
        if (aktif) setKategori(Array.isArray(daftar) ? daftar : []);
      } catch (err: unknown) {
        await handleAuthError(err);
        if (aktif) setKategori([]);
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  const namaAktif = useMemo(
    () => kategori.find((k) => k.id === kategoriId)?.nama_kategori ?? teks.kategori.semua,
    [kategori, kategoriId],
  );

  /** Angka tampil: `meta.total`; fallback jumlah item bila meta tidak dikirim. */
  const totalTampil = total > 0 ? total : produk.length;
  const memuatAwal = status === "memuat" && produk.length === 0;
  const galatAwal = status === "galat" && produk.length === 0;

  /* ------------------------------------------------------------------ */
  /* Sentinel footer: di web, IntersectionObserver menutup celah yang    */
  /* ditinggalkan `onEndReached` saat daftar masih pendek / scroll cepat. */
  /* ------------------------------------------------------------------ */
  const sentinelRef = useRef<View | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const simpul = sentinelRef.current as unknown as HTMLElement | null;
    if (!simpul || typeof IntersectionObserver === "undefined") return;
    const pengamat = new IntersectionObserver(
      (entri) => {
        if (entri.some((e) => e.isIntersecting)) muatLagi();
      },
      { rootMargin: "240px 0px" },
    );
    pengamat.observe(simpul);
    return () => pengamat.disconnect();
  }, [muatLagi, produk.length, habis, galatLagi, memuatLagi]);

  const footer = useMemo(() => {
    if (memuatLagi) {
      return (
        <View className="flex-row items-center justify-center gap-2 py-6">
          <ActivityIndicator size="small" color={colors.primary600} />
          <Text className="font-inter text-xs text-neutral-500" maxFontSizeMultiplier={1.3}>
            {teks.kategori.memuatLagi}
          </Text>
        </View>
      );
    }
    if (galatLagi) {
      return (
        <View className="items-center gap-2 py-6">
          <Text
            className="px-4 text-center font-inter text-xs text-neutral-500"
            maxFontSizeMultiplier={1.3}
          >
            {teks.kategori.galatLagi}
          </Text>
          <Pressable
            onPress={muatLagi}
            accessibilityRole="button"
            accessibilityLabel={teks.tombol.cobaLagi}
            hitSlop={8}
            style={{ minHeight: 44 }}
            className="items-center justify-center px-4"
          >
            <Text className="font-inter-semibold text-sm text-primary-700">
              {teks.tombol.cobaLagi}
            </Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View ref={sentinelRef} className="items-center py-4" style={{ minHeight: 2 }}>
        {habis && produk.length > 0 ? (
          <Text className="font-inter text-xs text-neutral-400" maxFontSizeMultiplier={1.3}>
            {teks.kategori.habis}
          </Text>
        ) : null}
      </View>
    );
  }, [memuatLagi, galatLagi, habis, produk.length, muatLagi]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={{ width: "47.5%", flexGrow: 1, maxWidth: "48.5%" }}>
        <ProductCardGrid produk={item} onPress={() => router.push(`/product/${item.id}`)} />
      </View>
    ),
    [router],
  );

  const keyExtractor = useCallback((item: Product) => String(item.id), []);

  /* ------------------------------------------------------------------ */
  /* Infinite scroll.                                                    */
  /* - Android/iOS: `FlatList` + `onEndReached` (VirtualizedList asli).   */
  /* - Web: `ScrollView` + listener `scroll` DOM. `FlatList` di           */
  /*   react-native-web tidak memajukan jendela sel untuk perubahan       */
  /*   programatik, sehingga `onEndReached` tak pernah terpicu dan        */
  /*   halaman baru tidak pernah tampil walau datanya sudah dimuat.       */
  /* Kedua jalur memakai `cekDekatBawah` yang sama, dan hook paginasi     */
  /* mengunci request ganda (`sedangMuatRef`).                            */
  /* ------------------------------------------------------------------ */
  const listRef = useRef<FlatList<Product>>(null);
  const webRef = useRef<ScrollView>(null);
  /**
   * Pemicu "sekali per pendekatan": setelah satu halaman diminta, pemicu
   * dipersenjatai ulang hanya ketika pengguna menjauh dari dasar (sisa > 480).
   * Tanpa ini, konten yang bertambah tepat saat pengguna berada di dasar
   * membuat event scroll berikutnya langsung meminta halaman lagi terus-
   * menerus (cascade: 40+ request dari satu tarikan).
   */
  const siapMuatRef = useRef(true);

  const cekDekatBawah = useCallback(
    (offset: number, tinggiIsi: number, tinggiLayar: number) => {
      const sisa = tinggiIsi - (offset + tinggiLayar);
      if (sisa > 480) {
        siapMuatRef.current = true; // pengguna menjauh dari dasar → siap lagi
        return;
      }
      if (!siapMuatRef.current) return;
      siapMuatRef.current = false;
      muatLagi();
    },
    [muatLagi],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      cekDekatBawah(contentOffset.y, contentSize.height, layoutMeasurement.height);
    },
    [cekDekatBawah],
  );

  // Kategori berganti → daftar mulai dari nol, pemicu siap lagi.
  useEffect(() => {
    siapMuatRef.current = true;
  }, [kategoriId]);

  // Web: listener DOM pada node scroll (ScrollView punya `scrollNode`).
  useEffect(() => {
    if (Platform.OS !== "web" || produk.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = (webRef.current as any)?.getScrollableNode?.() as HTMLElement | undefined;
    if (!node) return;

    let terakhir = 0;
    const tangani = () => {
      const sekarang = Date.now();
      // Throttle ringan: cukup 1 pemeriksaan per 120 ms saat menggulir.
      if (sekarang - terakhir < 120) return;
      terakhir = sekarang;
      cekDekatBawah(node.scrollTop, node.scrollHeight, node.clientHeight);
    };
    node.addEventListener("scroll", tangani, { passive: true });
    // Daftar yang lebih pendek dari layar tidak pernah memicu scroll.
    tangani();
    return () => node.removeEventListener("scroll", tangani);
  }, [cekDekatBawah, produk.length, kategoriId]);

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

      {memuatAwal ? (
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
      ) : galatAwal ? (
        <ErrorState pesan={pesanGalat} onRetry={cobaLagi} />
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

          {/* Chip kategori aktif + jumlah produk dari meta.total */}
          <View className="flex-row items-center justify-between px-4 pt-3">
            <Text
              className="flex-1 font-inter-semibold text-base text-neutral-900"
              accessibilityRole="header"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {namaAktif}
            </Text>
            {!pesanGalat ? (
              <Text
                className="font-inter text-xs text-neutral-500 tabular-nums"
                maxFontSizeMultiplier={1.3}
              >
                {teks.kategori.jumlah.replace("{jumlah}", angka(totalTampil))}
              </Text>
            ) : null}
          </View>

          {Platform.OS === "web" ? (
            /* Web: ScrollView + listener scroll DOM (lihat catatan di atas). */
            <ScrollView
              ref={webRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              onScroll={onScroll}
              scrollEventThrottle={64}
              refreshControl={
                <RefreshControl
                  refreshing={menyegarkan}
                  onRefresh={segarkan}
                  colors={[colors.primary600]}
                  tintColor={colors.primary600}
                />
              }
            >
              {status === "galat" ? (
                <ErrorState pesan={pesanGalat} onRetry={cobaLagi} />
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
              {footer}
            </ScrollView>
          ) : (
            /* Android/iOS: grid virtual dengan `onEndReached`. */
            <FlatList
              ref={listRef}
              data={produk}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
              style={{ flex: 1 }}
              refreshControl={
                <RefreshControl
                  refreshing={menyegarkan}
                  onRefresh={segarkan}
                  colors={[colors.primary600]}
                  tintColor={colors.primary600}
                />
              }
              onScroll={onScroll}
              scrollEventThrottle={64}
              onEndReached={muatLagi}
              onEndReachedThreshold={0.6}
              initialNumToRender={8}
              maxToRenderPerBatch={12}
              windowSize={7}
              removeClippedSubviews={false}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={footer}
              ListEmptyComponent={
                status === "galat" ? (
                  <ErrorState pesan={pesanGalat} onRetry={cobaLagi} />
                ) : (
                  <View className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <EmptyState
                      icon={<Package size={36} color={colors.primary600} strokeWidth={1.75} />}
                      title={teks.kategori.kosong.judul}
                      description={teks.kategori.kosong.deskripsi}
                      ctaLabel={teks.kategori.kosong.cta}
                      onCtaPress={() => pilihKategori(null)}
                    />
                  </View>
                )
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
