import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
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
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#1E40AF" 
        translucent={false}
      />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F3F4F6' },
        animation: 'slide_from_right',
      }} />
    </>
  );
}
