import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';

const CartScreen = () => {
  const router = useRouter();
  
  // Mock cart items
  const cartItems = [
    { id: 1, name: 'Product 1', price: 25000, quantity: 2 },
    { id: 2, name: 'Product 2', price: 15000, quantity: 1 },
    { id: 3, name: 'Product 3', price: 30000, quantity: 3 },
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Navbar title="Keranjang" />
      
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-lg font-bold mb-4">Item Keranjang ({cartItems.length})</Text>
          
          {cartItems.map((item) => (
            <View 
              key={item.id} 
              className="bg-white rounded-xl p-4 mb-3 flex-row items-center"
            >
              <View className="bg-gray-200 h-16 w-16 rounded-lg mr-3" />
              <View className="flex-1">
                <Text className="font-medium">{item.name}</Text>
                <Text className="text-primary font-bold">
                  Rp {item.price.toLocaleString('id-ID')}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Pressable className="bg-gray-200 w-8 h-8 rounded-full items-center justify-center">
                  <Ionicons name="remove" size={18} color="#1E40AF" />
                </Pressable>
                <Text className="mx-3 font-bold">{item.quantity}</Text>
                <Pressable className="bg-primary w-8 h-8 rounded-full items-center justify-center">
                  <Ionicons name="add" size={18} color="white" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
        
        <View className="p-4 bg-white rounded-xl mx-4 mb-4">
          <Text className="text-lg font-bold mb-3">Ringkasan Pembayaran</Text>
          
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Subtotal</Text>
            <Text className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</Text>
          </View>
          
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Pajak (10%)</Text>
            <Text className="font-medium">Rp {tax.toLocaleString('id-ID')}</Text>
          </View>
          
          <View className="border-t border-gray-200 my-2" />
          
          <View className="flex-row justify-between">
            <Text className="font-bold">Total</Text>
            <Text className="font-bold text-primary">Rp {total.toLocaleString('id-ID')}</Text>
          </View>
        </View>
      </ScrollView>
      
      <View className="p-4 bg-white border-t border-gray-200">
        <Button 
          title="Pilih Metode Pembayaran" 
          fullWidth 
          onPress={() => router.push('/payment-methods')}
        />
      </View>
    </SafeAreaView>
  );
};

export default CartScreen;