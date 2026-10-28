# Perbaikan APK 2026-10-28b — qty manual & dialog stuck

Tanggal: 28 Oktober 2026
Repo: `pos-fe` (Expo SDK 57, RN 0.86, New Architecture aktif), basis `07a03fb`
Lingkup: seluruh `pos-fe` (layar pelanggan). Backend `pos-be` tidak disentuh.

---

## 1. Ringkasan

Dua keluhan dari uji APK 2026-10-28a diperbaiki, keduanya dengan akar masalah
yang ditemukan lewat pembacaan kode + pengukuran DOM, bukan tebakan:

| # | Keluhan | Akar masalah | Status |
|---|---|---|---|
| 1 | Qty tidak bisa diketik manual di app Android (padahal web bisa) | Angka qty adalah `<Text>`, bukan input — tidak ada jalur ketik sama sekali | Diperbaiki, berlaku di keranjang **dan** detail produk |
| 2 | Dialog tidak muncul sampai BACK ditekan lalu dipicu ulang | Dua cacat sistemik: (a) tidak ada penjaga "satu jendela modal", (b) tutup-dialog-A + buka-dialog-B terjadi pada commit yang sama; ditambah (c) konfirmasi hapus keranjang dua lapis | Diperbaiki terpusat di `Dialog` + `Stepper` |

Gate: `tsc --noEmit` **0 error**, `node --test` **140/140 lulus**, `expo lint`
**0 error** (5 warning, semuanya sudah ada sebelum perubahan ini), verifikasi DOM
nyata pada ekspor web (`expo export -p web`) memakai Chromium headless.

---

## 2. Akar masalah #2 — dialog stuck (dengan bukti)

### 2.1 Mekanisme di Android

Di Android, satu `<Modal>` React Native **bukan** sekadar lapisan CSS: ia adalah
jendela `Dialog` Android tersendiri. Dari `node_modules/react-native/.../views/modal/ReactModalHostView.kt`:

```
newDialog = ComponentDialog(currentActivity ?: context, theme)   // jendela baru
newDialog.setContentView(contentView)
if (currentActivity?.isFinishing == false) { newDialog.show() }   // tampil
```

Konsekuensinya, dua hal yang tampak "wajar" di React menjadi berbahaya:

1. **Dua `<Modal>` hidup bersamaan** → dua jendela `Dialog` di `WindowManager`.
2. **Satu jendela dibuang sementara jendela baru dibuat pada commit yang sama**
   (`setPesan(...)` + `setDialog(null)` dalam satu handler) → `show()` bisa
   dieksekusi sebelum `dismiss()` jendela lama selesai diproses, sehingga
   jendela baru tidak tampil / tampil di belakang. Inilah gejalanya: dialog
   "tidak muncul", BACK menutup jendela hantu, pemicu berikutnya berhasil.

### 2.2 Bukti bahwa aplikasi ini memicu pola tersebut

Inventarisasi `<Dialog>` sebelum perbaikan (12 pemakaian di 10 berkas):

- `app/addresses/index.tsx` — **2 Dialog bersaudara** (hapus + pesan)
- `app/wishlist/index.tsx` — **2 Dialog bersaudara** (hapus + pesan)
- `app/orders/[id].tsx` — **3 Dialog bersaudara** (batal + pesan aksi)
- `app/(tabs)/cart.tsx` + `src/components/ui/Stepper.tsx` — dialog keranjang
  **dan** dialog di dalam setiap baris (`Stepper`), bisa hidup bersamaan

Jalur "tutup A, buka B pada commit yang sama" ada di tiga tempat:

- `app/addresses/index.tsx:136-141` — `setHapusTarget(null)` lalu `setPesan({...})`
- `app/wishlist/index.tsx:139-140` — `setDialog(null)` lalu `setPesan({...})`
- `app/orders/[id].tsx:166-170` — `setDialogBatal(null)` lalu `setPesanAksi({...})`

### 2.3 Cacat ketiga: konfirmasi hapus keranjang dua lapis

`CartItemRow` meneruskan `onHapus` ke `Stepper` dengan `confirmRemove` default
`true`, sementara `onHapus` itu sendiri membuka `Dialog` milik layar. Akibatnya
menekan − pada qty 1 memunculkan dialog `Stepper`, lalu setelah "Hapus" ditekan
muncul **lagi** dialog layar — dua konfirmasi untuk satu tindakan, dan dua
jendela bertukar pada satu alur. Ini kemungkinan besar yang dikeluhkan sebagai
"dialog hapus item keranjang stuck".

### 2.4 Bukti DOM: jumlah overlay yang hidup bersamaan

Diukur pada ekspor web commit `07a03fb` (sebelum) dan WORKING TREE (sesudah),
skenario "hapus item wishlist gagal (server 500) → kode menutup dialog A dan
membuka dialog B". Metrik: puncak jumlah elemen `[aria-modal="true"]` dan
riwayat perubahannya sepanjang alur.

| Build | Riwayat jumlah overlay | Arti |
|---|---|---|
| Sebelum | `[1]` | jendela lama tidak pernah benar-benar dilepas sebelum yang baru dibuat — satu commit |
| Sesudah | `[1, 0, 1]` | jendela lama dilepas (0), baru dibuat pada commit berikutnya |

Dan untuk konfirmasi ganda hapus keranjang (qty 1 → tombol −):

| Build | Konfirmasi kedua diperlukan? | Teks setelah konfirmasi pertama |
|---|---|---|
| Sebelum | **Ya** | dialog "Hapus Produk?" masih tampil |
| Sesudah | **Tidak** | overlay kosong, item langsung terhapus |

---

## 3. Perubahan

### 3.1 `src/lib/dialogAntrean.ts` (baru)

Antrean modal sebagai modul murni (bebas React Native, bisa diuji `node --test`).

Aturan yang dikunci:

1. Hanya **satu** id yang boleh merender `<Modal>` pada satu waktu (`boleh(id)`).
2. Id yang meminta saat slot terisi masuk antrean **FIFO** dan merender `null`.
3. Slot yang baru dilepas **tidak boleh langsung dipakai pada task yang sama**;
   promosi dijadwalkan satu tick kemudian (`setTimeout(fn, 0)`). Inilah yang
   memisahkan "buang jendela lama" dan "buat jendela baru" ke dua commit.
4. `lepas` idempoten; id yang batal sebelum giliran dibuang dari antrean tanpa
   mengunci slot.

### 3.2 `src/components/ui/Dialog.tsx`

Semua dialog di aplikasi lewat komponen ini, jadi perbaikannya otomatis
berlaku untuk seluruh dialog (lihat §4). Perubahan:

- `visible` (niat tampil) dipisah dari `memegangSlot` (jendela native tersedia).
  Instance mendaftar ke `antreanModal` lewat `useId()`; merender `<Modal>` hanya
  bila `visible && memegangSlot`.
- `useReduceMotion()` dipakai sebagai default `reduceMotion` (sebelumnya
  parameter `reduceMotion` tidak pernah diisi pemanggil, sehingga setelan
  "Kurangi gerakan" perangkat tidak berpengaruh pada dialog).
- Perilaku lain dipertahankan: overlay neutral-900 50%, kartu radius 16,
  fade + scale 0,95→1 (200 ms), `accessibilityViewIsModal`, dismiss backdrop,
  `onRequestClose` untuk tombol BACK, dan unmount total saat tertutup
  (perbaikan `ae9a522` tetap berlaku).

### 3.3 `src/lib/jumlahManual.ts` (baru) + `src/components/ui/Stepper.tsx`

Angka qty di tengah stepper diubah dari `<Text>` menjadi `<TextInput>`
(`keyboardType="number-pad"`, `inputMode="numeric"`, `maxLength=4`,
`selectTextOnFocus`) sehingga qty bisa diketik langsung. Karena keranjang dan
detail produk sama-sama memakai `Stepper`, perbaikan berlaku di keduanya
sekaligus.

Aturan validasi (diuji satu per satu):

| Kasus | Perilaku |
|---|---|
| `"12 pcs"`, `"-3"`, `"1.5"` (paste/IME) | disaring jadi digit saja |
| isi kosong | **ditahan** — qty tidak dipaksa jadi 1 saat pengguna menghapus |
| `"0"` / `"`000`"` | ditolak, di-clamp ke minimum 1 + pesan "Minimal 1 item." |
| `"007"` | dibaca 7 |
| di atas stok (mis. 99, stok 15) | di-clamp ke 15 + pesan "Maksimal 15 item sesuai stok." |
| stok tidak diketahui (`max` 0/undefined) | tidak dibatasi |
| selesai mengetik dengan isi kosong | kembali ke nilai terakhir yang sah |

Nilai sah diteruskan langsung lewat `onChange` pada **setiap ketikan**, sehingga
`CartContext.updateItemQuantity` menghitung ulang harga lewat `hargaEfektif()`
dan subtotal ikut berubah saat angka diketik (bukan hanya saat blur).

### 3.4 `src/components/commerce/CartItemRow.tsx`

`confirmRemove={false}` pada `Stepper` di baris keranjang — konfirmasi hapus
memakai satu `Dialog` milik layar (jalur yang sama dengan tombol trash).
Konsekuensinya tombol − pada qty 1 tetap aktif (dihitung dari `onRemove`, bukan
dari `confirmRemove`), tetapi tidak memunculkan dialog kedua.

### 3.5 `src/lib/i18n.ts`

Tiga kunci baru di `teks.keranjang`: `qtyMelebihiStok`, `qtyMinimal`,
`qtyKetikHint` (pesan validasi & hint aksesibilitas, Bahasa Indonesia).

---

## 4. Daftar dialog terdampak (sebelum → sesudah)

Perbaikan dilakukan di komponen `Dialog`, jadi **semua** dialog di aplikasi
mendapat penjaga antrean. Kolom "Risiko sebelum" menunjukkan apakah dialog itu
sebelumnya berada pada pola yang memicu bug.

| # | Layar | Dialog | Pola berisiko sebelum | Sesudah |
|---|---|---|---|---|
| 1 | Keranjang | Hapus item (tombol trash) | ya — bersaudara dengan dialog `Stepper` di tiap baris + konfirmasi dua lapis | aman (antrean + satu konfirmasi) |
| 2 | Keranjang (`Stepper`) | Hapus item saat qty 1 | ya — dialog di dalam baris, satu per item | tidak lagi dipakai di keranjang (`confirmRemove={false}`); tetap tersedia untuk pemakaian lain |
| 3 | Alamat | Konfirmasi hapus alamat | ya — tutup A + buka B pada commit sama (baris 136–141) | aman |
| 4 | Alamat | Pesan hasil aksi | ya — bersaudara dengan #3 | aman |
| 5 | Alamat (tambah) | Pesan berhasil/gagal | tidak (satu dialog) | aman |
| 6 | Alamat (ubah) | Pesan berhasil/gagal | tidak (satu dialog) | aman |
| 7 | Simpanan | Konfirmasi hapus | ya — tutup A + buka B pada commit sama (baris 139–140) | aman |
| 8 | Simpanan | Pesan tambah ke keranjang | ya — bersaudara dengan #7 | aman |
| 9 | Detail pesanan | Konfirmasi batalkan pesanan | ya — tutup A + buka B pada commit sama (baris 166–170) | aman |
| 10 | Detail pesanan | Pesan hasil aksi (batal/cetak) | ya — bersaudara dengan #9 | aman |
| 11 | Riwayat pesanan | Pesan "Beli Lagi" | tidak (satu dialog) | aman |
| 12 | Notifikasi | Menu + konfirmasi "tandai semua" | sudah digabung jadi satu dialog bertahap; isi berganti tanpa membuat jendela baru | aman |
| 13 | Akun (ubah profil) | Pesan hasil simpan | tidak (satu dialog) | aman |
| 14 | Kasir (order masuk) | Filter | tidak (satu dialog) | aman |

Ringkas: **9 dari 14** dialog berada pada pola berisiko sebelum perbaikan;
setelah perbaikan **0** (dijaga terpusat oleh `antreanModal`).

Sisa pemakaian `Alert.alert` (bukan `Dialog`) di `app/product/[id].tsx` dan
`src/screens/checkout/CheckoutContext.tsx` memakai dialog **native** Android,
bukan `<Modal>` React Native, sehingga tidak terkena masalah ini. Di web ia
memakai shim `utils/webAlert.ts`.

---

## 5. Bukti verifikasi

### 5.1 Gerbang statis

```
npx tsc --noEmit                 → 0 error
node --test src/lib/__tests__/*.test.ts utils/__tests__/*.test.ts
                                 → 140 tes, 140 lulus, 0 gagal
                                   (sebelum: 113 tes; +27 tes baru)
npx expo lint                    → 0 error, 5 warning
                                   (warning sudah ada sebelum perubahan; warning
                                   baru dari perubahan ini = 0)
```

### 5.2 Tes regresi baru

`src/lib/__tests__/dialogAntrean.test.ts` (10 tes):

- peminta pertama langsung memegang slot; peminta kedua mengantre;
- permintaan ganda untuk id yang sama tidak menggandakan antrean;
- **tutup A + buka B pada commit sama → B menunggu satu tick** (inti perbaikan);
- FIFO untuk tiga permintaan berurutan;
- id yang batal sebelum giliran tidak mengunci slot;
- `lepas` idempoten; `reset`; langganan/berhenti berlangganan;
- buka-tutup-dibuka berulang tetap mendapat slot.

`src/lib/__tests__/jumlahManual.test.ts` (17 tes): penyaringan digit, nol di
depan, kosong = belum sah, clamp stok + penanda `melebihiBatas`, tanpa batas
stok, paste berisi teks, `min` bukan 1, dan `jumlahSaatSelesai` (isi kosong
tidak menghapus qty).

### 5.3 Verifikasi DOM nyata

Ekspor web dibuat dua kali supaya perbandingan nyata (bukan klaim):

- **SEBELUM** = `npx expo export -p web` pada commit `07a03fb` → `dist-web-verify`
- **SESUDAH** = ekspor yang sama pada working tree → `dist-web-after`

Keduanya disajikan `scripts/serve-static.mjs` (rute tanpa ekstensi seperti
`/cart`, `/product/4502`, karena `python -m http.server` membuat router melihat
`/cart.html` dan menampilkan "Unmatched Route" — hasilnya akan palsu), lalu
diuji Chromium headless (Playwright) dengan viewport 412×915.

**a. Qty manual & harga mengikuti** (`scripts/verify-dialog-qty-dom.mjs`)

| Uji | Hasil |
|---|---|
| Input qty ada di keranjang | 2 input (2 baris) — **sebelum: 0** |
| Ketik `12` di keranjang | nilai input `12`; baris berubah ke **Grosir 1 Rp 70.000**; Sub-total Rp 840.000; total 12 item |
| Ketik `99` (stok 15) | input jadi **15**, pesan "Maksimal 15 item sesuai stok." |
| Ketik `abc1x2` | tersaring jadi `12`, hanya digit |
| Baris flash sale, qty `2` | tetap **Rp 72.000** (Flash Sale dipertahankan) |
| Baris flash sale, qty `12` | pindah ke **Rp 70.000** (Grosir 1, ambang 12 tercapai) |
| Detail produk, ketik `12` | nilai `12`; harga utama berubah jadi **Rp 70.000**; tabel harga tetap tampil |
| Galat halaman (pageerror) | **0** |

**b. Perilaku dialog** (`scripts/verify-dialog-qty-dom.mjs`)

| Uji | Sebelum | Sesudah |
|---|---|---|
| Dialog hapus muncul pada pemanggilan **pertama** | ya (web) | ya |
| Tutup → buka ulang segera | ya | ya |
| Tiga siklus buka/tutup dialog yang sama | — | `[1, 1, 1]` semua tampil |
| Dialog terlihat bersamaan | — | selalu **1** |

> Catatan penting: bug "harus BACK dulu" **tidak mereproduksi di web** karena
> `react-native-web` hanya memakai satu portal DOM, bukan jendela native. Yang
> bisa dan sudah diukur di web adalah penyebabnya — jumlah jendela modal yang
> hidup bersamaan dan pola tutup-A/buka-B satu commit (§2.4). Perbaikan Android
> yang sesungguhnya harus dikonfirmasi pada build APK berikutnya di perangkat.

**c. Konkurensi jendela modal** (`scripts/verify-konkurensi-modal.mjs`)

| Build | Riwayat jumlah `[aria-modal="true"]` |
|---|---|
| Sebelum | `[1]` — tidak pernah turun ke 0 sebelum dialog baru dibuat |
| Sesudah | `[1, 0, 1]` — jendela lama dilepas dulu, baru dibuat yang baru |

**d. Konfirmasi ganda hapus keranjang** (`scripts/verify-konfirmasi-ganda.mjs`)

| Build | Konfirmasi kedua | Teks setelah konfirmasi pertama |
|---|---|---|
| Sebelum | **diperlukan** | masih "Hapus Produk? …" |
| Sesudah | **tidak** | overlay kosong; keranjang jadi kosong |

### 5.4 Cara menjalankan ulang verifikasi

```
npx expo export -p web --output-dir dist-web-after
node scripts/serve-static.mjs dist-web-after 8793        # terminal lain
node scripts/verify-dialog-qty-dom.mjs  http://127.0.0.1:8793
node scripts/verify-konkurensi-modal.mjs http://127.0.0.1:8793
node scripts/verify-konfirmasi-ganda.mjs http://127.0.0.1:8793
```

Skrip mencari Playwright lewat env `PLAYWRIGHT_PATH`, `node_modules/playwright`,
atau cache npx — Playwright **tidak** ditambahkan sebagai dependensi proyek.

---

## 6. Perubahan perilaku yang disengaja

1. **Qty di keranjang kini dibatasi stok saat diketik.** Sebelumnya
   `updateItemQuantity` sudah memotong ke stok, tetapi pengguna tidak tahu
   mengapa angkanya "meloncat"; sekarang ada pesan eksplisit.
2. **Hapus item lewat tombol − hanya satu konfirmasi.** Sebelumnya dua; ini
   perubahan perilaku yang diinginkan (satu tindakan = satu konfirmasi).
3. **Dialog menghormati setelan "Kurangi gerakan" perangkat.** Sebelumnya
   parameter `reduceMotion` tidak pernah diisi, jadi setelan itu tidak berlaku.
4. **Dialog kedua yang diminta saat dialog lain terbuka akan menunggu satu
   tick.** Jedanya imperceptible (< satu frame) tetapi menghilangkan
   kemungkinan dua jendela native hidup bersamaan.

---

## 7. Sisa pekerjaan / tindak lanjut

1. **Build APK dan uji di perangkat** — di luar lingkup tugas ini (tidak ada
   build APK di sini). Yang harus diuji di HP: buka-tutup dialog hapus
   keranjang berulang, hapus item saat qty 1 (harus satu konfirmasi), alur gagal
   hapus alamat/simpanan (pesan galat harus menggantikan dialog konfirmasi tanpa
   perlu BACK), dan ketik qty langsung dengan keyboard angka.
2. **Tombol BACK saat keyboard qty terbuka.** Di Android, BACK pertama menutup
   keyboard (perilaku sistem). Perlu dipastikan di perangkat bahwa BACK kedua
   menutup dialog, bukan meninggalkan layar.
3. **Qty manual di layar lain.** Saat ini hanya keranjang dan detail produk yang
   punya stepper. Bila nanti ada stepper di layar lain, cukup pakai komponen
   `Stepper` yang sama — aturan validasi otomatis ikut.
4. **`Alert.alert` di `CheckoutContext` dan detail produk** masih memakai dialog
   native. Bukan bagian dari bug ini (bukan `<Modal>`), tetapi bila ingin gaya
   visual seragam dengan `Dialog` Zovora, itu pekerjaan terpisah.
5. **Batas digit qty = 4** (maksimum 9999). Bila ada produk dengan stok > 9999,
   naikkan `maxLength` di `Stepper` dan `maxDigit` di `jumlahManual.ts`.

---

## 8. Berkas terkait

Baru:

- `src/lib/dialogAntrean.ts` — antrean modal (satu slot, promosi tertunda)
- `src/lib/jumlahManual.ts` — logika qty manual (digit, clamp, selesai-ketik)
- `src/lib/__tests__/dialogAntrean.test.ts` — 10 tes regresi dialog
- `src/lib/__tests__/jumlahManual.test.ts` — 17 tes regresi qty
- `scripts/serve-static.mjs` — server statis untuk rute tanpa ekstensi
- `scripts/verify-dialog-qty-dom.mjs` — verifikasi dialog + qty + harga tier
- `scripts/verify-baseline-dom.mjs` — probe pembanding build lama
- `scripts/verify-swap-dom.mjs` — probe pola tutup-A/buka-B
- `scripts/verify-konkurensi-modal.mjs` — ukur jendela modal bersamaan
- `scripts/verify-konfirmasi-ganda.mjs` — ukur konfirmasi hapus dua lapis
- `scripts/verify-dialog-dom.mjs` — probe awal perilaku dialog

Diubah:

- `src/components/ui/Dialog.tsx` — lewat `antreanModal`, hormati reduce motion
- `src/components/ui/Stepper.tsx` — `<TextInput>` qty + validasi stok
- `src/components/commerce/CartItemRow.tsx` — `confirmRemove={false}` (satu konfirmasi)
- `src/lib/i18n.ts` — 3 kunci pesan qty

Tidak di-commit (artefak verifikasi, ada di `.gitignore`/dibersihkan):
`dist-web-verify/`, `dist-web-after/`.
