import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import { fetchCustomerProfile, updateCustomerProfile, CustomerProfile } from '../../services/api';
import { verifyToken } from '../../services/auth';
import { handleAuthError, getErrorMessage } from '../../utils/auth';

const EditProfileScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nama_pelanggan: '',
    email: '',
    telepon: '',
    alamat: '',
    password: '',
    confirmPassword: '',
  });

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const isValidToken = await verifyToken();
      
      if (!isValidToken) {
        setError('Sesi Anda telah berakhir, akan diarahkan ke halaman login');
        await handleAuthError({ message: 'Token expired or invalid' });
        return;
      }

      const profile = await fetchCustomerProfile();
      setFormData({
        nama_pelanggan: profile.nama_pelanggan,
        email: profile.email,
        telepon: profile.telepon,
        alamat: profile.alamat,
        password: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      const isAuthError = await handleAuthError(error);
      if (!isAuthError) {
        setError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nama_pelanggan.trim()) {
      Alert.alert('Error', 'Nama tidak boleh kosong');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email tidak boleh kosong');
      return;
    }

    if (!formData.telepon.trim()) {
      Alert.alert('Error', 'Nomor telepon tidak boleh kosong');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Password konfirmasi tidak sama');
      return;
    }

    setSaving(true);

    try {
      const updateData: any = {
        nama_pelanggan: formData.nama_pelanggan,
        email: formData.email,
        telepon: formData.telepon,
        alamat: formData.alamat,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateCustomerProfile(updateData);
      
      Alert.alert(
        'Berhasil!',
        'Profil berhasil diperbarui',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Gagal memperbarui profil. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Edit Profil" showBackButton={true} />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Memuat data profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
        <Navbar title="Edit Profil" showBackButton={true} />
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 w-full">
            <Text className="text-red-700 text-center">{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Navbar title="Edit Profil" showBackButton={true} />

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 bg-gray-200 rounded-full items-center justify-center mb-3">
            <Ionicons name="person" size={40} color="#1E40AF" />
          </View>
          <Pressable className="bg-primary px-4 py-2 rounded-xl">
            <Text className="text-white font-medium">Ubah Foto</Text>
          </Pressable>
        </View>

        {/* Personal Info */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-lg font-semibold mb-4">Informasi Pribadi</Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Nama Lengkap *</Text>
            <TextInput
              value={formData.nama_pelanggan}
              onChangeText={(text) => setFormData({...formData, nama_pelanggan: text})}
              placeholder="Masukkan nama lengkap"
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Email *</Text>
            <TextInput
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              placeholder="Masukkan email"
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Nomor Telepon *</Text>
            <TextInput
              value={formData.telepon}
              onChangeText={(text) => setFormData({...formData, telepon: text})}
              placeholder="Masukkan nomor telepon"
              keyboardType="phone-pad"
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
            />
          </View>

          <View className="mb-0">
            <Text className="text-gray-700 font-medium mb-2">Alamat</Text>
            <TextInput
              value={formData.alamat}
              onChangeText={(text) => setFormData({...formData, alamat: text})}
              placeholder="Masukkan alamat"
              multiline
              numberOfLines={3}
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Change Password */}
        <View className="bg-white rounded-xl p-4 mb-6">
          <Text className="text-lg font-semibold mb-4">Ubah Password</Text>
          <Text className="text-gray-500 text-sm mb-4">
            Kosongkan jika tidak ingin mengubah password
          </Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Password Baru</Text>
            <TextInput
              value={formData.password}
              onChangeText={(text) => setFormData({...formData, password: text})}
              placeholder="Masukkan password baru"
              secureTextEntry
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
            />
          </View>

          <View className="mb-0">
            <Text className="text-gray-700 font-medium mb-2">Konfirmasi Password</Text>
            <TextInput
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
              placeholder="Konfirmasi password baru"
              secureTextEntry
              className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50"
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="p-4 bg-white border-t border-gray-200">
        <Pressable
          onPress={handleSave}
          disabled={saving}
          className={`py-4 rounded-xl items-center ${
            saving ? 'bg-gray-300' : 'bg-primary'
          }`}
        >
          <Text className={`font-semibold text-lg ${
            saving ? 'text-gray-500' : 'text-white'
          }`}>
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default EditProfileScreen;
