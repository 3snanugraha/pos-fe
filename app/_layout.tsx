import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import { CartProvider } from "../contexts/CartContext";
import { colors } from "../src/theme/tokens";
import installWebAlert from "../utils/webAlert";
import "../global.css";

// react-native-web tidak mengimplementasikan Alert (callback tombol tidak
// pernah dipanggil). Shim ini mengembalikan perilaku dialog di web.
installWebAlert();

// Tahan splash screen sampai font Inter siap (guideline §8.2).
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Font Inter dimuat di root agar semua layar memakai font-inter-*.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Sembunyikan splash saat font siap, atau saat gagal dimuat agar app
    // tidak terjebak di splash kosong (fallback ke font sistem).
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.neutral50 },
            animation: "slide_from_right",
          }}
        />
      </CartProvider>
    </ErrorBoundary>
  );
}
