import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import { CartProvider } from "../contexts/CartContext";
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
        <StatusBar style="dark" backgroundColor="#F3F4F6" translucent={false} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#F3F4F6" },
            animation: "slide_from_right",
          }}
        />
      </CartProvider>
    </ErrorBoundary>
  );
}
