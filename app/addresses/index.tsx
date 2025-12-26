import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import { 
  fetchCustomerAddresses, 
  deleteCustomerAddress, 
  updateCustomerAddress,
  fetchCustomerProfile,
  CustomerAddress 
} from '../../services/api';
import { verifyToken } from '../../services/auth';
import { handleAuthError, getErrorMessage } from '../../utils/auth';

const AddressManagementScreen = () => {
  const router = useRouter();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAddresses = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('=== DEBUG: Starting to load addresses ===');
      const isValidToken = await verifyToken();
      console.log('Token validation result:', isValidToken);
      
      if (!isValidToken) {
        console.log('Token invalid, setting error');
        setError('Sesi Anda telah berakhir, akan diarahkan ke halaman login');
        await handleAuthError({ message: 'Token expired or invalid' });
        return;
      }

      // First check customer profile to see which customer we're logged in as
      try {
        const profile = await fetchCustomerProfile();
        console.log('=== CURRENT CUSTOMER INFO ===');
        console.log('Customer ID:', profile.id);
        console.log('Customer Name:', profile.nama_pelanggan);
        console.log('Customer Email:', profile.email);
        console.log('Customer Code:', profile.kode_pelanggan);
      } catch (profileError) {
        console.error('Error fetching customer profile:', profileError);
      }
      
      console.log('About to call fetchCustomerAddresses...');
      const addressesData = await fetchCustomerAddresses();
      console.log('Received addresses data:', addressesData);
      console.log('Addresses count:', addressesData.length);
      
      setAddresses(addressesData);
    } catch (error: any) {
      console.error('Error loading addresses:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
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
    await loadAddresses();
    setRefreshing(false);
  };

  const handleSetDefault = async (address: CustomerAddress) => {
    if (address.is_default) return;

    try {
      // Set this address as default
      await updateCustomerAddress(address.id, { is_default: true });
      
      // Update local state
      setAddresses(prev => 
        prev.map(addr => ({
          ...addr,
          is_default: addr.id === address.id
        }))
      );
      
      Alert.alert('Berhasil!', `${address.label} telah dijadikan alamat utama`);
    } catch (error: any) {
      console.error('Error setting default address:', error);
      Alert.alert('Error', 'Gagal mengubah alamat utama');
    }
  };

  const handleEditAddress = (address: CustomerAddress) => {
    router.push(`/addresses/edit/${address.id}`);
  };

  const handleDeleteAddress = (address: CustomerAddress) => {
    if (address.is_default) {
      Alert.alert('Error', 'Alamat utama tidak bisa dihapus. Pilih alamat lain sebagai alamat utama terlebih dahulu.');
      return;
    }

    Alert.alert(
      'Hapus Alamat',
      `Apakah Anda yakin ingin menghapus alamat "${address.label}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomerAddress(address.id);
              setAddresses(prev => prev.filter(addr => addr.id !== address.id));
              Alert.alert('Berhasil!', 'Alamat berhasil dihapus');
            } catch (error: any) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Gagal menghapus alamat');
            }
          },
        },
      ]
    );
  };

  const handleAddNewAddress = () => {
    router.push('/addresses/add');
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Alamat Pengiriman" showBackButton={true} />
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
        <Navbar title="Alamat Pengiriman" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Memuat alamat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (addresses.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Alamat Pengiriman" showBackButton={true} />
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="location-outline" size={80} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-600 mt-4 mb-2">
            Belum Ada Alamat
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            Tambahkan alamat pengiriman untuk memudahkan checkout
          </Text>
          <Pressable
            onPress={handleAddNewAddress}
            className="bg-primary px-6 py-3 rounded-xl mb-4"
          >
            <Text className="text-white font-semibold">Tambah Alamat</Text>
          </Pressable>
          
          {/* Debug: Add test address button */}
          <Pressable
            onPress={async () => {
              try {
                console.log('Creating test address...');
                const testAddress = {
                  label: 'Test Alamat',
                  nama_penerima: 'Test User',
                  telepon_penerima: '08123456789',
                  alamat_lengkap: 'Jl. Test No. 123',
                  kota: 'Jakarta',
                  provinsi: 'DKI Jakarta',
                  kode_pos: '12345',
                  is_default: false
                };
                
                const { addCustomerAddress } = await import('../../services/api');
                const result = await addCustomerAddress(testAddress);
                console.log('Test address created:', result);
                Alert.alert('Success', 'Test address berhasil dibuat');
                loadAddresses(); // Reload addresses
              } catch (error: any) {
                console.error('Error creating test address:', error);
                Alert.alert('Error', 'Gagal membuat test address: ' + error.message);
              }
            }}
            className="bg-orange-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">DEBUG: Buat Test Alamat</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Navbar 
        title={`Alamat Pengiriman (${addresses.length})`}
        showBackButton={true}
        rightAction={
          <Pressable onPress={handleAddNewAddress}>
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        }
      />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {addresses.map((address) => (
            <View key={address.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="font-semibold text-gray-900 mr-2">
                      {address.label}
                    </Text>
                    {address.is_default && (
                      <View className="bg-green-100 px-2 py-1 rounded">
                        <Text className="text-green-700 text-xs font-medium">
                          Alamat Utama
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  <Text className="text-gray-900 font-medium mb-1">
                    {address.nama_penerima}
                  </Text>
                  
                  <Text className="text-gray-600 mb-1">
                    {address.telepon_penerima}
                  </Text>
                  
                  <Text className="text-gray-600 mb-1">
                    {address.alamat_lengkap}
                  </Text>
                  
                  <Text className="text-gray-600">
                    {address.kota}, {address.provinsi} {address.kode_pos}
                  </Text>
                </View>

                <Pressable
                  onPress={() => handleEditAddress(address)}
                  className="p-2"
                >
                  <Ionicons name="create-outline" size={20} color="#1E40AF" />
                </Pressable>
              </View>

              {/* Action Buttons */}
              <View className="flex-row pt-3 border-t border-gray-100">
                {!address.is_default && (
                  <Pressable
                    onPress={() => handleSetDefault(address)}
                    className="flex-1 bg-blue-50 py-2 rounded-lg items-center mr-2"
                  >
                    <Text className="text-blue-700 font-medium text-sm">
                      Jadikan Utama
                    </Text>
                  </Pressable>
                )}
                
                <Pressable
                  onPress={() => handleEditAddress(address)}
                  className={`bg-gray-100 py-2 rounded-lg items-center ${
                    address.is_default ? 'flex-1 mr-2' : 'px-4 mr-2'
                  }`}
                >
                  <Text className="text-gray-700 font-medium text-sm">Edit</Text>
                </Pressable>
                
                {!address.is_default && (
                  <Pressable
                    onPress={() => handleDeleteAddress(address)}
                    className="bg-red-50 py-2 px-4 rounded-lg items-center"
                  >
                    <Text className="text-red-700 font-medium text-sm">Hapus</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add New Address Button */}
      <View className="p-4 bg-white border-t border-gray-200">
        <Pressable
          onPress={handleAddNewAddress}
          className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 items-center"
        >
          <Ionicons name="add-outline" size={24} color="#6B7280" />
          <Text className="text-gray-500 font-medium mt-1">
            Tambah Alamat Baru
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default AddressManagementScreen;
