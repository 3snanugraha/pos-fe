import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isAuthenticated, verifyToken } from '../services/auth';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { fetchBanners, fetchPaymentMethods } from '../services/api';

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [loadingText, setLoadingText] = useState('Memuat aplikasi...');
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = async () => {
    try {
      // Check if token exists first
      setLoadingText('Memeriksa autentikasi...');
      await new Promise(resolve => setTimeout(resolve, 500));
      const hasToken = await isAuthenticated();
      
      if (hasToken) {
        // If token exists, verify it's still valid
        setLoadingText('Memverifikasi sesi...');
        await new Promise(resolve => setTimeout(resolve, 500));
        const isValidToken = await verifyToken();
        setIsAuth(isValidToken);
      } else {
        setIsAuth(false);
      }

      setLoadingText('Siap!');
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Initialization error:', error);
      // If there's any error during auth check, assume not authenticated
      setIsAuth(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoading) {
    return <Redirect href={isAuth ? "/(tabs)" : "/auth/login"} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-1 justify-center items-center px-8">
        <Animated.View 
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
          className="items-center"
        >
          <View className="w-32 h-32 bg-white rounded-3xl items-center justify-center mb-8 shadow-lg">
            <Image
              source={require('../assets/images/logo.png')}
              style={{ width: 80, height: 80 }}
              contentFit="contain"
              onLoad={() => console.log('✅ Loading screen logo loaded successfully')}
              onError={(error) => console.log('❌ Loading screen logo failed to load:', error)}
            />
          </View>
          
          <Text className="text-white text-3xl font-bold mb-2">DeadEaStore</Text>
          <Text className="text-blue-200 text-lg mb-12 text-center">
            Solusi POS Modern untuk Bisnis Anda
          </Text>
        </Animated.View>
        
        <View className="items-center">
          <ActivityIndicator size="large" color="white" className="mb-4" />
          <Text className="text-white text-base">{loadingText}</Text>
        </View>
        
        <View className="absolute bottom-8">
          <Text className="text-blue-200 text-sm">Versi 1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
