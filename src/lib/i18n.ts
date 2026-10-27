/**
 * Kamus copy UI (Bahasa Indonesia).
 * Sumber: docs/PATTERN DESIGN.txt §5 (empty state), §6 (lokalisasi), dan label
 * umum tombol/navigasi. Komponen UI TIDAK boleh menulis literal copy sendiri —
 * impor dari sini.
 *
 * Pemakaian: `teks.tombol.simpan` (autocomplete + type-safe) atau
 * `t("tombol.simpan")` untuk kunci dinamis.
 */

export const teks = {
  /** Label umum. */
  umum: {
    ya: "Ya",
    tidak: "Tidak",
    batal: "Batal",
    tutup: "Tutup",
    kembali: "Kembali",
    lanjut: "Lanjutkan",
    selesai: "Selesai",
    simpan: "Simpan",
    ubah: "Ubah",
    hapus: "Hapus",
    muat: "Muat",
    cari: "Cari",
    semua: "Semua",
    lihat: "Lihat",
    opsional: "opsional",
    wajib: "wajib",
    atau: "atau",
    memuat: "Memuat…",
    berhasil: "Berhasil",
    gagal: "Gagal",
    konfirmasi: "Konfirmasi",
  },

  /** Tombol aksi. */
  tombol: {
    masuk: "Masuk",
    daftar: "Daftar",
    keluar: "Keluar",
    mulai: "Mulai",
    getStarted: "Mulai Sekarang",
    login: "Masuk",
    signUp: "Daftar",
    kirimKode: "Kirim Kode",
    kirimUlangKode: "Kirim ulang kode",
    verifikasi: "Verifikasi",
    simpanPerubahan: "Simpan Perubahan",
    lanjutkan: "Lanjutkan",
    tambahKeKeranjang: "Tambah ke Keranjang",
    beliSekarang: "Beli Sekarang",
    belanjaSekarang: "Belanja Sekarang",
    lihatProduk: "Lihat Produk",
    jelajahiProduk: "Jelajahi Produk",
    browseProducts: "Jelajahi Produk",
    placeOrder: "Buat Pesanan",
    cobaLagi: "Coba Lagi",
    tryAgain: "Coba Lagi",
    izinkan: "Izinkan",
    janganIzinkan: "Jangan Izinkan",
    lupaPassword: "Lupa Password?",
    kirimInstruksi: "Kirim Instruksi",
    resetPassword: "Atur Ulang Password",
    tambahAlamat: "Tambah Alamat",
    ubahAlamat: "Ubah Alamat",
    pilihAlamat: "Pilih Alamat",
    gunakanPoin: "Gunakan Poin",
    terapkan: "Terapkan",
    lihatSemua: "Lihat Semua",
    clearAll: "Hapus Semua",
    markAllRead: "Tandai semua sudah dibaca",
  },

  /** Navigasi / tab bar. */
  nav: {
    home: "Beranda",
    kategori: "Kategori",
    keranjang: "Keranjang",
    akun: "Akun",
    pesanan: "Pesanan",
    wishlist: "Disimpan",
    notifikasi: "Notifikasi",
    alamat: "Alamat",
    poin: "Poin",
    metodePembayaran: "Metode Pembayaran",
    pengaturan: "Pengaturan",
    pencarian: "Pencarian",
  },

  /** Layar auth (onboarding, masuk, daftar, lupa password, kode, reset). */
  auth: {
    onboarding: {
      judul: "Belanja Lebih Mudah, Setiap Hari",
      deskripsi:
        "Temukan produk pilihan, simpan favorit, dan pantau pesanan Anda dalam satu aplikasi.",
      poin: {
        produk: "Ribuan produk siap kirim",
        poin: "Kumpulkan poin tiap belanja",
        pesanan: "Lacak pesanan real-time",
      },
      lewati: "Lewati",
    },
    belumPunyaAkun: "Belum punya akun?",
    sudahPunyaAkun: "Sudah punya akun?",
    daftarSekarang: "Daftar Sekarang",
    masukSekarang: "Masuk Sekarang",
    ingatSaya: "Ingat saya",
    kirimKodeKe: "Kode 4 digit dikirim ke {email}",
    kodeTerkirim: "Kode verifikasi sudah dikirim. Periksa email Anda.",
    passwordDiubah: "Password berhasil diubah. Silakan masuk.",
    cekEmail: "Periksa kotak masuk email Anda untuk instruksi selanjutnya.",
    kataSandiLemah: "Gunakan minimal 8 karakter dengan huruf dan angka.",
    syaratKetentuan:
      "Dengan mendaftar, Anda menyetujui Syarat & Ketentuan serta Kebijakan Privasi kami.",
  },

  /** Judul layar & label section. */
  judul: {
    home: "Beranda",
    signIn: "Masuk",
    signUp: "Buat Akun",
    forgotPassword: "Lupa Password",
    verifyCode: "Masukkan Kode",
    resetPassword: "Atur Ulang Password",
    search: "Pencarian",
    notifications: "Notifikasi",
    saved: "Disimpan",
    cart: "Keranjang",
    checkout: "Checkout",
    orderSummary: "Ringkasan Pesanan",
    payment: "Pembayaran",
    reviews: "Ulasan",
    orders: "Pesanan",
    profile: "Akun",
    addresses: "Alamat",
    points: "Poin",
    featured: "Unggulan",
    flashSale: "Flash Sale",
    topRated: "Rating Tertinggi",
    recentSearches: "Pencarian Terakhir",
    trendingSearches: "Sedang Tren",
    availableColors: "Warna Tersedia",
    deliveryAddress: "Alamat Pengiriman",
    priceSummary: "Ringkasan Harga",
    paymentMethod: "Metode Pembayaran",
  },

  /** Subjudul / helper text. */
  subjudul: {
    signIn: "Masuk untuk melanjutkan belanja",
    signUp: "Buat akun untuk mulai belanja",
    forgotPassword: "Masukkan email untuk menerima instruksi atur ulang",
    resetPassword: "Buat password baru untuk akun Anda",
    enterCode: "Kode 4 digit telah dikirim ke email Anda",
    emailTidakDiterima: "Email tidak diterima?",
    kirimUlangDalam: "Kirim ulang dalam {detik} dtk",
    searchPlaceholder: "Cari produk",
  },

  /** Field form. */
  field: {
    nama: "Nama",
    namaLengkap: "Nama Lengkap",
    email: "Email",
    password: "Password",
    passwordBaru: "Password Baru",
    konfirmasiPassword: "Konfirmasi Password",
    telepon: "Nomor Telepon",
    alamat: "Alamat",
    provinsi: "Provinsi",
    kota: "Kota / Kabupaten",
    kecamatan: "Kecamatan",
    kodePos: "Kode Pos",
    detailAlamat: "Detail Alamat",
    patokan: "Patokan",
  },

  /** Placeholder. */
  placeholder: {
    email: "nama@email.com",
    password: "Masukkan password",
    passwordBaru: "Minimal 8 karakter",
    konfirmasiPassword: "Ulangi password",
    nama: "Masukkan nama",
    telepon: "08xxxxxxxxxx",
    search: "Cari produk",
  },

  /** Pesan error & validasi (teks error selalu danger-700). */
  error: {
    umum: "Terjadi kesalahan. Coba lagi.",
    jaringan: "Koneksi internet bermasalah. Periksa jaringan Anda.",
    wajib: "{field} wajib diisi",
    emailTidakValid: "Format email tidak valid",
    passwordSalah: "Password salah",
    passwordPendek: "Password minimal 8 karakter",
    passwordTidakCocok: "Konfirmasi password tidak cocok",
    kodeSalah: "Kode salah, silakan coba lagi",
    kodeKedaluwarsa: "Kode sudah kedaluwarsa, kirim ulang kode",
    stokTidakCukup: "Stok tidak mencukupi",
    muatGagal: "Gagal memuat data",
    simpanGagal: "Gagal menyimpan perubahan",
    emailTidakTerdaftar: "Email tidak terdaftar",
    emailSudahDipakai: "Email sudah terdaftar",
    teleponSudahDipakai: "Nomor telepon sudah terdaftar",
    akunTidakAktif: "Akun Anda tidak aktif. Hubungi admin.",
    terlaluBanyakPercobaan: "Terlalu banyak percobaan. Coba lagi nanti.",
    fiturBelumTersedia:
      "Fitur atur ulang password belum aktif di server. Hubungi admin toko untuk reset manual.",
  },

  /** Empty state (copy resmi kit, guideline §5, versi Indonesia). */
  empty: {
    notifikasi: {
      judul: "Belum Ada Notifikasi!",
      deskripsi: "Anda belum punya notifikasi saat ini. Kami beri tahu begitu ada yang baru.",
      cta: "Jelajahi Produk",
    },
    pencarian: {
      judul: "Tidak Ada Hasil!",
      deskripsi: "Coba kata lain atau kata yang lebih umum.",
    },
    wishlist: {
      judul: "Belum Ada Barang Disimpan!",
      deskripsi: "Anda belum menyimpan barang apa pun. Buka beranda dan simpan beberapa.",
    },
    keranjang: {
      judul: "Keranjang Anda kosong",
      deskripsi: "Anda belum menambahkan produk apa pun.",
      cta: "Belanja Sekarang",
    },
    jaringan: {
      judul: "Koneksi Terputus",
      deskripsi: "Periksa koneksi internet Anda lalu coba lagi.",
      cta: "Coba Lagi",
    },
    pesanan: {
      judul: "Belum Ada Pesanan",
      deskripsi: "Pesanan yang Anda buat akan muncul di sini.",
      cta: "Mulai Belanja",
    },
    alamat: {
      judul: "Belum Ada Alamat",
      deskripsi: "Tambahkan alamat pengiriman agar proses checkout lebih cepat.",
      cta: "Tambah Alamat",
    },
  },

  /** Dialog & konfirmasi. */
  dialog: {
    izinNotifikasi: {
      judul: "Jangan Lewatkan Penawaran",
      deskripsi:
        "Aktifkan notifikasi agar kami bisa memberi tahu status pesanan dan promo terbaru.",
      izinkan: "Izinkan",
      janganIzinkan: "Jangan Izinkan",
    },
    hapusItem: {
      judul: "Hapus Produk?",
      deskripsi: "Produk ini akan dihapus dari keranjang Anda.",
      ya: "Hapus",
      batal: "Batal",
    },
    keluar: {
      judul: "Keluar Akun?",
      deskripsi: "Anda perlu masuk kembali untuk melanjutkan belanja.",
      ya: "Keluar",
      batal: "Batal",
    },
  },

  /** Checkout / pembayaran. */
  checkout: {
    subTotal: "Sub-total",
    ppn: "PPN",
    ongkosKirim: "Ongkos kirim",
    diskon: "Diskon",
    poin: "Poin",
    total: "Total",
    totalAmount: "Total Pembayaran",
    orContinueWith: "atau lanjutkan dengan",
    metodePembayaran: "Metode Pembayaran",
    cod: "COD (Bayar di Tempat)",
    qris: "QRIS",
    virtualAccount: "Virtual Account Bank",
    ewallet: "E-wallet (GoPay, OVO, DANA)",
    kartu: "Kartu Kredit / Debit",
    cicilan: "Cicilan",
    pilihMetode: "Pilih salah satu metode pembayaran",
    stok: "Stok",
    ukuran: "Ukuran",
    jumlah: "Jumlah",
    penghitunganPoin: "Poin akan dihitung setelah pembayaran",
    lanjutPembayaran: "Lanjutkan",
    pilihPembayaran: "Pilih metode pembayaran",
    pembayaranCampuran: "Pembayaran Campuran",
    pembayaranCampuranDeskripsi:
      "Gabungkan beberapa metode pembayaran (mis. tunai + transfer).",
    rincianPembayaran: "Rincian Pembayaran",
    tagihan: "Tagihan {nilai}",
    metodeKe: "Metode {nomor}",
    tambahMetode: "Tambah Metode",
    hapusMetode: "Hapus metode {nomor}",
    sudahDialokasikan: "Sudah dialokasikan",
    kurang: "Kurang",
    kembalian: "Kembalian",
    splitCatatanKaki:
      "Rincian ini ikut tercatat di catatan pesanan agar kasir dapat mencocokkan pembayaran.",
    splitBelumLengkap: "Pembayaran campuran butuh minimal 2 metode dengan nominal.",
    splitMaksimal: "Split pembayaran dibatasi 4 metode.",
    sisaOtomatis: "Sisa",
    nominalPlaceholder: "0",
    kodePromo: "Kode Promo",
    kodePromoPlaceholder: "Masukkan kode promo",
    pakai: "Pakai",
    promoDiterapkan: "Diskon {nilai} telah diterapkan",
    saldoPoin: "Saldo {jumlah} poin",
    poinKeterangan:
      "1 poin = {nilai}. Maksimal {maks} poin untuk pesanan ini.",
    poinMaks: "Maks",
    poinDipakai: "{jumlah} poin = -{nilai}",
    poinTidakTersedia: "Belum ada poin tersedia.",
    poinTidakBisaDipakai: "Tagihan sudah 0 setelah promo — poin tidak dapat dipakai.",
    gunakanPoin: "Gunakan Poin",
    catatan: "Catatan Pesanan",
    catatanPlaceholder: "Tulis catatan untuk pesanan Anda…",
    catatanOpsional: "Catatan Pesanan (opsional)",
    itemPesanan: "Item Pesanan",
    instruksiPembayaran: "Instruksi Pembayaran",
    nomorRekening: "Nomor Rekening",
    nomorTujuan: "Nomor Tujuan",
    atasNama: "Atas Nama",
    rekeningBelumDiatur: "Rekening tujuan belum diatur admin",
    transferKe: "Transfer ke {rekening} a.n. {nama}",
    metodeTidakAda: "Belum ada metode pembayaran aktif. Hubungi admin toko.",
    ongkirGratis: "Gratis",
    totalItem: "{jumlah} item",
    diskonPoin: "Poin ({jumlah} poin)",
    biayaAdmin: "Biaya admin {nilai}",

    /** Uang tunai (quick button + input manual + kembalian). */
    tunai: {
      judul: "Uang Tunai",
      deskripsi:
        "Pilih nominal cepat atau isi manual uang yang Anda siapkan. Kembalian dihitung otomatis.",
      uangPas: "Uang Pas",
      pecahan: "{label} pecahan",
      labelInput: "Uang Diterima",
      placeholder: "Contoh: 300000",
      diterima: "Uang diterima",
      kembalian: "Kembalian",
      kurang: "Kurang",
      kurangPeringatan: "Uang diterima kurang {nilai} dari total pembayaran.",
      kosong: "Isi nominal bila ingin uang tunai dicatat di nota.",
      catatanNota: "Uang tunai & kembalian ikut tercetak di nota pesanan.",
    },
  },

  /** Keranjang (W4). */
  keranjang: {
    alamatBelumAda: "Pilih alamat pengiriman",
    ganti: "Ganti",
    stok: "Stok {jumlah}",
    hapusItem: "Hapus {nama} dari keranjang",
    tambah: "Tambah",
    kurangi: "Kurangi",
    satuan: "per item",
    varian: "Varian {nama}",
    memuatAlamat: "Memuat alamat…",
    ringkasanHarga: "Ringkasan Harga",
  },

  /** Pesanan berhasil (W4). */
  sukses: {
    judul: "Pesanan Berhasil Dibuat!",
    deskripsi:
      "Pesanan menunggu verifikasi kasir. Selesaikan pembayaran sesuai instruksi di bawah agar pesanan segera diproses.",
    nomorPesanan: "Nomor Pesanan",
    totalBayar: "Total Bayar",
    poinDigunakan: "Poin digunakan",
    lacakPesanan: "Lacak Pesanan",
    kembaliBeranda: "Kembali ke Beranda",
    batasWaktu: "Batas waktu pembayaran",
    kedaluwarsa: "Pesanan kedaluwarsa",
    sampaiDengan: "s.d. {waktu}",
    statusJudul: "Status Pesanan",
    statusDeskripsi:
      "Pantau status di Riwayat Pesanan. Status berubah otomatis setelah kasir memverifikasi (diproses/selesai) atau menolak pesanan.",
  },

  /** Notifikasi (W4). */
  notifikasi: {
    semua: "Semua",
    belumDibaca: "Belum dibaca",
    tandaiSemua: "Tandai semua dibaca",
    tandaiSemuaJudul: "Tandai Semua Sudah Dibaca?",
    tandaiSemuaDeskripsi: "Semua notifikasi akan ditandai sebagai sudah dibaca.",
    berhasilTandai: "Semua notifikasi telah ditandai sebagai sudah dibaca.",
    gagalTandai: "Gagal menandai notifikasi. Silakan coba lagi.",
    belumAdaBaru: "Tidak Ada Notifikasi Baru",
    semuaDibaca: "Semua notifikasi sudah dibaca.",
    menu: "Menu notifikasi",
    belumDibacaA11y: "Belum dibaca",
    realtimeAktif: "Realtime aktif",
    realtimeGagal: "Notifikasi langsung tidak aktif",
    baru: "baru",
    // Toast global (di luar layar notifikasi) — lihat NotifikasiGlobal.
    bukaToast: "Buka notifikasi",
    suaraMati: "Suara notifikasi mati",
    aktifkanSuara: "Aktifkan suara notifikasi",
    orderBaru: "Order Baru",
  },

  /** Dialog izin notifikasi (soft-prompt, guideline §3.17). */
  izinNotifikasi: {
    judul: "Jangan Lewatkan Penawaran",
    deskripsi:
      "Aktifkan notifikasi agar kami bisa memberi tahu status pesanan dan promo terbaru.",
  },

  /** Status pesanan. */
  status: {
    menungguPembayaran: "Menunggu Pembayaran",
    menungguVerifikasi: "Menunggu Verifikasi Kasir",
    menunggu: "Menunggu",
    diproses: "Diproses",
    dikonfirmasi: "Dikonfirmasi",
    dikirim: "Dikirim",
    selesai: "Selesai",
    selesaiDiterima: "Selesai / Diterima Kasir",
    dibatalkan: "Dibatalkan",
    dibatalkanKasir: "Dibatalkan / Ditolak",
    retur: "Diretur",
    kedaluwarsa: "Kedaluwarsa",
    orderConfirmed: "Pesanan Dikonfirmasi",
    orderShipped: "Pesanan Dikirim",
    specialOffer: "Penawaran Spesial",
  },

  /** Aksesibilitas — label untuk pembaca layar (guideline §7). */
  a11y: {
    tambahKeWishlist: "Tambah ke wishlist",
    hapusDariWishlist: "Hapus dari wishlist",
    hapusDariKeranjang: "Hapus dari keranjang",
    tambahJumlah: "Tambah jumlah",
    kurangiJumlah: "Kurangi jumlah",
    tampilkanPassword: "Tampilkan password",
    sembunyikanPassword: "Sembunyikan password",
    bukaFilter: "Buka filter",
    tutupDialog: "Tutup dialog",
    bukaKeranjang: "Buka keranjang",
    bukaNotifikasi: "Buka notifikasi",
    hapusPencarian: "Hapus kata pencarian",
    kodeOtp: "Kode verifikasi digit {index}",
    muatUlang: "Muat ulang",
  },

  /** Beranda (W3) — banner, section header, flash sale. */
  beranda: {
    semuaKategori: "Semua",
    untukAnda: "Untuk Anda",
    bannerCta: "Belanja Sekarang",
    bannerLabel: "Banner {index} dari {total}",
    lihatSemua: "Lihat Semua",
    produkTerbaru: "Produk Terbaru",
    rekomendasi: "Rekomendasi Untukmu",
    kategoriPilihan: "Kategori Pilihan",
    geserBanner: "Geser banner",
    memuatBeranda: "Memuat beranda…",
    kosongProduk: "Belum ada produk di kategori ini",
    kosongProdukDeskripsi: "Coba lihat kategori lain atau kembali ke beranda.",
    stokHabis: "Stok habis",
    sisaStok: "Sisa {jumlah}",
  },

  /** Pencarian (W3) — suggestion, trending, recent. */
  pencarian: {
    placeholderBerganti: ["Cari produk", "Cari elektronik", "Cari pakaian", "Cari perabot rumah"],
    hapusSemua: "Hapus Semua",
    hapusRiwayat: "Hapus riwayat pencarian",
    trending: "Sedang Tren",
    hasilUntuk: "Hasil untuk “{query}”",
    jumlahHasil: "{jumlah} produk ditemukan",
    saran: "Saran Pencarian",
    gunakanSaran: "Gunakan saran {saran}",
    filter: "Filter",
    urutkan: "Urutkan",
    rentangHarga: "Rentang Harga",
    hargaMin: "Harga min",
    hargaMax: "Harga maks",
    terapkan: "Terapkan",
    reset: "Atur Ulang",
    kategori: "Kategori",
    memuat: "Mencari produk…",
    mulaiCari: "Mulai Cari Produk",
    mulaiCariDeskripsi: "Ketik nama produk, merek, atau kategori yang Anda cari.",
    riwayatKosong: "Belum ada pencarian terakhir.",
    ulangiCari: "Atur Ulang Pencarian",
    urut: {
      namaAZ: "Nama A-Z",
      namaZA: "Nama Z-A",
      hargaTerendah: "Harga Terendah",
      hargaTertinggi: "Harga Tertinggi",
      terbaru: "Terbaru",
      stokTerbanyak: "Stok Terbanyak",
    },
  },

  /** Detail produk (W3). */
  produk: {
    pilihVarian: "Pilih Varian",
    pilihVarianDeskripsi: "Silakan pilih varian produk terlebih dahulu.",
    varian: "Varian",
    warna: "Warna",
    ukuran: "Ukuran",
    jumlah: "Jumlah",
    subtotal: "Subtotal",
    deskripsi: "Deskripsi Produk",
    ulasan: "Ulasan Produk",
    lihatSemuaUlasan: "Lihat Semua Ulasan",
    belumAdaUlasan: "Belum ada ulasan",
    belumAdaUlasanDeskripsi: "Jadilah yang pertama memberi ulasan setelah produk tiba.",
    terlaris: "Terlaris",
    stokTersedia: "Stok {jumlah}",
    gambarKe: "Gambar {index} dari {total}",
    tambahKeranjangBerhasil: "{nama} ditambahkan ke keranjang",
    pilihVarianDulu: "Pilih varian dulu",
    galeriProduk: "Galeri produk",
    diskonPersen: "Diskon {persen} persen",
    /** Bagikan produk (link versi web ecommerce). */
    bagikan: "Bagikan",
    bagikanProduk: "Bagikan produk",
    bagikanJudul: "Bagikan Produk",
    bagikanDeskripsi:
      "Kirim tautan produk versi web ke teman, keluarga, atau grup chat.",
    tautanDisalin: "Tautan produk disalin",
    tautanDisalinDeskripsi:
      "Tempel tautan ini di aplikasi chat atau media sosial pilihan Anda.",
    bagikanGagal: "Tautan produk tidak bisa dibagikan. Salin manual dari dialog ini.",
    salinTautan: "Salin Tautan",
  },

  /** Barang disimpan (W4) — dialog & umpan balik. */
  simpanan: {
    hapusJudul: "Hapus dari Simpanan?",
    hapusDeskripsi: "Hapus {nama} dari barang tersimpan?",
    hapusGagal: "Gagal menghapus produk dari simpanan.",
    stokHabisJudul: "Stok Habis",
    stokHabisDeskripsi: "{nama} sedang tidak tersedia.",
    tambahBerhasilJudul: "Ditambahkan ke Keranjang",
    tambahBerhasilDeskripsi: "{nama} ditambahkan ke keranjang.",
    lihatKeranjang: "Lihat Keranjang",
    lanjutBelanja: "Lanjut Belanja",
    tambahGagal: "Gagal menambahkan produk ke keranjang.",
  },

  /** Ulasan (W3). */
  ulasan: {
    judul: "Ulasan",
    jumlahUlasan: "{jumlah} Ulasan",
    rating: "Rating",
    dariRating: "dari 5",
    jumlahRating: "{jumlah} penilaian · {ulasan} ulasan",
    urutkan: "Urutkan",
    palingRelevan: "Paling Relevan",
    terbaru: "Terbaru",
    ratingTertinggi: "Rating Tertinggi",
    ratingTerendah: "Rating Terendah",
    selengkapnya: "Selengkapnya",
    sembunyikan: "Sembunyikan",
    belumAda: "Belum Ada Ulasan!",
    belumAdaDeskripsi:
      "Produk ini belum punya ulasan. Ulasan pembeli akan tampil di sini setelah pesanan selesai.",
    hanyaBintang: "{bintang} bintang",
    fotoUlasan: "Foto ulasan {index}",
    bintangKe: "{bintang} dari 5 bintang",
  },

  /** Pesanan (W5) — riwayat, detail, timeline, struk. */
  pesanan: {
    riwayat: "Riwayat Pesanan",
    detail: "Detail Pesanan",
    nomor: "No. Pesanan",
    nomorTransaksi: "No. Transaksi",
    tanggal: "Tanggal",
    totalPembayaran: "Total Pembayaran",
    subtotalProduk: "Subtotal Produk",
    diskonTotal: "Diskon (promo + poin)",
    itemLainnya: "+{jumlah} item lainnya",
    jumlahItem: "{jumlah} item",
    produkDipesan: "Produk Dipesan",
    rincianPembayaran: "Rincian Pembayaran",
    statusPesanan: "Status Pesanan",
    instruksiPembayaran: "Instruksi Pembayaran",
    nomorRekening: "Nomor Rekening",
    atasNama: "Atas Nama",
    rincianSplit: "Rincian pembayaran campuran",
    statusPembayaran: "Status pembayaran: {status}",
    beliLagi: "Beli Lagi",
    batalkan: "Batalkan Pesanan",
    cetakStruk: "Cetak Struk",
    mencetak: "Mencetak…",
    kembaliRiwayat: "Kembali ke Riwayat",
    memuatUlang: "Memuat ulang…",
    tarikMuatUlang: "Tarik atau ketuk untuk memuat ulang",
    bayarDalam: "Bayar dalam {waktu}",
    batasPembayaran: "Batas pembayaran",
    batasSampai: "s.d. {waktu}",
    kedaluwarsaJudul: "Pesanan kedaluwarsa",
    kedaluwarsaDeskripsi:
      "Batas pembayaran {waktu} sudah terlewat. Pesanan akan otomatis dibatalkan oleh kasir.",
    dibatalkanJudul: "Pesanan ditolak / dibatalkan",
    dibatalkanDeskripsi:
      "Poin yang terpakai sudah dikembalikan otomatis. Silakan buat pesanan baru atau hubungi kasir untuk informasi lebih lanjut.",
    tidakDitemukan: {
      judul: "Pesanan Tidak Ditemukan",
      deskripsi: "Pesanan ini tidak tersedia atau sudah dihapus.",
    },
    filter: {
      semua: "Semua",
      pending: "Menunggu",
      selesai: "Selesai",
      dibatalkan: "Dibatalkan",
      retur: "Retur",
    },
    tahap: {
      dibuat: "Pesanan dibuat",
      dibuatDeskripsi: "Menunggu verifikasi kasir",
      diproses: "Diterima & diproses",
      diprosesDeskripsi: "Kasir memverifikasi pesanan",
      selesai: "Selesai",
      selesaiDeskripsi: "Pembayaran lunas",
    },
    dialogBatal: {
      judul: "Batalkan Pesanan?",
      deskripsi:
        "Pesanan yang dibatalkan tidak dapat dikembalikan. Poin yang terpakai akan dikembalikan otomatis.",
      ya: "Ya, Batalkan",
      tidak: "Tidak",
    },
    batalBerhasil: "Pesanan telah dibatalkan.",
    batalGagal: "Gagal membatalkan pesanan. Silakan coba lagi.",
    reorder: {
      tidakAdaJudul: "Tidak Bisa Membeli Lagi",
      tidakAdaDeskripsi: "Detail item pesanan tidak tersedia.",
      gagalJudul: "Tidak Ada Produk yang Bisa Dibeli Lagi",
      gagalDeskripsi: "Produk mungkin sudah tidak tersedia atau stok habis.",
      berhasilJudul: "Ditambahkan ke Keranjang",
      berhasilDeskripsi: "{jumlah} produk dimasukkan ke keranjang.",
      dilewati: "Tidak tersedia: {daftar}",
      lanjutBelanja: "Lanjut Belanja",
      keKeranjang: "Ke Keranjang",
    },
    struk: {
      diunduhJudul: "Struk diunduh",
      diunduhDeskripsi:
        "Berkas struk ESC/POS (.bin) tersimpan di folder unduhan. Kirim ke printer thermal lewat RawBT (menu Print File) atau driver printer.",
      appJudul: "Aplikasi Tidak Ditemukan",
      appDeskripsi:
        "Untuk mencetak struk, silakan install aplikasi RawBT atau Thermer dari Play Store.",
      bukaPlayStore: "Buka Play Store",
      gagal: "Gagal mencetak struk.",
      /** PDF struk pelanggan (bukan thermal). */
      pdfJudul: "Struk PDF dibuat",
      pdfDeskripsi:
        "Struk disimpan sebagai PDF dan siap dibagikan. Simpan atau kirim lewat aplikasi pilihan Anda.",
      webJudul: "Struk siap dicetak",
      webDeskripsi:
        "Dialog cetak terbuka. Pilih \u201cSave as PDF\u201d / \u201cSimpan sebagai PDF\u201d untuk menyimpan struk.",
      tokoCadangan:
        "Identitas toko tidak bisa dimuat. Kop struk memakai nama sementara \u201cToko Kami\u201d.",
    },
  },

  /** Alamat pengiriman (W5) — daftar, form tambah/ubah, validasi. */
  alamat: {
    judul: "Alamat Pengiriman",
    judulDenganJumlah: "Alamat Pengiriman ({jumlah})",
    utama: "Alamat Utama",
    jadikanUtama: "Jadikan Utama",
    tambahBaru: "Tambah Alamat Baru",
    tambah: "Tambah Alamat",
    simpan: "Simpan Alamat",
    menyimpan: "Menyimpan…",
    jumlah: "{jumlah} alamat tersimpan",
    field: {
      label: "Label Alamat",
      labelPlaceholder: "Contoh: Rumah, Kantor, Kos",
      namaPenerima: "Nama Penerima",
      namaPenerimaPlaceholder: "Nama lengkap penerima",
      telepon: "Telepon Penerima",
      teleponPlaceholder: "Contoh: 08123456789",
      alamatLengkap: "Alamat Lengkap",
      alamatPlaceholder: "Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan",
      kota: "Kota / Kabupaten",
      kotaPlaceholder: "Contoh: Jakarta Selatan",
      provinsi: "Provinsi",
      provinsiPlaceholder: "Contoh: DKI Jakarta",
      kodePos: "Kode Pos",
      kodePosPlaceholder: "Contoh: 12345",
    },
    utamaToggle: "Jadikan Alamat Utama",
    utamaToggleDeskripsi: "Alamat ini dipakai sebagai alamat default saat checkout.",
    wajibCatatan: "* Field yang wajib diisi",
    berhasilTambah: "Alamat berhasil ditambahkan.",
    berhasilUbah: "Alamat berhasil diperbarui.",
    berhasilHapus: "Alamat berhasil dihapus.",
    berhasilUtama: "{label} sekarang menjadi alamat utama.",
    gagalUtama: "Gagal mengubah alamat utama.",
    gagalHapus: "Gagal menghapus alamat.",
    gagalSimpan: "Gagal menyimpan alamat.",
    utamaTidakBisaDihapus:
      "Alamat utama tidak bisa dihapus. Pilih alamat lain sebagai alamat utama dahulu.",
    dialogHapus: {
      judul: "Hapus Alamat?",
      deskripsi: "Alamat “{label}” akan dihapus permanen.",
    },
    tidakDitemukan: {
      judul: "Alamat Tidak Ditemukan",
      deskripsi: "Alamat yang Anda cari tidak tersedia atau sudah dihapus.",
    },
    validasi: {
      label: "Label alamat wajib diisi",
      nama: "Nama penerima wajib diisi",
      telepon: "Telepon penerima wajib diisi",
      teleponFormat: "Format telepon tidak valid",
      alamat: "Alamat lengkap wajib diisi",
      kota: "Kota wajib diisi",
      provinsi: "Provinsi wajib diisi",
      kodePos: "Kode pos wajib diisi",
      kodePosFormat: "Kode pos harus 5 digit angka",
      lengkapi: "Mohon lengkapi semua field dengan benar.",
    },
  },

  /** Akun / profil (W5). */
  profil: {
    judul: "Akun",
    ubahProfil: "Ubah Profil",
    poin: "{jumlah} poin",
    anggotaSejak: "Anggota sejak {tanggal}",
    menu: {
      pesanan: { judul: "Pesanan Saya", deskripsi: "Lihat riwayat pesanan Anda" },
      poin: { judul: "Poin Saya", deskripsi: "Saldo & riwayat penggunaan poin" },
      wishlist: { judul: "Disimpan", deskripsi: "Produk favorit Anda" },
      alamat: { judul: "Alamat Pengiriman", deskripsi: "Kelola alamat pengiriman Anda" },
      metode: {
        judul: "Metode Pembayaran",
        deskripsi: "Daftar metode & instruksi pembayaran",
      },
      kasir: {
        judul: "Order Masuk (Kasir)",
        deskripsi: "Verifikasi / tolak pesanan online",
      },
      pengaturan: {
        judul: "Pengaturan Akun",
        deskripsi: "Ubah data diri dan password",
      },
      bantuan: { judul: "Bantuan", deskripsi: "Pusat bantuan dan dukungan" },
    },
    bantuanJudul: "Bantuan",
    bantuanDeskripsi:
      "Hubungi kasir/toko melalui telepon atau kunjungi toko langsung untuk bantuan pesanan.",
    versi: "Versi Aplikasi {versi}",
    gagalMuat: "Gagal memuat profil",
    dialogKeluarJudul: "Keluar Akun?",
    dialogKeluarDeskripsi: "Anda perlu masuk kembali untuk melanjutkan belanja.",
    keluar: "Keluar",
    keluarGagal: "Terjadi kesalahan saat logout.",
    ubah: {
      judul: "Ubah Profil",
      infoPribadi: "Informasi Pribadi",
      ubahPassword: "Ubah Password",
      ubahPasswordDeskripsi: "Kosongkan kolom password jika tidak ingin mengubahnya.",
      berhasil: "Profil berhasil diperbarui.",
      gagal: "Gagal memperbarui profil. Silakan coba lagi.",
      namaWajib: "Nama tidak boleh kosong",
      emailWajib: "Email tidak boleh kosong",
      teleponWajib: "Nomor telepon tidak boleh kosong",
      passwordTidakCocok: "Konfirmasi password tidak sama",
      passwordPendek: "Password minimal 8 karakter",
      periksaField: "Periksa kembali kolom yang ditandai merah.",
    },
  },

  /** Metode pembayaran & instruksi rekening (W5). */
  metodeBayar: {
    judul: "Metode Pembayaran",
    deskripsi: "Metode pembayaran aktif di toko. Instruksi di bawah dipakai saat checkout.",
    biayaAdmin: "Biaya admin {nilai}",
    tanpaBiaya: "Tanpa biaya admin",
    persentase: "Biaya {persen}%",
    rekening: "Rekening Tujuan",
    instruksiJudul: "Instruksi",
    tidakAda: {
      judul: "Belum Ada Metode Pembayaran",
      deskripsi: "Admin toko belum mengaktifkan metode pembayaran.",
    },
    instruksiKosong: "Ikuti instruksi dari kasir untuk menyelesaikan pembayaran.",
  },

  /** Riwayat poin (W5). */
  poin: {
    judul: "Poin Saya",
    saldo: "Saldo Poin",
    setara: "Setara {nilai} · 1 poin = {perPoin}",
    totalDidapat: "Total didapat",
    totalDipakai: "Total dipakai",
    keterangan:
      "Poin dapat dipakai saat checkout. 1 poin = Rp 1 dan akan dikembalikan otomatis bila pesanan dibatalkan/ditolak.",
    riwayat: "Riwayat Poin",
    saldoAkhir: "Saldo akhir: {jumlah}",
    kosong: {
      judul: "Belum Ada Riwayat Poin",
      deskripsi: "Poin akan tercatat setelah transaksi pertama Anda selesai.",
    },
    jenis: {
      dapat: "Poin didapat",
      pakai: "Poin dipakai",
      kadaluarsa: "Poin kedaluwarsa",
      koreksi: "Koreksi poin",
      refund: "Pengembalian poin",
    },
    jumlahPoin: "{jumlah} poin",
  },

  /** Kategori / daftar produk (W5). */
  kategori: {
    judul: "Kategori",
    semua: "Semua",
    jumlah: "{jumlah} produk",
    kosong: {
      judul: "Belum Ada Produk",
      deskripsi: "Belum ada produk di kategori ini. Coba kategori lain.",
      cta: "Lihat Semua",
    },
    pilihKategori: "Pilih kategori",
    memuatLagi: "Memuat produk…",
    galatLagi: "Gagal memuat produk berikutnya.",
    habis: "Semua produk sudah tampil",
  },

  /** Layar kasir (W5) — login staf & verifikasi order online. */
  kasir: {
    judul: "Order Masuk",
    judulLengkap: "Order Masuk (Kasir)",
    loginJudul: "Login Kasir / Admin",
    loginDeskripsi:
      "Hanya akun Admin atau Super Admin yang dapat memakai endpoint API staf. Akun kasir dapat memverifikasi lewat halaman web kasir.",
    masuk: "Masuk",
    emailPlaceholder: "admin@toko.com",
    passwordPlaceholder: "••••••••",
    emailWajib: "Email dan password wajib diisi.",
    loginGagal: "Login staf gagal. Periksa email/password.",
    sesiBerakhir: "Sesi staf berakhir, silakan login ulang.",
    muatGagal: "Gagal memuat order masuk.",
    memuat: "Memuat order masuk…",
    kosong: {
      judul: "Tidak Ada Order Menunggu",
      deskripsi: "Semua pesanan online sudah diverifikasi atau ditolak.",
    },
    itemTidakAda: "Detail item tidak tersedia",
    kirimKe: "Kirim ke",
    catatanPelanggan: "Catatan pelanggan",
    menunggu: "Menunggu",
    kedaluwarsa: "Order sudah kedaluwarsa",
    sisaWaktu: "Sisa waktu bayar {waktu}",
    alasanPlaceholder: "Alasan penolakan (opsional)",
    verifikasi: "Verifikasi",
    tolak: "Tolak",
    batalTolak: "Batal Tolak",
    tolakPesanan: "Tolak Pesanan",
    bukaHalamanKasir: "Buka Halaman Kasir Backend",
    catatan: "Catatan",
    verifikasiGagal: "Verifikasi gagal.",
    tolakGagal: "Penolakan gagal.",
    keluar: "Keluar sesi staf",
    orderBaruMasuk: "Order baru masuk — daftar diperbarui otomatis.",
    realtime: {
      aktif: "Realtime aktif",
      mati: "Realtime tidak aktif",
    },
  },

  satuan: {
    mnt: "mnt",
    jam: "jam",
    hari: "hari",
    item: "item",
    produk: "produk",
    ulasan: "ulasan",
  },
} as const;

export type KamusTeks = typeof teks;

/** Kunci bertitik untuk lookup dinamis, mis. "empty.keranjang.judul". */
type DotPaths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : DotPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type KunciTeks = DotPaths<KamusTeks>;

/** Ganti `{nama}` dengan nilai dari `vars`. */
export function interpolasi(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * Lookup kunci bertitik dengan interpolasi.
 * `t("error.wajib", { field: teks.field.email })`
 */
export function t(key: KunciTeks | string, vars?: Record<string, string | number>): string {
  let node: unknown = teks;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return key;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? interpolasi(node, vars) : key;
}

export default teks;
