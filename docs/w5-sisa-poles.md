# W5 — Sisa Layar + Poles (Design System "Zovora")

Status: **selesai**. Fase ini memigrasikan seluruh layar yang masih memakai UI lama
(Navbar biru + Ionicons + `Alert`) ke Zovora, lalu melakukan pass poles menyeluruh
atas semua layar W2–W5.

Sumber kebenaran: `docs/PATTERN DESIGN.txt` (tidak diubah) + `docs/ui-refactor-plan.md`.
Fondasi: `docs/w1-fondasi.md`, `docs/w2-layout-auth.md`, `docs/w3-commerce-a.md`,
`docs/w4-commerce-b.md`.

## Batasan yang dipatuhi

- `services/`, `contexts/CartContext`, `utils/payment.ts`, `utils/orderExpiry.ts`,
  `utils/printReceipt.ts` **tidak diubah**. Refactor murni tampilan.
- Payload ke backend identik dengan versi lama (dibuktikan di §7):
  `addCustomerAddress`, `updateCustomerAddress`, `updateCustomerProfile`,
  `cancelOrder`, dan reorder (via `addItem`).
- `decisions` baru dicatat di §8.

## 1. Pesanan — `app/orders/index.tsx` + `app/orders/[id].tsx`

| Bagian | Guideline | Implementasi |
| --- | --- | --- |
| Filter status | §3.8 | Chip `Semua / Menunggu / Selesai / Dibatalkan / Retur`, role `tab`, `accessibilityState.selected`, tinggi 44. |
| Kartu pesanan | §3.9 | `OrderCard`: nomor (`Body` semibold) + tanggal (`Small` neutral-500), `StatusBadge` (ikon + tint, bukan warna saja), countdown `warning-50`, pratinjau 2 item + "+N item lainnya", total `Section` bold `tabular-nums`, chevron kanan. Target sentuh seluruh kartu ≥ 44. |
| Badge status | §3.19 | `StatusBadge` baru: pill `rounded-full`, ikon 12 + teks 12 semibold. Nada: menunggu `warning-100/700`, proses `primary-100/800`, selesai `success-100/700`, batal `danger-100/700`, netral `neutral-100/700` — semuanya ≥ 4,5:1. |
| Detail: status | §5 | Kartu status: lingkaran 44 bertint + badge + tanggal + nomor transaksi, panel countdown (`warning-50`) atau kedaluwarsa (`danger-50`). |
| Detail: timeline | §5 (turunan) | `OrderTimeline` 3 tahap (dibuat → diproses → selesai): titik 24 `primary-600` dengan centang untuk tahap tercapai, garis penghubung 2 pt, deskripsi `Small`. Status batal/retur menyembunyikan timeline dan menampilkan panel sendiri. |
| Detail: instruksi | §3.14 | Kartu instruksi dari `buildPaymentInstruction()` (sumber sama dengan checkout) + nomor rekening & atas nama `selectable`. Hanya tampil saat `pending`. |
| Detail: item | §3.11 | Baris 56 thumbnail `rounded-md` bg neutral-50, nama maks 2 baris, varian, `jumlah × harga` + subtotal `tabular-nums`. |
| Detail: ringkasan | §3.12 | `PriceSummary` (primary-50 / border primary-100): Subtotal − Diskon → Total. |
| Aksi | §3.1 | Satu CTA primary "Cetak Struk", outline "Kembali ke Riwayat", outline danger "Batalkan Pesanan" (hanya `pending`/`confirmed`). |
| Beli Lagi | §5 | Tombol outline `lg` di kartu status final; hasil (berhasil/gagal + produk dilewati) lewat `Dialog`, bukan `Alert`. |
| Batalkan | §5 | `Dialog` konfirmasi → `Dialog` hasil. |
| Struk | §5 | `printOrderReceipt` dipertahankan; hasil `browser`/`no-app`/error ditampilkan lewat `Dialog` (termasuk tombol "Buka Play Store"). |
| State | §5 | Skeleton kartu saat memuat; `ErrorState` + "Coba Lagi"; empty `Receipt` "Belum Ada Pesanan" + CTA. |

Logika reorder **tidak berubah**: produk diambil ulang lewat `getProduct`, stok dibaca
dari varian bila ada, dan `varian` tetap dikirim ke `addItem` supaya id baris keranjang
konsisten. Polling 20 dtk saat status `pending` juga dipertahankan.

## 2. Alamat — `app/addresses/{index,add,edit/[id]}.tsx`

- **Daftar**: kartu `rounded-lg` border neutral-200 — label + badge "Alamat Utama"
  (`success-100` + ikon bintang), nama penerima, telepon, alamat satu baris
  (`alamat · kota, provinsi · kode pos`). Aksi baris "Jadikan Utama" / "Ubah" / "Hapus"
  sebagai teks primary-700 / danger-700 bertinggi 44. Tombol pensil di kanan atas
  target 44. Satu CTA primary "Tambah Alamat Baru" di `StickyBar`.
- **Form** (dipakai tambah & ubah): `src/components/akun/FormAlamat.tsx` — 7 field
  `Input` W1 (tinggi 48, label 14 medium, error `danger-700` di bawah field) +
  `Toggle` "Jadikan Alamat Utama" (role `switch`). Validasi identik dengan versi lama
  (telepon `[\d+\-\s()]{8,}`, kode pos 5 digit) dan dipindah ke `validasiAlamat()`.
- **Hapus**: `Dialog` konfirmasi; alamat utama tidak bisa dihapus (pesan `danger-700`
  lewat dialog).
- **State**: skeleton baris form, `ErrorState` + "Coba Lagi", `EmptyState` `MapPin`
  "Belum Ada Alamat" + CTA.
- Perbaikan: setelah simpan sukses form memakai `router.replace("/addresses")`
  (bukan `router.back()`), supaya tetap benar walau layar dibuka langsung lewat URL.
- Fitur debug "Buat Test Alamat" (tombol oranye + `console.log`) **dihapus**.

## 3. Akun — `screens/ProfileScreen.tsx` + `app/profile/edit.tsx`

- **Akun**: kartu identitas — avatar bulat 56 `primary-100` berisi inisial (fallback
  ikon `User`), nama `Title`, email `Small` neutral-500, chip poin `primary-100`
  (ikon `Gift` + `text-primary-800`) dan "Anggota sejak 1 Jan 2025". Tautan
  "Ubah Profil" primary-700 target 44.
- **Menu**: 8 baris (Pesanan, Poin, Disimpan, Alamat, Metode Pembayaran, Order Masuk
  Kasir, Pengaturan Akun, Bantuan) — ikon 20 dalam lingkaran 36 `primary-100`,
  deskripsi `Small` neutral-500, chevron kanan, tinggi 56. Baris "Keluar" terpisah
  bernada danger (`danger-50` / `danger-700`).
- Semua `Alert` diganti `Dialog`: konfirmasi keluar, hasil keluar, dan Bantuan.
- **Ubah Profil**: dua bagian (Informasi Pribadi, Ubah Password) dengan `Input` W1;
  password opsional (hanya dikirim bila diisi) dan divalidasi minimal 8 karakter +
  harus sama dengan konfirmasi. Satu CTA primary di `StickyBar`.
- **State**: skeleton, `ErrorState` + "Coba Lagi" (menu tetap bisa dipakai karena galat
  dirender inline, bukan mengganti seluruh layar).

## 4. Metode Pembayaran — `screens/PaymentMethodsScreen.tsx`

Layar ini sekarang **informatif** (bukan pemilih metode — pemilihan terjadi di
checkout, sehingga tidak ada lagi tombol "Konfirmasi Pembayaran" yang tidak bereaksi).
Tiap metode = kartu berisi ikon 20 per jenis (`Banknote`/`Landmark`/`Smartphone`/
`CreditCard`), nama `Body` semibold, jenis + biaya admin/persentase (`Small`
neutral-500), blok rekening (nomor `selectable` + atas nama) untuk transfer, dan daftar
instruksi dari `buildPaymentInstruction()`. Empty state "Belum Ada Metode Pembayaran",
skeleton, `ErrorState`, pull-to-refresh.

## 5. Riwayat Poin — `app/points/index.tsx`

- Kartu saldo `bg-primary-700` (bukan primary-600 — lihat §6) dengan "Saldo Poin"
  10 pt, angka `text-4xl` bold `tabular-nums`, "Setara Rp 15.000 · 1 poin = Rp 1",
  dan dua kolom total didapat/dipakai.
- Keterangan konversi + pengembalian poin saat pesanan dibatalkan.
- Daftar mutasi: ikon 36 bertint per jenis (`dapat` success, `pakai` warning,
  `kadaluarsa` danger, `koreksi`/`refund` primary), label, keterangan maks 2 baris,
  waktu relatif + nomor transaksi, saldo akhir, jumlah `+1.270` / `−15.000`
  `tabular-nums`. Konversi epoch-detik → ms dipertahankan (`keMs`).
- Empty `Gift` "Belum Ada Riwayat Poin", skeleton, `ErrorState`, pull-to-refresh.

## 6. Kategori — `screens/CategoryScreen.tsx` (+ `app/(tabs)/products.tsx`)

- Rail avatar kategori 56 (dapat digeser) + chip "Semua"; memilih kategori memuat
  ulang produk **tanpa** spinner layar penuh (skeleton grid).
- Header kategori aktif + jumlah produk `tabular-nums`.
- Grid 2 kolom gap 12 memakai `ProductCardGrid` (gambar 3:4, badge diskon, harga
  bold + coret, rating).
- Empty "Belum Ada Produk" + CTA "Lihat Semua", `ErrorState` untuk kegagalan produk,
  pull-to-refresh. Endpoint & parameter (`kategori_id`, `per_page`) tidak berubah.

## 7. Kasir — `app/kasir/orders.tsx` (ikut termigrasi)

Satu-satunya layar yang masih memakai `components/Navbar` lama. Sekarang memakai
`AppBar` + `Input` + `Button` + `EmptyState` + `Skeleton` Zovora, dengan copy di
`teks.kasir`. Logika sesi staf (`loginStaff`, `loginStaffSession`,
`verifyOnlineOrder`, `rejectOnlineOrder`, `clearStaffSession`) **tidak berubah**;
verifikasi/tolak tetap inline (bukan `Alert`) seperti sebelumnya.

## 8. Poles menyeluruh

### (a) i18n
- Kunci baru: `pesanan.*` (riwayat/detail/timeline/struk/reorder), `alamat.*`
  (form + validasi), `profil.*` (menu, ubah, keluar), `metodeBayar.*`, `poin.*`,
  `kategori.*`, `kasir.*`, `simpanan.*`, `pencarian.urut.*`, `produk.diskonPersen`,
  `checkout.biayaAdmin`, dan `status.*` lengkap (menunggu/dikonfirmasi/retur/kedaluwarsa).
- Sisa literal yang dipindah: opsi urutan pencarian, label diskon a11y, dialog
  simpanan, format biaya admin checkout, semua copy kasir.
- `src/lib/pesanan.ts` memusatkan pemetaan status → label/nada/ikon + `TAHAP_TIMELINE`
  sehingga tidak ada label status yang ditulis ulang di layar.

### (b) Harga & angka
- Semua harga memakai `rupiah()`; angka poin memakai `angka()`. Sisa
  `toLocaleString("id-ID")` ad hoc di checkout (payment & success) diganti `angka()`
  agar konsisten. Semua nilai uang/jumlah diberi `tabular-nums`.

### (c) Aksesibilitas
- Audit otomatis di web: **semua** elemen `role=button|tab|switch|link|search` di
  `/orders`, `/orders/[id]`, `/addresses`, `/profile`, `/points`, `/payment-methods`,
  `/products` berukuran ≥ 44 pt (0 pelanggaran).
- `Button` varian `md` (40) dan `sm` (32) sekarang otomatis diberi `hitSlop`
  4/8 pt sehingga target sentuh ≥ 44 tanpa mengubah tinggi visual.
- Setiap tombol ikon punya `accessibilityLabel` (mis. "Hapus Rumah", "Ubah Kantor",
  "Jadikan Utama Kantor", "Hapus dari wishlist"); status aktif memakai
  `accessibilityState` (selected/expanded/checked), bukan warna saja.

### (d) Kontras
- Audit otomatis (WCAG relative luminance) atas semua teks kecil (< 18 pt, atau
  < 14 pt bold) di 12 layar. Dua pelanggaran ditemukan dan diperbaiki:
  1. kartu saldo poin: teks 10–14 pt putih di atas `primary-600` hanya **4,1:1** →
     latar diganti `primary-700` (**5,9:1**);
  2. placeholder search bar beranda memakai `neutral-400` (**2,6:1**) → naik ke
     `neutral-500` (**4,8:1**), ikon ikut `neutral-500`.
- Tidak ada lagi `text-danger-500` untuk teks (semua pesan error `danger-700`,
  border tetap `danger-500`), dan tidak ada teks kecil memakai
  `primary-500`/`primary-400`.

### (e) Satu CTA primary per layar
Dipertahankan: pesanan (Cetak Struk), alamat (Tambah Alamat Baru), ubah alamat
(Simpan Perubahan), akun (tidak ada — hanya baris menu), ubah profil (Simpan
Perubahan), metode pembayaran (tidak ada — informatif), poin (tidak ada — informatif),
kategori (tidak ada — kartu produk yang menjadi target), kasir (Verifikasi / Masuk).
Tombol sekunder selalu outline/social/teks.

### (f) Font scale 130%
Diuji di web dengan menaikkan `fontSize` setiap node teks ×1,3 pada `/orders`,
`/orders/[id]`, `/addresses`, `/points`, `/profile`: **0 node meluap**
(`scrollWidth > clientWidth`). Semua teks baru memakai `maxFontSizeMultiplier={1.3}`.

### (g) Reduce Motion
Diuji dengan `Emulation.setEmulatedMedia` (`prefers-reduced-motion: reduce`):
`scrollLeft` carousel beranda tetap `0` selama 6 dtk (auto-play mati) dengan banner
nyata; pada `no-preference` carousel bergeser. Skeleton juga berhenti berdenyut
(`useReduceMotion` di `Skeleton`).

## 9. Verifikasi

- `npx tsc --noEmit` → **0 error**.
- `npx expo lint` → **0 error**, 3 warning `react-hooks/set-state-in-effect`
  (baseline W4: 11; tiga sisanya berada di hook/layar W3–W4 yang tidak disentuh:
  `CheckoutContext`, `useUlasanProduk`, `notifications`).
- Web mode (`npx expo start --web --port 8095`, mock `.tmp-w5/mock.js` di 18890):

| Alur | Hasil |
| --- | --- |
| Riwayat pesanan | 3 kartu: `INV-W5-501` (Menunggu Verifikasi Kasir + countdown `00:28:35`, 2 item, `Rp 188.000`), `INV-W5-502` (Selesai + Beli Lagi), `INV-W5-503` (Dibatalkan + Beli Lagi). Chip filter "Selesai" menyaring jadi 1 kartu. |
| Detail pesanan | Badge status, tanggal `23 Okt 2026, 03.52`, nomor transaksi, countdown + `s.d. …`, timeline 3 tahap, instruksi transfer + rekening `1234567890` a.n. Toko Zovora, 2 item, alamat, metode + rincian split, ringkasan `Rp 193.000 − Rp 5.000 = Rp 188.000`. |
| Batalkan | "Batalkan Pesanan" → dialog "Batalkan Pesanan?" → "Ya, Batalkan" → status jadi "Dibatalkan / Ditolak", panel pembatalan muncul, dialog "Pesanan telah dibatalkan." Tombol batal hilang. |
| Beli Lagi | Dialog "Ditambahkan ke Keranjang — 2 produk dimasukkan ke keranjang." dengan aksi "Lanjut Belanja" / "Ke Keranjang". |
| Alamat | Daftar 2 alamat (badge "Alamat Utama" pada Rumah). Tambah "Gudang" → dialog "Alamat berhasil ditambahkan." → daftar jadi 3. "Jadikan Utama" pada Gudang → badge pindah, dialog konfirmasi. Hapus "Rumah" → dialog "Hapus Alamat? Alamat “Rumah” akan dihapus permanen." → daftar jadi 2. |
| Ubah profil | Password beda → field "Konfirmasi password tidak sama" (`danger-700`) + dialog peringatan; password sama → "Profil berhasil diperbarui." Log mencatat payload `{nama_pelanggan, email, telepon, alamat, password}` (password hanya saat diisi). |
| Metode pembayaran | 3 kartu: COD (Tanpa biaya admin), Transfer BCA (Biaya admin Rp 2.500 + rekening + 2 instruksi), QRIS (Biaya 0,7% + 2 instruksi). |
| Riwayat poin | Saldo `15.000`, "Setara Rp 15.000 · 1 poin = Rp 1", +21.270 / −15.500, 4 mutasi dengan waktu relatif ("3 hari lalu · INV-W5-502") dan saldo akhir. |
| Kategori | 4 produk di "Semua"; pilih "Elektronik" → "2 produk" (Blender, Kipas Angin) tanpa spinner penuh. |
| Regresi | Keranjang (empty state), Ringkasan, Pembayaran, Notifikasi (3 item, 2 belum dibaca), Simpanan (2 kartu + dialog hapus) tetap normal. |

## 10. Komponen & util baru

| Berkas | Isi |
| --- | --- |
| `src/lib/pesanan.ts` | Peta status → label/nada/ikon, kelas badge, `statusFinal`, `bisaDibatalkan`, `indeksTimeline`, `TAHAP_TIMELINE` |
| `src/components/commerce/OrderCard.tsx` | Kartu riwayat pesanan + tombol Beli Lagi |
| `src/components/commerce/OrderTimeline.tsx` | Timeline 3 tahap |
| `src/components/commerce/StatusBadge.tsx` | Pill status dengan ikon + tint |
| `src/components/akun/FormAlamat.tsx` | Form alamat bersama + `validasiAlamat()` |
| `screens/CategoryScreen.tsx` | Layar kategori (menggantikan `screens/ProductsScreen.tsx`) |

## 11. Catatan / utang teknis

- `screens/ProductsScreen.tsx` dihapus; route `app/(tabs)/products.tsx` sekarang
  menunjuk `screens/CategoryScreen.tsx`. Parameter `?categoryId=` tetap didukung.
- `components/Navbar.tsx`, `components/PaymentMethodCard.tsx`, `components/Button.tsx`
  (lama) sudah **tidak dipakai** layar mana pun. Belum dihapus agar tidak memecah
  riwayat; kandidat pembersihan W6.
- `Dialog` masih belum mendukung tumpukan >1; layar W5 memakai satu `Dialog` per
  keadaan (konfirmasi lalu hasil) — bukan dua dialog bersamaan.
- Metode pembayaran kini murni informatif. Bila nanti dibutuhkan pemilihan metode di
  luar checkout, tambahkan `Chip`/radio dan simpan pilihan di state lokal.
