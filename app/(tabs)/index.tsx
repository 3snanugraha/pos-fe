import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BannerSlider from "../../components/BannerSlider";
import { HomeHeader } from "../../src/components/layout";
import { teks } from "../../src/lib/i18n";
import { colors } from "../../src/theme/tokens";
import { useCart } from "../../contexts/CartContext";
import { apiService } from "../../services/apiService";
import { Banner, Product, ProductCategory } from "../../services/types";
import { getUserData } from "../../services/auth";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

const HomeScreen = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [customerName, setCustomerName] = useState<string>("Pelanggan");
  const [alamat, setAlamat] = useState<string>("");
  const [tabAktif, setTabAktif] = useState<string | number>("semua");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { itemCount } = useCart();
  const router = useRouter();

  // Ikon Lucide per kategori (guideline §2.5 — ikon 24 untuk tab).
  const ikonKategori = (categoryName: string, aktif: boolean) => {
    const nama = categoryName.toLowerCase();
    const warna = aktif ? colors.primary600 : colors.neutral600;
    const props = { size: 24, color: warna, strokeWidth: 1.75 } as const;
    if (nama.includes("elektronik")) return <Monitor {...props} />;
    if (nama.includes("makan") || nama.includes("dapur")) return <Utensils {...props} />;
    if (nama.includes("minum")) return <Wine {...props} />;
    if (nama.includes("pakaian") || nama.includes("fashion")) return <Shirt {...props} />;
    if (nama.includes("kecantikan") || nama.includes("kesehatan")) return <Heart {...props} />;
    if (nama.includes("motor") || nama.includes("mobil")) return <Car {...props} />;
    if (nama.includes("helm")) return <Shield {...props} />;
    if (nama.includes("rumah")) return <Home {...props} />;
    if (nama.includes("buku")) return <Book {...props} />;
    return <Package {...props} />;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get customer name from stored data first (faster)
      try {
        const userData = await getUserData();
        if (userData?.nama_pelanggan) {
          setCustomerName(userData.nama_pelanggan);
        }
        if (userData?.alamat) {
          setAlamat(userData.alamat);
        }
      } catch {
        console.log("Could not get stored user data");
      }

      // Load banners and categories in parallel
      const [bannersData, categoriesData] = await Promise.all([
        apiService.getBanners(),
        apiService.getProductCategories(),
      ]);

      // Load featured products with fallback
      try {
        const products = await apiService.getFeaturedProducts(6);
        setFeaturedProducts(products);
      } catch {
        console.log("Featured products not available, using regular products");
        const productsResult = await apiService.searchProducts({ per_page: 6 });
        setFeaturedProducts(productsResult.data);
      }

      setBanners(bannersData);
      setCategories(categoriesData.slice(0, 8)); // Ambil 8 kategori pertama
    } catch (error: any) {
      console.error("Error loading home data:", error);

      // Try to handle auth errors first
      const isAuthError = await handleAuthError(error);

      if (isAuthError) {
        setError(getErrorMessage(error));
      } else {
        setError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatPrice = (price: number | string | null | undefined) => {
    // Konversi ke number dan handle edge cases
    const numPrice = price ? Number(price) : 0;

    // Jika masih NaN setelah konversi, return fallback
    if (isNaN(numPrice)) {
      return "Harga tidak tersedia";
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  const navigateToProducts = (categoryId?: number) => {
    router.push({
      pathname: "/(tabs)/products",
      params: categoryId ? { categoryId: categoryId.toString() } : {},
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["left", "right"]}>
      <HomeHeader
        judul={`${teks.judul.home} · ${customerName}`}
        alamat={alamat}
        onPressAlamat={() => router.push("/addresses")}
        onPressWishlist={() => router.push("/wishlist")}
        onPressCart={() => router.push("/(tabs)/cart")}
        jumlahKeranjang={itemCount}
        onPressSearch={() => router.push("/search")}
        tabs={[
          { id: "semua", label: teks.umum.semua, ikon: <LayoutGrid size={24} color={tabAktif === "semua" ? colors.primary600 : colors.neutral600} strokeWidth={1.75} /> },
          ...categories.map((c) => ({
            id: c.id,
            label: c.nama_kategori,
            ikon: ikonKategori(c.nama_kategori, tabAktif === c.id),
          })),
        ]}
        tabAktif={tabAktif}
        onTabChange={(id) => {
          setTabAktif(id);
          if (id !== "semua") navigateToProducts(Number(id));
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-6">
          <Text className="text-lg font-bold mb-3">Promo & Penawaran</Text>
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4">
              <Text className="text-red-700 text-center">{error}</Text>
            </View>
          ) : (
            <BannerSlider banners={banners} loading={loading} />
          )}
        </View>

        <View className="mb-6">
          <Text className="text-lg font-bold mb-3">Kategori</Text>
          {loading ? (
            <View className="flex-row flex-wrap justify-between">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <View
                  key={item}
                  className="w-[48%] bg-gray-200 rounded-xl p-4 mb-3 items-center"
                  style={{ height: 100 }}
                />
              ))}
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  className="w-[48%] bg-white rounded-xl p-4 mb-3 items-center"
                  onPress={() => navigateToProducts(category.id)}
                >
                  <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mb-2">
                    {ikonKategori(category.nama_kategori, true)}
                  </View>
                  <Text className="font-inter-medium text-center text-sm text-neutral-900" numberOfLines={2}>
                    {category.nama_kategori}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-bold">Produk Unggulan</Text>
            <Pressable onPress={() => navigateToProducts()}>
              <Text className="text-primary">Lihat Semua</Text>
            </Pressable>
          </View>

          {loading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4 }}
            >
              {[1, 2, 3, 4].map((item) => (
                <View
                  key={item}
                  className="bg-gray-200 rounded-xl mr-3"
                  style={{ width: 160, height: 200 }}
                />
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4 }}
            >
              {featuredProducts.map((product) => (
                <Pressable
                  key={product.id}
                  className="bg-white rounded-xl p-3 mr-3"
                  style={{ width: 160 }}
                  onPress={() => router.push(`/product/${product.id}`)}
                >
                  <View className="bg-gray-200 h-32 rounded-lg mb-2 overflow-hidden">
                    {product.gambar_url ? (
                      <Image
                        source={{ uri: product.gambar_url }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <Ionicons
                          name="image-outline"
                          size={32}
                          color="#9CA3AF"
                        />
                      </View>
                    )}
                  </View>
                  <Text className="font-medium" numberOfLines={2}>
                    {product.nama_produk}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {product.kategori_nama}
                  </Text>
                  <Text className="text-primary font-bold mt-1">
                    {(product as any).harga_range ||
                      formatPrice(
                        product.harga || (product as any).harga_jual_min || 0
                      )}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {(product.variants_count || 0) > 1
                      ? `${product.variants_count} varian`
                      : `Stok: ${Number(product.stok) || 0}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
