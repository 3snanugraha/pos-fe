# Perbaikan Safe Area (inset atas/bawah)

Laporan bug pemilik: **"Bagian beranda belum pakai safeareaview — konten menembus notif bar HP."**

Acuan desain `docs/PATTERN DESIGN.txt`:
- §2.3/§3.5 — gradien header Home **boleh** menjangkau ke belakang status bar
  (status bar transparan), tetapi **konten** (baris judul/alamat/ikon, search bar,
  tabs) harus mulai **di bawah inset atas**.
- §2.3 — safe area memakai `react-native-safe-area-context` (bukan `SafeAreaView`
  bawaan `react-native`).
- §3.12/§3.18 — sticky bar dan tab bar menambah inset bawah.

## 1. Home (bug utama)

`app/(tabs)/index.tsx` sudah memakai `SafeAreaView` dari
`react-native-safe-area-context`, tetapi dengan `edges={["left","right"]}` —
inset atas **sengaja** dilepas. Masalahnya: `HomeHeader` tidak menambahkan inset
atas sendiri, sehingga baris judul, search bar, dan tabs tergambar di bawah
status bar/notch.

Perbaikan (`src/components/layout/HomeHeader.tsx`):
- `useSafeAreaInsets()` → `paddingTop: insets.top + 8` **pada pembungkus konten
  di dalam `LinearGradient`**, bukan pada gradien.
- Tinggi/area gradien tidak dikurangi dan tidak dibungkus `SafeAreaView` biasa,
  jadi gradien tetap penuh sampai tepi atas layar (status bar transparan).
- `app/(tabs)/index.tsx`: `edges={["left","right"]}` dipertahankan + komentar
  alasan, karena inset atas kini ditangani header (tidak dihitung dua kali).

## 2. Hasil audit seluruh layar/komponen

| Komponen / layar | Kondisi | Tindakan |
|---|---|---|
| `HomeHeader` | konten mulai di y=0 | **diperbaiki** — `paddingTop = insets.top + 8` |
| `AppBar` (tinggi 56) | tidak menangani inset sendiri | **tidak diubah** — semua pemakainya sudah dibungkus `SafeAreaView edges={["top","left","right"]}`, jadi AppBar mulai tepat di bawah status bar. Diperiksa 14 file pemakai (cart, addresses, checkout summary/payment/success, kasir, orders, reviews, profile/edit, Category, PaymentMethods, Profile, search, wishlist, notifications) — semuanya `edges` berisi `top` **kecuali** Home dan galeri produk (memang menembus, sesuai desain) |
| `AuthShell` | `paddingTop: insets.top` pada root | sudah benar |
| `OnboardingScreen` | hero gradien menembus, `paddingTop: insets.top` pada gradien | sudah benar (hero boleh menembus); CTA bawah `insets.bottom + 16` |
| `ProductGallery` (detail produk) | tombol kembali/wishlist `absolute top: 12` menempel di bawah notif bar karena galeri menembus status bar | **diperbaiki** — `top: insets.top + 12` |
| `app/product/[id].tsx` skeleton | `SafeAreaView edges` termasuk `top` → galeri skeleton tidak menembus (beda dengan layar akhir) | **diperbaiki** — skeleton memakai `edges={["left","right"]}` seperti layar akhir |
| Sticky CTA produk | `Math.max(insets.bottom, 12)` | **diperbaiki** — memakai `paddingBawahStickyBar` (inset + 16) agar sama dengan `StickyBar` |
| `StickyBar` | inset + 16 | benar secara nilai; **dirapikan** ke helper bersama |
| `app/(tabs)/cart.tsx` | `StickyBar` di dalam layar ber-tab → inset bawah dihitung dua kali (StickyBar + BottomTabBar) | **diperbaiki** — `denganInset={false}` |
| `BottomTabBar` | 64 + inset | benar; **dirapikan** ke helper (jepit nilai negatif) |
| `Dialog` (modal, `statusBarTranslucent`) | kartu dialog bisa menempel notif bar / gesture bar | **diperbaiki** — overlay tetap penuh, konten diberi `paddingTop: insets.top`, `paddingBottom: insets.bottom` |
| Layar stack tanpa sticky bar (`orders`, `orders/[id]`, `points`, `notifications`, `wishlist`, `product/[id]/reviews`, `search`, `kasir/orders`, `payment-methods`) | `contentContainerStyle.paddingBottom` angka tetap → item terakhir bisa tertutup gesture bar Android edge-to-edge | **diperbaiki** — `paddingBawahKonten(insets, dasar)` |
| `app/index.tsx` (splash) | `SafeAreaView` default (semua edge) | sudah benar |

`app.json` memakai `edgeToEdgeEnabled: true` (Android), jadi insets memang
signifikan di perangkat — bukan hanya isu iOS.

## 3. Helper perhitungan

`src/lib/inset.ts` — fungsi murni, supaya nilai inset fiktif bisa diuji tanpa
perangkat ber-notch:

- `paddingAtasHeader(inset)` → `inset.top + 8`
- `paddingBawahStickyBar(inset, denganInset)` → `(denganInset ? inset.bottom : 0) + 16`
- `tinggiTabBar(desain, insetBawah)` → `desain + inset.bottom`
- `paddingBawahKonten(inset, dasar = 24)` → `dasar + inset.bottom`
- `offsetMengambang(inset)` → `inset.top + 12`

Nilai negatif dijepit ke 0.

## 4. Verifikasi

- `npx tsc --noEmit` → **0 error**.
- `npx expo lint` → **0 error** (4 warning lama `react-hooks/set-state-in-effect`
  di hook fetch-on-mount, bukan dari perubahan ini).
- Web mode tidak mensimulasikan notch (insets 0), jadi bukti diambil dengan
  **mengganti `useSafeAreaInsets`** ke nilai fiktif lalu me-render komponen ke
  HTML (react-native-web + `react-dom/server`):
  `node scripts/verify-safe-area.js <repo> '{"top":47,"bottom":34}'`.

Hasil (atribut `style` pada HTML hasil render):

| Inset | HomeHeader paddingTop | StickyBar paddingBottom | StickyBar (denganInset=false) | BottomTabBar tinggi / paddingBottom | Dialog paddingTop/Bottom |
|---|---|---|---|---|---|
| top 47 / bottom 34 | **55** | **50** | 16 | **98** / 34 | 47 / 34 |
| top 59 / bottom 34 | **67** | **50** | 16 | **98** / 34 | 59 / 34 |
| top 0 / bottom 0 | 8 | 16 | 16 | 64 / 0 | 0 / 0 |

`paddingTop` header berubah mengikuti inset (8 → 55 → 67), sedangkan tinggi
internal header (ikon 36, search bar 44) tidak berubah — membuktikan padding
ditambahkan pada konten, bukan pada gradien/tinggi desain.

Catatan: verifikasi ini statis (style hasil render), bukan tangkapan layar pada
perangkat ber-notch. Pengujian di HP fisik tetap disarankan untuk
mengonfirmasi tampilan akhir.

## 5. Yang tidak diubah

Logika bisnis (fetch, keranjang, checkout, poin, auth) tidak disentuh. Ukuran
desain (AppBar 56, search bar 44, tab bar 64, tombol 44/36, radius, warna) tetap
sesuai guideline; hanya penambahan inset yang berubah.
