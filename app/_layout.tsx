import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { CartProvider } from '../contexts/CartContext';
import ErrorBoundary from '../components/ErrorBoundary';
import "../global.css";
// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // You can add custom fonts here if needed
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Hide the splash screen once fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <CartProvider>
        <StatusBar 
          style="light" 
          backgroundColor="#1E40AF" 
          translucent={false}
        />
        <Stack screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F3F4F6' },
          animation: 'slide_from_right',
        }} />
      </CartProvider>
    </ErrorBoundary>
  );
}
