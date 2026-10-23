# Perbaikan: notifikasi global + bell yang pasti berbunyi + build netinfo

Tanggal: 24 Oktober 2026
Repo: `pos-fe` (Expo SDK 57), basis `b2f70ac`

---

## 1. Notifikasi order baru kini tampil di SEMUA rute

**Gejala.** Notifikasi realtime hanya muncul di `/kasir/online-orders`
(`/kasir/orders`). Kasir yang sedang membuka keranjang, produk, atau detail
pesanan tidak melihat apa pun.

**Sebab.** Listener event hidup di layar kasir. `RealtimeProvider` memang sudah
satu koneksi di root, tetapi tidak ada komponen root yang menampilkan notifikasi
— jadi event diterima, bell dibunyikan, lalu hilang tanpa jejak visual bila
layarnya bukan layar kasir.

**Perbaikan.**

- `src/components/notifikasi/NotifikasiGlobal.tsx` dipasang di
  `app/_layout.tsx` **di dalam** `RealtimeProvider` dan **di atas** `<Stack>`
  (dibungkus `View className="flex-1"`). Karena hidup di root, ia tidak
  terpengaruh rute yang sedang dibuka.
- `src/lib/realtime/toastAntrean.ts` — antrean toast sebagai modul murni:
  - judul `Order Baru: ORD-XXXX` (jatuh ke judul server bila nomor tidak ada,
    tidak pernah kosong);
  - event duplikat (reconnect Pusher) tidak menumpuk antrean;
  - maksimal 3 toast mengantre, yang tertua dibuang lebih dulu;
  - jumlah notifikasi lain ditampilkan sebagai badge `+N`.
- `src/components/notifikasi/ToastNotifikasi.tsx` — gaya Zovora §5: bg
  `neutral-900`, teks putih, `rounded-md`, shadow float. Diletakkan **di bawah
  AppBar** (`inset.top + 56 + 8`) agar tombol kembali/menu dan judul layar
  tidak tertutup; pembungkus `pointerEvents="box-none"` membuat area di luar
  kartu tetap tembus sentuhan. Tampil **5 detik** atau sampai ditutup.
- Tombol **X** menutup toast; timer direset per toast sehingga toast berikutnya
  mendapat 5 detik penuh.
- **Tap toast → navigasi** sesuai target:

  | Target | Rute |
  | --- | --- |
  | `kasir-order-baru` | `/kasir/orders` |
  | `pelanggan-status` (dengan orderId) | `/orders/{id}` |
  | `pelanggan-status` (tanpa orderId) | `/orders` |
  | `notifikasi-umum` | `/notifications` |

- **Update daftar di layar terkait TETAP berjalan.** `useNotifikasiMasuk` di
  `app/kasir/orders.tsx`, `app/orders/index.tsx`, dan
  `app/notifications/index.tsx` tidak diubah; toast adalah tambahan, bukan
  pengganti.

## 2. Bell berbunyi untuk semua notifikasi

**Gejala.** Bell tidak berbunyi sama sekali — bahkan ketika notifikasi tampil.

**Diagnosis (empat sebab, semuanya nyata).**

1. **`play()` dipanggil sebelum media siap.** `createAudioPlayer(require(...))`
   memuat aset secara asinkron. `play()` pada pemutar yang belum `isLoaded`
   tidak bersuara dan **tidak melempar error**, sehingga kode lama terlihat
   "berhasil".
2. **Aset Android adalah embedded resource.** `unzip -l` APK 23d menunjukkan
   hanya `res/1Q.wav` (439718 byte) — URI `res/…` tidak selalu bisa dibuka
   ExoPlayer, walau `Image` bisa.
3. **Web: permintaan tertunda dibuang.** Kode lama mengembalikan `"tertunda"`
   bila belum ada interaksi dan tidak pernah mencoba lagi. Notifikasi pertama
   (yang paling penting) hilang selamanya.
4. **Elemen `<audio>` adalah jalur rapuh.** Pada lingkungan uji tanpa perangkat
   output, elemen `<audio>` menggantung di `readyState 0` selamanya, sementara
   `decodeAudioData` pada berkas yang sama berhasil (durasi 2,49 dtk, 2 kanal,
   48 kHz). Jadi status "siap" tidak boleh bergantung pada elemen media.

**Perbaikan (`services/realtime/bell.ts`).**

- **Native**: `downloadFirst: true` — aset `res/<hash>.wav` disalin ke cache
  lalu diputar dari `file:///…`, jalur yang pasti terbaca ExoPlayer/AVPlayer.
- **Native**: menunggu `isLoaded` (maks 900 ms) tetapi **tetap memanggil
  `play()`** bila belum termuat (ExoPlayer mengantre `play()`), lalu mengulang
  sampai 3 kali dan memeriksa `player.playing`.
- **Web**: memakai **WebAudio** (`decodeAudioData` + `AudioBufferSourceNode`).
  `AudioContext.state` adalah sumber kebenaran autoplay yang sebenarnya:
  - `suspended` → permintaan diingat (`permintaanTertunda`);
  - `onstatechange` → begitu `running`, permintaan tertunda **langsung
    diputar** tanpa menunggu notifikasi berikutnya;
  - `resume()` dibatasi timeout 800 ms (di sebagian browser promise ini bisa
    menggantung selamanya).
- **Autoplay unlock tanpa TombolSuara**: pembuka dipasang di level `document`
  (`pointerdown`, `keydown`, `touchstart`, `click`) — sentuhan pertama di layar
  mana pun cukup. `TombolSuara` tetap ada sebagai kontrol preferensi, bukan
  syarat bunyi.
- **Semua notifikasi** memicu bell (order baru **dan** status), bukan hanya
  order — `putarBell(notifikasi.bunyikanSuara)` dipanggil dari satu pintu masuk
  `terimaNotifikasi` di provider.
- **Indikator suara-mati**: chip `Suara notifikasi mati` (ikon `BellOff`) muncul
  di kanan bawah AppBar bila preferensi tersimpan = mati; diketuk untuk
  menyalakan lagi. Disembunyikan saat ada toast agar tidak bertumpuk.
- **Diagnostik**: `diagnosaBell()` mengembalikan `dibuka`, `dimuat`,
  `preferensiSuara`, `permintaanTertunda`, `statusTerakhir`, `galatTerakhir`,
  `jumlahDiputar`; setiap pemutaran mencetak `[bell] putar {…}` ke console.

## 3. Build APK dari repo bersih

**Masalah.** Build 23d hanya berhasil karena alias Metro untuk
`@react-native-community/netinfo` ada di **salinan build** (`shims/netinfo.js`
+ patch `metro.config.js`) dan tidak pernah masuk repo. `pusher-js`
(`dist/react-native/pusher.js`) mengimpor paket itu, jadi checkout bersih gagal
me-resolve modul saat bundling.

**Perbaikan (dua lapis).**

- Dependency resmi ditambahkan: `@react-native-community/netinfo@12.0.1` —
  versi yang dibundel Expo SDK 57 menurut `expo/bundledNativeModules.json`.
  Jalur normal memakai paket asli (implementasi native, deteksi offline nyata).
- `shims/netinfo.js` **masuk repo** sebagai fallback "selalu online";
  `metro.config.js` memasang alias **hanya** bila paket asli tidak bisa
  di-resolve (mis. `npm install` dilewati / offline).

---

## Verifikasi

### Gate statis

| Pemeriksaan | Hasil |
| --- | --- |
| `npx tsc -p tsconfig.json --noEmit` | **0 error** |
| `npx expo lint` | **0 error**, 5 warning (semuanya sudah ada sebelum perubahan: `set-state-in-effect`, `exhaustive-deps`) |
| `node --test` (semua suite) | **52 lulus, 0 gagal** (9 di antaranya test baru toast) |

### Export native

`npx expo export --platform android` sukses; `metadata.json` mencatat **66 aset
termasuk 1 berkas `wav` sebesar 439718 byte** — `bell.wav` benar-benar ikut
terbundel (bukan hipotesis).

### Uji web (browser sungguhan, Metro dev server)

Notifikasi dipicu lewat jembatan `__DEV__` `kirimNotifikasiUji()` — jalur yang
sama persis dengan event Pusher (badge → bell → toast → listener layar).

**Toast muncul di 7 rute berbeda** (bukan hanya kasir):

| Rute | Judul toast |
| --- | --- |
| `/` | Order Baru: ORD-RUTE |
| `/cart` | Order Baru: ORD-RUTE |
| `/products` | Order Baru: ORD-RUTE |
| `/notifications` | Order Baru: ORD-RUTE |
| `/orders` | Order Baru: ORD-RUTE |
| `/wishlist` | Order Baru: ORD-RUTE |
| `/kasir/orders` | Order Baru: ORD-RUTE |

**Dismiss berfungsi**: klik `Tutup` → elemen `[data-testid="toast-notifikasi"]`
hilang; tanpa diklik, toast hilang sendiri setelah 5,2 detik.

**Navigasi berfungsi**: dari `/products`, klik toast kasir → `/kasir/orders`
dan toast tertutup. Klik toast status pelanggan → `/orders/12345`.

**Bell berbunyi** (bukti dari `diagnosaBell()`):

| Skenario | `statusTerakhir` | `jumlahDiputar` |
| --- | --- | --- |
| Notifikasi sebelum interaksi apa pun | `tertunda` (permintaan diingat) | 0 |
| Setelah satu klik nyata (tanpa event baru) | **`diputar`** | **1** |
| Notifikasi status pelanggan setelah unlock | **`diputar`** | **1** |
| Preferensi suara dimatikan | `dimatikan` | 0 |

Indikator `Suara notifikasi mati` terlihat setelah bell dimatikan dan hilang
lagi setelah diketuk untuk menyalakan.

### Build netinfo

- Dengan paket asli terpasang: `resolveRequest` kustom **tidak** terpasang,
  `require.resolve('@react-native-community/netinfo/package.json')` →
  `12.0.1`.
- Disimulasikan `MODULE_NOT_FOUND` (setara `npm install` dilewati):
  `resolveRequest` terpasang dan mengembalikan `shims/netinfo.js` yang ada.
- Shim sendiri: `fetch()` → `isConnected: true, type: "wifi"`;
  `addEventListener(cb)` memanggil cb dan mengembalikan pelepas.

---

## Berkas

**Baru**
- `src/lib/realtime/toastAntrean.ts` — reducer antrean toast (murni, teruji)
- `src/lib/__tests__/toastAntrean.test.ts` — 9 test
- `src/components/notifikasi/ToastNotifikasi.tsx` — kartu toast
- `src/components/notifikasi/NotifikasiGlobal.tsx` — pemasangan global + timer
- `shims/netinfo.js` — fallback netinfo untuk build

**Diubah**
- `app/_layout.tsx` — `<NotifikasiGlobal />` di root, di atas `<Stack>`
- `services/realtime/bell.ts` — WebAudio di web, `downloadFirst` di native,
  tunggu-siap + retry, replay permintaan tertunda, `diagnosaBell()`
- `src/lib/realtime/RealtimeProvider.tsx` — `terimaNotifikasi` sebagai satu
  pintu masuk (bell untuk semua notifikasi), langganan kesiapan audio,
  jembatan `__DEV__` untuk QA
- `src/lib/i18n.ts` — 4 kunci: `bukaToast`, `suaraMati`, `aktifkanSuara`,
  `orderBaru`
- `metro.config.js` — alias netinfo kondisional
- `package.json`, `package-lock.json` — `@react-native-community/netinfo`

## Commit lokal (belum di-push)

| Hash | Isi |
| --- | --- |
| `37a7441` | build(metro): netinfo asli + shim fallback |
| `af699e0` | feat(notifikasi): toast global dismissable + navigasi |
| `f50ba00` | fix(bell): bell berbunyi di semua notifikasi |

## Catatan / tindak lanjut

- **Jembatan uji** `kirimNotifikasiUji()` / `diagnosaBellUji()` hanya ada di
  `__DEV__`; Metro membuangnya di build release. Dipakai untuk membuktikan bug
  tanpa backend + Pusher hidup.
- **`hasAttemptedToLoad` pada APK berikutnya**: perbaikan aset
  (`downloadFirst`) adalah kode JS murni, jadi APK baru tetap perlu dibangun
  ulang agar ikut terpakai — tidak ada perubahan modul native tambahan selain
  `@react-native-community/netinfo` yang sudah dibundel Expo SDK 57.
- **Verifikasi bell di perangkat fisik belum dilakukan** — lingkungan uji ini
  headless tanpa output audio. Yang terbukti: aset terbundel dan ter-decode,
  `AudioContext` berstatus `running`, dan sumber bunyi benar-benar di-`start()`.
  Bila pemilik masih tidak mendengar suara di APK, log `[bell] putar {…}` akan
  menunjukkan apakah masalahnya di jalur audio perangkat (mis. volume media 0
  atau mode senyap) — itu di luar jangkauan kode aplikasi.
- Toast sengaja tidak memakai `Modal` agar tidak memblokir interaksi layar di
  bawahnya; ia hanya menempati area kartu.
