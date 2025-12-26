import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import {
  fetchProductCategories,
  fetchProducts,
  Product,
  ProductCategory,
} from "../../services/api";
import { verifyToken } from "../../services/auth";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

const SearchScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialQuery = (params.query as string) || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
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
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const sortOptions = [
    { key: "nama_produk", label: "Nama A-Z", direction: "asc" },
    { key: "nama_produk", label: "Nama Z-A", direction: "desc" },
    { key: "harga", label: "Harga Terendah", direction: "asc" },
    { key: "harga", label: "Harga Tertinggi", direction: "desc" },
    { key: "created_at", label: "Terbaru", direction: "desc" },
    { key: "stok", label: "Stok Terbanyak", direction: "desc" },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const loadCategories = React.useCallback(async () => {
    try {
      const categoriesData = await fetchProductCategories();
      setCategories(categoriesData);
    } catch (error: any) {
      console.error("Error loading categories:", error);
    }
  }, []);

  const searchProducts = React.useCallback(
    async (query: string = searchQuery) => {
      setLoading(true);
      setError(null);

      try {
        const isValidToken = await verifyToken();

        if (!isValidToken) {
          setError("Sesi Anda telah berakhir, akan diarahkan ke halaman login");
          await handleAuthError({ message: "Token expired or invalid" });
          return;
        }

        const params: any = {
          per_page: 50,
          sort_by: sortBy,
          sort_direction: sortDirection,
        };

        if (query.trim()) {
          params.search = query.trim();
          addToSearchHistory(query.trim());
        }

        if (selectedCategory) {
          params.kategori_id = selectedCategory;
        }

        // Add price range filter (this would need backend support)
        if (priceRange.min) {
          params.min_price = parseInt(priceRange.min);
        }
        if (priceRange.max) {
          params.max_price = parseInt(priceRange.max);
        }

        const result = await fetchProducts(params);
        setProducts(result.data);
      } catch (error: any) {
        console.error("Error searching products:", error);
        const isAuthError = await handleAuthError(error);
        if (!isAuthError) {
          setError(getErrorMessage(error));
        }
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, sortBy, sortDirection, selectedCategory, priceRange]
  );

  const addToSearchHistory = (query: string) => {
    if (!query) return;

    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== query);
      return [query, ...filtered].slice(0, 10); // Keep only last 10 searches
    });
  };

  const handleSearch = () => {
    searchProducts(searchQuery);
  };

  const handleProductPress = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const handleCategoryFilter = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setTimeout(() => searchProducts(), 100);
  };

  const handleSortChange = (sortKey: string, direction: "asc" | "desc") => {
    setSortBy(sortKey);
    setSortDirection(direction);
    setTimeout(() => searchProducts(), 100);
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSortBy("nama_produk");
    setSortDirection("asc");
    setPriceRange({ min: "", max: "" });
    setTimeout(() => searchProducts(), 100);
  };

  const handleHistorySearch = (query: string) => {
    setSearchQuery(query);
    searchProducts(query);
  };

  useEffect(() => {
    loadCategories();
    if (initialQuery) {
      searchProducts(initialQuery);
    }
  }, []);

  if (error) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["top", "left", "right"]}
      >
        <Navbar title="Search" showBackButton={true} />
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 w-full">
            <Text className="text-red-700 text-center">{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <Navbar title="Search" showBackButton={true} />

      {/* Search Bar */}
      <View className="bg-white p-4">
        <View className="flex-row items-center">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mr-3">
            <Ionicons name="search-outline" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari produk..."
              className="flex-1 ml-2"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            className="p-3 bg-primary rounded-xl"
          >
            <Ionicons name="options-outline" size={20} color="white" />
          </Pressable>
        </View>

        {/* Search History */}
        {!searchQuery && searchHistory.length > 0 && (
          <View className="mt-4">
            <Text className="text-gray-700 font-medium mb-2">
              Pencarian Terakhir
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {searchHistory.map((query, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleHistorySearch(query)}
                  className="bg-gray-100 px-3 py-2 rounded-full mr-2"
                >
                  <Text className="text-gray-700">{query}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Filters */}
      {showFilters && (
        <View className="bg-white border-t border-gray-200 p-4">
          {/* Category Filter */}
          <View className="mb-4">
            <Text className="font-medium mb-2">Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => handleCategoryFilter(null)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  selectedCategory === null ? "bg-primary" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`font-medium ${
                    selectedCategory === null ? "text-white" : "text-gray-700"
                  }`}
                >
                  Semua
                </Text>
              </Pressable>

              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => handleCategoryFilter(category.id)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedCategory === category.id
                      ? "bg-primary"
                      : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      selectedCategory === category.id
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {category.nama_kategori}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Sort Options */}
          <View className="mb-4">
            <Text className="font-medium mb-2">Urutkan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {sortOptions.map((option, index) => (
                <Pressable
                  key={index}
                  onPress={() =>
                    handleSortChange(
                      option.key,
                      option.direction as "asc" | "desc"
                    )
                  }
                  className={`px-4 py-2 rounded-full mr-2 ${
                    sortBy === option.key && sortDirection === option.direction
                      ? "bg-primary"
                      : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      sortBy === option.key &&
                      sortDirection === option.direction
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Price Range */}
          <View className="mb-4">
            <Text className="font-medium mb-2">Rentang Harga</Text>
            <View className="flex-row items-center">
              <TextInput
                value={priceRange.min}
                onChangeText={(text) =>
                  setPriceRange((prev) => ({ ...prev, min: text }))
                }
                placeholder="Min"
                keyboardType="numeric"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 mr-2"
              />
              <Text className="mx-2 text-gray-500">-</Text>
              <TextInput
                value={priceRange.max}
                onChangeText={(text) =>
                  setPriceRange((prev) => ({ ...prev, max: text }))
                }
                placeholder="Max"
                keyboardType="numeric"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 ml-2"
              />
            </View>
          </View>

          {/* Filter Actions */}
          <View className="flex-row space-x-3">
            <Pressable
              onPress={clearFilters}
              className="flex-1 bg-gray-100 py-2 rounded-xl items-center"
            >
              <Text className="font-medium text-gray-700">Reset</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowFilters(false);
                searchProducts();
              }}
              className="flex-1 bg-primary py-2 rounded-xl items-center"
            >
              <Text className="font-medium text-white">Terapkan</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Search Results */}
      <View className="flex-1">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500">Mencari produk...</Text>
          </View>
        ) : products.length === 0 && searchQuery ? (
          <View className="flex-1 justify-center items-center px-4">
            <Ionicons name="search-outline" size={80} color="#9CA3AF" />
            <Text className="text-xl font-semibold text-gray-600 mt-4 mb-2">
              Produk Tidak Ditemukan
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Tidak ada produk yang cocok dengan pencarian "{searchQuery}"
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery("");
                clearFilters();
              }}
              className="bg-primary px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Reset Pencarian</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={products}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            contentContainerStyle={{ padding: 16 }}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                className="bg-white rounded-xl p-3 w-[48%] mb-4 shadow-sm"
                onPress={() => handleProductPress(item)}
              >
                <View className="bg-gray-200 h-32 rounded-lg mb-2 overflow-hidden">
                  <Image
                    source={{
                      uri:
                        item.gambar_url ||
                        "https://via.placeholder.com/300x200/E5E7EB/9CA3AF?text=No+Image",
                    }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
                <Text className="font-medium mb-1" numberOfLines={2}>
                  {item.nama_produk}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {item.kategori_nama}
                </Text>
                <Text className="text-primary font-bold mt-1">
                  {formatPrice(item.harga)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  Stok: {item.stok}
                </Text>
              </Pressable>
            )}
            ListHeaderComponent={
              searchQuery && products.length > 0 ? (
                <View className="mb-4">
                  <Text className="text-gray-700">
                    Ditemukan {products.length} produk untuk "{searchQuery}"
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default SearchScreen;
