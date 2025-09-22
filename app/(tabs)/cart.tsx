import React from 'react';
import { View, Text, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Navbar from '../../components/Navbar';
import { useCart, CartItem } from '../../contexts/CartContext';

const CartScreen = () => {
  const router = useRouter();
  const { items, itemCount, totalAmount, removeItem, updateItemQuantity, clearCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleQuantityChange = async (item: CartItem, newQuantity: number) => {
    try {
      await updateItemQuantity(item.id, newQuantity);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRemoveItem = async (item: CartItem) => {
    Alert.alert(
      'Hapus Item',
      `Apakah Anda yakin ingin menghapus ${item.nama_produk} dari keranjang?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => removeItem(item.id),
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Kosongkan Keranjang',
      'Apakah Anda yakin ingin mengosongkan keranjang belanja?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Kosongkan',
          style: 'destructive',
          onPress: clearCart,
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Keranjang Kosong', 'Tambahkan produk ke keranjang terlebih dahulu');
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Keranjang" showLogo={true} />
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="cart-outline" size={80} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-600 mt-4 mb-2">
            Keranjang Kosong
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            Belum ada produk yang ditambahkan ke keranjang
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
        title={`Keranjang (${itemCount})`}
        showLogo={true}
        rightAction={
          <Pressable onPress={handleClearCart}>
            <Ionicons name="trash-outline" size={24} color="white" />
          </Pressable>
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {items.map((item) => (
            <View key={item.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <View className="flex-row">
                {/* Product Image */}
                <View className="w-20 h-20 bg-gray-200 rounded-lg mr-3 overflow-hidden">
                  <Image
                    source={{
                      uri: item.gambar_url || 'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=No+Image'
                    }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>

                {/* Product Info */}
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900 mb-1" numberOfLines={2}>
                    {item.nama_produk}
                  </Text>
                  
                  {item.varian_nama && (
                    <Text className="text-sm text-gray-500 mb-1">
                      Varian: {item.varian_nama}
                    </Text>
                  )}
                  
                  <Text className="text-sm text-gray-500 mb-2">
                    {item.kategori_nama}
                  </Text>
                  
                  <Text className="text-lg font-bold text-primary mb-2">
                    {formatPrice(item.harga)}
                  </Text>

                  {/* Quantity Controls */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => handleQuantityChange(item, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full items-center justify-center"
                      >
                        <Ionicons name="remove" size={16} color="#374151" />
                      </Pressable>
                      
                      <Text className="mx-3 text-lg font-semibold min-w-[30px] text-center">
                        {item.quantity}
                      </Text>
                      
                      <Pressable
                        onPress={() => handleQuantityChange(item, item.quantity + 1)}
                        className={`w-8 h-8 rounded-full items-center justify-center ${
                          item.quantity >= item.stok_tersedia ? 'bg-gray-200' : 'bg-primary'
                        }`}
                        disabled={item.quantity >= item.stok_tersedia}
                      >
                        <Ionicons 
                          name="add" 
                          size={16} 
                          color={item.quantity >= item.stok_tersedia ? "#9CA3AF" : "white"} 
                        />
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => handleRemoveItem(item)}
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                  
                  <View className="flex-row justify-between items-center mt-2">
                    <Text className="text-sm text-gray-500">
                      Stok: {item.stok_tersedia}
                    </Text>
                    <Text className="text-lg font-bold text-gray-900">
                      {formatPrice(item.subtotal)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Spacer for bottom bar */}
        <View className="h-24" />
      </ScrollView>

      {/* Bottom Summary & Checkout */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-semibold text-gray-900">
            Total ({itemCount} item)
          </Text>
          <Text className="text-2xl font-bold text-primary">
            {formatPrice(totalAmount)}
          </Text>
        </View>
        
        <Pressable
          onPress={handleCheckout}
          className="bg-primary py-4 rounded-xl items-center"
        >
          <Text className="text-white font-semibold text-lg">
            Checkout Sekarang
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default CartScreen;