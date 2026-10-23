# Perbaikan: total produk & infinite scroll halaman Kategori

Tanggal: 23 Oktober 2026
Layar: tab **Kategori** (`app/(tabs)/products.tsx` → `screens/CategoryScreen.tsx`)
Data uji: API produksi `https://gudangperabot.my.id/api` (4.519 produk, 226 halaman @20)
Mode verifikasi: web (`expo start --web`, viewport 412×900) + proxy CORS lokal
(`scripts/verify-kategori-proxy.js`) agar layar web bisa memanggil API produksi
tanpa mengubah services. Tidak ada perubahan pada `services/`.

## 1. Bug: "Semua" menampilkan **20 produk**

### Penyebab
Layar memakai **jumlah item halaman pertama** sebagai total:

```tsx
// sebelum
{teks.kategori.jumlah.replace("{jumlah}", String(produk.length))}
```

Satu request hanya memuat `per_page: 20`, jadi `produk.length` selalu 20
walaupun `meta.total` = 4.519. Respons API sudah benar sejak awal:

```
GET /api/public/products?per_page=1
→ meta: { total: 4519, per_page: 1, current_page: 1, last_page: 4519 }
GET /api/public/products?per_page=20&page=1
→ meta: { total: 4519, per_page: 20, current_page: 1, last_page: 226 }
```

### Perbaikan
Total diambil dari `meta.total` respons dan diformat `angka()` (locale `id-ID`):

```tsx
<Text>{teks.kategori.jumlah.replace("{jumlah}", angka(totalTampil))}</Text>
// totalTampil = total > 0 ? total : produk.length  (fallback bila meta hilang)
```

`meta.total` dibaca sekali di hook paginasi (`bacaMeta`) dan tidak ikut berubah
saat halaman berikutnya ditambahkan — angka tetap 4.519 walaupun grid sudah
berisi 200 kartu.

Pola yang sama di layar **Pencarian** (`app/search/index.tsx`) juga diperbaiki:
"`{n} produk ditemukan`" kini memakai `meta.total`, bukan `products.length`
(sebelumnya mentok di `per_page: 50`). Grid beranda tidak menampilkan angka
total (hanya 20 item + CTA "Jelajahi Produk"), jadi tidak ada yang perlu diubah.

## 2. Bug: scroll ke bawah tidak memuat produk berikutnya

### Penyebab
Grid adalah `ScrollView` + `.map()` tanpa pemicu apa pun — hanya 20 item pertama
yang pernah dimuat. Tidak ada `page` yang dikirim ke API.

### Perbaikan

**Hook baru `src/screens/produk/useProdukPaginasi.ts`** memisahkan tiga hal yang
dulu tercampur:

| State | Arti |
| --- | --- |
| `total` | angka `meta.total` (bukan jumlah item di layar) |
| `produk` | akumulasi halaman, didedupe berdasarkan `id` |
| `habis` | `halaman >= meta.last_page` → berhenti meminta |

Rincian perilaku:

- **`per_page` konsisten 20** (`PER_PAGE_PRODUK`) di setiap request, termasuk
  halaman lanjutan — tidak ada campur 20/50 yang membuat lompatan halaman.
- **Dedupe id** (`gabungUnik`) saat append: backend bisa menggeser item antar
  halaman ketika ada produk baru masuk, sehingga item yang sama tidak muncul
  dua kali dan posisi item lama tidak bergeser.
- **Stop di `last_page`**: `muatLagi` langsung `return` bila
  `halamanRef >= lastPageRef`; halaman kosong tidak pernah diminta berulang.
  Footer menampilkan "Semua produk sudah tampil" saat `habis`.
- **Anti double-load**: `sedangMuatRef` diset **sinkron sebelum `await`**, jadi
  dua pemicu dalam satu frame (event scroll + sentinel + `onEndReached`) tetap
  menghasilkan satu request.
- **Anti cascade**: `siapMuatRef` hanya dipersenjatai ulang ketika pengguna
  **menjauh** dari dasar (sisa > 480 px). Tanpa ini, konten yang bertambah tepat
  saat pengguna berada di dasar langsung memicu halaman berikutnya lagi —
  terbukti menghasilkan **43 request dari 4 kali scroll** saat diuji tanpa
  penjagaan ini.
- **Ganti kategori = reset**: `pilihKategori` menaikkan `generasiRef`, sehingga
  respons kategori lama yang telat datang dibuang; `halamanRef` kembali 0,
  `produk` dikosongkan, `total` direset, lalu halaman 1 dimuat.
- **Posisi scroll dipertahankan**: append menambah item di akhir daftar, item
  yang sedang dilihat tidak dirender ulang/dipindah (key = `id` stabil).
- **Loading footer** (indikator + "Memuat produk…"), **galat halaman lanjutan**
  ditampilkan sebagai footer dengan tombol "Coba Lagi" tanpa mengosongkan grid
  yang sudah tampil.
- **Tarik-untuk-segarkan** memuat halaman 1 dengan `useCache = false` agar data
  benar-benar baru.

**Pemicu per platform** (`screens/CategoryScreen.tsx`):

- **Android/iOS**: `FlatList` + `onEndReached` (`threshold 0.6`) +
  `onScroll` sebagai cadangan. `FlatList` tetap dipakai supaya 4.519 item
  tervirtualisasi (tidak semua dirender sekaligus).
- **Web**: `ScrollView` + listener `scroll` DOM pada node scroll-nya
  (`getScrollableNode()`), `rootMargin` setara 480 px.
  **Alasan**: `FlatList` react-native-web **tidak** memicu `onEndReached` untuk
  perubahan programatik — jendela sel tidak pernah maju (`cellsAroundViewport`
  tetap `last: 7`), sehingga data halaman 2 sudah masuk state tetapi tidak
  pernah tampil di DOM. Ini terbukti saat pengujian: `produk.length` = 40 tapi
  kartu di DOM tetap 16. `ScrollView` me-render semua item, jadi perilaku web
  deterministik dan cocok untuk QA.
- Kedua jalur memakai `cekDekatBawah()` yang sama, jadi ambang & penjagaan
  identik.

### Teks baru (`src/lib/i18n.ts`, grup `kategori`)
- `memuatLagi`: "Memuat produk…"
- `galatLagi`: "Gagal memuat produk berikutnya."
- `habis`: "Semua produk sudah tampil"

## 3. Bukti verifikasi (web, API produksi)

Angka di bawah diambil dari DOM/`performance.getEntriesByType('resource')`,
bukan dari perkiraan.

### Total produk
| Kondisi | Teks di layar | `meta.total` API |
| --- | --- | --- |
| Tab "Semua" | **4.519 produk** | 4519 |
| Kategori Elektronik | **141 produk** | 141 |
| Kembali ke "Semua" | **4.519 produk** | 4519 |

Sebelum perbaikan: "20 produk" pada tab "Semua".

### Infinite scroll — tab "Semua" (226 halaman)
| Scroll ke- | Kartu di DOM | Request `/products` |
| --- | --- | --- |
| 0 (awal) | 20 | 1 |
| 1 | 40 | 2 |
| 2 | 60 | 3 |
| 3 | 80 | 4 |
| … | +20 per scroll | +1 per scroll |
| 9 | 220 | 11 |

Satu scroll = satu halaman, tidak ada request dobel
(`per_page=20&page=1..11`, tanpa duplikat).

### Berhenti di halaman terakhir — kategori Elektronik (141 produk, 8 halaman)
| Scroll ke- | Kartu | Request | Status |
| --- | --- | --- | --- |
| 0 | 40 | 2 | |
| 2 | 80 | 4 | |
| 5 | 140 | 7 | |
| 6 | **141** | **8** | footer "Semua produk sudah tampil" |
| 7–13 | 141 | 8 (tidak bertambah) | tetap berhenti |

### Ganti kategori & dedupe
- Elektronik (141, 8 halaman) → "Semua": hitungan kembali **4.519 produk**,
  grid mulai dari 20 kartu (bukan melanjutkan halaman lama), request berikutnya
  `per_page=20&page=1`.
- Setelah 3 scroll lagi: 80 kartu, **80 unik** (0 duplikat `aria-label`).
- Ganti kategori saat request masih berjalan tidak mencampur hasil: request
  kategori baru memakai `kategori_id=6&per_page=20&page=1`, respons lama dibuang
  lewat `generasiRef`.

## 4. Gate kualitas

- `npx tsc --noEmit` → **0 error** untuk file yang diubah
  (`screens/CategoryScreen.tsx`, `src/screens/produk/useProdukPaginasi.ts`,
  `app/search/index.tsx`, `src/lib/i18n.ts`).
  Catatan: ada error TS dari `services/__tests__/paymentMethods.test.ts`
  (pekerjaan agen lain di tree yang sama, tidak disentuh).
- `npx expo lint` → **0 error** (4 warning `react-hooks/set-state-in-effect`
  yang sudah ada sebelumnya di `payment.tsx`, `notifications/index.tsx`,
  `CheckoutContext.tsx`, `useUlasanProduk.ts`).

## 5. Catatan / sisa

- Di web, semua item di-render sekaligus (tanpa virtualisasi) karena
  `FlatList` RN-web tidak bisa dipakai untuk infinite scroll terprogram. Untuk
  4.519 item di web QA ini terukur lancar (220 kartu ter-render tanpa lag), tetapi
  bila suatu saat web dipakai produksi dengan katalog jauh lebih besar,
  pertimbangkan virtualisasi khusus web.
- Perubahan pada `services/` tidak diperlukan: `searchProducts` sudah
  mengembalikan `meta` dan meneruskan `page`.
