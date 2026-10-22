# W3 — Commerce A (Design System "Zovora")

Status: **selesai**. Fase ini mengganti empat layar commerce: beranda, pencarian,
detail produk, dan ulasan produk.

Sumber kebenaran: `docs/PATTERN DESIGN.txt` (tidak diubah) + `docs/ui-refactor-plan.md`.
Fondasi: `docs/w1-fondasi.md`, `docs/w2-layout-auth.md`.

## Batasan yang dipatuhi

- `services/`, `contexts/` (CartContext/WishlistContext), dan alur checkout **tidak diubah**.
- `services/api.ts` juga tidak diubah. Rating/jumlah ulasan di detail produk dibaca lewat
  hook baca-saja `src/screens/produk/useRingkasanProduk.ts` karena `fetchProductById`
  hanya meneruskan field yang dipakai keranjang.

## 1. Beranda — `app/(tabs)/index.tsx` + `src/components/commerce/`

| Bagian | Guideline | Implementasi |
| --- | --- | --- |
| Banner carousel | §3.7 | `BannerCarousel`: kartu `rounded-lg` tinggi 140, gradien primary-500 → primary-600 (fallback warna solid bila `gambar_url` kosong), auto-play 4 dtk, dots 6 pt dengan dot aktif memanjang 16 pt primary-600. Auto-play berhenti bila `useReducedMotion()` (AccessibilityInfo / `prefers-reduced-motion`) bernilai true. |
| Section header | §3.8 | `SectionHeader`: judul 20/28 semibold + tautan "Lihat Semua" primary-700, target sentuh 44. |
| Featured | §3.7 | Rail horizontal `FeaturedAvatar` (avatar bulat 56 + nama kategori) bila kategori tersedia. |
| Grid produk | §3.9 | 2 kolom, gap 12. `ProductCard` vertikal: gambar 3:4 `rounded-lg`, badge diskon kiri atas (danger-500), nama 1–2 baris, harga `Section` bold + harga coret + rating. |
| Flash sale | §3.7 | Rail "Flash Sale" dengan kartu yang sama; harga flash dari backend bila ada. |
| Tema header | §2.1 | `src/theme/temaKategori.ts` — For You = primary-200 → primary-50 → putih (biru); kategori lain memakai pasangan warna guideline (peach/beauty, mint, dsb.). `HomeHeader` menerima tema aktif sehingga gradien berubah saat tab kategori diganti. |
| Loading | §5 | `Skeleton` shimmer (bukan spinner), animasi ~1,2 dtk, bentuk mengikuti kartu nyata. |
| Empty / error | §5 | `ErrorState` (kegagalan jaringan, tombol "Coba Lagi") dan empty state berbahasa Indonesia. |

## 2. Pencarian — `app/search/index.tsx` + `src/components/commerce/SearchBar.tsx`

- Search bar tinggi 44 `rounded-md`, ikon search kiri, placeholder berganti sesuai konteks,
  tombol clear (target 44).
- Recent searches: avatar bulat + "Hapus Semua" (`src/lib/riwayatPencarian.ts`, penyimpanan lokal).
- Trending (dari kategori populer) dan suggestion list: baris tinggi 52, thumbnail 28,
  bagian yang cocok di-bold, ikon `arrow-up-left` mengisi kolom kanan sebagai petunjuk
  "isi kolom pencarian".
- Tidak ada hasil → `EmptyState` dengan copy guideline.
- **Filter harga dan urutan (sorting) yang sudah ada dipertahankan**; keduanya tetap memanggil
  endpoint yang sama seperti sebelumnya.

## 3. Detail produk — `app/product/[id].tsx` + `src/components/commerce/ProductGallery.tsx`

- Carousel gambar 1:1 (hero) dengan dot pagination; chip rating menempel di kanan bawah gambar.
- Chip varian: terpilih `border-2 primary-600` + `bg primary-50`, tidak terpilih border neutral-200.
  Pemilihan varian mengubah stok/harga persis seperti logika lama (tidak diubah).
- Harga + harga coret + badge diskon, lalu deskripsi.
- Sticky CTA bar: dua tombol `flex 1 : 1,3`, gap 12 — outline "Tambah ke Keranjang" dan
  primary "Beli Sekarang", memakai `shadowStyle("bar")` + `useSafeAreaInsets`.
- Fitur stok, varian, dan add-to-cart lama dipertahankan; satu CTA primary per layar.

## 4. Ulasan — `app/product/[id]/reviews.tsx` + `src/screens/produk/useUlasanProduk.ts`

- Ringkasan rating pada kotak `warning-50` + 5 bar distribusi `primary-500`.
- Daftar review: bintang, teks maksimal 3 baris + "Selengkapnya", foto (bila ada),
  meta "Nama · X hari lalu".
- Header "N Ulasan" + dropdown urutkan.
- Bila backend tidak menyediakan endpoint ulasan (mis. 404), layar menampilkan empty state
  berbahasa Indonesia — **bukan error**.

## Verifikasi

- `npx tsc --noEmit` → 0 error.
- `npx expo lint` → 0 error (12 warning `react-hooks/set-state-in-effect` pada hook pemuat
  data; sudah pola yang sama di hook W2, bukan error).
- Web mode (`npx expo start --web`, API mock lokal): beranda tampil lengkap (banner, kategori,
  flash sale, grid 2 kolom, rating), navigasi beranda → detail produk berhasil, tombol
  "Tambah ke Keranjang" menulis item ke keranjang (`@cart_items`) dan memunculkan dialog
  konfirmasi. Halaman ulasan menampilkan empty state saat endpoint mengembalikan 404.
  Pencarian menampilkan trending dan suggestion saat mengetik.

## Catatan / utang teknis

- Rail horizontal memakai lebar kartu eksplisit (bukan `flex`) agar `ScrollView` horizontal
  tidak mengecilkan kartu di web.
- Skeleton shimmer memakai `Animated` bawaan React Native, bukan `react-native-reanimated`,
  supaya tidak menambah dependensi.
