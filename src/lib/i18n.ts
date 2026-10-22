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
    atasNama: "Atas Nama",
    rekeningBelumDiatur: "Rekening tujuan belum diatur admin",
    transferKe: "Transfer ke {rekening} a.n. {nama}",
    metodeTidakAda: "Belum ada metode pembayaran aktif. Hubungi admin toko.",
    ongkirGratis: "Gratis",
    totalItem: "{jumlah} item",
    diskonPoin: "Poin ({jumlah} poin)",
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
    diproses: "Diproses",
    dikirim: "Dikirim",
    selesai: "Selesai",
    dibatalkan: "Dibatalkan",
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
