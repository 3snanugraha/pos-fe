# Perbaikan APK 2026-10-28c — backdrop tampil, konten dialog kosong

Tanggal: 28 Oktober 2026
Repo: `pos-fe` (Expo SDK 57, RN 0.86, New Architecture), basis `1baa380`
Lingkup: seluruh `pos-fe`. `pos-be` tidak disentuh. APK tidak dibangun di tugas ini.

---

## 1. Ringkasan

Uji perangkat 2026-10-28b menemukan regresi yang **lebih spesifik** daripada
keluhan sebelumnya: layar menghitam (backdrop modal tampil) tetapi **konten
dialog tidak muncul sama sekali**. Kasus yang dilaporkan: Keranjang → Hapus
Keranjang, dan Akun → Bantuan.

Akar masalahnya bukan antrean modal 28b, melainkan **animasi manual pada kartu
dialog**. Perbaikan 28b menambah mekanisme antrean (yang memang perlu) tetapi
mempertahankan `Animated.View` ber-`opacity` 0 → 1 dengan `useNativeDriver`
membungkus kartu. Di Android nilai opacity itu dikirim lewat native animated
driver; bila pembaruannya tidak sampai, kartu tetap 0 **selamanya**.

| # | Gejala | Akar masalah | Status |
|---|---|---|---|
| 1 | Backdrop tampil, kartu dialog kosong (28b) | Kartu dialog dibungkus `Animated.View` dengan `opacity` mulai 0; pembaruan opacity lewat native driver bisa tidak sampai di Android, dan `Animated.Value` tidak memicu render ulang sehingga tidak ada yang memperbaikinya | Diperbaiki terpusat di `Dialog` |
| 2 | Uji DOM 28b tidak menangkap bug ini | Probe lama hanya memeriksa keberadaan `[aria-modal]`/teks; react-native-web tidak punya native animated module sehingga `useNativeDriver` **diam-diam jatuh ke driver JS** — animasi selalu jalan di web | Probe baru mengukur opacity efektif kartu |

Gate: `tsc --noEmit` **0 error**, `node --test` **153/153 lulus**, `expo lint`
**0 error** (5 warning, sama seperti sebelum perubahan).

---

## 2. Akar masalah (dengan bukti kode dan pengukuran)

### 2.1 Kenapa "backdrop tampil, konten kosong" menunjuk ke opacity

Di `Dialog.tsx` versi 28b, hanya **kartu** yang punya animasi:

```
<View style={{ backgroundColor: overlay }}>          ← backdrop: View biasa
  <Pressable className="absolute inset-0" />          ← area tutup: View biasa
  <Animated.View style={{ opacity: progress, transform: [{ scale }] }}>  ← KARTU
    ...
  </Animated.View>
</View>
```

`progress` dibuat `new Animated.Value(0)` lalu dianimasikan ke 1
(`Animated.timing(..., useNativeDriver: true)`). Jadi keadaan "backdrop
terlihat, kartu tidak" secara harfiah adalah **opacity kartu tertahan di 0**.
Tidak ada penjelasan lain yang menghasilkan pemisahan visual itu, karena
backdrop dan kartu berada di pohon yang sama dan dirender bersamaan.

### 2.2 Kenapa nilainya bisa tertahan permanen di Android

`Animated.Value` bukan state React. Ia tidak memicu render ulang. Nilainya
dikirim ke view lewat jalur native:

```
node_modules/react-native/ReactAndroid/.../animated/PropsAnimatedNode.kt
  fun updateView() { ... connectedViewUIManager?.synchronouslyUpdateViewOnUIThread(...) }

node_modules/react-native/ReactAndroid/.../fabric/FabricUIManager.java:762
  public void synchronouslyUpdateViewOnUIThread(final int reactTag, final ReadableMap props) {
    ...
    if (!mMountingManager.getViewExists(reactTag)) {
      mMountItemDispatcher.addMountItem(synchronousMountItem);   // ditunda
      return;
    }
```

Dua konsekuensi penting:

1. Bila tag view belum ada di mounting manager (kondisi normal pada frame-frame
   pertama setelah jendela `Dialog` Android baru dibuat — lihat
   `ReactModalHostView.showOrUpdate()` yang memanggil `newDialog.show()`),
   pembaruan **ditunda**, bukan diulang.
2. Karena `Animated.Value` tidak memicu render React, tidak ada mekanisme
   pemulihan: sekali opacity tidak teraplikasi, kartu tetap transparan sampai
   komponen itu di-mount ulang.

Ini juga menjelaskan mengapa pada 28a gejalanya "harus BACK dulu lalu picu
ulang baru muncul": memicu ulang me-*remount* dialog, dan animasi berikutnya
kebetulan berhasil.

### 2.3 Kenapa verifikasi web 28b lulus (dan itu bukan salah skripnya)

`react-native-web` tidak punya native animated module, sehingga
`useNativeDriver` diturunkan menjadi animasi JS:

```
node_modules/react-native-web/dist/vendor/react-native/Animated/NativeAnimatedHelper.js
function shouldUseNativeDriver(config) {
  if (config.useNativeDriver === true && !NativeAnimatedModule) { ...warn...; return false; }
```

Di browser, `requestAnimationFrame` selalu berjalan, jadi animasi opacity
**selalu** selesai dan kartu selalu terlihat. Ditambah lagi, probe DOM 28b
hanya menghitung `[aria-modal="true"]` dan membaca `innerText` — keduanya lulus
walau kartu transparan total. Jadi bukan skripnya yang salah mengukur, tetapi
metriknya memang tidak menyentuh variabel yang rusak.

### 2.4 Bukti pengukuran: kartu 28b dilukis dengan opacity 0

Diukur pada dua ekspor web nyata (`expo export -p web`) memakai Chromium
headless, viewport 412×915, alur Keranjang → Hapus. Metrik: opacity efektif
kartu `[role="alert"]` dihitung dari kartu sampai elemen `[aria-modal]`
(inklusif, agar animasi fade milik react-native-web di atas overlay tidak ikut
terhitung), dicatat pada lukisan pertama dan sepanjang dialog tampil.

| Build | `opacityAwalKartu` (6 dialog diukur) | Pernah transparan | Gaya inline pembungkus kartu |
|---|---|---|---|
| `1baa380` (28b) | `[0, 0, 0, 0, 0, 0]` | **ya**, semua | `opacity: 0; transform: scale(0.95)` → naik bertahap 0,11 → 0,25 → … |
| perbaikan ini (28c) | `[1, 1, 1, 1, 1, 1]` | **tidak**, semua | tidak ada `opacity`/`transform` sama sekali |

Dialog yang diukur: hapus keranjang (pemicuan pertama + 3 siklus buka/tutup),
Akun → Bantuan, Akun → Keluar. Build 28b **gagal** probe ini (exit 1), build
28c **lulus** (exit 0). Inilah pembeda yang tidak ada di verifikasi 28b.

### 2.5 Kenapa serialisasi lewat `onDismiss` TIDAK dipakai

Rencana awal menyebut `onDismiss` sebagai cara yang "benar" di Android. Setelah
dibaca di sumber RN 0.86, itu **tidak benar** dan akan membuat antrean macet:

```
Libraries/Modal/Modal.js:318
  const onDismiss = () => {
    // OnDismiss is implemented on iOS only.
    if (Platform.OS === 'ios') { ... this.props.onDismiss(); }

ReactAndroid/.../views/modal/ReactModalHostManager.kt:112
  put("topDismiss", mapOf("registrationName" to "onDismiss")) // iOS only
```

Di Android tidak ada event "jendela sudah benar-benar ditutup". Karena itu
serialisasi tetap memakai antrean dengan promosi satu tick (mekanisme 28b, yang
tidak menyebabkan bug ini), dan `Dialog` sengaja **tidak** memakai `onDismiss`.
Ada tes yang mengunci keputusan ini supaya tidak ada yang menambahkannya lagi
tanpa membaca catatan ini.

---

## 3. Perubahan

### 3.1 `src/lib/dialogTampil.ts` (baru)

Fungsi murni `rencanaRenderDialog(visible, memegangSlot)` mengembalikan
`{ modal, konten }` dengan invarian **`konten === modal`**. Tujuannya
memindahkan keputusan "apa yang dirender" ke satu tempat yang bisa diuji
`node --test`, sehingga tidak bisa lagi ada keadaan "modal tampil, konten
ditahan". Fungsi ini sengaja hanya punya dua parameter — tidak ada slot untuk
opacity/animasi yang bisa menunda konten.

### 3.2 `src/components/ui/Dialog.tsx`

Inti perbaikan:

1. **`Animated` dihapus seluruhnya dari komponen.** Kartu dialog sekarang
   `View` biasa — tanpa `opacity`, tanpa `transform: scale`, tanpa
   `useNativeDriver`. Kelas NativeWind (`rounded-xl bg-white p-5`) tetap di
   `View` yang sama seperti sebelumnya.
2. **Animasi diserahkan ke `animationType` milik `<Modal>`** (default `"fade"`;
   `"none"` bila Reduce Motion aktif). Di Android ini memakai animasi jendela
   native `catalyst_fade_in/out` (`ReactModalHostView.showOrUpdate()` memilih
   `Theme.FullScreenDialogAnimatedFade`), yang bekerja pada level **jendela**,
   bukan pada opacity view di dalamnya — jadi tidak bisa membuat konten
   tak terlihat secara permanen.
3. **Konten atomis dengan `visible`** lewat `rencanaRenderDialog`; `visible`
   pada `<Modal>` kini literal `true` karena modal hanya dirender saat memang
   harus tampil (sebelumnya `visible={visible}` bisa `false` sementara komponen
   masih ter-mount).
4. **Tidak memakai `onDismiss`** (alasan di §2.5), didokumentasikan di docblock.
5. `testID` kini juga dipasang pada kartu (`${testID}-kartu`) supaya uji bisa
   menunjuk kartu secara eksplisit.

Perilaku yang dipertahankan: overlay `rgba(15,23,42,0.5)`, kartu radius 16 /
`p-5`, lebar `min(layar-48, 360)`, `shadowStyle("modal")`, padding safe-area,
dismiss lewat backdrop, `onRequestClose` untuk tombol BACK,
`accessibilityViewIsModal`, dan **unmount total saat tertutup** (perbaikan
`ae9a522`).

### 3.3 Tes regresi (baru, 13 tes)

`src/lib/__tests__/dialogTampil.test.ts` (7 tes) — mengunci invarian
`konten === modal` untuk semua kombinasi, menolak parameter tambahan
(`rencanaRenderDialog.length === 2`), dan memperlakukan nilai non-boolean
sebagai "tidak tampil".

`src/lib/__tests__/dialogStruktur.test.ts` (6 tes) — membaca **teks sumber**
`Dialog.tsx` (komentar dibuang lebih dulu) dan gagal bila:
`Animated` dipakai, `opacity` disetel, `animationType` tidak diteruskan ke
`Modal`, keputusan render tidak lewat `rencanaRenderDialog`, `onDismiss`
dipakai, atau konten digate dengan syarat selain keberadaan prop.

Keduanya sudah diverifikasi **benar-benar gagal pada sumber 28b**: dengan
`git show 1baa380:src/components/ui/Dialog.tsx`, hasil pemeriksaannya
`Animated terpakai: true`, `opacity disetel: true`,
`pakai rencanaRenderDialog: false`.

### 3.4 `scripts/verify-dialog-konten-terlihat.mjs` (baru)

Probe Chromium headless yang mengukur hal yang benar-benar dikeluhkan, bukan
sekadar keberadaan elemen:

- opacity efektif kartu (dihitung dari kartu sampai `[aria-modal]`);
- luas kotak kartu yang benar-benar terlihat (`lebar × tinggi × opacity`);
- jumlah overlay yang hidup bersamaan;
- dengan `--bekukan-animasi`: `opacityAwalKartu` pada lukisan pertama dan
  penanda `pernahTransparan`.

Exit code 1 bila ada dialog tanpa kartu, kartu transparan, lebih dari satu
overlay, galat halaman, atau (mode `--bekukan-animasi`) kartu terlihat setelah
transparan.

### 3.5 `.gitignore`

Menambahkan `dist-web-28b/`, `dist-web-28c/`, `_scratch/` (artefak verifikasi
lokal).

---

## 4. Bukti verifikasi

### 4.1 Gerbang statis

```
npx tsc --noEmit                 → 0 error
node --test src/lib/__tests__/*.test.ts utils/__tests__/*.test.ts
                                 → 153 tes, 153 lulus, 0 gagal
                                   (sebelum: 140 tes; +13 tes baru)
npx expo lint                    → 0 error, 5 warning
                                   (kelima warning sudah ada sebelum perubahan;
                                    warning baru dari perubahan ini = 0)
```

### 4.2 Probe konten terlihat (pembeda 28b vs 28c)

```
node scripts/serve-static.mjs dist-web-28b 8811
node scripts/serve-static.mjs dist-web-28c 8812

node scripts/verify-dialog-konten-terlihat.mjs http://127.0.0.1:8811 --bekukan-animasi
  → exit 1, semuaKartuTerlihatSejakLukisanPertama: false,
    tidakAdaKartuPernahTransparan: false, opacityAwalKartu: [0,0,0,0,0,0]

node scripts/verify-dialog-konten-terlihat.mjs http://127.0.0.1:8812 --bekukan-animasi
  → exit 0, semuaKartuTerlihatSejakLukisanPertama: true,
    tidakAdaKartuPernahTransparan: true, opacityAwalKartu: [1,1,1,1,1,1]
```

Rincian per dialog (28c): hapus keranjang + 3 siklus, Bantuan, Keluar — semuanya
`opacityAwalKartu = 1`, `pernahTransparan = false`, luas terlihat 61.920 px²
(keranjang) dan 79.200 px² (Bantuan/Keluar), `jumlahOverlay = 1`, 0 galat
halaman.

### 4.3 Regresi yang dipertahankan (skrip lama, dijalankan ulang pada 28c)

| Skrip | Hasil |
|---|---|
| `verify-konkurensi-modal.mjs` | `puncak: 1`, `riwayat: [1, 0, 1]` — jendela lama dilepas dulu, baru dibuat yang baru |
| `verify-konfirmasi-ganda.mjs` | satu dialog, `konfirmasiKeduaDiperlukan: false`, keranjang kosong setelah konfirmasi |
| `verify-dialog-qty-dom.mjs` | dialog muncul pada pemicuan pertama; tutup → buka ulang berhasil; tiga siklus `[1,1,1]`; qty manual (12 → Grosir 1 Rp 70.000, 99 → clamp 15 + pesan, `abc1x2` → 12, flash sale qty 2 tetap Rp 72.000 dan qty 12 pindah Rp 70.000); detail produk ketik 12 → Rp 70.000; 0 galat halaman |

### 4.4 Cara menjalankan ulang

```
npx expo export -p web --output-dir dist-web-28c
node scripts/serve-static.mjs dist-web-28c 8812        # terminal lain
node scripts/verify-dialog-konten-terlihat.mjs http://127.0.0.1:8812 --bekukan-animasi
node scripts/verify-konkurensi-modal.mjs       http://127.0.0.1:8812
node scripts/verify-konfirmasi-ganda.mjs       http://127.0.0.1:8812
node scripts/verify-dialog-qty-dom.mjs         http://127.0.0.1:8812
```

Build pembanding 28b dibuat dengan mengembalikan `Dialog.tsx` ke `1baa380`
sesaat, mengekspor, lalu memulihkan berkas (sudah dipulihkan; `Animated` yang
tersisa di `Dialog.tsx` hanya di dalam komentar penjelasan).

---

## 5. Kenapa 28b gagal (ringkas)

1. **Diagnosisnya benar, perbaikannya belum menyentuh penyebab sebenarnya.**
   28b memperbaiki pola "dua jendela bertukar / tutup A buka B satu commit"
   (masalah nyata 28a), tetapi regresi "konten kosong" berasal dari animasi
   kartu yang sudah ada sejak sebelum 28b. Antrean justru membuat kartu baru
   muncul satu tick setelah jendela dibuat — kondisi yang paling rawan bagi
   animasi native-driver pada view yang belum ter-mount.
2. **Metrik verifikasi tidak menjangkau variabel yang rusak.** Semua probe 28b
   memeriksa keberadaan elemen dan teks. Kartu ber-`opacity: 0` tetap punya
   teks di `innerText` dan tetap `[aria-modal="true"]`.
3. **Web tidak bisa mereproduksi kelas bug ini secara default**, karena
   react-native-web menurunkan `useNativeDriver` ke driver JS dan frame selalu
   berjalan. Perlu probe yang mengukur opacity efektif pada lukisan pertama
   (dan itu sekarang ada, beserta exit code yang gagal pada build 28b).

---

## 6. Perubahan perilaku yang disengaja

1. **Tidak ada lagi animasi scale 0,95 → 1 pada kartu.** Animasi masuk/keluar
   sekarang fade di level jendela (`animationType`), konsisten di Android dan
   web. Ini konsekuensi langsung dari menghapus animasi manual pada konten.
2. **`animationType` mengikuti Reduce Motion secara langsung** (`"none"` bila
   aktif). Tidak lagi memakai state/effect, sehingga tidak ada `setState` di
   dalam effect (menjaga jumlah warning lint tetap 5).
3. **`<Modal visible>` selalu `true`** saat dirender; komponen tetap
   di-unmount total saat tidak tampil, jadi tidak ada dialog tersembunyi yang
   bisa difokus pembaca layar.

---

## 7. Sisa pekerjaan / tindak lanjut

1. **Uji perangkat fisik pada build APK berikutnya** — ini satu-satunya bukti
   yang belum bisa diambil di sini (tidak ada APK yang dibangun, dan tidak ada
   perangkat/emulator terpasang: `adb devices` kosong, `emulator -list-avds`
   kosong, `system-images/` tidak ada). Yang harus diuji di HP:
   Keranjang → Hapus (pemicuan pertama, tanpa BACK), Akun → Bantuan, Akun →
   Keluar, hapus alamat/simpanan (alur gagal → pesan galat menggantikan
   konfirmasi), serta buka-tutup dialog yang sama 3–5 kali.
2. **Emulator tidak dibuat** karena memerlukan unduhan system image multi-GB;
   sesuai arahan tugas, tidak tenggelam di setup emulator.
3. **Animasi masuk kini fade jendela, bukan scale.** Bila desain tetap ingin
   efek scale, implementasinya harus memakai API animasi yang tidak
   menggantungkan visibilitas konten pada nilai native-driver (mis. animasi
   pada properti yang tidak menyembunyikan konten, atau `animationType` khusus)
   — bukan mengembalikan `opacity` 0 pada kartu.
4. **`onDismiss`** bisa dipakai sebagai sinyal tambahan bila kelak dibutuhkan,
   tetapi **hanya** sebagai pelengkap (bukan syarat promosi antrean), karena di
   Android event itu tidak pernah dikirim.
5. **`Alert.alert`** di `CheckoutContext` dan detail produk tetap memakai dialog
   native; di luar lingkup bug ini.

---

## 8. Berkas terkait

Baru:

- `src/lib/dialogTampil.ts` — rencana render dialog (invarian konten = modal)
- `src/lib/__tests__/dialogTampil.test.ts` — 7 tes invarian
- `src/lib/__tests__/dialogStruktur.test.ts` — 6 tes pagar struktur komponen
- `scripts/verify-dialog-konten-terlihat.mjs` — probe konten benar-benar terlihat

Diubah:

- `src/components/ui/Dialog.tsx` — `Animated` dihapus, konten atomis dengan
  `visible`, animasi lewat `animationType` Modal, `testID` pada kartu
- `.gitignore` — `dist-web-28b/`, `dist-web-28c/`, `_scratch/`

Tidak di-commit (di `.gitignore`): `dist-web-28b/`, `dist-web-28c/`,
`_scratch/`.
