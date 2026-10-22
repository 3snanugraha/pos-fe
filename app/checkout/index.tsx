import { Redirect } from "expo-router";

/**
 * `/checkout` — pintu masuk lama dari keranjang dan tombol "Beli Sekarang".
 * Checkout kini dipecah menjadi Ringkasan Pesanan → Pembayaran, jadi route ini
 * hanya mengalihkan ke langkah pertama agar semua tautan lama tetap bekerja.
 */
export default function CheckoutIndex() {
  return <Redirect href="/checkout/summary" />;
}
