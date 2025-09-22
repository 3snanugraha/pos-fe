import React, { useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Button from '../../components/Button';
import Navbar from '../../components/Navbar';
import { register } from '../../services/auth';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    nama_pelanggan: '',
    telepon: '',
    email: '',
    password: '',
    alamat: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!formData.nama_pelanggan || !formData.email || !formData.password || !formData.telepon) {
      Alert.alert('Error', 'Mohon isi semua field yang wajib');
      return;
    }

    setLoading(true);
    try {
      const result = await register(formData);
      if (result.success) {
        Alert.alert('Berhasil', 'Akun berhasil dibuat dan login otomatis berhasil!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        Alert.alert('Registrasi Gagal', result.message || 'Terjadi kesalahan');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      let errorMessage = 'Terjadi kesalahan saat registrasi';
      
      if (error.message === 'Network error or server unavailable') {
        errorMessage = 'Tidak dapat terhubung ke server, periksa koneksi internet Anda';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Tidak dapat terhubung ke server';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Navbar title="Daftar Akun" showBackButton />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 py-4">
          <Text className="text-gray-500 text-center mb-8">
            Buat akun baru untuk mulai berbelanja
          </Text>

          <View className="space-y-4 mb-8">
            <View>
              <Text className="text-gray-700 mb-2 font-medium">Nama Lengkap *</Text>
              <TextInput
                value={formData.nama_pelanggan}
                onChangeText={(text) => setFormData({...formData, nama_pelanggan: text})}
                placeholder="Masukkan nama lengkap"
                className="bg-white p-4 rounded-xl border border-gray-200"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2 font-medium">Nomor Telepon *</Text>
              <TextInput
                value={formData.telepon}
                onChangeText={(text) => setFormData({...formData, telepon: text})}
                placeholder="Masukkan nomor telepon"
                keyboardType="phone-pad"
                className="bg-white p-4 rounded-xl border border-gray-200"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2 font-medium">Email *</Text>
              <TextInput
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                placeholder="Masukkan email"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-white p-4 rounded-xl border border-gray-200"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2 font-medium">Password *</Text>
              <TextInput
                value={formData.password}
                onChangeText={(text) => setFormData({...formData, password: text})}
                placeholder="Masukkan password"
                secureTextEntry
                className="bg-white p-4 rounded-xl border border-gray-200"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2 font-medium">Alamat</Text>
              <TextInput
                value={formData.alamat}
                onChangeText={(text) => setFormData({...formData, alamat: text})}
                placeholder="Masukkan alamat (opsional)"
                multiline
                numberOfLines={3}
                className="bg-white p-4 rounded-xl border border-gray-200"
              />
            </View>
          </View>

          <Button
            title="Daftar"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="lg"
          />

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">Sudah punya akun? </Text>
            <Text 
              className="text-primary font-medium"
              onPress={() => router.back()}
            >
              Masuk Sekarang
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}