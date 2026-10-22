# Rencana Refactor UI pos-fe — Design System "Zovora"
Sumber kebenaran desain: docs/PATTERN DESIGN.txt (WAJIB dibaca tiap fase; jangan diubah).
Dokumen ini = rencana fase + gate. Keputusan logika yang berubah dicatat di sini.

## Prinsip kunci (ringkas)
- Token warna Sky (primary/neutral/success/warning/danger/peach) di tailwind.config + theme/tokens.ts.
- Font Inter (@expo-google-fonts/inter) — pakai font-inter-*, jangan fontWeight.
- Satu CTA utama per layar; sticky bar bawah; target sentuh >= 44pt; accessibilityLabel wajib.
- Semua layar berisi data punya empty/loading/error state (pola section 5).
- Copy UI Indonesia lewat file i18n (jangan hardcode di komponen); format rupiah Intl id-ID.
- Kontras: teks kecil primary-700/neutral-500+; pesan error danger-700 (border danger-500).

## Fase
- W1 FONDASI: deps (@expo-google-fonts/inter, lucide-react-native, react-native-svg,
  expo-linear-gradient), tailwind.config token sesuai guideline, global.css, src/theme/tokens.ts,
  src/lib/format.ts (rupiah), src/lib/i18n.ts (kamus UI Indonesia), src/components/ui/:
  Button, Input, OtpInput, Badge, Chip, Divider, EmptyState, Dialog, Accordion, Stepper.
  Gate: tsc 0 error, lint 0 error, komponen ter-render di web mode.
- W2 LAYOUT + AUTH: src/components/layout/: AppBar, HomeHeader, CategoryTabs, BottomTabBar
  + integrasi tab bar ke app/(tabs). Auth screens sesuai pola section 4: onboarding, sign-in,
  sign-up, forgot-password, verify-code (OTP 4 digit), reset-password — KeyboardAvoidingView,
  error per field. Termasuk: alur lupa password untuk pelanggan legacy (13.836 akun tanpa
  password) — hubungkan ke endpoint backend yang ada. Gate: alur auth jalan end-to-end.
- W3 COMMERCE A: home (header gradien tema kategori, banner carousel, featured, flash sale),
  search (recent/trending/suggestion/empty), product/[id] (carousel, rating chip, chip warna,
  sticky CTA), product/[id]/reviews. Gate: alur home -> detail jalan.
- W4 COMMERCE B: cart (address, cart item, stepper, price summary, sticky bar),
  checkout/summary, checkout/payment (accordion metode + banner total), order success,
  saved items, notifications (item + soft-prompt dialog izin). Gate: checkout penuh jalan
  (poin + split payment tetap berfungsi — JANGAN rusak logika yang sudah ada).
- W5 SISA + POLES: orders (riwayat/detail/tracking), addresses, profile/account, payment-methods,
  riwayat poin, kategori — semua pakai komponen baru; i18n penuh; empty/loading/error di semua
  layar; accessibility pass; skeleton shimmer. Gate: seluruh alur E2E hijau di web mode.
- W6 FINAL: tsc 0 error, lint 0 error, uji E2E penuh (web mode), commit rapi, push,
  build APK baru, kirim ke chat.

## Aturan teknis
- NativeWind v4 sudah terpasang — jangan rusak konfigurasi babel/metro yang ada.
- Jangan hardcode hex di komponen (kecuali theme/tokens.ts).
- Logika bisnis (cart context, services API, checkout payload) JANGAN diubah — refactor UI saja.
- Perubahan struktur folder screens/ -> src/components harus kompatibel dengan expo-router app/.
