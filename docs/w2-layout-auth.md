# W2 — Layout + Auth (Design System "Zovora")

Status: **selesai**. Fase ini menambah komponen layout dan mengganti seluruh layar auth.
Layar lama di luar auth (`app/`, `screens/`, `components/`) tetap dipakai apa adanya
sampai W3+; beranda hanya ditukar headernya.

Sumber kebenaran: `docs/PATTERN DESIGN.txt` (tidak diubah) + `docs/ui-refactor-plan.md`.
Fondasi W1: `docs/w1-fondasi.md`.

## 1. Komponen layout (`src/components/layout/`)

Barel: `src/components/layout/index.ts`.

| Komponen | Guideline | Catatan implementasi |
| --- | --- | --- |
| `AppBar` | §3.5 | Varian `default`: tinggi 56, back arrow 24 (target 44), judul Section 16/24 rata tengah, aksi kanan 44×44 atau ellipsis. Varian `auth`: back kotak 32 `rounded-md` bg neutral-100 (ikon 18), judul Title 24/30 + subjudul Small 12/16 neutral-500, rata kiri. |
| `HomeHeader` | §3.5 | `LinearGradient` tema kategori: `forYou` = primary-200 → primary-50 → putih (§2.1), `beauty` = peach-200 → neutral-50 → putih. Baris 1 judul Section bold + alamat Small neutral-700 terpotong + chevron-down, kanan dua icon button 36 bg putih `shadow-float` (heart & bag, badge danger-500). Baris 2 search bar 44 `rounded-md` border neutral-200. Baris 3 `CategoryTabs`. Gradien menjangkau di bawah tabs. |
| `CategoryTabs` | §3.6 | `ScrollView` horizontal gap 20, tiap tab ikon 24 di atas label Caption. Aktif: ikon primary-600, label primary-700 semibold, garis bawah 2 pt primary-600 lebar 24. Inaktif: neutral-600/500. |
| `BottomTabBar` | §3.18 | Tinggi 64 + `insets.bottom`, bg putih, border-top neutral-100, `shadowStyle("bar")` (fallback StyleSheet). Ikon Lucide 24, aktif `fill` primary-600 + label primary-700, inaktif neutral-400/500. Badge keranjang bulat 16 danger-500, teks Caption bold putih, `badgeJumlah()` → `99+`. |

Catatan tipe: `BottomTabBarProps` didefinisikan **struktural** di komponen, bukan
impor dari `@react-navigation/bottom-tabs`. expo-router 57 membundel salinan
`@react-navigation` sendiri, sehingga tipe `descriptors` dari paket terpisah tidak
kompatibel (`headerSearchBarOptions.autoCapitalize` beda union) dan memunculkan error
TS2322. Bentuk struktural lebih longgar tapi tetap memeriksa pemakaian nyata.

`aria-selected` ditambahkan eksplisit di tab (React Native Web tidak memetakan
`accessibilityState.selected` ke DOM untuk `role=tab`).

## 2. Integrasi tab bar

`app/(tabs)/_layout.tsx` sekarang memakai `tabBar={(props) => <BottomTabBar {...props} />}`.
Keempat route lama tetap terdaftar: `index`, `products`, `cart`, `profile`.
Label mengikuti `src/lib/i18n.ts` (`nav.home`, `nav.kategori`, `nav.keranjang`, `nav.akun`).

**Kerugian nol**: tidak ada route yang dihapus atau disembunyikan. `BottomTabBar`
memfilter `state.routes` berdasarkan `TAB_ZOVORA`, jadi kalau nanti ada route kelima
di `app/(tabs)` ia tetap bisa diakses lewat URL/deep link (hanya tidak tampil di bar)
— tidak ada layar yang hilang. Route di luar `(tabs)` (search, wishlist, orders,
checkout, notifications, points, addresses, product, kasir) tetap terjangkau lewat
header beranda dan layar lain seperti sebelumnya.

## 3. Layar auth (`src/screens/auth/`)

Route tipis di `app/auth/*` hanya me-re-export layar, sehingga logika tidak terikat
struktur expo-router.

| Layar | Route | Isi |
| --- | --- | --- |
| Onboarding | `/auth/onboarding` | Hero (headline Display 32/38 + logo), 3 poin manfaat, CTA primary `Mulai Sekarang` full width, link `Lewati`. Keduanya → `/auth/login`. |
| Sign In | `/auth/login` | `AppBar` varian auth (judul Title + subjudul), Input email + password (toggle eye), link `Lupa Password?` rata kanan, error per field, `KeyboardAvoidingView`, satu CTA primary. |
| Create Account | `/auth/register` | Nama, telepon, email, password, konfirmasi. Validasi telepon Indonesia, error per field (termasuk error 422 backend), teks syarat & ketentuan, satu CTA. |
| Forgot Password | `/auth/forgot-password` | `AppBar` auth, Input email, satu CTA `Kirim Instruksi`. |
| Enter Code | `/auth/verify-code` | `OtpInput` 4 digit terpusat, subjudul email tersamarkan (`samarkanEmail`), "Email tidak diterima?" + Resend dengan hitung mundur 30 dtk, CTA `Verifikasi`. |
| Reset Password | `/auth/reset-password` | Password baru + konfirmasi, helper "minimal 8 karakter", error per field, satu CTA. |

`AuthShell` menyatukan kerangka: `AppBar` varian auth, margin 24 (`px-6`), footer
sticky di atas safe area bawah, `KeyboardAvoidingView` membungkus seluruh isi +
footer sehingga CTA naik bersama keyboard.

**Route lama dipertahankan**: `/auth/login` dan `/auth/register` adalah nama yang
dirujuk `services/httpClient.ts`, `services/api.ts`, `utils/auth.ts`, dan
`screens/ProfileScreen.tsx`. Nama route tidak berubah — hanya isinya diganti layar
baru. `app/auth/_layout.tsx` menambahkan Stack untuk keenam route.

**Tanpa tombol social**: backend pelanggan hanya punya `/customer/login` dan
`/customer/register` (tanpa OAuth/OAuth token exchange), jadi `DividerAtau` dan dua
tombol Google/Apple **tidak dirender** sama sekali — tidak ada tombol mati.

## 4. Status backend untuk alur lupa password

Diperiksa (read-only) `pos-be/routes/api.php` + `CustomerAuthController`:
**tidak ada** endpoint reset password pelanggan.

Yang ada hanya:
- `POST /api/customer/register`, `POST /api/customer/login` (publik)
- `POST /api/customer/logout`, `GET/PUT /api/customer/profile` (auth:sanctum)

`routes/auth.php` punya `forgot-password`/`reset-password`, tapi itu guard **staff**
(session + `password_reset_tokens` untuk tabel `users`), bukan `pelanggan`.

### Kontrak yang dibutuhkan backend (sudah dipanggil FE, siap dipakai)

`services/passwordReset.ts` memanggil tepat tiga endpoint berikut. Begitu backend
menambahkannya, layar langsung berfungsi tanpa perubahan UI.

**1. `POST /api/customer/forgot-password`** (publik)

```json
{ "email": "budi@example.com" }
```

- `200 { "success": true, "message": "Kode dikirim", "data": { "email": "...", "kedaluwarsa_detik": 900 } }`
- `422 { "success": false, "message": "Validation error", "errors": { "email": ["..."] } }`
- Harus membalas `200` juga untuk email tak terdaftar (anti-enumerasi), cukup tanpa mengirim kode.
- Kode 4 digit disimpan hashed + `kedaluwarsa` (mis. 15 menit), rate-limit per email/IP.

**2. `POST /api/customer/verify-reset-code`** (publik)

```json
{ "email": "budi@example.com", "code": "1234" }
```

- `200 { "success": true, "data": { "reset_token": "<token sekali pakai>" } }`
- `422` dengan `errors.code` bila salah; `410 { "message": "Kode kedaluwarsa" }` bila lewat masa berlaku.
- `reset_token` sekali pakai, umur pendek (mis. 10 menit).

**3. `POST /api/customer/reset-password`** (publik)

```json
{ "email": "budi@example.com", "reset_token": "<token>", "password": "baru12345", "password_confirmation": "baru12345" }
```

- `200 { "success": true, "message": "Password berhasil diubah" }`
- `422` dengan `errors.password` / `errors.password_confirmation`.
- Wajib memvalidasi `reset_token` + email, lalu menghapus token dan mencabut token Sanctum lama pelanggan itu.

### Perilaku FE sementara (endpoint belum ada)

| Kondisi | Perilaku |
| --- | --- |
| 404 / 405 / 501 | Pesan `error.fiturBelumTersedia`: "Fitur atur ulang password belum aktif di server. Hubungi admin toko untuk reset manual." |
| Jaringan gagal | Pesan `error.jaringan` |
| 422 | Error per field dari `errors` backend |
| `success: false` lain | `message` backend |

Tidak ada backend baru yang dibangun di fase ini (sesuai batas tugas).

## 5. Verifikasi

- `npx tsc --noEmit` → **0 error**.
- `npx expo lint` → **0 error**, 18 warning. Semua warning adalah warisan layar lama
  (`react-hooks/set-state-in-effect` + 2 `exhaustive-deps`/`import/no-duplicates`);
  tidak ada warning dari file W2.
- Web mode (`npx expo start --web`), diuji terhadap mock backend yang meniru
  `routes/api.php` (port terpisah, bukan backend asli — port 8000 di mesin ini
  dipakai proses lain):
  - Onboarding → `Mulai Sekarang` → `/auth/login` → login sukses → `/` (beranda)
    dengan header baru + 4 tab.
  - Sign-in kosong → "Email wajib diisi" dan "Password wajib diisi" per field.
  - Sign-in password salah → pesan `rgb(185,28,28)` (danger-700) di bawah field,
    border field `rgb(239,68,68)` (danger-500), isi email tidak dihapus.
  - Sign-up kosong → 5 pesan per field; sign-up valid → beranda.
  - Forgot → verify (kode salah: 4 kotak border danger-500 + "Kode salah, silakan
    coba lagi"; kode benar) → reset (konfirmasi tidak cocok: "Konfirmasi password
    tidak cocok") → simpan → `/auth/login`.
  - Terhadap backend tanpa endpoint reset (404): pesan "Fitur atur ulang password
    belum aktif di server…" muncul, layar tidak macet.
- Pengukuran di browser (desktop 1264 px dan 360 px):
  - `BottomTabBar`: 4 tab, tinggi 64, bg `rgb(255,255,255)`, border-top
    `rgb(241,245,249)`, `box-shadow rgba(15,23,42,0.06) 0 -2px 8px`.
  - Tab aktif: label `rgb(3,105,161)` (primary-700), ikon `fill #0284C7`; inaktif
    label `rgb(100,116,139)`, `fill transparent`.
  - Badge keranjang: `rgb(239,68,68)`, radius 9999, 16 px, teks putih 10 px; dengan
    qty 150 → "99+" dan `aria-label` "Keranjang, 99+ item".
  - `HomeHeader`: gradien `linear-gradient(rgb(186,230,253), rgb(240,249,255), rgb(255,255,255))`
    setinggi 174 px (tabs termasuk), search bar 44 px radius 8 border
    `rgb(226,232,240)`.
  - `CategoryTabs`: label 10 px, font aktif `Inter_600SemiBold` + garis bawah
    `rgb(2,132,199)`, `aria-selected` benar.
  - AppBar auth: back 32×32 `rgb(241,245,249)` radius 8, judul 24/30 `Inter_700Bold`.
  - Onboarding: headline 32/38 `Inter_700Bold`, CTA bg `rgb(2,132,199)` 48 px
    radius 8 `Inter_600SemiBold`.
  - 360 px: `scrollWidth == innerWidth` di onboarding, sign-in, dan beranda
    (tidak ada overflow horizontal).
- Tidak ada route demo/temporary yang tertinggal.

## 6. Perbaikan yang ditemukan saat verifikasi

1. **Tipe tab bar vs expo-router** — `@react-navigation/bottom-tabs` terpasang sebagai
   dependensi terpisah, tapi expo-router 57 membundel salinannya sendiri. Impor
   `BottomTabBarProps` dari paket terpisah memunculkan TS2322. Solusi: tipe struktural
   lokal (lihat §1).
2. **`aria-selected` tidak terpasang** — RNW mengabaikan `accessibilityState.selected`
   untuk `role=tab`; ditambahkan prop `aria-selected` eksplisit di kedua komponen tab.
3. **`ScrollView` bersarang** di `SignUpScreen` (di dalam `ScrollView` milik
   `AuthShell`) — diganti `View`; gestur scroll bertabrakan di iOS/Android.
4. **Label OTP dobel** — `OtpInput` menggabungkan `accessibilityLabel` + label digit
   menjadi "Masukkan Kode Masukkan Kode verifikasi digit 1"; sekarang dipisah koma.
5. **Pesan statis menyesatkan** — "Periksa kotak masuk…" di Forgot dan "Password
   berhasil diubah" di Reset tampil sebelum submit; dihapus (pesan sukses hanya
   muncul dari hasil nyata).
6. **Set-state di body effect** — timer resend dan reset pesan saat mengetik
   dipindah keluar dari `useEffect` agar tidak menambah warning
   `react-hooks/set-state-in-effect`.

## 7. Catatan untuk fase berikutnya

- `AppBar` varian `default` sudah siap tapi belum dipakai layar mana pun; layar
  W3+ (search, notifications, wishlist, product) yang akan memakainya.
- Ikon kategori di beranda masih heuristik berbasis nama (`ikonKategori`). Bila
  backend menambah kolom ikon kategori, ganti pemetaan itu.
- `HomeHeader` belum punya varian "gradien ikut tab aktif" penuh: `tema` bisa
  dioper per layar, tapi perpindahan tema saat tab berubah diserahkan ke W3
  (butuh konten banner/featured yang juga berganti).
- Alamat di header memakai `user_data.alamat` (data tersimpan saat login). Bila
  pelanggan punya beberapa alamat, W5 (addresses) perlu mengoper alamat default
  dari `/customer/addresses`.
- Endpoint reset password harus dibuat di backend sebelum alur ini bisa dipakai
  13.836 pelanggan legacy; kontraknya ada di §4.
