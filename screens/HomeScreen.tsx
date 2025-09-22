import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BannerSlider from '../components/BannerSlider';
import { fetchBanners, fetchProducts, fetchProductCategories, Banner, Product, ProductCategory } from '../services/api';
import { verifyToken } from '../services/auth';
import { handleAuthError, getErrorMessage } from '../utils/auth';

const HomeScreen = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Icon mapping untuk kategori
  const getCategoryIcon = (categoryName: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'elektronik': 'laptop-outline',
      'makanan': 'restaurant-outline',
      'minuman': 'wine-outline', 
      'pakaian': 'shirt-outline',
      'fashion': 'shirt-outline',
      'alat dapur': 'restaurant-outline',
      'kecantikan': 'heart-outline',
      'kesehatan': 'medical-outline',
      'olahraga': 'fitness-outline',
      'mainan': 'game-controller-outline',
      'buku': 'book-outline',
      'mobil': 'car-outline',
      'motor': 'bicycle-outline',
      'helm': 'shield-outline',
      'rumah': 'home-outline',
      'default': 'cube-outline'
    };
    
    const lowerName = categoryName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }
    return iconMap.default;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Verify token first before loading data
      const isValidToken = await verifyToken();
      
      if (!isValidToken) {
        setError('Sesi Anda telah berakhir, akan diarahkan ke halaman login');
        await handleAuthError({ message: 'Token expired or invalid' });
        return;
      }

      // Load semua data dashboard
      const [bannersData, categoriesData, productsResult] = await Promise.all([
        fetchBanners(),
        fetchProductCategories(),
        fetchProducts({ per_page: 6 }) // Ambil 6 produk untuk featured
      ]);
      
      setBanners(bannersData);
      setCategories(categoriesData.slice(0, 8)); // Ambil 8 kategori pertama
      setFeaturedProducts(productsResult.data);
    } catch (error: any) {
      console.error('Error loading home data:', error);
      
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const navigateToProducts = (categoryId?: number) => {
    router.push({
      pathname: '/(tabs)/products',
      params: categoryId ? { categoryId: categoryId.toString() } : {}
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <View className="bg-primary pt-4 pb-4 px-4 rounded-b-3xl">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-lg">Selamat Datang,</Text>
            <Text className="text-white text-2xl font-bold">Pelanggan</Text>
          </View>
          <View className="flex-row space-x-4">
            <Ionicons name="notifications-outline" size={24} color="white" />
            <Ionicons name="cart-outline" size={24} color="white" />
          </View>
        </View>
      </View>

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
                  <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-2">
                    <Ionicons 
                      name={getCategoryIcon(category.nama_kategori)} 
                      size={24} 
                      color="#1E40AF" 
                    />
                  </View>
                  <Text className="font-medium text-center" numberOfLines={2}>
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
                >
                  <View className="bg-gray-200 h-32 rounded-lg mb-2 overflow-hidden">
                    {product.gambar_url ? (
                      <Image
                        source={{ uri: product.gambar_url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                      </View>
                    )}
                  </View>
                  <Text className="font-medium" numberOfLines={2}>{product.nama_produk}</Text>
                  <Text className="text-gray-500 text-xs">{product.kategori_nama}</Text>
                  <Text className="text-primary font-bold mt-1">
                    {formatPrice(product.harga)}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">Stok: {product.stok}</Text>
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