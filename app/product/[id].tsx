import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import { fetchProductById, addToWishlist, Product } from '../../services/api';
import { verifyToken } from '../../services/auth';
import { handleAuthError, getErrorMessage } from '../../utils/auth';
import { useCart } from '../../contexts/CartContext';

const { width } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { addItem } = useCart();
  const productId = parseInt(params.id as string);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Verify token first
      const isValidToken = await verifyToken();
      
      if (!isValidToken) {
        setError('Sesi Anda telah berakhir, akan diarahkan ke halaman login');
        await handleAuthError({ message: 'Token expired or invalid' });
        return;
      }

      const productData = await fetchProductById(productId);
      setProduct(productData);
    } catch (error: any) {
      console.error('Error loading product:', error);
      
      const isAuthError = await handleAuthError(error);
      if (!isAuthError) {
        setError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      await addItem(product, quantity);
      Alert.alert(
        'Berhasil!',
        `${product.nama_produk} (${quantity} item) ditambahkan ke keranjang`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAddToWishlist = async () => {
    if (!product) return;
    
    try {
      await addToWishlist(product.id);
      setIsInWishlist(true);
      Alert.alert('Berhasil!', 'Produk ditambahkan ke wishlist');
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      Alert.alert('Error', 'Gagal menambahkan ke wishlist');
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    // TODO: Implement buy now functionality (go to checkout)
    router.push({
      pathname: '/checkout',
      params: { 
        productId: product.id.toString(), 
        quantity: quantity.toString() 
      }
    });
  };

  const formatPrice = (price: number | string | null | undefined) => {
    // Konversi ke number dan handle edge cases
    const numPrice = price ? Number(price) : 0;
    
    // Jika masih NaN setelah konversi, return fallback
    if (isNaN(numPrice)) {
      return 'Harga tidak tersedia';
    }
    
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numPrice);
  };

  const incrementQuantity = () => {
    const safeStok = product ? Number(product.stok) || 0 : 0;
    if (product && quantity < safeStok) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Detail Produk" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Memuat produk...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Detail Produk" showBackButton={true} />
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 w-full">
            <Text className="text-red-700 text-center">
              {error || 'Produk tidak ditemukan'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Navbar 
        title="Detail Produk" 
        showBackButton={true}
        rightAction={
          <Pressable onPress={handleAddToWishlist}>
            <Ionicons 
              name={isInWishlist ? "heart" : "heart-outline"} 
              size={24} 
              color={isInWishlist ? "#EF4444" : "white"} 
            />
          </Pressable>
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View className="bg-white">
          <Image
            source={{ 
              uri: product.gambar_url || 'https://via.placeholder.com/400x300/E5E7EB/9CA3AF?text=No+Image'
            }}
            style={{ width: width, height: width * 0.75 }}
            resizeMode="cover"
          />
        </View>

        {/* Product Info */}
        <View className="bg-white p-4 mt-2">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {product.nama_produk}
          </Text>
          
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-3xl font-bold text-primary">
              {formatPrice(product.harga)}
            </Text>
            <View className="bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-sm text-gray-600">
                Stok: {Number(product.stok) || 0}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center mb-4">
            <View className="bg-blue-50 px-3 py-1 rounded-full mr-3">
              <Text className="text-blue-700 text-sm font-medium">
                {product.kategori_nama}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="star" size={16} color="#FCD34D" />
              <Text className="text-gray-600 text-sm ml-1">4.5 (128 ulasan)</Text>
            </View>
          </View>
        </View>

        {/* Product Description */}
        {product.deskripsi && (
          <View className="bg-white p-4 mt-2">
            <Text className="text-lg font-semibold mb-3">Deskripsi Produk</Text>
            <Text className="text-gray-700 leading-6">{product.deskripsi}</Text>
          </View>
        )}

        {/* Product Variants - Placeholder for future implementation */}
        <View className="bg-white p-4 mt-2">
          <Text className="text-lg font-semibold mb-3">Varian</Text>
          <View className="flex-row flex-wrap">
            <Pressable 
              className="bg-primary px-4 py-2 rounded-full mr-2 mb-2"
              onPress={() => setSelectedVariant(0)}
            >
              <Text className="text-white font-medium">Default</Text>
            </Pressable>
          </View>
        </View>

        {/* Quantity Selector */}
        <View className="bg-white p-4 mt-2">
          <Text className="text-lg font-semibold mb-3">Jumlah</Text>
          <View className="flex-row items-center">
            <Pressable
              onPress={decrementQuantity}
              className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center"
            >
              <Ionicons name="remove" size={20} color="#374151" />
            </Pressable>
            
            <Text className="mx-6 text-xl font-semibold min-w-[40px] text-center">
              {quantity}
            </Text>
            
            <Pressable
              onPress={incrementQuantity}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                quantity >= (Number(product.stok) || 0) ? 'bg-gray-200' : 'bg-primary'
              }`}
              disabled={quantity >= (Number(product.stok) || 0)}
            >
              <Ionicons 
                name="add" 
                size={20} 
                color={quantity >= (Number(product.stok) || 0) ? "#9CA3AF" : "white"} 
              />
            </Pressable>
          </View>
          
          <Text className="text-gray-500 text-sm mt-2">
            Subtotal: {formatPrice((Number(product.harga) || 0) * quantity)}
          </Text>
        </View>

        {/* Reviews Section - Placeholder */}
        <View className="bg-white p-4 mt-2 mb-20">
          <Text className="text-lg font-semibold mb-3">Ulasan Produk</Text>
          <View className="bg-gray-50 p-4 rounded-xl">
            <Text className="text-gray-500 text-center">
              Belum ada ulasan untuk produk ini
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <View className="flex-row space-x-3">
          <Pressable
            onPress={handleAddToCart}
            className="flex-1 bg-white border-2 border-primary py-3 rounded-xl items-center"
            disabled={product.stok === 0}
          >
            <Text className={`font-semibold ${
              product.stok === 0 ? 'text-gray-400' : 'text-primary'
            }`}>
              + Keranjang
            </Text>
          </Pressable>
          
          <Pressable
            onPress={handleBuyNow}
            className={`flex-1 py-3 rounded-xl items-center ${
              product.stok === 0 ? 'bg-gray-300' : 'bg-primary'
            }`}
            disabled={product.stok === 0}
          >
            <Text className={`font-semibold ${
              product.stok === 0 ? 'text-gray-500' : 'text-white'
            }`}>
              {product.stok === 0 ? 'Stok Habis' : 'Beli Sekarang'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ProductDetailScreen;
