# W6 — Verifikasi E2E Regresi

Tanggal: 23 Oktober 2026
HEAD saat verifikasi: `f4f410e` (+ 3 commit perbaikan W6 di bawah)
Mode: web (`npx expo start --web --port 8133`), backend mock kontrak `routes/api.php`
(`.tmp-w6/mock.js`, port 18900, `EXPO_PUBLIC_API_URL=http://127.0.0.1:18900/api`).

Verifikasi dilakukan dengan menyapu DOM tiap layar di browser (bukan klik manual):
teks yang diambil adalah `document.body.innerText` + daftar `aria-label`, dan
setiap alur dicatat lolos/gagal dari kondisi DOM setelah aksi.

## Ringkasan

| Kelompok | Alur diuji | Lolos | Gagal |
| --- | --- | --- | --- |
| Auth & onboarding | 10 | 10 | 0 |
| Beranda & pencarian | 9 | 9 | 0 |
| Detail produk & ulasan | 10 | 10 | 0 |
| Keranjang | 6 | 6 | 0 |
| Checkout, pembayaran, pesanan sukses | 10 | 10 | 0 |
| Riwayat & detail pesanan | 10 | 10 | 0 |
| Simpanan (wishlist) | 3 | 3 | 0 |
| Notifikasi | 3 | 3 | 0 |
| Alamat | 8 | 8 | 0 |
| Akun, poin, metode bayar, kategori | 8 | 8 | 0 |
| Kasir (order masuk) | 3 | 3 | 0 |
| **Total** | **80** | **80** | **0** |

Bug nyata yang ditemukan dan diperbaiki: **3** (lihat §Perbaikan).
Catatan/non-bug: 2 (lihat §Catatan).

## Perbaikan

1. `3343c26` — **Instruksi pembayaran di akordeon memakai metode yang salah.**
   Sebelum perbaikan, isi akordeon memakai `instruksi` milik metode terpilih
   ketika split nonaktif, sehingga membuka “QRIS All Payment” menampilkan
   instruksi COD/Transfer. Sekarang tiap akordeon memakai
   `instruksiUntuk(metode)` (buildPaymentInstruction per metode).
   Bukti sesudah: membuka QRIS menampilkan “Pindai QRIS pada aplikasi pembayaran
   Anda / Bayar menggunakan QRIS All Payment…” tanpa “Bayar tunai…”.
2. `e9845de` — **Label aksesibilitas tombol ubah alamat salah.** Label tombol
   ubah menempelkan teks “Tambah Alamat Baru” di depan (“Tambah Alamat Baru —
   Ubah Rumah”), sehingga pembaca layar mengumumkan aksi yang keliru. Kini
   “Ubah <label>”.
3. `7414e4b` — **Cache sesi tidak dibuang saat login/daftar akun lain.**
   Masuk atau daftar dengan akun berbeda tanpa lewat “Keluar” masih menampilkan
   nama/poin/alamat pelanggan sebelumnya di layar Akun. `cacheManager.clear()`
   kini dipanggil tepat sebelum token baru disimpan (login & register).
   Bukti sesudah: daftar akun baru → layar Akun “Dewi Lestari · 0 poin”, data
   Siti Rahma tidak tersisa.

## Bukti per alur

### 1. Onboarding, login, register

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `auth.onboarding` | Lolos | “Lewati / Belanja Lebih Mudah, Setiap Hari / Mulai Sekarang” |
| `auth.onboarding->login` | Lolos | URL `/auth/login` |
| `auth.login.validasi-kosong` | Lolos | “Email wajib diisi”, “Password wajib diisi” (per field) |
| `auth.login.email-format` | Lolos | “Format email tidak valid” di bawah field email |
| `auth.login.kredensial-salah` | Lolos | “Email atau password salah.” di bawah field, tetap di `/auth/login` |
| `auth.login.sukses` | Lolos | redirect `/` → “Beranda · Siti Rahma” |
| `auth.register.validasi-kosong` | Lolos | 5 pesan “<Field> wajib diisi” |
| `auth.register.password-mismatch` | Lolos | “Konfirmasi password tidak cocok” |
| `auth.register.sukses` | Lolos | redirect `/` → “Beranda · Dewi Lestari” |
| `profil.akun-baru-tidak-bocor` | Lolos | Akun: “DL / Dewi Lestari / dewi@example.com / 0 poin”, tanpa data Siti |

Alur lupa password juga disapu: `/auth/forgot-password` → `/auth/verify-code`
(kode “9999” → “Kode salah”; kode “1234”) → `/auth/reset-password` → kembali ke
`/auth/login`. Halaman ini tidak termasuk refactor UI W1–W5 tetapi tetap jalan.

### 2. Beranda & pencarian

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `home.tampil` | Lolos | banner (“Banner 1 dari 2”), chip kategori, rail “Kategori Pilihan”, “Flash Sale” dengan harga coret `-18%` (Rp 27.000 vs Rp 33.000), grid “Produk Terbaru” (4 produk) |
| `home.banner-ganti` | Lolos | klik indikator “2/2” → “Banner 2 dari 2” |
| `search.buka` | Lolos | “Pencarian / Sedang Tren / Elektronik / Perabot Rumah / Fashion” |
| `search.saran` | Lolos | input “elek” → “Saran Pencarian → Elektronik” |
| `search.tanpa-hasil` | Lolos | “Tidak Ada Hasil! / Coba kata lain atau kata yang lebih umum. / Atur Ulang Pencarian” |
| `search.hasil` | Lolos | “Hasil untuk “blender” → Blender Cosmos 2 Liter · Rp 80.000 · 4,6 (12)” |
| `search.recent-trending` | Lolos | “Pencarian Terakhir / Hapus Semua / blender / zzzz” + “Sedang Tren” |
| `kategori.tampil` | Lolos | tab Kategori: rail “Semua/Elektronik/Perabot Rumah/Fashion”, “4 produk” |
| `kategori.filter` | Lolos | pilih Elektronik → “2 produk” (Blender + Kipas), Kemeja hilang |

### 3. Detail produk & ulasan

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `produk.buka-dari-hasil` | Lolos | `/product/4502` |
| `produk.detail` | Lolos | “Blender Cosmos 2 Liter / Rp 80.000 / Stok 15 / Varian: Default / Jumlah 1 / Deskripsi / Ulasan / Tambah ke Keranjang / Beli Sekarang” |
| `produk.carousel` | Lolos | tombol “Gambar berikutnya” → “Gambar 2 dari 3” (3 gambar, indikator 1/3–3/3) |
| `produk.varian-stok` | Lolos | varian Default terpilih, badge stok 15, qty 1→2 lewat “Tambah jumlah” |
| `produk.wishlist-toggle` | Lolos | “Tambah ke wishlist” → “Hapus dari wishlist” |
| `produk.stok-habis` | Lolos | produk stok 0: “Stok 0”, tombol “Tambah ke Keranjang” `aria-disabled=true`, `tabindex=-1`, tidak menambah item |
| `produk.ulasan` | Lolos | `/product/4502/reviews`: “4,5 / 2 penilaian · 2 ulasan”, distribusi 5→1, 2 ulasan (Andi, Rina) |
| `ulasan.urutkan` | Lolos | dropdown: “Paling Relevan / Terbaru / Rating Tertinggi / Rating Terendah”; pilih Tertinggi → urutan berubah |
| `ulasan.distribusi-bintang` | Lolos | angka ringkasan + label aksesibilitas “5 bintang: 1”, “4 bintang: 1”, … |
| `produk.tambah-keranjang` | Lolos | dialog “Berhasil — Blender Cosmos 2 Liter ditambahkan ke keranjang” |

### 4. Keranjang

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `cart.tampil` | Lolos | alamat pengiriman + “Blender Cosmos… Rp 80.000 · 2 · Sub-total Rp 160.000 · Gratis · Total Rp 160.000” |
| `cart.tambah-qty` | Lolos | qty 3 → “Sub-total Rp 240.000”, “3 item”, badge tab 3 |
| `cart.kurangi-qty` | Lolos | qty 2 → “Rp 160.000”, “2 item” |
| `cart.qty1-konfirmasi` | Lolos | menekan “Kurangi jumlah” pada qty 1 memunculkan “Hapus Produk? — Blender Cosmos 2 Liter — Produk ini akan dihapus…” |
| `cart.hapus-item` | Lolos | tombol hapus per item → dialog → “Hapus” → “Keranjang Anda kosong” |
| `cart.multi-item` | Lolos | 2 produk → “Sub-total Rp 113.000”, “2 item” |

### 5. Checkout → pembayaran → pesanan sukses

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `checkout.summary` | Lolos | “Ringkasan Pesanan / Alamat Pengiriman / Item Pesanan / Sub-total Rp 113.000 / Gratis / Total / Buat Pesanan” |
| `checkout.payment` | Lolos | “Total Pembayaran Rp 113.000”, akordeon 3 metode, “Pembayaran Campuran”, “Gunakan Poin” |
| `checkout.cod-default` | Lolos | akordeon terbuka default = “Cash on Delivery · Tunai” + instruksi tunai |
| `payment.instruksi-per-metode` | Lolos | buka QRIS → instruksi QRIS saja (tidak lagi bercampur COD/transfer) — **perbaikan #1** |
| `payment.instruksi-rekening` | Lolos | Transfer BCA: “Nomor Rekening 1234567890 / Atas Nama: Toko Zovora” |
| `payment.split-2-metode` | Lolos | toggle “Pembayaran Campuran” → 2 baris metode + input nominal; 50.000 + 63.000 → “Sudah dialokasikan Rp 113.000 / Kembalian Rp 0” |
| `payment.poin-aktif` | Lolos | toggle “Gunakan Poin” → input 15.000, “Total Pembayaran Rp 98.000” (113.000 − 15.000) |
| `checkout.success` | Lolos | `/checkout/success?orderNumber=INV-W6-803…`; “Pesanan Berhasil Dibuat!”, total, poin, countdown “00:59:54”, instruksi |
| `checkout.order-cod` | Lolos | pesanan COD tanpa split → sukses, “Total Bayar Rp 334.000”, instruksi “Cash on Delivery · Tunai” |
| `checkout.success-lacak` | Lolos | “Lacak Pesanan” → `/orders/803` |

### 6. Riwayat & detail pesanan

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `orders.riwayat` | Lolos | 4 pesanan (INV-W6-803/501/502/503) dengan status, item, total |
| `orders.filter-selesai` | Lolos | hanya INV-W6-502 (“Selesai / Diterima Kasir”) |
| `orders.filter-dibatalkan` | Lolos | hanya INV-W6-503 (“Dibatalkan / Ditolak”) |
| `orders.filter-menunggu` | Lolos | INV-W6-803 + INV-W6-501 (“Menunggu Verifikasi Kasir”) |
| `orders.filter-semua` | Lolos | keempat pesanan kembali tampil |
| `orders.detail` | Lolos | `/orders/501`: timeline “Pesanan dibuat → Menunggu verifikasi kasir → Diterima & diproses → Selesai”, item, alamat, metode, rincian split, total |
| `orders.cetak-struk` | Lolos | dialog “Struk diunduh — Berkas struk ESC/POS (.bin) tersimpan…” |
| `orders.batalkan` | Lolos | “Batalkan Pesanan?” → “Ya, Batalkan” → status “Dibatalkan / Ditolak” + “Pesanan telah dibatalkan.” |
| `orders.refresh-setelah-batal` | Lolos | kembali ke daftar: filter “Menunggu” tidak lagi memuat INV-W6-501 |
| `orders.beli-lagi` | Lolos | “Beli Lagi INV-W6-502” → “Ditambahkan ke Keranjang — 1 produk dimasukkan” + CTA “Ke Keranjang” |

### 7. Simpanan (wishlist)

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `wishlist.tampil` | Lolos | “Disimpan (2)” + 2 kartu + “+ Tambah ke Keranjang” |
| `wishlist.hapus` | Lolos | dialog “Hapus dari Simpanan?” → “Hapus” → “Disimpan (1)” |
| `wishlist.tambah` | Lolos | tombol “Tambah ke wishlist” di detail → “Disimpan (2)” |

### 8. Notifikasi

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `notifikasi.tampil` | Lolos | “Semua (3) / Belum dibaca (2)” + 3 item + penanda “Belum dibaca” |
| `notifikasi.tandai-per-item` | Lolos | buka item → pindah ke `/orders`, kembali: “Belum dibaca (1)” |
| `notifikasi.tandai-semua` | Lolos | menu “Lihat” → “Tandai semua dibaca” → “Tandai Semua Sudah Dibaca?” → “Ya” → “Belum dibaca (0)” |

### 9. Alamat

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `alamat.daftar` | Lolos | “Alamat Pengiriman (2)”, Rumah “Alamat Utama”, Kantor dengan “Jadikan Utama” |
| `alamat.jadikan-utama` | Lolos | setelah “Jadikan Utama Kantor”, badge “Alamat Utama” pindah ke Kantor |
| `alamat.tambah` | Lolos | form 7 field (label, penerima, telepon, alamat, kota, provinsi, kode pos) → “Alamat berhasil ditambahkan.” |
| `alamat.baru-di-daftar` | Lolos | “Alamat Pengiriman (3)” dengan entri “Gudang” |
| `alamat.ubah` | Lolos | ubah kode pos 40111→40113 → “Alamat berhasil diperbarui.” |
| `alamat.refresh-setelah-ubah` | Lolos | kembali ke daftar tanpa reload manual: baris Rumah memuat 40113, Kantor 40119 |
| `alamat.hapus` | Lolos | dialog “Hapus Alamat? — Alamat “Gudang”…” → “Hapus” → “(2)” |
| `alamat.label-ubah` | Lolos | tombol ubah berlabel “Ubah Rumah” / “Ubah Kantor” — **perbaikan #2** |

### 10. Akun, poin, metode bayar, kategori

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `profil.tampil` | Lolos | “Akun / SR / Siti Rahma / siti@example.com / 15.000 poin / Anggota sejak 1 Jan 2025” + 9 menu + versi |
| `profil.ganti-password-validasi` | Lolos | password beda → “Konfirmasi password tidak sama” + “Gagal — Periksa kembali kolom yang ditandai merah.” |
| `profil.edit-simpan` | Lolos | “Profil berhasil diperbarui.” |
| `profil.keluar` | Lolos | dialog “Keluar Akun?” → “Keluar” → `/auth/login` |
| `poin.riwayat` | Lolos | “Saldo Poin 15.000 / Setara Rp 15.000”, total didapat/dipakai, 3 baris riwayat dengan saldo akhir |
| `payment-methods.tampil` | Lolos | 3 kartu: COD (Tanpa biaya admin), Transfer BCA (Biaya admin Rp 2.500 + rekening), QRIS (Biaya 0,7%) |
| `kategori.tampil` | Lolos | rail kategori + grid “4 produk” |
| `kategori.filter` | Lolos | filter per kategori memberi “2 produk” untuk Elektronik |

### 11. Kasir — order masuk

| Alur | Status | Bukti DOM |
| --- | --- | --- |
| `kasir.login` | Lolos | form “Login Kasir / Admin” (email+password) → daftar “Order Masuk / Admin Zovora / Admin” |
| `kasir.verifikasi` | Lolos | “Verifikasi” pada INV-W6-9001 → “INV-W6-9001: Pesanan diverifikasi”, kartu hilang dari daftar |
| `kasir.tolak` | Lolos | “Tolak” → panel “Alasan penolakan (opsional)” + “Tolak Pesanan” → “INV-W6-9002: Pesanan ditolak” → empty state “Tidak Ada Order Menunggu” |

## Catatan (bukan bug / di luar cakupan)

- **`produk.tidak-ditemukan`** — membuka id yang tidak ada menampilkan
  “Koneksi Terputus / Terjadi kesalahan, silakan coba lagi”. Judul “Koneksi
  Terputus” untuk kasus 404 memang kurang tepat, tetapi kontrak/kamus teks tidak
  punya copy “produk tidak ditemukan” dan `ErrorState` hanya punya varian
  jaringan. Tidak diubah agar tidak menambah copy/desain baru di luar
  spesifikasi W6; dicatat sebagai usulan W7 (tambah `teks.empty.produk` +
  deteksi 404 di `muatProduk`).
- **Filter bintang pada ulasan** — lima bar distribusi rating bersifat
  tampilan (bukan tombol filter) sesuai guideline §3.10; tidak ada
  filter bintang di spesifikasi, jadi tidak diuji sebagai alur.

## Kualitas kode akhir

```
npx tsc --noEmit   → 0 error
npx expo lint      → 0 error, 4 warning (react-hooks/set-state-in-effect,
                      sudah ada sebelum W6: CheckoutContext, useUlasanProduk)
```

## Cara mengulang

```bash
# 1. mock API kontrak routes/api.php
PORT=18900 node .tmp-w6/mock.js &

# 2. web mode
EXPO_PUBLIC_API_URL=http://127.0.0.1:18900/api CI=1 \
  npx expo start --web --port 8133
```

Akun uji: `siti@example.com` / password apa pun kecuali `salah`
(mock menolak password `salah` untuk menguji error per field).
Staf: `admin@toko.com` / `admin123`.
