import { Stack } from "expo-router";
import { CheckoutProvider } from "../../src/screens/checkout/CheckoutContext";
import { colors } from "../../src/theme/tokens";

/**
 * Layout checkout — satu `CheckoutProvider` untuk Ringkasan Pesanan dan
 * Pembayaran, sehingga alamat terpilih, split payment, dan poin tetap sama
 * saat pengguna berpindah layar (dulu semuanya satu layar bertahap).
 *
 * Logika order (payload, validasi split, poin) tetap di provider itu dan tidak
 * diubah dari versi sebelumnya.
 */
export default function CheckoutLayout() {
  return (
    <CheckoutProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.neutral50 },
          animation: "slide_from_right",
        }}
      />
    </CheckoutProvider>
  );
}
