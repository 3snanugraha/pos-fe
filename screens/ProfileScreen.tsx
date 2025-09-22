import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Navbar from '../components/Navbar';
import { fetchCustomerProfile, CustomerProfile } from '../services/api';
import { logout, verifyToken } from '../services/auth';
import { handleAuthError, getErrorMessage } from '../utils/auth';

const ProfileScreen = () => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const menuItems = [
    { 
      title: 'Pesanan Saya', 
      icon: 'receipt-outline',
      description: 'Lihat riwayat pesanan Anda',
      action: () => {
        router.push('/orders');
      }
    },
    { 
      title: 'Wishlist', 
      icon: 'heart-outline',
      description: 'Produk favorit Anda',
      action: () => {
        router.push('/wishlist');
      }
    },
    { 
      title: 'Alamat Pengiriman', 
      icon: 'location-outline',
      description: 'Kelola alamat pengiriman Anda',
      action: () => {
        router.push('/addresses');
      }
    },
    { 
      title: 'Metode Pembayaran', 
      icon: 'card-outline',
      description: 'Kelola metode pembayaran Anda',
      action: () => {
        router.push('/payment-methods');
      }
    },
    { 
      title: 'Pengaturan', 
      icon: 'settings-outline',
      description: 'Pengaturan aplikasi dan akun',
      action: () => {
        // Navigate to settings
        // console.log('Navigate to settings');
      }
    },
    { 
      title: 'Bantuan', 
      icon: 'help-circle-outline',
      description: 'Pusat bantuan dan dukungan',
      action: () => {
        // Navigate to help
        // console.log('Navigate to help');
      }
    },
  ];

  const loadCustomerData = async () => {
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

      const customerData = await fetchCustomerProfile();
      setCustomer(customerData);
    } catch (error: any) {
      console.error('Error loading customer data:', error);
      
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

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin keluar dari aplikasi?',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Terjadi kesalahan saat logout');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  useEffect(() => {
    loadCustomerData();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Navbar title="Profil" showLogo={true} />
      
      <ScrollView className="flex-1">
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 m-4">
            <Text className="text-red-700 text-center">{error}</Text>
          </View>
        ) : (
          <>
            <View className="bg-white p-4 mb-4 flex-row items-center">
              <View className="w-16 h-16 bg-gray-200 rounded-full mr-4 items-center justify-center">
                <Ionicons name="person" size={32} color="#1E40AF" />
              </View>
              <View>
                {loading ? (
                  <>
                    <View className="w-32 h-5 bg-gray-200 rounded mb-2" />
                    <View className="w-40 h-4 bg-gray-200 rounded" />
                  </>
                ) : customer ? (
                  <>
                    <Text className="text-xl font-bold">{customer.nama_pelanggan}</Text>
                    <Text className="text-gray-500">{customer.email}</Text>
                    <Text className="text-sm text-primary">Poin: {customer.total_poin}</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-xl font-bold">Pelanggan</Text>
                    <Text className="text-gray-500">pelanggan@example.com</Text>
                  </>
                )}
                <Pressable className="flex-row items-center mt-1" onPress={handleEditProfile}>
                  <Text className="text-primary mr-1">Edit Profil</Text>
                  <Ionicons name="chevron-forward" size={16} color="#1E40AF" />
                </Pressable>
              </View>
            </View>
            
            <View className="bg-white rounded-xl mx-4 overflow-hidden">
              {menuItems.map((item, index) => (
                <Pressable 
                  key={item.title}
                  onPress={item.action}
                  className={`p-4 flex-row items-center ${
                    index < menuItems.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name={item.icon as any} size={20} color="#1E40AF" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium">{item.title}</Text>
                    <Text className="text-gray-500 text-xs">{item.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </Pressable>
              ))}
            </View>
            
            <Pressable 
              className="bg-white rounded-xl mx-4 mt-4 p-4 flex-row items-center"
              onPress={handleLogout}
            >
              <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </View>
              <Text className="font-medium text-red-500">Keluar</Text>
            </Pressable>
          </>
        )}
        
        <View className="p-6 items-center">
          <Text className="text-gray-400 text-xs">Versi Aplikasi 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
