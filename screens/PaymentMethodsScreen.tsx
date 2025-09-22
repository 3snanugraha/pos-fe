import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../components/Navbar';
import PaymentMethodCard from '../components/PaymentMethodCard';
import Button from '../components/Button';
import { fetchPaymentMethods, PaymentMethod } from '../services/api';
import { verifyToken } from '../services/auth';
import { handleAuthError, getErrorMessage } from '../utils/auth';

const PaymentMethodsScreen = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const methods = await fetchPaymentMethods();
      setPaymentMethods(methods);
      if (methods.length > 0) {
        setSelectedMethod(methods[0].id);
      }
    } catch (error: any) {
      console.error('Error loading payment methods:', error);
      
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

  useEffect(() => {
    loadData();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      <Navbar title="Metode Pembayaran" showBackButton />
      
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-lg font-bold mb-4">Pilih Metode Pembayaran</Text>
        
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4">
            <Text className="text-red-700 text-center">{error}</Text>
          </View>
        ) : loading ? (
          <View className="space-y-3">
            {[1, 2, 3].map((item) => (
              <View key={item} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </View>
        ) : paymentMethods.length === 0 ? (
          <View className="items-center justify-center py-8">
            <Text className="text-gray-500">Tidak ada metode pembayaran tersedia</Text>
          </View>
        ) : (
          <View>
            {paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                selected={selectedMethod === method.id}
                onSelect={() => setSelectedMethod(method.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      
      <View className="p-4 bg-white border-t border-gray-200">
        <Button 
          title="Konfirmasi Pembayaran" 
          fullWidth 
          disabled={selectedMethod === null || loading}
          onPress={() => {
            // Handle payment confirmation
            // console.log('Selected payment method:', selectedMethod);
          }}
        />
      </View>
    </SafeAreaView>
  );
};

export default PaymentMethodsScreen;