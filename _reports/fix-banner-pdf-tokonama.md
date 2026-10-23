# Perbaikan: Banner tanpa Gradasi, Struk PDF, Nama Toko dari BE

Tanggal: 23 Oktober 2026
Repo: `pos-fe` (commit `0e83f6b`), `pos-be` (commit `e5c69fc`)
Status: **selesai & terverifikasi** (commit lokal, belum di-push)

---

## 1. Banner beranda — masking gradien dihapus

**Masalah.** Foto banner tampak biru dan tidak utuh. Penyebabnya bukan satu
lapisan, tapi **dua** di `src/components/commerce/BannerCarousel.tsx`:

1. `LinearGradient` dasar tema (`primary500` → `primary600`) yang selalu
   dirender, dan
2. **scrim** horizontal `LinearGradient` dengan `locations=[0, 0.5, 0.62]`,
   alfa 0,88 → 0,42 → 0, menutupi ±62 % lebar kartu persis di area teks.

Ditambah foto hanya menempati sisi kanan (`width: 56%`), sehingga sebagian
besar kartu memang biru.

**Perbaikan.**

- Foto kini mengisi **seluruh kartu** (`position:absolute` inset 0,
  `contentFit="cover"`) dan **tidak ada satu pun layer gradien** dirender di
  atasnya.
- Gradien tema hanya menjadi latar pengganti bila banner **tidak** punya
  `gambar_url`.
- Kontras judul/deskripsi dijaga `text-shadow` tipis:
  teks putih → bayangan hitam α 0,55; teks gelap → bayangan putih α 0,65.
  Di web dipakai shorthand `textShadow` karena prop `textShadow*` sudah
  deprecated di react-native-web (memunculkan warning runtime).
- Kolom teks dilebarkan 52 % → 62 % dan di-`justify-end` agar label + tombol
  mengambang di bawah foto tanpa menutupi tengahnya.
- `testID` kartu: `banner-foto-tanpa-gradasi` (ada foto) /
  `banner-latar-gradien` (tanpa foto) — jadi regresi bisa dideteksi dari DOM.

**Bukti DOM (web nyata, Metro + API lokal, banner berfoto):**

```
layerGradien          : []              ← nol elemen bergradien di dalam kartu
fotoCoverSeluruhKartu : true
ukuranKartu           : [1232, 148]
ukuranFoto            : [1232, 148]
objectFit             : "cover"
shadowJudul           : "rgba(0, 0, 0, 0.55) 0px 1px 4px"
```

---

## 2. Cetak Struk — dari thermal ke PDF pelanggan

**Masalah.** `app/orders/[id].tsx` memanggil `printOrderReceipt`
(`utils/printReceipt.ts`), yaitu jalur **ESC/POS**: membuka intent `rawbt:`
di Android, dan di web hanya mengunduh `struk-*.bin` mentah. Pelanggan tidak
punya printer thermal — tombolnya terasa mati.

**Perbaikan.**

| Berkas | Peran |
|---|---|
| `utils/strukPelanggan.ts` | Penyusun HTML faktur (bebas dependensi RN, bisa diuji `node --test`) |
| `utils/cetakStrukPelanggan.ts` | Eksekusi: `expo-print` + `expo-sharing` (native), iframe + dialog cetak (web) |

Isi PDF (A4 portrait, margin 14 mm):

- Kop: logo (bila ada), **nama toko dari BE**, alamat, telepon · email
- Dokumen: judul "Struk Pembelian", no. transaksi, tanggal, badge status
- Tabel item: **`produk (varian) / satuan`**, qty, harga, jumlah
- Ringkasan: subtotal, diskon (promo + poin), **poin digunakan**,
  **rincian split payment**, metode, **total**, status pembayaran
- **Tujuan Pembayaran** (rekening + a.n. + petunjuk berita transfer) —
  hanya muncul bila **belum lunas**
- Alamat pengiriman & catatan (bila ada)
- Semua teks pelanggan di-escape (`escapeHtml`) — tidak ada HTML mentah

Perilaku per platform:

- **Android/iOS**: `Print.printToFileAsync` → PDF di cache → `Sharing.shareAsync`
  (simpan / kirim WA / buka PDF). Bila Sharing tidak tersedia → dialog cetak
  native `Print.printAsync`.
- **Web**: `expo-print` web hanya memicu `window.print()` halaman aplikasi
  (bukan struk), jadi HTML struk ditulis ke `<iframe id="struk-pelanggan-print">`
  lalu dicetak dari iframe itu → dialog browser menawarkan **Save as PDF**.

**Jalur thermal TIDAK diubah.** `utils/printReceipt.ts` dan seluruh
ESC/POS (`utils/escpos.ts`) tetap utuh untuk kasir/admin di back-office.
Grep memastikan tidak ada lagi pemanggil `printOrderReceipt` di app pelanggan.

---

## 3. Nama toko dari backend

**Masalah.** `utils/printReceipt.ts` menulis `DEFAULT_STORE.name = "Toko Kami"`.
Nama toko di struk pelanggan tidak pernah memakai identitas yang diisi pemilik.

**Endpoint baru (pos-be):** `GET /api/public/store-info`

- Tanpa auth — struk pelanggan dicetak tanpa login staff.
- Sumber tunggal `App\Support\KopCetak::identitas()` (sama dengan kop dokumen
  cetak admin), jadi tidak ada logika kop kedua yang bisa menyimpang.
- `Cache::remember('api_public_store_info', 600)` + header
  `Cache-Control: public, max-age=600`.
- Selalu 200 walau tabel `profil_toko` kosong (nama default dari `KopCetak`)
  — kalau 500, FE akan jatuh ke fallback dan bug lama muncul lagi.

```json
{ "success": true,
  "data": { "nama_toko": "Deadea Store",
            "alamat": "Jl. Margo Taruno, …",
            "telepon": "081234567890",
            "email": "info@deadeastore.com",
            "website": "https://deadeastore.com",
            "npwp": "12.345.678.9-123.000",
            "logo_url": "http://…/logo-toko" } }
```

**FE:** `apiService.getStoreInfo()` (cache 1 jam, kegagalan tidak di-cache).
Layar detail pesanan mengambilnya saat mount, dan **mengambil ulang saat
tombol ditekan** bila fetch awal gagal (jaringan bisa pulih). Fallback
`NAMA_TOKO_CADANGAN = "Toko Kami"` hanya dipakai bila fetch benar-benar gagal
— inilah satu-satunya tempat string itu tersisa di jalur pelanggan.

---

## Verifikasi

### pos-fe

| Pemeriksaan | Hasil |
|---|---|
| `npx tsc --noEmit -p tsconfig.json` | **0 error** (3 error yang sempat muncul ada di `app/notifications/index.tsx` milik agen lain, di luar file saya) |
| `npx eslint` (file saya) | **0 error**, hanya 1 warning lama `set-state-in-effect` di BannerCarousel (sudah ada sebelumnya) |
| `node --test utils/__tests__/strukPelanggan.test.ts` | **10/10 lulus** |

Test struk mengunci: kop dari BE bukan "Toko Kami", fallback hanya bila nama
kosong, label `produk (varian) / satuan`, rekening **tidak** muncul saat lunas
dan muncul saat belum lunas, split & poin tercetak, escape HTML, format rupiah.

### Uji web end-to-end (bukan mock)

Backend `php artisan serve --port=8124` + `expo start --web` dengan
`EXPO_PUBLIC_API_URL=http://127.0.0.1:8124/api`, database berisi data nyata.

1. Banner: dibuat 1 baris `banner_slider` aktif berfoto, beranda dimuat →
   `testid: ["banner-foto-tanpa-gradasi"]`, `layerGradien: []`. ✔
2. Struk: order `ORD-20261023-DEUTQX` (Transfer Bank, belum bayar) dibuka,
   tombol **Cetak Struk** diklik → iframe struk berisi:

```
nama_toko        : "Deadea Store"     ← dari BE
ada_toko_kami    : false
baris_item       : "Guling Silicon Dealova (Default)   2   Rp 28.000   Rp 56.000"
judul dokumen    : "Struk ORD-20261023-DEUTQX — Deadea Store"
```

3. PDF nyata: HTML struk dirender `Page.printToPDF` → 82 KB, `pdftotext`
   menunjukkan "Deadea Store" muncul 1× dan "Toko Kami" **0×**, termasuk blok
   TUJUAN PEMBAYARAN (rekening + a.n.) karena status masih belum bayar.

### pos-be

- `vendor/bin/phpunit tests/Feature/Api/StoreInfoApiTest.php` → **OK (5 test, 11 assertion)**.
- Suite penuh: **805 test, 4660 assertion**, 39 error + 52 failure.
  Semua kegagalan terpusat di `tests/Feature/Ui/*` dan
  `WipeLegacyProductDataTest` dengan pesan
  `SQLSTATE[HY000] 1412 Table definition has changed, please retry transaction`
  — artefak DDL MySQL saat suite paralel/`RefreshDatabase`, bukan akibat
  perubahan saya. Dijalankan ulang terpisah:
  `tests/Feature/Ui` + `WipeLegacyProductDataTest` → **OK (193 test, 2609 assertion)**,
  dan `SalesMigrationTest` sendiri → **OK (9 test, 201 assertion)**.
- Tidak ada file agen lain yang disentuh: `app/Http/Controllers/Api/AuthController.php`,
  `app/Services/NotifikasiRealtime.php`, `tests/Feature/NotifikasiRealtimeTest.php`
  tetap unstaged.

---

## Berkas

**pos-be** (`e5c69fc`)
- `app/Http/Controllers/Api/StoreInfoController.php` (baru)
- `routes/api.php` (rute publik + import)
- `tests/Feature/Api/StoreInfoApiTest.php` (baru)

**pos-fe** (`0e83f6b`)
- `src/components/commerce/BannerCarousel.tsx`
- `utils/strukPelanggan.ts` (baru)
- `utils/cetakStrukPelanggan.ts` (baru)
- `utils/__tests__/strukPelanggan.test.ts` (baru)
- `app/orders/[id].tsx`
- `services/apiService.ts`, `services/config.ts`, `services/types.ts`
- `src/lib/i18n.ts` (hanya hunk `pesanan.struk`; hunk notifikasi milik agen lain dibiarkan unstaged)
- `package.json`, `package-lock.json`, `app.json` (`expo-print`, `expo-sharing`)

**Tidak diubah (sengaja):** `utils/printReceipt.ts`, `utils/escpos.ts` —
jalur thermal kasir tetap apa adanya.

---

## Catatan / tindak lanjut

- `expo-print` & `expo-sharing` adalah modul native: build Android/iOS baru
  perlu dibuat ulang (`expo run:android`) agar PDF bisa dibagikan. Di Expo Go
  modul ini sudah tersedia.
- Satuan jual (`item.satuan`) baru muncul di label bila backend mengirim
  `satuan` pada item order. Saat ini `CustomerOrderController@show` belum
  mengirimnya (hanya `nama_produk`/`nama_varian`), jadi label tampil sebagai
  `produk (varian)`. Bila pemilik ingin satuan selalu tampil, endpoint
  `customer/orders/{id}` perlu menambahkan `satuan` — perubahan kecil di
  controller yang sedang disentuh agen lain, jadi sengaja tidak saya ubah.
- Cache store-info 10 menit (BE) + 1 jam (FE): setelah pemilik mengganti nama
  toko, struk bisa masih memakai nama lama hingga cache kedaluwarsa.
