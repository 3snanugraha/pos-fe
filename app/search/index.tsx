import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowUpLeft, ImageIcon, Search, SlidersHorizontal, TrendingUp, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { kembaliAman } from "../../src/lib/navigasi";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBar } from "../../src/components/layout";
import {
  EmptyState,
  Chip,
} from "../../src/components/ui";
import { ProductCardGrid } from "../../src/components/commerce";
import { SearchBar } from "../../src/components/commerce/SearchBar";
import { SkeletonGridProduk } from "../../src/components/commerce/Skeleton";
import { paddingBawahKonten } from "../../src/lib/inset";
import { angka } from "../../src/lib/format";
import { teks } from "../../src/lib/i18n";
import { useRiwayatPencarian } from "../../src/lib/riwayatPencarian";
import { colors, sizes } from "../../src/theme/tokens";
import { apiService } from "../../services/apiService";
import type { Product, ProductCategory } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

/** Override filter untuk satu kali pemanggilan (menghindari state basi). */
interface SearchParams {
  query?: string;
  kategoriId?: number | null;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  priceRange?: { min: string; max: string };
}

const SORT_OPTIONS = [
  { key: "nama_produk", label: teks.pencarian.urut.namaAZ, direction: "asc" as const },
  { key: "nama_produk", label: teks.pencarian.urut.namaZA, direction: "desc" as const },
  { key: "harga", label: teks.pencarian.urut.hargaTerendah, direction: "asc" as const },
  { key: "harga", label: teks.pencarian.urut.hargaTertinggi, direction: "desc" as const },
  { key: "created_at", label: teks.pencarian.urut.terbaru, direction: "desc" as const },
  { key: "stok", label: teks.pencarian.urut.stokTerbanyak, direction: "desc" as const },
];

/**
 * Pencarian Zovora — guideline §3.4 + §4 (Search) + §5.
 *
 * Tiga keadaan sesuai pola layar:
 * 1. awal (query kosong): recent searches (avatar 48 + "Hapus Semua") dan
 *    trending (thumbnail kotak rounded-md) — keduanya digeser horizontal;
 * 2. mengetik: daftar saran baris 52 dengan thumbnail 28, bagian yang cocok
 *    dicetak tebal, ikon arrow-up-left mengisi kolom pencarian;
 * 3. hasil: grid produk 2 kolom; tanpa hasil → EmptyState pola §5.
 *
 * Filter harga, kategori, dan sorting dari versi sebelumnya DIPERTAHANKAN
 * (termasuk fallback filter harga sisi klien karena rute publik backend
 * mengabaikan `harga_min`/`harga_max`).
 */
export default function SearchScreen() {
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/");
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initialQuery = typeof params.query === "string" ? params.query : "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  /** Total hasil dari `meta.total` API — bukan jumlah item halaman ini. */
  const [totalHasil, setTotalHasil] = useState(0);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("nama_produk");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({
    min: "",
    max: "",
  });
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Kata yang sudah benar-benar dikirim ke API (pembanding mode saran). */
  const [kataDicari, setKataDicari] = useState(initialQuery);

  const { riwayat, tambah: tambahRiwayat, hapusSemua } = useRiwayatPencarian();

  const searchProducts = useCallback(
    async (overrides: Partial<SearchParams> = {}) => {
      setLoading(true);
      setError(null);

      // Nilai filter diambil dari `overrides` lebih dulu: state React belum
      // tentu sudah ter-update saat handler memanggil fungsi ini.
      const query = overrides.query ?? searchQuery;
      const kategori = overrides.kategoriId ?? selectedCategory;
      const urut = overrides.sortBy ?? sortBy;
      const arah = overrides.sortDirection ?? sortDirection;
      const harga = overrides.priceRange ?? priceRange;

      const permintaan: Record<string, unknown> = {
        per_page: 50,
        sort_by: urut,
        sort_direction: arah,
      };

      if (query.trim()) {
        permintaan.search = query.trim();
        tambahRiwayat(query.trim());
      }
      if (kategori) permintaan.kategori_id = kategori;

      const hargaMin = parseInt(harga.min, 10);
      const hargaMax = parseInt(harga.max, 10);
      if (!Number.isNaN(hargaMin)) permintaan.min_harga = hargaMin;
      if (!Number.isNaN(hargaMax)) permintaan.max_harga = hargaMax;

      try {
        const result = await apiService.searchProducts(permintaan as never);
        const produk = result.data ?? [];
        /**
         * Jumlah hasil memakai `meta.total` dari API, bukan `produk.length`:
         * satu halaman hanya memuat `per_page` item, jadi `length` bukan total
         * (bug yang sama dengan layar kategori).
         */
        const totalServer = Number(result.meta?.total);

        /**
         * Backend mengabaikan `harga_min`/`harga_max` pada rute publik
         * (`/public/products` memanggil `getProducts($request, false)` dan
         * filter harga hanya jalan bila `$isPublic === true`). Tanpa fallback
         * ini filter harga tampak "tidak berefek".
         */
        const tersaring = produk.filter((item) => {
          const hargaProduk = Number(item.harga) || 0;
          if (!Number.isNaN(hargaMin) && hargaProduk < hargaMin) return false;
          if (!Number.isNaN(hargaMax) && hargaProduk > hargaMax) return false;
          return true;
        });

        setProducts(tersaring);
        setTotalHasil(
          Number.isFinite(totalServer) && totalServer > 0 ? totalServer : tersaring.length,
        );
        setKataDicari(query.trim());
      } catch (e) {
        const isAuthError = await handleAuthError(e);
        if (!isAuthError) setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, sortBy, sortDirection, selectedCategory, priceRange, tambahRiwayat],
  );

  const jalankanPencarian = useCallback(
    (kata: string) => {
      setSearchQuery(kata);
      searchProducts({ query: kata });
    },
    [searchProducts],
  );

  useEffect(() => {
    // SetState dipisah ke tugas async agar tidak terjadi sinkron di body effect
    // (pola fetch-on-mount yang sama dengan layar lain, tanpa warning).
    let aktif = true;
    (async () => {
      try {
        const data = await apiService.getProductCategories();
        if (aktif) setCategories(data);
      } catch {
        /* kategori hanya pelengkap filter; pencarian tetap jalan */
      }
      if (aktif && initialQuery) searchProducts({ query: initialQuery });
    })();
    return () => {
      aktif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adaQuery = searchQuery.trim().length > 0;
  /** Kolom kosong → selalu tampilkan recent + trending (guideline §3.4). */
  const modeAwal = !adaQuery;
  /** Query berubah sejak pencarian terakhir → tampilkan saran dulu. */
  const modeSaran = adaQuery && searchQuery.trim() !== kataDicari.trim();

  /* ------------------------------------------------------------------ */
  /* Saran: gabungan nama produk yang sudah ada + nama kategori.         */
  /* ------------------------------------------------------------------ */
  const kolamSaran = useMemo(() => {
    const dariProduk = products.slice(0, 40).map((p) => p.nama_produk);
    const dariKategori = categories.map((c) => c.nama_kategori);
    return Array.from(new Set([...dariProduk, ...dariKategori]));
  }, [products, categories]);

  const saran = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return kolamSaran.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [kolamSaran, searchQuery]);

  /** Trending: nama kategori teratas — sumber nyata, bukan data karangan. */
  const trending = useMemo(() => categories.slice(0, 10), [categories]);

  const resetFilter = () => {
    const kosong = { min: "", max: "" };
    setSelectedCategory(null);
    setSortBy("nama_produk");
    setSortDirection("asc");
    setPriceRange(kosong);
    searchProducts({
      kategoriId: null,
      sortBy: "nama_produk",
      sortDirection: "asc",
      priceRange: kosong,
    });
  };

  /* ------------------------------- render --------------------------- */
  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar
        title={teks.judul.search}
        onBack={kembali}
        right={
          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={teks.a11y.bukaFilter}
            accessibilityState={{ expanded: showFilters }}
            hitSlop={sizes.hitSlop}
            className="h-11 w-11 items-center justify-center rounded-full"
          >
            <SlidersHorizontal
              size={20}
              color={showFilters ? colors.primary600 : colors.neutral700}
              strokeWidth={1.75}
            />
          </Pressable>
        }
      />

      <View className="border-b border-neutral-100 bg-white px-4 pb-3 pt-1">
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={() => searchProducts({ query: searchQuery })}
          autoFocus={!initialQuery}
          tanpaAksiSuara
        />

        {/* Filter & sorting — dipertahankan dari versi sebelumnya. */}
        {showFilters ? (
          <View className="mt-3">
            <Text className="mb-2 font-inter-medium text-sm text-neutral-900">
              {teks.pencarian.urutkan}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {SORT_OPTIONS.map((opt) => (
                  <Chip
                    key={`${opt.key}-${opt.direction}`}
                    label={opt.label}
                    selected={sortBy === opt.key && sortDirection === opt.direction}
                    onPress={() => {
                      setSortBy(opt.key);
                      setSortDirection(opt.direction);
                      searchProducts({ sortBy: opt.key, sortDirection: opt.direction });
                    }}
                  />
                ))}
              </View>
            </ScrollView>

            <Text className="mb-2 mt-3 font-inter-medium text-sm text-neutral-900">
              {teks.pencarian.kategori}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                <Chip
                  label={teks.umum.semua}
                  selected={selectedCategory === null}
                  onPress={() => {
                    setSelectedCategory(null);
                    searchProducts({ kategoriId: null });
                  }}
                />
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.nama_kategori}
                    selected={selectedCategory === c.id}
                    onPress={() => {
                      setSelectedCategory(c.id);
                      searchProducts({ kategoriId: c.id });
                    }}
                  />
                ))}
              </View>
            </ScrollView>

            <Text className="mb-2 mt-3 font-inter-medium text-sm text-neutral-900">
              {teks.pencarian.rentangHarga}
            </Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={priceRange.min}
                onChangeText={(t) => setPriceRange((p) => ({ ...p, min: t }))}
                placeholder={teks.pencarian.hargaMin}
                placeholderTextColor={colors.neutral400}
                keyboardType="numeric"
                className="flex-1 rounded-md border border-neutral-200 bg-white px-3 font-inter text-sm text-neutral-900"
                style={{ height: sizes.input }}
                accessibilityLabel={teks.pencarian.hargaMin}
              />
              <Text className="font-inter text-neutral-500">–</Text>
              <TextInput
                value={priceRange.max}
                onChangeText={(t) => setPriceRange((p) => ({ ...p, max: t }))}
                placeholder={teks.pencarian.hargaMax}
                placeholderTextColor={colors.neutral400}
                keyboardType="numeric"
                className="flex-1 rounded-md border border-neutral-200 bg-white px-3 font-inter text-sm text-neutral-900"
                style={{ height: sizes.input }}
                accessibilityLabel={teks.pencarian.hargaMax}
              />
            </View>

            <View className="mt-3 flex-row gap-3">
              <Pressable
                onPress={resetFilter}
                accessibilityRole="button"
                accessibilityLabel={teks.pencarian.reset}
                className="flex-1 items-center justify-center rounded-md border border-neutral-200 bg-white"
                style={{ height: sizes.buttonMd }}
              >
                <Text className="font-inter-semibold text-sm text-neutral-700">
                  {teks.pencarian.reset}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowFilters(false);
                  searchProducts();
                }}
                accessibilityRole="button"
                accessibilityLabel={teks.pencarian.terapkan}
                className="flex-1 items-center justify-center rounded-md bg-primary-600"
                style={{ height: sizes.buttonMd }}
              >
                <Text className="font-inter-semibold text-sm text-white">
                  {teks.pencarian.terapkan}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {/* ---------------------------- konten ---------------------------- */}
      {modeAwal ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: paddingBawahKonten(insets) }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recent searches — judul + "Hapus Semua" + avatar bulat 48. */}
          {riwayat.length > 0 ? (
            <View className="pt-4">
              <View className="mb-3 flex-row items-center justify-between px-4">
                <Text className="font-inter-semibold text-base text-neutral-900">
                  {teks.judul.recentSearches}
                </Text>
                <Pressable
                  onPress={hapusSemua}
                  accessibilityRole="button"
                  accessibilityLabel={teks.pencarian.hapusRiwayat}
                  hitSlop={sizes.hitSlop}
                  className="flex-row items-center"
                  style={{ minHeight: sizes.minTouchTarget }}
                >
                  <Trash2 size={14} color={colors.primary700} strokeWidth={1.75} />
                  <Text className="ml-1 font-inter-medium text-xs text-primary-700">
                    {teks.tombol.clearAll}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
              >
                {riwayat.map((kata) => (
                  <Pressable
                    key={kata}
                    onPress={() => jalankanPencarian(kata)}
                    accessibilityRole="button"
                    accessibilityLabel={`${teks.judul.recentSearches}: ${kata}`}
                    className="items-center active:opacity-70"
                    style={{ width: 64 }}
                  >
                    <View
                      className="items-center justify-center rounded-full bg-primary-50"
                      style={{ width: 48, height: 48 }}
                    >
                      <Search size={20} color={colors.primary600} strokeWidth={1.75} />
                    </View>
                    <Text
                      className="mt-1.5 text-center font-inter text-xs text-neutral-700"
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.3}
                    >
                      {kata}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Trending — thumbnail kotak rounded-md (guideline §3.4). */}
          {trending.length > 0 ? (
            <View className="pt-6">
              <View className="mb-3 flex-row items-center gap-1.5 px-4">
                <TrendingUp size={16} color={colors.primary600} strokeWidth={1.75} />
                <Text className="font-inter-semibold text-base text-neutral-900">
                  {teks.pencarian.trending}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              >
                {trending.map((k) => (
                  <Pressable
                    key={k.id}
                    onPress={() => {
                      setSelectedCategory(k.id);
                      jalankanPencarian(k.nama_kategori);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={k.nama_kategori}
                    className="overflow-hidden rounded-md border border-neutral-100 bg-white active:opacity-80"
                    style={{ width: 96 }}
                  >
                    <View style={{ height: 72 }} className="bg-neutral-50">
                      {k.gambar_url ? (
                        <Image
                          source={{ uri: k.gambar_url }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-full w-full items-center justify-center">
                          <ImageIcon size={22} color={colors.neutral300} strokeWidth={1.75} />
                        </View>
                      )}
                    </View>
                    <Text
                      className="p-2 font-inter-medium text-xs text-neutral-900"
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.3}
                    >
                      {k.nama_kategori}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Ajakan awal bila belum ada riwayat/trending. */}
          {riwayat.length === 0 && trending.length === 0 ? (
            <View className="pt-10">
              <EmptyState
                icon={<Search size={36} color={colors.primary600} strokeWidth={1.75} />}
                title={teks.pencarian.mulaiCari}
                description={teks.pencarian.mulaiCariDeskripsi}
              />
            </View>
          ) : null}
        </ScrollView>
      ) : loading ? (
        <View className="p-4">
          <SkeletonGridProduk jumlah={4} />
        </View>
      ) : error ? (
        <View className="p-4">
          <EmptyState
            icon={<Search size={36} color={colors.primary600} strokeWidth={1.75} />}
            title={teks.empty.jaringan.judul}
            description={error}
            ctaLabel={teks.tombol.cobaLagi}
            onCtaPress={() => searchProducts({ query: searchQuery })}
          />
        </View>
      ) : modeSaran ? (
        /* Daftar saran — baris 52, thumbnail 28, teks tebal pada bagian cocok.
           Bila tidak ada saran yang cocok, tetap tampilkan satu baris "cari
           persis" agar pengguna tidak melihat "tidak ada hasil" sebelum
           benar-benar mencari. */
        <ScrollView keyboardShouldPersistTaps="handled" className="flex-1">
          <Text className="px-4 pb-1 pt-4 font-inter-semibold text-xs text-neutral-500">
            {teks.pencarian.saran}
          </Text>
          {saran.map((s) => (
            <BarisSaran
              key={s}
              teksSaran={s}
              query={searchQuery}
              onPress={() => jalankanPencarian(s)}
            />
          ))}
          {saran.length === 0 ? (
            <BarisSaran
              teksSaran={searchQuery.trim()}
              query={searchQuery}
              onPress={() => searchProducts({ query: searchQuery })}
            />
          ) : null}
        </ScrollView>
      ) : products.length === 0 ? (
        <View className="flex-1 justify-center px-4">
          <EmptyState
            icon={<Search size={36} color={colors.primary600} strokeWidth={1.75} />}
            title={teks.empty.pencarian.judul}
            description={teks.empty.pencarian.deskripsi}
          >
            <Pressable
              onPress={() => {
                setSearchQuery("");
                resetFilter();
              }}
              accessibilityRole="button"
              accessibilityLabel={teks.pencarian.ulangiCari}
              hitSlop={sizes.hitSlop}
              className="mt-6"
              style={{ minHeight: sizes.minTouchTarget }}
            >
              <Text className="font-inter-medium text-sm text-primary-700">
                {teks.pencarian.ulangiCari}
              </Text>
            </Pressable>
          </EmptyState>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8}
          ListHeaderComponent={
            <Text
              className="mb-3 font-inter text-xs text-neutral-500"
              accessibilityRole="header"
            >
              {adaQuery
                ? teks.pencarian.hasilUntuk.replace("{query}", searchQuery.trim())
                : teks.pencarian.jumlahHasil.replace(
                    "{jumlah}",
                    angka(totalHasil > 0 ? totalHasil : products.length),
                  )}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ width: "47.5%", flexGrow: 1, maxWidth: "48.5%" }}>
              <ProductCardGrid
                produk={item}
                onPress={() => router.push(`/product/${item.id}`)}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

/**
 * Baris saran — tinggi 52, thumbnail 28 `rounded-sm`, teks Body dengan bagian
 * yang cocok dicetak tebal, tombol arrow-up-left di kanan mengisi kolom
 * pencarian (guideline §3.4), divider neutral-100.
 */
function BarisSaran({
  teksSaran,
  query,
  onPress,
}: {
  teksSaran: string;
  query: string;
  onPress: () => void;
}) {
  const q = query.trim().toLowerCase();
  const posisi = q ? teksSaran.toLowerCase().indexOf(q) : -1;

  return (
    <View className="border-b border-neutral-100">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${teksSaran}`}
        className="flex-row items-center gap-3 px-4 active:bg-neutral-50"
        style={{ height: 52 }}
      >
        <View
          className="items-center justify-center rounded-sm bg-neutral-100"
          style={{ width: 28, height: 28 }}
        >
          <Search size={14} color={colors.neutral500} strokeWidth={1.75} />
        </View>

        <Text className="flex-1 font-inter text-sm text-neutral-900" numberOfLines={1}>
          {posisi < 0 ? (
            teksSaran
          ) : (
            <>
              {teksSaran.slice(0, posisi)}
              <Text className="font-inter-semibold text-neutral-900">
                {teksSaran.slice(posisi, posisi + q.length)}
              </Text>
              {teksSaran.slice(posisi + q.length)}
            </>
          )}
        </Text>

        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={teks.pencarian.gunakanSaran.replace("{saran}", teksSaran)}
          hitSlop={sizes.hitSlop}
          className="items-center justify-center"
          style={{ width: 44, height: 44 }}
        >
          <ArrowUpLeft size={18} color={colors.neutral400} strokeWidth={1.75} />
        </Pressable>
      </Pressable>
    </View>
  );
}
