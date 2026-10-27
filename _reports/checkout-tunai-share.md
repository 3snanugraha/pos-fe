# Checkout Tunai (Pecahan + Kembalian) & Share Produk ke Web

Tanggal: 27 Oktober 2026
Repo: `pos-fe` (branch `main`), commit `d6b3bc0`
Lingkup: (a) pemilihan opsi tunai di checkout; (b) tombol share produk (app + web)

---

## Ringkasan hasil

| Item | Status | Bukti |
|---|---|---|
| Panel "Uang Tunai" pada metode tunai | Selesai | DOM: judul + tombol Uang Pas + Rp 276.000/280.000/300.000 |
| Tombol "Uang Pas" | Selesai | Klik → input `275000`, panel menampilkan Kembalian Rp 0 |
| Pecahan 2rb/5rb/10rb/20rb/50rb/100rb (pembulatan ke atas) | Selesai | Tagihan Rp 275.000 → Rp 276.000 / 280.000 / 300.000 (nominal kembar dibuang) |
| Input manual uang tunai | Selesai | `input[aria-label="Uang Diterima"]` |
| Validasi uang < tagihan | Selesai | Rp 250.000 → "Kurang Rp 25.000" + pesan + tombol disabled |
| Kembalian dihitung & tampil | Selesai | 300rb untuk 275rb → Kembalian Rp 25.000 |
| Kembalian tampil di nota/sukses | Selesai | `/checkout/success` dan struk PDF memuat baris Kembalian Rp 25.000 |
| Share produk dari app → link web | Selesai | Tombol ikon galeri + baris "Bagikan" berlabel |
| Share di versi web (Web Share API + fallback copy) | Selesai | `navigator.share` dipanggil dengan URL web; fallback menyalin + dialog |
| `npx tsc --noEmit` | 0 error | output kosong, exit 0 |
| `npx expo lint` | 0 error / 5 warning (semua pra-ada) | lihat §Verifikasi |
| `node --test` | 65 lulus / 0 gagal (suite terkait) | lihat §Verifikasi |
| Build web (`expo export --platform web`) | Sukses | 19 rute, termasuk `/checkout/payment` & `/product/[id]` |

---

## (a) Uang tunai di checkout

### UX yang dipilih

Panel muncul **di bawah daftar metode pembayaran, di atas "Pembayaran Campuran"**, hanya
ketika metode terpilih bertipe `tunai` dan mode split mati. Susunannya:

1. Judul "Uang Tunai" + deskripsi satu baris.
2. Baris tombol: **Uang Pas** + pecahan hasil pembulatan ke atas dari tagihan.
   Tombol aktif ditandai border primary + bg primary-100, target sentuh 44 pt.
3. Input manual "Uang Diterima" (prefiks `Rp`, `inputMode="numeric"`), border danger
   saat nominal kurang.
4. Ringkasan: "Uang diterima Rp X" lalu **Kembalian** (success-700, bold) atau
   **Kurang** (danger-700, bold) + pesan peringatan.
5. Catatan kaki: "Uang tunai & kembalian ikut tercetak di nota pesanan."

Aturan pecahan (`saranTunai`): untuk tiap pecahan `k`, nominal = `ceil(tagihan / k) * k`;
hasil yang sama dengan tagihan atau sudah muncul dibuang, lalu diurutkan naik. Jadi
tagihan Rp 275.000 menghasilkan tepat tiga tombol: Rp 276.000 (2rb), Rp 280.000 (5rb/10rb
bertabrakan → satu), Rp 300.000 (20rb/50rb/100rb bertabrakan → satu).

### Validasi

- `validasiTunai(total, diterima)` → `null` bila aman, termasuk saat input masih kosong
  (COD boleh dibuat lalu dibayar di tempat).
- Nominal terisi tetapi < tagihan → pesan "Uang diterima kurang Rp X dari total
  pembayaran." Tombol **Buat Pesanan** dinonaktifkan (`aria-disabled="true"`), dan
  `handlePlaceOrder` punya guard yang sama sehingga tidak ada jalan pintas ke API.

### Kembalian sampai ke nota

`POST /api/customer/orders` hanya menerima `metode_pembayaran_id` + `catatan`; kolom
`jumlah_dibayar`/`kembalian` diisi `0` oleh backend sampai kasir memverifikasi. Karena itu
angka tunai **tidak** dikarang ke kolom uang, melainkan ditulis ke catatan dengan penanda
yang bisa dibaca ulang — pola yang sama dengan `[Split: ...]` yang sudah ada:

```
[Tunai: diterima Rp 300.000; kembali Rp 25.000]
```

Yang membaca penanda itu:

- `/checkout/success` — baris "Uang diterima" + **Kembalian** (dari `catatan` server,
  param URL hanya cadangan).
- `/orders/[id]` — kartu metode pembayaran menampilkan uang diterima + kembalian;
  penanda dibuang dari catatan yang ditampilkan pelanggan.
- Struk PDF pelanggan (`bangunHtmlStruk`) — baris "Uang tunai diterima" + "Kembalian"
  tepat setelah Total.

Contoh kasus permintaan (bayar 300rb untuk belanjaan 275rb) terverifikasi di ketiga
tempat di atas.

### Berkas

| Berkas | Perubahan |
|---|---|
| `utils/tunai.ts` (baru) | Modul murni: `PECAHAN_UANG`, `saranTunai`, `bulatKeAtas`, `nominalTunai`, `hitungTunai`, `validasiTunai`, `tandaTunai`, `gabungCatatanTunai`, `parseTunaiCatatan`, `stripTunaiCatatan` |
| `src/components/commerce/UangTunaiPanel.tsx` (baru) | Panel UI (tombol cepat, input, ringkasan, peringatan) |
| `src/components/commerce/index.ts` | Ekspor `UangTunaiPanel` |
| `src/screens/checkout/CheckoutContext.tsx` | State `uangTunai`, turunan `uangTunaiNominal`/`tunaiKembalian`/`tunaiKurang`/`tunaiError`, guard submit, penulisan penanda ke `catatan`, param tunai ke layar sukses |
| `app/checkout/payment.tsx` | Panel dipasang untuk metode tunai; tombol Buat Pesanan ikut disabled saat `tunaiError` |
| `app/checkout/success.tsx` | Baris uang diterima + kembalian (`testID="kembalian-nota"`) |
| `app/orders/[id].tsx` | Kartu tunai di metode pembayaran; penanda tunai dibuang dari catatan; `tunai` diteruskan ke struk |
| `utils/strukPelanggan.ts` | Field `tunai` + baris nota "Uang tunai diterima"/"Kembalian" |
| `src/lib/i18n.ts` | Blok `teks.checkout.tunai.*` |

---

## (b) Share produk — app & web

### Tautan yang dibagikan

Selalu versi **web ecommerce**: `<origin>/product/<id>`. Aplikasi berjalan di Android/iOS
(skema `deadeastore://`) dan di web (http); penerima tautan di WhatsApp tidak bisa membuka
skema native, jadi URL mentah halaman aplikasi tidak dipakai.

Prioritas origin (`tentukanOriginWeb`):

1. `EXPO_PUBLIC_WEB_URL` — bila web ecommerce dideploy di domain terpisah.
2. `window.location.origin` — saat berjalan di web (yang dibagikan = domain yang sedang dibuka).
3. `API_ORIGIN` (origin backend tanpa `/api`) — pola deploy satu domain repo ini.
4. `https://gudangperabot.my.id` sebagai jaring terakhir.

### Perilaku

- **Web dengan Web Share API** → `navigator.share({title, text, url})`.
- **Web tanpa Web Share API**, atau `navigator.share` menolak (mis. `NotAllowedError`) →
  tautan disalin (`navigator.clipboard.writeText`, fallback `execCommand("copy")` via
  textarea untuk non-secure context) lalu dialog "Tautan produk disalin".
- **Pengguna menutup dialog share** (`AbortError`) → tidak ada aksi lanjutan (bukan error).
- **Native** → `Share.share` (sheet Android / activity sheet iOS); sheet ditutup =
  `dismissedAction` → tidak ada dialog tambahan.

### Titik masuk UI

- Ikon `Share2` di overlay galeri, di kiri tombol wishlist (`testID="tombol-bagikan-produk"`).
- Baris berlabel "Bagikan" + tautan web yang terlihat di bawah harga
  (`testID="tombol-bagikan-baris"`, tautan `testID="tautan-produk-web"`) — ini yang dipakai
  di versi web karena tombol berlabel lebih jelas daripada ikon saja.

### Berkas

| Berkas | Perubahan |
|---|---|
| `utils/tautanProduk.ts` (baru) | Penyusunan tautan murni (diuji `node --test`) |
| `utils/bagikanProduk.ts` (baru) | Eksekusi share/copy per platform + `salinTeks`, `urlProdukWeb`, `originWeb` |
| `app/product/[id].tsx` | Tombol ikon + baris bagikan, handler `onBagikan`, state `membagikan` |
| `src/lib/i18n.ts` | Blok `teks.produk.bagikan*` |

---

## Verifikasi (output nyata)

### TypeScript

```
$ npx tsc --noEmit
$ echo $?
0
```

### Lint

```
$ npx expo lint
✖ 5 problems (0 errors, 5 warnings)
```

Kelima warning pra-ada dan bukan dari perubahan ini:
`app/checkout/payment.tsx:168` (`useMemo` dep `instruksi` — kode lama),
`app/notifications/index.tsx:70`, `src/components/commerce/BannerCarousel.tsx:133`,
`src/screens/checkout/CheckoutContext.tsx:192`,
`src/screens/produk/useUlasanProduk.ts:156` (set-state-in-effect).

### Unit test

```
$ node --test utils/__tests__/tunai.test.ts utils/__tests__/tautanProduk.test.ts \
    utils/__tests__/strukPelanggan.test.ts utils/__tests__/instruksiPembayaran.test.ts \
    src/lib/__tests__/*.test.ts
ℹ tests 65
ℹ pass 65
ℹ fail 0
```

Kasus kunci yang dikunci test:

- `saranTunai(275000)` → `[275000 (pas), 276000, 280000, 300000]`, urut naik, tanpa duplikat.
- `hitungTunai(275000, 300000)` → `{cukup: true, kembalian: 25000, kurang: 0}`.
- `validasiTunai(275000, 250000)` mengembalikan pesan berisi "Rp 25.000"; `0` (kosong) dan
  `>= tagihan` → `null`.
- `gabungCatatanTunai` + `parseTunaiCatatan` round-trip, termasuk saat catatan sudah punya
  `[Split: ...]`.
- `bangunHtmlStruk` mencetak "Uang tunai diterima Rp 300.000" dan "Kembalian Rp 25.000";
  baris itu tidak muncul tanpa data tunai.
- `tentukanOriginWeb` prioritas env → halaman → API → produksi; `susunUrlProduk` tidak
  menghasilkan `//`.

### Build web

```
$ EXPO_PUBLIC_API_URL=http://127.0.0.1:18900/api npx expo export --platform web \
    --output-dir .tmp-w7-checkout/dist --clear
...
/checkout/payment (17KB)
/checkout/success (17KB)
/product/[id] (17KB)
Exported: .tmp-w7-checkout/dist
```

Build statis disajikan `node .tmp-w7-checkout/static.js 8133` dan diuji di Chromium
sungguhan (browser-use) terhadap mock API kontrak `routes/api.php`.

### Bukti DOM

**(1) Panel tunai, tagihan Rp 275.000** (`/checkout/payment`):

```
Total Pembayaran
Rp 275.000
Uang Tunai
Pilih nominal cepat atau isi manual uang yang Anda siapkan. Kembalian dihitung otomatis.
Uang Pas
Rp 276.000
Rp 280.000
Rp 300.000
Uang Diterima
Rp
Isi nominal bila ingin uang tunai dicatat di nota.
Uang tunai & kembalian ikut tercetak di nota pesanan.
```

**(2) Uang kurang Rp 250.000** — peringatan muncul, tombol ditahan:

```
Uang diterima
Rp 250.000
Kurang
Rp 25.000
Uang diterima kurang Rp 25.000 dari total pembayaran.
```
```
tombol "Buat Pesanan": {disabled: 'true', ... opacity-50 ...}
```

**(3) Klik tombol cepat "Rp 300.000"** — input terisi, kembalian 25rb, tombol aktif lagi:

```
klik: Rp 300.000 pecahan
Uang diterima
Rp 300.000
Kembalian
Rp 25.000
input[aria-label="Uang Diterima"].value === "300000"
tombol "Buat Pesanan": {disabled: None}
```

**(4) Klik "Uang Pas"** → `input.value === "275000"`, panel: `Uang diterima Rp 275.000`,
`Kembalian Rp 0`.

**(5) Payload order yang benar-benar dikirim** (log mock, `POST /api/customer/orders`):

```json
{
  "items": [{ "produk_id": 4599, "jumlah": 1 }],
  "metode_pembayaran_id": 11,
  "alamat_pengiriman": "Jl. Merdeka No. 12, RT 03 / RW 04, Bandung, Jawa Barat, 40111",
  "catatan": "[Tunai: diterima Rp 300.000; kembali Rp 25.000]",
  "poin_digunakan": 0
}
```

**(6) Layar sukses setelah order dibuat** (`/checkout/success?orderNumber=INV-W6-803&...
&tunaiDiterima=300000&tunaiKembalian=25000`):

```
Total Bayar
Rp 275.000
Uang diterima
Rp 300.000
Kembalian
Rp 25.000
```

**(7) Detail pesanan** (`/orders/803`) — penanda tidak tampil mentah, angkanya terurai:

```
Metode Pembayaran
Cash on Delivery
Tunai
Uang diterima
Rp 300.000
Kembalian
Rp 25.000
Status pembayaran: belum bayar
```

**(8) Nota/struk PDF pelanggan** (isi `iframe#struk-pelanggan-print` setelah tombol
"Cetak Struk", dibaca dari `contentDocument.body.innerText`):

```
Sofa Tamu Minimalis 3 Dudukan (Default)   1   Rp 275.000   Rp 275.000
Subtotal
Rp 275.000
Metode
Cash on Delivery
Total
Rp 275.000
Uang tunai diterima
Rp 300.000
Kembalian
Rp 25.000
```

**(9) Panel tunai tidak muncul saat bukan tunai / mode split:**

```
panel ada (tunai default): True
… pilih Transfer BCA …
panel ada (transfer): False
… aktifkan Toggle Pembayaran Campuran …
panel ada (split): False
```

**(10) Share di web — Web Share API** (`/product/4599`), `navigator.share` di-stub untuk
merekam argumen:

```
tombol share terpasang:
[{label: 'Bagikan produk', teks: '', testid: 'tombol-bagikan-produk'},
 {label: 'Bagikan produk', teks: 'Bagikan', testid: 'tombol-bagikan-baris'}]
tautan yang terlihat: http://127.0.0.1:8133/product/4599

navigator.share dipanggil dengan:
[{'title': 'Sofa Tamu Minimalis 3 Dudukan',
  'text': 'Sofa Tamu Minimalis 3 Dudukan — lihat & beli di toko online kami: http://127.0.0.1:8133/product/4599',
  'url': 'http://127.0.0.1:8133/product/4599'}]
```

**(11) Share di web — fallback salin** (`navigator.share` dihapus):

```
copied: http://127.0.0.1:8133/product/4599
dialog: Tautan produk disalin
        Tempel tautan ini di aplikasi chat atau media sosial pilihan Anda.
        OK
```

**(12) Share dibatalkan** (`AbortError`): `shareCalls: 1`, `copied: None`, tidak ada dialog
— sesuai harapan, pembatalan bukan error.

**(13) Tombol ikon di galeri** juga menembak share (`share dari ikon: 1`).

---

## Catatan & asumsi

1. **Backend tidak diubah.** Order online belum menerima uang (`jumlah_dibayar = 0`,
   `kembalian = 0` di `CustomerOrderController@store`), jadi uang tunai & kembalian
   dititipkan di `catatan` dengan penanda `[Tunai: ...]` — sejajar dengan `[Split: ...]`
   yang sudah dipakai. Bila kelak backend menerima `jumlah_dibayar`/`kembalian`, penanda
   ini tetap kompatibel (pembacaan memakai `parseTunaiCatatan`).
2. **Panel tunai sengaja tidak muncul di mode campuran.** Split sudah punya nominal per
   baris metode; menampilkan panel tunai di sana akan membuat dua sumber angka kembalian.
3. **`EXPO_PUBLIC_WEB_URL` belum diset di produksi.** Tanpa env, tautan mengikuti origin
   halaman (di web) atau origin API (di native) — untuk deploy satu domain hasilnya sudah
   benar. Bila web ecommerce dipindah ke subdomain, set variabel ini saat build.
   Belum ada subdomain ecommerce aktif saat verifikasi (`toko.`/`shop.` → NXDOMAIN), dan
   build web belum dideploy ke `gudangperabot.my.id`, jadi tautan `/product/<id>` di
   produksi belum dapat diuji hidup — verifikasi dilakukan pada build web lokal dengan
   rute yang sama.
4. **File milik subagent lain tidak di-commit.** `src/lib/i18n.ts` disentuh dua tugas;
   commit ini hanya memuat dua hunk milik tugas ini (`teks.checkout.tunai`,
   `teks.produk.bagikan*`). Perubahan lain di file itu (filter order, salin nomor,
   cetak thermal) tetap di working tree untuk subagent terkait.
5. **Artefak verifikasi** ada di `.tmp-w7-checkout/` (gitignored): `dist/` hasil export,
   `static.js`, `mock.js` (mock + produk 275rb), `actions.json` log request.
