import {
  Book,
  Car,
  Heart,
  Home,
  LayoutGrid,
  Monitor,
  Package,
  Shirt,
  Shield,
  Utensils,
  Wine,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BannerCarousel,
  ErrorState,
  KategoriAvatar,
  ProductCardGrid,
  SectionHeader,
  Skeleton,
  SkeletonGridProduk,
} from "../../src/components/commerce";
import { HomeHeader } from "../../src/components/layout";
import { EmptyState } from "../../src/components/ui";
import { teks } from "../../src/lib/i18n";
import { colors, sizes } from "../../src/theme/tokens";
import { TEMA_FOR_YOU, temaKategori } from "../../src/theme/temaKategori";
import { useCart } from "../../contexts/CartContext";
import { getUserData } from "../../services/auth";
import type { Product } from "../../services/types";
import { useBeranda } from "../../src/screens/home/useBeranda";

/**
 * Beranda Zovora — guideline §3.5–§3.9 + §4 (Home) + §5 (state).
 *
 * Susunan: HomeHeader bergradien tema kategori (search bar, ikon
 * wishlist/keranjang, category tabs, dan banner carousel) → kategori pilihan
 * (avatar bulat 56) → flash sale (scroll horizontal, kartu 140) → grid produk
 * 2 kolom gap 12.
 *
 * Tema header ikut tab kategori aktif: "Semua" = biru For You, kategori lain
 * memakai pasangan warna guideline (src/theme/temaKategori.ts). Loading memakai
 * skeleton (bukan spinner), kosong & galat memakai pola §5.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { itemCount } = useCart();
  const { data, status, pesanGalat, menyegarkan, segarkan, cobaLagi } = useBeranda();

  const [tabAktif, setTabAktif] = useState<string | number>("semua");
  const [namaPelanggan, setNamaPelanggan] = useState("Pelanggan");
  const [alamat, setAlamat] = useState("");

  // Nama & alamat pelanggan: pelengkap header saja, kegagalan diabaikan.
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const user = await getUserData();
        if (!aktif) return;
        if (user?.nama_pelanggan) setNamaPelanggan(user.nama_pelanggan);
        if (user?.alamat) setAlamat(user.alamat);
      } catch {
        /* tamu tanpa sesi — header memakai label default */
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  const memuat = status === "memuat";

  /** Tema header mengikuti kategori tab aktif (guideline §3.6). */
  const tema = useMemo(() => {
    if (tabAktif === "semua") return TEMA_FOR_YOU;
    const kategori = data.kategori.find((k) => String(k.id) === String(tabAktif));
    return kategori ? temaKategori(kategori.nama_kategori) : TEMA_FOR_YOU;
  }, [tabAktif, data.kategori]);

  const kategoriAktif = useMemo(
    () => data.kategori.find((k) => String(k.id) === String(tabAktif)),
    [data.kategori, tabAktif],
  );

  /** Produk yang ditampilkan mengikuti tab kategori aktif. */
  const produkTampil = useMemo(() => {
    if (tabAktif === "semua" || !kategoriAktif) return data.grid;
    return data.grid.filter(
      (p) =>
        String(p.kategori_id) === String(kategoriAktif.id) ||
        p.kategori_nama === kategoriAktif.nama_kategori,
    );
  }, [data.grid, tabAktif, kategoriAktif]);

  const flashSale = useMemo(() => {
    const daftar = tabAktif === "semua" || !kategoriAktif
      ? data.flashSale
      : data.flashSale.filter((p) => String(p.kategori_id) === String(kategoriAktif.id));
    return daftar.slice(0, 8);
  }, [data.flashSale, tabAktif, kategoriAktif]);

  const bukaProduk = (produk: Product) => router.push(`/product/${produk.id}`);

  const ikonKategori = useCallback((nama: string) => {
    const n = nama.toLowerCase();
    const props = { size: 22, color: colors.primary600, strokeWidth: 1.75 } as const;
    if (n.includes("elektronik")) return <Monitor {...props} />;
    if (n.includes("makan") || n.includes("dapur")) return <Utensils {...props} />;
    if (n.includes("minum")) return <Wine {...props} />;
    if (n.includes("pakaian") || n.includes("fashion")) return <Shirt {...props} />;
    if (n.includes("kecantikan") || n.includes("kesehatan")) return <Heart {...props} />;
    if (n.includes("motor") || n.includes("mobil")) return <Car {...props} />;
    if (n.includes("helm")) return <Shield {...props} />;
    if (n.includes("rumah")) return <Home {...props} />;
    if (n.includes("buku")) return <Book {...props} />;
    return <Package {...props} />;
  }, []);

  const tabKategori = useMemo(
    () => [
      {
        id: "semua" as const,
        label: teks.beranda.semuaKategori,
        ikon: (
          <LayoutGrid
            size={24}
            color={tabAktif === "semua" ? colors.primary600 : colors.neutral600}
            strokeWidth={1.75}
          />
        ),
      },
      ...data.kategori.slice(0, 8).map((k) => ({
        id: k.id,
        label: k.nama_kategori,
        ikon: ikonKategori(k.nama_kategori),
      })),
    ],
    [data.kategori, tabAktif, ikonKategori],
  );

  const jumlahProduk = produkTampil.length;

  return (
    /* Hanya kiri/kanan: gradien HomeHeader sengaja menjangkau ke belakang
       status bar (guideline §3.5), sedangkan inset atas diterapkan pada konten
       header (`paddingAtasHeader`) di dalam HomeHeader. */
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["left", "right"]}>
      <HomeHeader
        judul={`${teks.judul.home} · ${namaPelanggan}`}
        alamat={alamat || undefined}
        onPressAlamat={() => router.push("/addresses")}
        onPressWishlist={() => router.push("/wishlist")}
        onPressCart={() => router.push("/(tabs)/cart")}
        jumlahKeranjang={itemCount}
        onPressSearch={() => router.push("/search")}
        tabs={tabKategori}
        tabAktif={tabAktif}
        onTabChange={setTabAktif}
        tema={tema.kunci === "beauty" || tema.kunci === "fashion" ? "beauty" : "forYou"}
      >
        {/* Banner carousel di dalam gradien header (guideline §3.7). */}
        <View className="px-4 pb-4 pt-3">
          <BannerCarousel
            banners={data.banners}
            loading={memuat}
            tema={tema}
            onPressBanner={() => router.push("/(tabs)/products")}
            paddingHorizontal={16}
          />
        </View>
      </HomeHeader>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={menyegarkan}
            onRefresh={segarkan}
            colors={[colors.primary600]}
            tintColor={colors.primary600}
          />
        }
        testID="beranda-scroll"
      >
        {status === "galat" ? (
          <View className="px-4 pt-6">
            <ErrorState pesan={pesanGalat} onRetry={cobaLagi} kompak />
          </View>
        ) : null}

        {/* Kategori pilihan — avatar bulat 56, gap 16 (guideline §2.3). */}
        {memuat ? (
          <View className="flex-row gap-4 px-4 pt-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} className="items-center gap-1.5">
                <Skeleton width={56} height={56} radiusClassName="rounded-full" />
                <Skeleton width={48} height={10} />
              </View>
            ))}
          </View>
        ) : data.kategori.length > 0 ? (
          <View className="pt-5">
            <View className="px-4">
              <SectionHeader judul={teks.beranda.kategoriPilihan} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
            >
              {data.kategori.slice(0, 10).map((k) => (
                <KategoriAvatar
                  key={k.id}
                  nama={k.nama_kategori}
                  gambarUrl={k.gambar_url}
                  ikon={ikonKategori(k.nama_kategori)}
                  onPress={() => setTabAktif(k.id)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Flash sale / unggulan — scroll horizontal, kartu 140 (guideline §3.9). */}
        {memuat ? (
          <View className="mt-6 flex-row gap-3 px-4">
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 140 }}>
                <Skeleton height={187} radiusClassName="rounded-lg" />
                <Skeleton height={12} className="mt-2" width="90%" />
                <Skeleton height={14} className="mt-1.5" width="55%" />
              </View>
            ))}
          </View>
        ) : flashSale.length > 0 ? (
          <View className="mt-6">
            <View className="px-4">
              <SectionHeader
                judul={teks.judul.flashSale}
                onPressAksi={() => router.push("/(tabs)/products")}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {flashSale.map((p) => (
                <ProductCardGrid
                  key={`flash-${p.id}`}
                  produk={p}
                  width={140}
                  onPress={() => bukaProduk(p)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Grid produk 2 kolom, gap 12 (guideline §2.3). */}
        <View className="mt-6 px-4">
          <SectionHeader
            judul={
              tabAktif === "semua"
                ? teks.beranda.produkTerbaru
                : (kategoriAktif?.nama_kategori ?? teks.beranda.produkTerbaru)
            }
            onPressAksi={() => router.push("/(tabs)/products")}
          />

          {memuat ? (
            <SkeletonGridProduk jumlah={4} />
          ) : jumlahProduk === 0 ? (
            status === "galat" ? null : (
              <View className="overflow-hidden rounded-lg border border-neutral-100 bg-white">
                <EmptyState
                  icon={<Package size={36} color={colors.primary600} strokeWidth={1.75} />}
                  title={teks.beranda.kosongProduk}
                  description={teks.beranda.kosongProdukDeskripsi}
                  ctaLabel={teks.tombol.belanjaSekarang}
                  onCtaPress={() => {
                    setTabAktif("semua");
                    segarkan();
                  }}
                />
              </View>
            )
          ) : (
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {produkTampil.map((p) => (
                <View key={p.id} style={{ width: "47.5%", flexGrow: 1, maxWidth: "48.5%" }}>
                  <ProductCardGrid produk={p} onPress={() => bukaProduk(p)} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Satu CTA primary di akhir layar (aturan "satu CTA primary per layar"). */}
        {!memuat && jumlahProduk > 0 ? (
          <View className="px-4 pt-6">
            <Pressable
              onPress={() => router.push("/(tabs)/products")}
              accessibilityRole="button"
              accessibilityLabel={teks.tombol.jelajahiProduk}
              className="flex-row items-center justify-center rounded-md bg-primary-600 active:bg-primary-700"
              style={{ height: sizes.buttonLg }}
            >
              <Text
                className="font-inter-semibold text-base text-white"
                maxFontSizeMultiplier={1.3}
              >
                {teks.tombol.jelajahiProduk}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
