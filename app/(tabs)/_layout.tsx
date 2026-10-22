import { Tabs } from "expo-router";
import { BottomTabBar } from "../../src/components/layout/BottomTabBar";
import { teks } from "../../src/lib/i18n";

/**
 * Tab bar Zovora (guideline §3.18) — 4 tab: Beranda, Kategori, Keranjang, Akun.
 * Semua route lama di `app/(tabs)` tetap terdaftar sehingga tidak ada layar
 * yang kehilangan jalur akses; label, ikon, dan badge keranjang ditentukan
 * oleh komponen `BottomTabBar`.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: teks.nav.home }} />
      <Tabs.Screen name="products" options={{ title: teks.nav.kategori }} />
      <Tabs.Screen name="cart" options={{ title: teks.nav.keranjang }} />
      <Tabs.Screen name="profile" options={{ title: teks.nav.akun }} />
    </Tabs>
  );
}
