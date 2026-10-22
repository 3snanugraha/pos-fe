# W1 — Fondasi Design System "Zovora"

Status: **selesai**. Fase ini hanya menambah fondasi + UI kit; layar lama (`app/`,
`screens/`, `components/`) tetap dipakai apa adanya sampai fase W2+.

Sumber kebenaran: `docs/PATTERN DESIGN.txt` (tidak diubah) + `docs/ui-refactor-plan.md`.

## 1. Dependensi

Dipasang dengan `npx expo install` agar versi sesuai SDK 57:

| Paket | Versi |
| --- | --- |
| `@expo-google-fonts/inter` | ^0.4.2 |
| `lucide-react-native` | ^1.61.0 |
| `react-native-svg` | 15.15.4 (pin SDK 57) |
| `expo-linear-gradient` | ~57.0.2 |
| `expo-haptics` | ~57.0.0 (sudah ada) |

## 2. Token

### `tailwind.config.js`
- Warna: `primary` 50–900 (Sky), `neutral` 50–900 (Slate), `success`, `warning`,
  `danger`, `peach` — hex persis guideline §2.1/§8.1.
- `fontFamily`: `inter`, `inter-medium`, `inter-semibold`, `inter-bold`
  (nama file font, bukan `fontWeight` — catatan §8.1).
- `fontSize`: `caption` 10/14, `xs` 12/16, `sm` 14/20, `base` 16/24, `lg` 18/24,
  `xl` 20/26, `2xl` 24/30, `4xl` 32/38.
- `borderRadius`: sm 6, md 8, lg 12, xl 16, 2xl 24.
- `boxShadow`: `bar`, `float`, `modal` (nilai guideline §2.4).
- `content` ditambah `./src/**` agar komponen baru ikut ter-scan.
- **Kompatibilitas**: preset `nativewind/preset` tetap; `primary`, `secondary`,
  `accent`, `background` juga tersedia sebagai alias untuk layar W0 yang memakai
  `bg-primary` / `text-primary` / `bg-background` (nilainya dipetakan ke brand baru).

### `src/theme/tokens.ts`
Hex untuk prop non-`className`: `primary`, `neutral`, `success`, `warning`,
`danger`, `peach`, `colors` (datar: `primary600`, `neutral400`, …), `radius`,
`shadow`, `sizes`, `fontFamily`, `overlay`, `gradients`.

**Catatan §8.1 (fallback shadow)**: `shadowStyle("bar" | "float" | "modal")`
menghasilkan `ViewStyle` lewat `StyleSheet`-style object — shadow iOS, `elevation`
Android, `boxShadow` web. Dipakai di komponen yang butuh shadow pasti
(`Dialog`) sehingga tidak bergantung pada pembacaan token `boxShadow` NativeWind.

## 3. Font Inter

`app/_layout.tsx` memuat `Inter_400Regular/500Medium/600SemiBold/700Bold` lewat
`useFonts` dari `@expo-google-fonts/inter`, splash ditahan (`preventAutoHideAsync`)
sampai font siap. Logika root lama (ErrorBoundary, CartProvider, StatusBar, Stack,
`installWebAlert`) dipertahankan; ditambah fallback `fontError` supaya app tidak
terjebak di splash bila font gagal dimuat.

## 4. Utilitas

- `src/lib/format.ts` — `rupiah()` (`Intl.NumberFormat` `id-ID`, IDR, tanpa desimal),
  `angka()`, `parseRupiah()`, `tanggal()` → `23 Okt 2026`, `tanggalWaktu()`, `jam()`,
  `waktuRelatif()` → `2 mnt lalu` / `9 hari lalu`, `samarkanEmail()`,
  `badgeJumlah()` (`99+`). Epoch detik dari backend ditangani (`< 1e11` → ×1000).
- `src/lib/i18n.ts` — kamus `teks` (umum, tombol, nav, judul, subjudul, field,
  placeholder, error, empty, dialog, checkout, status, a11y, satuan) + helper
  `t("error.wajib", { field })` dengan interpolasi `{...}` dan tipe `KunciTeks`
  untuk autocomplete. Semua copy guideline §5 + label tombol/nav ada di sini.

## 5. UI kit (`src/components/ui/`)

Semua memakai token (tanpa hex langsung; warna lewat `tokens.ts` untuk prop ikon/spinner),
copy dari `i18n.ts`, dan aksesibilitas §7.

| Komponen | Catatan implementasi |
| --- | --- |
| `Button` | primary/outline/social/ghost × lg 48 / md 40 / sm 32, radius md, pressed lebih gelap, disabled opacity 50%, loading spinner (`loadingText` opsional), `accessibilityState {disabled, busy}` |
| `Input` | tinggi 48, label Body medium, border neutral-200 → primary-500 saat fokus **+ ring 2pt primary-100**, error border danger-500 + pesan **danger-700**, disabled bg neutral-100, toggle eye/eye-off 20 dengan target 44 |
| `OtpInput` | 4 kotak 48×48 gap 12, auto-advance, auto-backspace, **paste** (tempel 4 digit), `textContentType=oneTimeCode` + `autoComplete=one-time-code`, error semua kotak danger-500 |
| `Badge` | diskon bg primary-600, Caption bold, padding 6×2, radius sm; varian netral/danger/success/warning; helper `hitungDiskon()` |
| `Chip` | swatch warna 48×56 radius md, terpilih border-2 primary-600 + bg primary-50 + centang; varian teks pill |
| `Divider` | label `"atau lanjutkan dengan"` (gap 12, margin vertikal 24) + varian garis polos, `DividerAtau` |
| `EmptyState` | lingkaran 80 bg primary-100, ikon 36, judul Subheading 18/24, deskripsi Small neutral-500 max-width 260, CTA primary full width |
| `Dialog` | overlay `rgba(15,23,42,.5)`, kartu putih radius 16, padding 20, `shadow-modal`, animasi fade + scale 0,95→1 **200 ms**, `accessibilityViewIsModal`, `reduceMotion` |
| `Accordion` | baris 52, border-bottom neutral-200, satu terbuka (`single`), chevron berputar + `LayoutAnimation` **200 ms**, mode terkontrol/tak terkontrol, `accessibilityState {expanded}` |
| `Stepper` | tombol − / + 28×28 border neutral-200 radius md, angka min-width 24 tabular-nums, batas stok (`max`), **konfirmasi hapus di qty 1** via `Dialog`, `accessibilityValue` + `accessibilityLiveRegion` |

Ekspor barel: `src/components/ui/index.ts`.

## 6. Verifikasi

- `npx tsc --noEmit` → **0 error**.
- `npx expo lint` → **0 error**, 18 warning (semuanya warisan layar lama:
  `react-hooks/set-state-in-effect` yang sudah diturunkan ke warning di
  `eslint.config.js`).
- Render web: `npx expo export -p web` + halaman demo sementara
  (`app/kit-demo.tsx`) — semua 10 komponen tampil. Diukur di browser:
  - Inter 400/500/600/700 **loaded**; label Button `font-family: Inter_600SemiBold`, 16/24.
  - Button bg `rgb(2,132,199)`, radius 8px, tinggi 48; error text `rgb(185,28,28)` 12px.
  - Badge bg `rgb(2,132,199)`, radius 6, teks 10px putih.
  - OTP: 4 input 48×48, `autocomplete=one-time-code`, label "Kode verifikasi digit N".
  - Stepper tombol 28×28; klik − di qty 1 memunculkan dialog "Hapus Produk?".
  - Accordion: klik QRIS menutup COD (satu terbuka).
  - Dialog: kartu putih radius 16 padding 20, `role=alert`, `aria-modal` aktif.
  - EmptyState: lingkaran 80 `rgb(224,242,254)`, judul 18/24, deskripsi max 260.
  - Focus ring Input: border berubah ke `rgb(14,165,233)` + ring `rgb(224,242,254)`.
  - Layar lama `/auth/login` tetap render normal dengan `bg-primary` baru.
- Halaman demo **dihapus** (`app/kit-demo.tsx`), tidak ada route sampah yang tertinggal.

## 7. Perbaikan yang ditemukan saat verifikasi

1. `Animated.View` di react-native-web **tidak meneruskan `className`** NativeWind →
   kartu Dialog kehilangan bg/radius/padding. Diperbaiki dengan `Animated.View`
   (transform/opacity saja) membungkus `View` ber-`className`.
2. Focus ring Input: NativeWind v4 tidak memetakan `ring-*` ke luar border di web →
   diganti overlay `absolute -inset-[3px] border-2 border-primary-100`.

## 8. Catatan untuk fase berikutnya

- `ringStyle()` sengaja tidak ditambahkan ke `tokens.ts`; pola ring dipakai inline di
  `Input`. Bila komponen lain butuh ring, ekstrak ke helper bersama.
- Layar W0 masih memakai `components/Button.tsx` lama (bukan UI kit) — migrasi di W2–W5.
- `app.json` masih memakai `#1E40AF` untuk ikon adaptive/splash; disesuaikan saat
  rebranding final (W6), bukan bagian W1.
