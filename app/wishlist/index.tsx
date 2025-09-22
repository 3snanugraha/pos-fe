import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import { useCart } from '../../contexts/CartContext';
import { 
  fetchCustomerWishlist, 
  removeFromWishlist, 
  WishlistItem,
  fetchProductById,
} from '../../services/api';
import { verifyToken } from '../../services/auth';
import { handleAuthError, getErrorMessage } from '../../utils/auth';

const WishlistScreen = () => {
  const router = useRouter();
  const { addItem } = useCart();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const loadWishlist = async () => {
    setLoading(true);
    setError(null);

    try {
      const isValidToken = await verifyToken();
      
      if (!isValidToken) {
        setError('Sesi Anda telah berakhir, akan diarahkan ke halaman login');
        await handleAuthError({ message: 'Token expired or invalid' });
        return;
      }

      const result = await fetchCustomerWishlist({ per_page: 50 });
      setWishlistItems(result.data);
    } catch (error: any) {
      console.error('Error loading wishlist:', error);
      const isAuthError = await handleAuthError(error);
      if (!isAuthError) {
        setError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWishlist();
    setRefreshing(false);
  };

  const handleRemoveFromWishlist = async (item: WishlistItem) => {
    Alert.alert(
      'Hapus dari Wishlist',
      `Apakah Anda yakin ingin menghapus ${item.nama_produk} dari wishlist?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromWishlist(item.produk_id);
              setWishlistItems(prev => prev.filter(wishItem => wishItem.id !== item.id));
              Alert.alert('Berhasil!', 'Produk berhasil dihapus dari wishlist');
            } catch (error: any) {
              console.error('Error removing from wishlist:', error);
              Alert.alert('Error', 'Gagal menghapus produk dari wishlist');
            }
          },
        },
      ]
    );
  };

  const handleAddToCart = async (item: WishlistItem) => {
    try {
      // Get full product details for cart
      const product = await fetchProductById(item.produk_id);
      await addItem(product, 1);
      
      Alert.alert(
        'Berhasil!',
        `${item.nama_produk} ditambahkan ke keranjang`,
        [
          { text: 'Lanjut Belanja', style: 'cancel' },
          { text: 'Lihat Keranjang', onPress: () => router.push('/(tabs)/cart') },
        ]
      );
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Gagal menambahkan produk ke keranjang');
    }
  };

  const handleProductPress = (item: WishlistItem) => {
    router.push(`/product/${item.produk_id}`);
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Wishlist" showBackButton={true} />
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 w-full">
            <Text className="text-red-700 text-center">{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Wishlist" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Memuat wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Wishlist" showBackButton={true} />
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="heart-outline" size={80} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-600 mt-4 mb-2">
            Wishlist Kosong
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            Belum ada produk yang ditambahkan ke wishlist
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/products')}
            className="bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">Mulai Belanja</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Navbar 
        title={`Wishlist (${wishlistItems.length})`}
        showBackButton={true}
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          <View className="grid grid-cols-2 gap-3">
            {wishlistItems.map((item) => (
              <View key={item.id} className="bg-white rounded-xl p-3 w-[48%] mb-4 shadow-sm">
                <Pressable onPress={() => handleProductPress(item)}>
                  {/* Product Image */}
                  <View className="bg-gray-200 h-32 rounded-lg mb-2 overflow-hidden relative">
                    <Image
                      source={{
                        uri: item.gambar_url || 'https://via.placeholder.com/300x200/E5E7EB/9CA3AF?text=No+Image'
                      }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => handleRemoveFromWishlist(item)}
                      className="absolute top-2 right-2 w-8 h-8 bg-white/80 rounded-full items-center justify-center"
                    >
                      <Ionicons name="heart" size={20} color="#EF4444" />
                    </Pressable>
                  </View>

                  {/* Product Info */}
                  <Text className="font-medium mb-1" numberOfLines={2}>
                    {item.nama_produk}
                  </Text>
                  
                  <Text className="text-lg font-bold text-primary mb-2">
                    {formatPrice(item.harga)}
                  </Text>
                  
                  <Text className="text-xs text-gray-500 mb-3">
                    Ditambahkan {formatDate(item.created_at)}
                  </Text>
                </Pressable>

                {/* Action Buttons */}
                <View className="flex-row space-x-2">
                  <Pressable
                    onPress={() => handleRemoveFromWishlist(item)}
                    className="flex-1 bg-gray-100 py-2 rounded-lg items-center"
                  >
                    <Text className="text-gray-700 text-sm font-medium">Hapus</Text>
                  </Pressable>
                  
                  <Pressable
                    onPress={() => handleAddToCart(item)}
                    className="flex-1 bg-primary py-2 rounded-lg items-center"
                  >
                    <Text className="text-white text-sm font-medium">+ Keranjang</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="bg-white border-t border-gray-200 p-4">
        <View className="flex-row space-x-3">
          <Pressable
            onPress={() => router.push('/(tabs)/products')}
            className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
          >
            <Text className="text-gray-700 font-semibold">Lanjut Belanja</Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push('/(tabs)/cart')}
            className="flex-1 bg-primary py-3 rounded-xl items-center"
          >
            <Text className="text-white font-semibold">Lihat Keranjang</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default WishlistScreen;
