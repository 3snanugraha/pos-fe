# W4 — Commerce B (Design System "Zovora")

Status: **selesai**. Fase ini mengganti enam layar commerce: keranjang, ringkasan
pesanan, pembayaran, pesanan berhasil, barang disimpan, dan notifikasi.

Sumber kebenaran: `docs/PATTERN DESIGN.txt` (tidak diubah) + `docs/ui-refactor-plan.md`.
Fondasi: `docs/w1-fondasi.md`, `docs/w2-layout-auth.md`, `docs/w3-commerce-a.md`.

## Batasan yang dipatuhi

- `services/`, `contexts/CartContext`, `utils/payment.ts`, dan `utils/formatters.ts`
  **tidak diubah**.
- Payload order ke backend **identik** dengan sebelum refactor (dibuktikan di §6).
- Alur split payment, batas stok, promo, dan poin dipertahankan persis; yang
  berubah hanya tampilan dan pemecahan layar.

## 1. Keranjang — `app/(tabs)/cart.tsx`

| Bagian | Guideline | Implementasi |
| --- | --- | --- |
| Alamat pengiriman | §3.13 | `AddressCard` varian `ringkas`: ikon `map-pin` 16 + alamat satu baris terpotong (`Small` neutral-700), link "Ganti" primary-700 (target 44). Alamat default dari `getCustomerAddresses()`; gagal muat ≠ gagal layar (tombol coba lagi kecil). |
| Item | §3.11 | `CartItemRow`: thumbnail 72×80 `rounded-md` bg neutral-50, judul `Body` medium maks 2 baris, keterangan `Small` neutral-500 (`Varian X · Kategori`), harga `Section` bold, `trash-2` 20 danger-500 kanan atas (target 44), `Stepper` kanan bawah. |
| Stepper | §3.11 | Komponen `Stepper` W1: tombol −/+ 28×28, angka min-width 24 `tabular-nums`, batas `stok_tersedia`, dan konfirmasi hapus saat qty 1. |
| Ringkasan harga | §3.12 | `PriceSummary`: kartu `rounded-lg` bg primary-50 border primary-100 padding 16, baris Sub-total + Ongkos kirim (belum dihitung backend → label "Gratis"), divider, Total bold. |
| Sticky bar | §3.12 | `StickyBar` (`shadow-bar` + inset bawah): kiri total `Heading` + jumlah item `Caption`, kanan CTA primary "Lanjutkan" 140. |
| Empty state | §5 | `EmptyState` `shopping-basket` 36 di lingkaran primary-100 80, judul "Keranjang Anda kosong", CTA "Belanja Sekarang". |
| Loading | §5 | Skeleton bentuk kartu (bukan spinner layar penuh) saat hidrasi keranjang. |

Layar ini tetap memakai logika `CartContext` apa adanya (`updateItemQuantity`
membatasi stok, `removeItem` di qty 1 lewat dialog konfirmasi `Stepper`).

## 2. Checkout dipecah dua layar

`app/checkout/index.tsx` (dulu 1091 baris, wizard 3 langkah) dipecah menjadi:

- `app/checkout/_layout.tsx` — satu `CheckoutProvider` untuk kedua layar.
- `src/screens/checkout/CheckoutContext.tsx` — **seluruh state + logika order lama
  dipindahkan apa adanya**: perhitungan `setelahPromo`/`finalTotal`, `poinValue`
  (1 poin = Rp 1, dibatasi saldo & tagihan), `activeSplits`, `validasiSplitPembayaran`,
  `buildCatatanWithSplit`, fallback order tanpa poin saat backend menolak poin
  ("data truncated"), dan `router.replace("/checkout/success", …)`.
- `app/checkout/index.tsx` — `<Redirect href="/checkout/summary" />` agar tautan
  lama (`/checkout`) tetap bekerja.

### 2a. Ringkasan Pesanan — `app/checkout/summary.tsx`

- `AddressCard` varian `lengkap`: nama (`Body` semibold), alamat multi-baris,
  telepon (`Small` neutral-500) — sesuai §3.13.
- Item read-only (`CartItemRow readOnly`): `jumlah× harga` + subtotal, tanpa stepper.
- `PriceSummary` dengan Sub-total, Ongkir, Diskon promo, Poin (bila ada).
- Sticky bar "Buat Pesanan" (150) → lanjut ke `/checkout/payment`.
- State: skeleton saat memuat, `ErrorState` + "Coba Lagi" saat gagal.

### 2b. Pembayaran — `app/checkout/payment.tsx`

- **Banner total** (§3.14): tinggi 44 `rounded-md` bg success-100, label `Body`
  medium + nilai `Section` bold keduanya success-700.
- **Accordion metode**: `Accordion` W1 (baris 52, border-bottom neutral-200, satu
  terbuka, chevron berputar 200 ms). Kunci awal = metode `tunai` (COD), sesuai
  "Cash on delivery terbuka secara default"; bila tidak ada, metode pertama.
  Isi yang terbuka: jenis + biaya admin (`Small` neutral-500), instruksi dari
  `buildPaymentInstruction()` (termasuk nomor rekening & atas nama yang memang
  sudah didukung backend), dan tombol "Pilih metode pembayaran" (outline/primary).
- **Split payment** (§3.14 + pola lama): `Toggle` "Pembayaran Campuran"
  (min 2 metode), tiap baris = chip metode + input nominal (`number-pad`) +
  tombol "Sisa" (isi otomatis), tombol hapus per baris (muncul bila >2), tombol
  "Tambah Metode" (maks 4), ringkasan "Sudah dialokasikan" / "Kurang" /
  "Kembalian", dan pesan `paymentError` / `splitBelumLengkap` danger-700.
  Validasi, batas 4 metode, dan aturan kembalian-hanya-dari-tunai tetap dari
  `utils/payment.ts`.
- **Poin**: `Toggle` "Gunakan Poin" + input poin + tombol "Maks"; keterangan
  konversi (1 poin = Rp 1), saldo, nilai rupiah yang dipakai (`15.000 poin = -Rp 15.000`),
  dan pesan "Tagihan sudah 0 setelah promo".
- `PriceSummary` akhir + sticky bar "Buat Pesanan" dengan status disabled mengikuti
  `canProceedPayment`/`paymentError` yang sama seperti dulu.
- Promo tetap tersedia lewat state yang sama (`promoDiscount` ikut di ringkasan).

### 2c. Pesanan Berhasil — `app/checkout/success.tsx` (layar baru)

- Ikon `check` 40 di lingkaran 80 bg success-100 (success-700).
- Nomor pesanan, total bayar, poin terpakai — angka diambil dari **respons server**
  (`total_bayar`, `poin_digunakan`) bila detail order termuat, param URL hanya cadangan.
- Hitung mundur batas bayar (`useOrderExpiry`) di kotak warning-50/warning-500,
  berubah danger saat kedaluwarsa.
- Instruksi pembayaran + nomor rekening.
- Aksi: link teks "Kembali ke Beranda" (primary-700) + **satu** CTA primary
  "Lacak Pesanan" (160) → `/orders/[id]`.

## 3. Barang Disimpan — `app/wishlist/index.tsx`

- `ProductCardHorizontal` (§3.9): thumbnail 72×80 `rounded-md`, judul `Body` medium
  maks 2 baris, baris rating (bintang warning-500 + angka + jumlah ulasan), harga
  `Section` bold + harga coret neutral-400 + `Badge` diskon, heart terisi
  danger-500 (target 44).
- Empty state `heart` + "Belum Ada Barang Disimpan!" + deskripsi guideline (§5).
- Loading skeleton, `ErrorState` + coba lagi, pull-to-refresh.
- Logika wishlist tidak berubah: `getWishlist`, `removeFromWishlist`, dan
  tambah-ke-keranjang lewat varian pertama (agar id baris keranjang konsisten).

## 4. Notifikasi — `app/notifications/index.tsx`

- `NotificationItem` (§3.15): ikon 20 di lingkaran 36 dengan tint per tipe
  (`order`/`payment` → primary-100/primary-600, `shipping` → success-100/success-700,
  `promo` → peach-100/warning-700, `system`/`general` → neutral), judul `Body`
  semibold (lebih tebal saat unread), isi `Small` maks 2 baris, waktu `Caption`
  relative ("6 mnt lalu") via `waktuRelatif()`, dot unread 6 pt danger-500.
- AppBar ellipsis → menu **"Tandai semua dibaca"**, lalu dialog konfirmasi.
  Keduanya **satu** `Dialog` bertahap: di react-native-web dua `Modal` yang tampil
  bersamaan saling menutupi sehingga dialog pertama tidak pernah tertutup.
- Chip filter "Semua (n)" / "Belum dibaca (n)" (role `tab`, target 44).
- Empty state `bell-off` + "Belum Ada Notifikasi!" (atau "Tidak Ada Notifikasi Baru"
  pada filter belum dibaca).
- Normalisasi field backend (`dibaca`→`is_read`, `jenis_notifikasi`→`tipe`,
  `isi_notifikasi`→`pesan`) dan navigasi per tipe dipertahankan.

## 5. Komponen & util baru

| Berkas | Isi |
| --- | --- |
| `src/components/commerce/CartItemRow.tsx` | Baris item keranjang / read-only (§3.11) |
| `src/components/commerce/PriceSummary.tsx` | Kartu ringkasan harga (§3.12) |
| `src/components/commerce/AddressCard.tsx` | Kartu alamat ringkas & lengkap (§3.13) |
| `src/components/commerce/BannerTotal.tsx` | `BannerTotal` + `BarisMetode` (§3.14) |
| `src/components/commerce/StickyBar.tsx` | `StickyBar` + `StickyTotal` (§3.12) |
| `src/components/commerce/NotificationItem.tsx` | Item notifikasi + tint per tipe (§3.15) |
| `src/components/commerce/ProductCard.tsx` | + `ProductCardHorizontal` (§3.9) |
| `src/components/ui/Toggle.tsx` | Sakelar 48×28 untuk split payment & poin |
| `src/screens/checkout/CheckoutContext.tsx` | State + logika checkout (dipindah apa adanya) |
| `src/lib/i18n.ts` | + `checkout.*` (split, poin, promo), `keranjang.*`, `sukses.*`, `notifikasi.*`, `izinNotifikasi.*` |

## 6. Verifikasi

- `npx tsc --noEmit` → **0 error**.
- `npx expo lint` → **0 error**, 11 warning (semuanya `react-hooks/set-state-in-effect`
  pada hook pemuat data; pola yang sama sudah ada di W2/W3 — baseline W3: 18 warning).
- Web mode (`npx expo start --web`, mock API lokal `.tmp-w4/mock.js`):
  - **Keranjang**: alamat default tampil satu baris dengan link "Ganti", 2 item
    dengan thumbnail 72×80 radius 8, stepper 28×28, trash target 44, kartu ringkasan
    `rgb(240,249,255)` border `rgb(224,242,254)` radius 12 padding 16, sticky bar CTA
    140×48. Menekan − pada qty 1 memunculkan dialog "Hapus Produk?" dan menghapus
    baris → empty state "Keranjang Anda kosong".
  - **Ringkasan**: alamat tinggi (nama, alamat multi-baris, telepon), item read-only,
    ringkasan harga, CTA "Buat Pesanan" 150.
  - **Pembayaran**: banner total success-100 h 44; COD terbuka default; split
    diaktifkan → 2 baris metode dengan nominal (100.000 + 59.000 = 159.000 setelah
    poin), "Kembalian Rp 0"; poin 15.000 → total Rp 159.000.
  - **Pesanan berhasil**: nomor `INV-W4-900`, total `Rp 107.000` (dari respons server),
    poin 15.000, hitung mundur, instruksi COD, tombol "Lacak Pesanan".
  - **Barang Disimpan**: 2 kartu horizontal, harga + coret + `-69%`, heart 44×44,
    thumbnail 72×80 radius 8.
  - **Notifikasi**: 3 item dengan lingkaran 36 (`rgb(224,242,254)`, `rgb(220,252,231)`,
    `rgb(255,237,213)`), 2 dot unread, waktu "6 mnt lalu"; menu → konfirmasi →
    "Ya" menandai semua (Belum dibaca 2 → 0).
- **Payload order dibandingkan** (mock mencatat request; strukturnya sama persis
  dengan kode lama):

```json
{
  "items": [
    { "produk_id": 4501, "varian_id": 9001, "jumlah": 1 },
    { "produk_id": 4502, "varian_id": 9002, "jumlah": 2 }
  ],
  "metode_pembayaran_id": 11,
  "alamat_pengiriman": "Jl. Merdeka No. 12, RT 03 / RW 04, Bandung, Jawa Barat, 40111",
  "catatan": "[Split: Cash on Delivery Rp 100.000; Transfer BCA Rp 59.000]",
  "poin_digunakan": 15000
}
```

  Kunci, urutan, dan tipe nilainya tidak berubah (`varian_id` hilang bila item tanpa
  varian, `promo_code`/`catatan` hanya dikirim bila terisi — sama seperti sebelumnya).

## 7. Catatan / utang teknis

- **Dua `Modal` bertumpuk di react-native-web** menutupi satu sama lain; semua
  alur dua dialog digabung jadi satu `Dialog` bertahap (notifikasi). Bila nanti
  butuh dialog di atas dialog, `Dialog` W1 perlu dukungan tumpukan.
- Setelah ditutup, node `Modal` di web masih ada di DOM dengan
  `pointer-events: none` (tidak menghalangi klik) — perilaku `Dialog` W1, bukan
  atau perubahan di W4.
- Ongkos kirim belum dihitung backend pada tahap checkout; ringkasan menampilkan
  baris "Ongkos kirim — Gratis" agar struktur §3.12 lengkap. Angka final tetap
  dari server (`total_bayar`).
- `shadow-bar` dipasang lewat `shadowStyle("bar")` (fallback §8.1) agar shadow
  pasti muncul di web/Android.
