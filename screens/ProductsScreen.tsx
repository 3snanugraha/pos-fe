import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, RefreshControl, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import Navbar from '../components/Navbar';
import { fetchProducts, fetchProductCategories, Product, ProductCategory } from '../services/api';
import { verifyToken } from '../services/auth';
import { handleAuthError, getErrorMessage } from '../utils/auth';

const ProductsScreen = () => {
  const params = useLocalSearchParams();
  const initialCategoryId = params.categoryId ? parseInt(params.categoryId as string) : null;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategoryId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
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

      // Load categories and products
      const [categoriesData, productsResult] = await Promise.all([
        fetchProductCategories(),
        fetchProducts({ 
          kategori_id: selectedCategory || undefined,
          per_page: 20 
        })
      ]);
      
      setCategories(categoriesData);
      setProducts(productsResult.data);
    } catch (error: any) {
      console.error('Error loading products data:', error);
      
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
  }, [selectedCategory]);

  const loadProductsByCategory = async (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    
    try {
      const productsResult = await fetchProducts({ 
        kategori_id: categoryId || undefined,
        per_page: 20 
      });
      setProducts(productsResult.data);
    } catch (error: any) {
      console.error('Error loading products by category:', error);
      const isAuthError = await handleAuthError(error);
      if (!isAuthError) {
        setError(getErrorMessage(error));
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Navbar 
        title="Produk" 
        showLogo={true}
        rightAction={
          <Ionicons name="search-outline" size={24} color="white" />
        }
      />
      
      {error ? (
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 w-full">
            <Text className="text-red-700 text-center">{error}</Text>
          </View>
        </View>
      ) : (
        <>
          <View className="px-4 py-3">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4 }}
            >
              <Pressable 
                onPress={() => loadProductsByCategory(null)}
                className={`px-4 py-2 rounded-full mr-2 ${
                  selectedCategory === null ? 'bg-primary' : 'bg-white'
                }`}
              >
                <Text 
                  className={`${
                    selectedCategory === null ? 'text-white' : 'text-gray-800'
                  } font-medium`}
                >
                  Semua
                </Text>
              </Pressable>
              
              {categories.map((category) => (
                <Pressable 
                  key={category.id}
                  onPress={() => loadProductsByCategory(category.id)}
                  className={`px-4 py-2 rounded-full mr-2 ${
                    selectedCategory === category.id ? 'bg-primary' : 'bg-white'
                  }`}
                >
                  <Text 
                    className={`${
                      selectedCategory === category.id ? 'text-white' : 'text-gray-800'
                    } font-medium`}
                  >
                    {category.nama_kategori}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-gray-500">Memuat produk...</Text>
            </View>
          ) : products.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-gray-500">Tidak ada produk tersedia</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              contentContainerStyle={{ padding: 16 }}
              keyExtractor={(item) => item.id.toString()}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              renderItem={({ item }) => (
                <Pressable className="bg-white rounded-xl p-3 w-[48%] mb-4 shadow-sm">
                  <View className="bg-gray-200 h-32 rounded-lg mb-2 overflow-hidden">
                    <Image
                      source={{ 
                        uri: item.gambar_url || 'https://via.placeholder.com/300x200/E5E7EB/9CA3AF?text=No+Image'
                      }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                      onError={() => {
                        // console.log('❌ Image failed for:', item.nama_produk, item.gambar_url);
                      }}
                    />
                  </View>
                  <Text className="font-medium" numberOfLines={2}>{item.nama_produk}</Text>
                  <Text className="text-gray-500 text-xs">{item.kategori_nama}</Text>
                  <Text className="text-primary font-bold mt-1">
                    {formatPrice(item.harga)}
                  </Text>
                  <View className="flex-row justify-between items-center mt-2">
                    <Text className="text-xs text-gray-500">Stok: {item.stok}</Text>
                    <Pressable className="bg-primary px-2 py-1 rounded">
                      <Text className="text-white text-xs">+</Text>
                    </Pressable>
                  </View>
                </Pressable>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

export default ProductsScreen;
