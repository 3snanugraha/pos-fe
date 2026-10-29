import {
  CheckCheck,
  Clock,
  Filter as FilterIcon,
  LogOut,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react-native";
import { kembaliAman } from "../../src/lib/navigasi";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorState, Skeleton, StickyBar } from "../../src/components/commerce";
import { TombolSalin } from "../../src/components/kasir/TombolSalin";
import { AppBar } from "../../src/components/layout";
import { Button, Chip, Dialog, EmptyState, Input } from "../../src/components/ui";
import { rupiah, tanggalWaktu } from "../../src/lib/format";
import {
  FILTER_AWAL,
  LABEL_STATUS,
  PRESET_RENTANG,
  bangunQueryOrder,
  galatTanggalKustom,
  jumlahFilterAktif,
  ringkasFilter,
  tanggalTampil,
  type FilterOrder,
} from "../../src/lib/filterOrder";
import { paddingBawahKonten } from "../../src/lib/inset";
import { teks } from "../../src/lib/i18n";
import { colors, sizes } from "../../src/theme/tokens";
import {
  StaffApiError,
  StaffSessionUnavailableError,
  clearStaffSession,
  fetchOnlineOrdersBerhalaman,
  fetchStaffOrderDetail,
  fetchStaffPaymentMethods,
  getStaffUser,
  isCrossOriginWeb,
  loginStaff,
  loginStaffSession,
  onlineOrdersPageUrl,
  rejectOnlineOrder,
  verifyOnlineOrder,
  type StaffUser,
} from "../../services/staffSession";
import type { Transaction } from "../../services/types";
import { useOrderExpiry } from "../../utils/orderExpiry";
import {
  useNotifikasiMasuk,
  useRealtime,
  type PesanRealtime,
} from "../../src/lib/realtime/RealtimeProvider";
import { TombolSuara } from "../../src/components/notifikasi/TombolSuara";
import { cetakStrukOrderKasir } from "../../utils/cetakStrukThermal";

interface KasirOrder {
  transaction: Transaction;
  items: {
    id?: number;
    nama_produk: string;
    nama_varian?: string | null;
    nama_satuan?: string | null;
    jumlah: number;
    /**
     * API `detail_transaksi` mengirim `harga_satuan` (bukan `harga`);
     * keduanya dibaca supaya struk tidak mencetak "Rp 0".
     */
    harga?: number | string;
    harga_satuan?: number | string;
    subtotal: number | string;
  }[];
  alamat?: string | null;
  catatan?: string | null;
  total: number;
}

/** Hasil aksi yang mengubah data — plus tawaran cetak ulang bila gagal cetak. */
type Aksi = {
  tipe: "sukses" | "error";
  teks: string;
  /** Order yang sudah diverifikasi tetapi struknya gagal dicetak. */
  orderPerluCetak?: KasirOrder | null;
} | null;

/**
 * Order Masuk (Kasir) Zovora — guideline §3.2 (form login) + §3.9 (kartu) + §5.
 *
 * Tiga hal yang ditambahkan supaya layar ini informatif (sebelumnya hanya
 * daftar order pending tanpa alat bantu):
 *
 * 1. **Salin nomor transaksi** — tombol di setiap kartu; kasir sering perlu
 *    menempelkan nomor ke chat pelanggan atau catatan transfer.
 * 2. **Cetak struk thermal saat verifikasi** — setelah verifikasi berhasil,
 *    struk 58 mm dicetak (ESC/POS RawBT + fallback dialog cetak; lihat
 *    `utils/cetakStrukThermal.ts`). Bila printer belum siap, verifikasi tetap
 *    berhasil dan tombol "Cetak struk" tetap tersedia di kartu hasil.
 * 3. **Filter komprehensif** — status, rentang tanggal (preset + kustom),
 *    metode bayar, dan pencarian nomor/nama/telepon. Semuanya diterjemahkan
 *    ke parameter API (`src/lib/filterOrder.ts`) sehingga penyaringan terjadi
 *    di server; daftar tidak lagi terpotong pada 50 transaksi terbaru.
 *
 * Semua logika sesi staf (`loginStaff`, `loginStaffSession`,
 * `verifyOnlineOrder`, `rejectOnlineOrder`) tidak berubah. Konfirmasi tidak
 * memakai `Alert` (callback tidak jalan di web).
 */
export default function KasirOrdersScreen() {
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/");
  const insets = useSafeAreaInsets();
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [orders, setOrders] = useState<KasirOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [aksi, setAksi] = useState<Aksi>(null);
  const [mencetakId, setMencetakId] = useState<number | null>(null);
  /** Total baris dari `meta.total` (bukan panjang satu halaman). */
  const [totalOrder, setTotalOrder] = useState(0);
  /** Halaman yang sedang ditampilkan dan halaman terakhir menurut server. */
  const [halaman, setHalaman] = useState(1);
  const [halamanTerakhir, setHalamanTerakhir] = useState(1);
  const [memuatLagi, setMemuatLagi] = useState(false);

  // ---- Filter ------------------------------------------------------------
  /** Nilai di dialog (bisa diubah sebelum diterapkan). */
  const [filter, setFilter] = useState<FilterOrder>(FILTER_AWAL);
  /** Filter yang dipakai untuk permintaan terakhir. */
  const [filterAktif, setFilterAktif] = useState<FilterOrder>(FILTER_AWAL);
  const [filterTerbuka, setFilterTerbuka] = useState(false);
  const [metodeList, setMetodeList] = useState<
    { id: number; nama_metode: string }[]
  >([]);

  const jumlahFilter = jumlahFilterAktif(filterAktif);
  const galatTanggal = galatTanggalKustom(filter);
  const ringkasanFilter = useMemo(() => ringkasFilter(filterAktif), [filterAktif]);

  /**
   * Ubah baris API menjadi kartu siap tampil.
   *
   * Baris item sudah ikut dalam respons (`dengan_item=1`), jadi tidak ada lagi
   * N+1 `GET /transactions/{id}` per kartu. Detail per order hanya dipanggil
   * sebagai cadangan bila backend belum mengirim `detail_transaksi`, dan
   * kegagalannya tidak mengosongkan kartu.
   */
  const jadikanKartu = useCallback(async (rows: any[]): Promise<KasirOrder[]> => {
    return Promise.all(
      rows.map(async (trx) => {
        const itemsDariDaftar = trx.detail_transaksi;

        if (Array.isArray(itemsDariDaftar)) {
          return {
            transaction: trx,
            items: itemsDariDaftar,
            alamat: trx.alamat_pengiriman ?? null,
            catatan: trx.catatan ?? null,
            total: Number(trx.total_bayar) || 0,
          } as KasirOrder;
        }

        try {
          const detail = await fetchStaffOrderDetail(trx.id);
          return {
            transaction: trx,
            items: detail?.detail_transaksi ?? detail?.items ?? [],
            alamat: detail?.alamat_pengiriman ?? trx.alamat_pengiriman ?? null,
            catatan: detail?.catatan ?? trx.catatan ?? null,
            total: Number(detail?.total_bayar ?? trx.total_bayar) || 0,
          } as KasirOrder;
        } catch {
          return {
            transaction: trx,
            items: [],
            alamat: trx.alamat_pengiriman ?? null,
            catatan: trx.catatan ?? null,
            total: Number(trx.total_bayar) || 0,
          } as KasirOrder;
        }
      })
    );
  }, []);

  /**
   * Muat daftar order dari server.
   *
   * `halamanTujuan` default 1 (muat ulang penuh). Nilai > 1 dipakai tombol
   * "Muat lagi": baris halaman berikut DITAMBAHKAN, bukan menggantikan.
   */
  const loadOrders = useCallback(
    async (pakaiFilter: FilterOrder, halamanTujuan: number = 1) => {
      setError(null);
      const tambah = halamanTujuan > 1;

      if (tambah) setMemuatLagi(true);
      else setLoading(true);

      try {
        const hasil = await fetchOnlineOrdersBerhalaman(
          bangunQueryOrder(pakaiFilter, new Date(), halamanTujuan)
        );

        const lengkap = await jadikanKartu(hasil.rows as any[]);

        setOrders((sebelum) => (tambah ? [...sebelum, ...lengkap] : lengkap));
        setTotalOrder(hasil.total);
        setHalaman(hasil.halaman);
        setHalamanTerakhir(hasil.halamanTerakhir);
      } catch (err: any) {
        if (err instanceof StaffSessionUnavailableError) {
          await clearStaffSession();
          setStaff(null);
          setError(err.message);
        } else if (err instanceof StaffApiError && err.status === 401) {
          await clearStaffSession();
          setStaff(null);
          setError(teks.kasir.sesiBerakhir);
        } else {
          setError(err?.message ?? teks.kasir.muatGagal);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setMemuatLagi(false);
      }
    },
    [jadikanKartu]
  );

  /** Muat halaman berikutnya (order ke-51 dan seterusnya). */
  const muatLagi = () => {
    if (memuatLagi || halaman >= halamanTerakhir) return;
    void loadOrders(filterAktif, halaman + 1);
  };

  /**
   * Koneksi realtime dibuat di root saat aplikasi dibuka — ketika token staf
   * belum ada. Setelah login berhasil (atau sesi dipulihkan) kita harus
   * menyambung ulang, kalau tidak channel `private-orders` tidak pernah
   * dilanggani.
   */
  const { sambungUlang } = useRealtime();

  useEffect(() => {
    (async () => {
      const user = await getStaffUser();
      setStaff(user);
      setCheckingSession(false);
      if (user) {
        void loadOrders(FILTER_AWAL);
        // Sesi staf dipulihkan dari storage → token sudah ada, sambungkan.
        sambungUlang();
      }
    })();
    // Sekali saat mount: filter berikutnya diterapkan lewat aksi pengguna.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sambungUlang]);

  /** Metode bayar untuk filter. Gagal memuat tidak menghalangi daftar order. */
  useEffect(() => {
    if (!staff) return;

    let aktif = true;
    (async () => {
      try {
        // Token STAF, bukan token pelanggan: `apiService.getPaymentMethods()`
        // membaca `auth_token` sehingga di perangkat kasir hasilnya 401 dan
        // chip metode bayar kosong. Kegagalan tetap tidak fatal — dialog
        // hanya menampilkan "Semua metode".
        const metode = await fetchStaffPaymentMethods();
        if (aktif) setMetodeList(metode);
      } catch {
        if (aktif) setMetodeList([]);
      }
    })();

    return () => {
      aktif = false;
    };
  }, [staff]);

  /**
   * Realtime: order baru dari aplikasi mobile / pelanggan.
   *
   * Koneksi Pusher dipasang sekali di root (`RealtimeProvider`), bukan di
   * layar ini — jadi order baru tetap sampai walau kasir sedang membuka layar
   * lain, dan bell tetap berbunyi. Di sini kita hanya bereaksi terhadap event
   * yang memang milik layar ini.
   */
  const tanganiOrderBaru = useCallback(
    (pesan: PesanRealtime) => {
      if (pesan.notifikasi.target !== "kasir-order-baru") {
        return;
      }

      setAksi({ tipe: "sukses", teks: teks.kasir.orderBaruMasuk });
      void loadOrders(filterAktif);
    },
    [filterAktif, loadOrders]
  );

  useNotifikasiMasuk(tanganiOrderBaru);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(teks.kasir.emailWajib);
      return;
    }

    setLoggingIn(true);
    setError(null);

    try {
      const user = await loginStaff(email.trim(), password);
      setStaff(user);
      setPassword("");

      // Coba buka sesi web (cookie+CSRF) supaya tombol verify/reject berfungsi.
      try {
        await loginStaffSession(email.trim(), password);
      } catch (sessionError: any) {
        // Tidak fatal: daftar order tetap bisa dibaca via API token.
        setAksi({
          tipe: "error",
          teks: sessionError?.message ?? teks.kasir.loginDeskripsi,
        });
      }

      await loadOrders(filterAktif);
      // Token staf baru tersedia sekarang → langgani channel privat tim
      // (`private-orders`). Tanpa ini koneksi buatan root tetap tidak-aktif.
      sambungUlang();
    } catch (err: any) {
      setError(err instanceof StaffApiError ? err.message : teks.kasir.loginGagal);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await clearStaffSession();
    setStaff(null);
    setOrders([]);
    setEmail("");
    setPassword("");
    // Token sudah dihapus → lepaskan langganan channel privat.
    sambungUlang();
  };

  /** Terapkan filter dari dialog: tutup, lalu muat ulang dari server. */
  const terapkanFilter = () => {
    if (galatTanggal) return;

    setFilterTerbuka(false);
    setFilterAktif(filter);
    setLoading(true);
    void loadOrders(filter);
  };

  const resetFilter = () => {
    setFilter(FILTER_AWAL);
    setFilterAktif(FILTER_AWAL);
    setFilterTerbuka(false);
    setLoading(true);
    void loadOrders(FILTER_AWAL);
  };

  /** Ketik di kotak cari lalu Enter → terapkan tanpa membuka dialog. */
  const cariSekarang = () => {
    setFilterAktif(filter);
    setLoading(true);
    void loadOrders(filter);
  };

  const hapusPencarian = () => {
    const bersih = { ...filter, cari: "" };
    setFilter(bersih);
    setFilterAktif(bersih);
    setLoading(true);
    void loadOrders(bersih);
  };

  /**
   * Cetak struk thermal untuk satu order.
   *
   * `verifikasi` diisi saat dipanggil setelah verifikasi berhasil (struk
   * memuat "Diverifikasi oleh …"); null saat cetak ulang dari kartu.
   */
  const cetakStruk = useCallback(
    async (
      order: KasirOrder,
      verifikasi?: { oleh?: string | null; pada?: string | null } | null
    ): Promise<boolean> => {
      setMencetakId(order.transaction.id);

      try {
        const hasil = await cetakStrukOrderKasir(
          {
            nomor_transaksi: order.transaction.nomor_transaksi,
            tanggal_transaksi: order.transaction.tanggal_transaksi,
            pelanggan: order.transaction.pelanggan ?? null,
            metode_pembayaran: order.transaction.metode_pembayaran ?? null,
            /**
             * Verifikasi kasir menandai pesanan LUNAS di server
             * (`OnlineOrderController@verify` mengisi `status_pembayaran`
             * = lunas). Objek order di memori masih memuat status lama
             * (`belum_bayar`), jadi struk verifikasi WAJIB memakai status
             * hasil verifikasi — kalau tidak, struk yang baru dicetak
             * menyatakan "BELUM BAYAR" untuk pesanan yang sudah dibayar.
             */
            status_pembayaran: verifikasi
              ? "lunas"
              : (order.transaction.status_pembayaran ?? null),
            alamat_pengiriman: order.alamat ?? null,
            catatan: order.catatan ?? null,
            // Kolom pembayaran ikut dikirim: struk memakai angka ini bila
            // terisi, dan jatuh ke penanda `[Tunai: …]` di catatan hanya untuk
            // order lama (lihat `bacaPembayaran` di utils/strukThermal.ts).
            jumlah_dibayar: order.transaction.jumlah_dibayar ?? null,
            kembalian: order.transaction.kembalian ?? null,
            subtotal: Number(order.transaction.subtotal ?? 0) || order.total,
            total_diskon: Number(order.transaction.total_diskon ?? 0) || 0,
            total_bayar: order.total,
            items: order.items.map((i) => ({
              nama_produk: i.nama_produk,
              nama_varian: i.nama_varian ?? null,
              satuan: i.nama_satuan ?? null,
              jumlah: Number(i.jumlah) || 0,
              // Baris `detail_transaksi` memakai `harga_satuan`; `harga`
              // dipertahankan untuk pemanggil yang memakai bentuk ringkas.
              harga: Number(i.harga_satuan ?? i.harga) || 0,
              subtotal: Number(i.subtotal) || 0,
            })),
          },
          verifikasi ?? null
        );

        if (!hasil.ok) {
          setAksi({
            tipe: "error",
            teks: `${teks.kasir.cetakGagal}: ${
              hasil.alasan === "tanpa-app" ? teks.kasir.cetakTanpaApp : hasil.pesan
            }`,
            orderPerluCetak: order,
          });
          return false;
        }

        setAksi({
          tipe: "sukses",
          teks:
            hasil.jalur === "rawbt" ? teks.kasir.cetakBerhasil : teks.kasir.cetakDialog,
        });
        return true;
      } finally {
        setMencetakId(null);
      }
    },
    []
  );

  /**
   * Verifikasi order, lalu cetak struk thermal.
   *
   * Urutan penting: verifikasi dulu (status di server berubah), baru cetak.
   * Bila pencetakan gagal, verifikasi TETAP berhasil — pesannya dipisah supaya
   * kasir tidak mengira pesanan belum terverifikasi lalu menekan tombol lagi.
   */
  const handleVerify = async (order: KasirOrder) => {
    setBusyId(order.transaction.id);
    setAksi(null);

    try {
      const result = await verifyOnlineOrder(order.transaction.id);

      // Nama kasir untuk kop "Diverifikasi oleh" diambil dari sesi staf
      // (server juga menyimpan `verified_by`).
      const tercetak = await cetakStruk(order, {
        oleh: staff?.name ?? null,
        pada: new Date().toISOString(),
      });

      setAksi({
        tipe: "sukses",
        teks: `${order.transaction.nomor_transaksi}: ${result.message}${
          tercetak ? "" : ` — ${teks.kasir.cetakGagal}`
        }`,
        orderPerluCetak: tercetak ? null : order,
      });

      await loadOrders(filterAktif);
    } catch (err: any) {
      if (err instanceof StaffSessionUnavailableError) {
        setAksi({
          tipe: "error",
          teks: isCrossOriginWeb()
            ? `${err.message} Rute verifikasi adalah rute web Laravel (cookie + CSRF), sedangkan CORS backend hanya mengizinkan path api/*. Buka halaman kasir backend untuk memverifikasi pesanan ini.`
            : err.message,
        });
      } else {
        setAksi({
          tipe: "error",
          teks: err?.message ?? teks.kasir.verifikasiGagal,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (order: KasirOrder) => {
    setBusyId(order.transaction.id);
    setAksi(null);
    try {
      const result = await rejectOnlineOrder(order.transaction.id, rejectReason.trim());
      setAksi({
        tipe: "sukses",
        teks: `${order.transaction.nomor_transaksi}: ${result.message}`,
      });
      setRejectingId(null);
      setRejectReason("");
      await loadOrders(filterAktif);
    } catch (err: any) {
      if (err instanceof StaffSessionUnavailableError) {
        setAksi({ tipe: "error", teks: err.message });
      } else {
        setAksi({
          tipe: "error",
          teks: err?.message ?? teks.kasir.tolakGagal,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadOrders(filterAktif);
  };

  // ---- Gate login staf ---------------------------------------------------

  if (checkingSession) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.kasir.judul} onBack={kembali} />
        <View className="px-4 pt-4">
          <View className="rounded-lg border border-neutral-200 bg-white p-4">
            <Skeleton height={16} width="45%" />
            <Skeleton height={12} width="90%" className="mt-3" />
            <Skeleton height={48} width="100%" className="mt-4" />
            <Skeleton height={48} width="100%" className="mt-4" />
            <Skeleton height={48} width="100%" className="mt-4" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!staff) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <AppBar title={teks.kasir.judulLengkap} onBack={kembali} />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="rounded-lg border border-neutral-200 bg-white p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <View
                className="items-center justify-center rounded-full bg-primary-100"
                style={{ width: 36, height: 36 }}
              >
                <ShieldCheck size={20} color={colors.primary600} strokeWidth={1.75} />
              </View>
              <Text
                className="flex-1 font-inter-semibold text-base text-neutral-900"
                accessibilityRole="header"
                maxFontSizeMultiplier={1.3}
              >
                {teks.kasir.loginJudul}
              </Text>
            </View>
            <Text
              className="mb-4 font-inter text-xs text-neutral-500"
              maxFontSizeMultiplier={1.3}
            >
              {teks.kasir.loginDeskripsi}
            </Text>

            <View style={{ gap: 16 }}>
              <Input
                label={teks.field.email}
                value={email}
                onChangeText={setEmail}
                placeholder={teks.kasir.emailPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loggingIn}
              />
              <Input
                label={teks.field.password}
                value={password}
                onChangeText={setPassword}
                placeholder={teks.kasir.passwordPlaceholder}
                password
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!loggingIn}
                onSubmitEditing={handleLogin}
              />
            </View>

            {error ? (
              <View className="mt-4 rounded-md border border-danger-100 bg-danger-50 p-3">
                <Text className="font-inter text-xs text-danger-700">{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <StickyBar>
          <Button
            title={teks.kasir.masuk}
            loading={loggingIn}
            fullWidth
            onPress={handleLogin}
          />
        </StickyBar>
      </SafeAreaView>
    );
  }

  // ---- Daftar order ------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar
        title={teks.kasir.judul}
        onBack={kembali}
        right={
          <View className="flex-row items-center">
            <TombolSuara />
            <Pressable
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel={teks.kasir.keluar}
              hitSlop={sizes.hitSlop}
              className="h-11 w-11 items-center justify-center"
            >
              <LogOut size={22} color={colors.neutral700} strokeWidth={1.75} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: paddingBawahKonten(insets) }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary600]}
            tintColor={colors.primary600}
          />
        }
      >
        {/* Identitas staf */}
        <View className="mb-3 flex-row items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
          <View
            className="items-center justify-center rounded-full bg-primary-100"
            style={{ width: 36, height: 36 }}
          >
            <ShieldCheck size={20} color={colors.primary600} strokeWidth={1.75} />
          </View>
          <View className="flex-1">
            <Text
              className="font-inter-medium text-sm text-neutral-900"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {staff.name}
            </Text>
            <Text
              className="font-inter text-xs text-neutral-500"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {staff.role}
            </Text>
          </View>
          <Pressable
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel={teks.a11y.muatUlang}
            hitSlop={sizes.hitSlop}
            className="h-11 w-11 items-center justify-center"
          >
            <RefreshCw size={18} color={colors.primary700} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* ---- Pencarian + buka filter ---------------------------------- */}
        <View className="mb-2 flex-row items-center gap-2">
          <View
            className="flex-1 flex-row items-center gap-2 rounded-md border border-neutral-200 bg-white px-3"
            style={{ minHeight: 44 }}
          >
            <Search size={16} color={colors.neutral500} strokeWidth={1.75} />
            <TextInput
              value={filter.cari}
              onChangeText={(cari) => setFilter((f) => ({ ...f, cari }))}
              onSubmitEditing={cariSekarang}
              returnKeyType="search"
              placeholder={teks.kasir.filter.cariPlaceholder}
              placeholderTextColor={colors.neutral400}
              accessibilityLabel={teks.kasir.filter.cariLabel}
              className="flex-1 font-inter text-sm text-neutral-900"
            />
            {filter.cari ? (
              <Pressable
                onPress={hapusPencarian}
                accessibilityRole="button"
                accessibilityLabel={teks.kasir.filter.hapusPencarian}
                hitSlop={sizes.hitSlop}
                className="h-9 w-9 items-center justify-center"
              >
                <XCircle size={16} color={colors.neutral500} strokeWidth={1.75} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setFilterTerbuka(true)}
            accessibilityRole="button"
            accessibilityLabel={teks.kasir.filter.buka}
            accessibilityHint={ringkasanFilter}
            className={`flex-row items-center gap-1.5 rounded-md border px-3 ${
              jumlahFilter > 0
                ? "border-primary-200 bg-primary-50"
                : "border-neutral-200 bg-white"
            }`}
            style={{ minHeight: 44 }}
          >
            <FilterIcon
              size={16}
              color={jumlahFilter > 0 ? colors.primary700 : colors.neutral700}
              strokeWidth={1.75}
            />
            <Text
              className={`font-inter-medium text-xs ${
                jumlahFilter > 0 ? "text-primary-800" : "text-neutral-700"
              }`}
              maxFontSizeMultiplier={1.3}
            >
              {teks.kasir.filter.judul}
              {jumlahFilter > 0 ? ` (${jumlahFilter})` : ""}
            </Text>
          </Pressable>
        </View>

        {/* Ringkasan filter + jumlah hasil */}
        <View className="mb-3 flex-row items-start justify-between gap-2">
          <Text
            className="flex-1 font-inter text-caption text-neutral-500"
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {ringkasanFilter}
          </Text>
          <Text
            className="font-inter-medium text-caption text-neutral-700 tabular-nums"
            maxFontSizeMultiplier={1.3}
          >
            {halaman > 1 || totalOrder > orders.length
              ? teks.kasir.filter.hasilSebagian
                  .replace("{tampil}", String(orders.length))
                  .replace("{total}", String(totalOrder))
              : teks.kasir.filter.hasil.replace("{jumlah}", String(totalOrder))}
          </Text>
        </View>

        {error ? (
          <View className="mb-4">
            <ErrorState pesan={error} onRetry={onRefresh} kompak />
          </View>
        ) : null}

        {aksi ? (
          <View
            className={`mb-4 rounded-md border p-3 ${
              aksi.tipe === "sukses"
                ? "border-success-100 bg-success-100"
                : "border-danger-100 bg-danger-50"
            }`}
            accessibilityRole="alert"
          >
            <Text
              className={`font-inter text-xs ${
                aksi.tipe === "sukses" ? "text-success-700" : "text-danger-700"
              }`}
            >
              {aksi.teks}
            </Text>

            {aksi.orderPerluCetak ? (
              <Pressable
                onPress={() => {
                  const order = aksi.orderPerluCetak;
                  if (order) void cetakStruk(order);
                }}
                accessibilityRole="button"
                accessibilityLabel={teks.kasir.cetakStruk}
                className="mt-2 min-h-[44px] flex-row items-center gap-1.5 self-start"
              >
                <Printer size={14} color={colors.primary700} strokeWidth={1.75} />
                <Text className="font-inter-medium text-xs text-primary-700">
                  {teks.kasir.cetakStruk}
                </Text>
              </Pressable>
            ) : null}

            {aksi.tipe === "error" ? (
              <Pressable
                onPress={() => Linking.openURL(onlineOrdersPageUrl()).catch(() => {})}
                accessibilityRole="link"
                accessibilityLabel={teks.kasir.bukaHalamanKasir}
                className="mt-2 min-h-[44px] justify-center self-start"
              >
                <Text className="font-inter-medium text-xs text-primary-700">
                  {teks.kasir.bukaHalamanKasir}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {loading && orders.length === 0 ? (
          <View>
            {[0, 1].map((i) => (
              <View
                key={i}
                className="mb-3 rounded-lg border border-neutral-200 bg-white p-4"
              >
                <Skeleton height={14} width="50%" />
                <Skeleton height={12} width="35%" className="mt-2" />
                <Skeleton height={12} width="80%" className="mt-4" />
                <Skeleton height={40} width="100%" className="mt-4" />
              </View>
            ))}
          </View>
        ) : orders.length === 0 ? (
          <View className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <EmptyState
              icon={<PackageCheck size={36} color={colors.primary600} strokeWidth={1.75} />}
              title={
                jumlahFilter > 0 ? teks.kasir.filter.hasilKosong : teks.kasir.kosong.judul
              }
              description={
                jumlahFilter > 0
                  ? teks.kasir.filter.hasilKosongDeskripsi
                  : teks.kasir.kosong.deskripsi
              }
              ctaLabel={jumlahFilter > 0 ? teks.kasir.filter.reset : undefined}
              onCtaPress={jumlahFilter > 0 ? resetFilter : undefined}
            />
          </View>
        ) : (
          orders.map((order) => (
            <KasirOrderCard
              key={order.transaction.id}
              order={order}
              busy={busyId === order.transaction.id}
              mencetak={mencetakId === order.transaction.id}
              rejecting={rejectingId === order.transaction.id}
              rejectReason={rejectReason}
              onChangeRejectReason={setRejectReason}
              onVerify={() => handleVerify(order)}
              onStartReject={() =>
                setRejectingId(
                  rejectingId === order.transaction.id ? null : order.transaction.id
                )
              }
              onConfirmReject={() => handleReject(order)}
              onCetak={() => void cetakStruk(order)}
            />
          ))
        )}

        {/*
          Muat halaman berikutnya. Tanpa tombol ini daftar mentok di 50 order
          pertama walaupun server mengirim `last_page` — kasir tidak punya cara
          melihat order ke-51 dan seterusnya.
        */}
        {halaman < halamanTerakhir ? (
          <Button
            title={
              memuatLagi
                ? teks.kasir.filter.memuatLagi
                : teks.kasir.filter.muatLagi.replace(
                    "{sisa}",
                    String(Math.max(0, totalOrder - orders.length))
                  )
            }
            variant="outline"
            size="md"
            fullWidth
            loading={memuatLagi}
            onPress={muatLagi}
          />
        ) : null}
      </ScrollView>

      {/* ---- Dialog filter ---------------------------------------------- */}
      <Dialog
        visible={filterTerbuka}
        onClose={() => setFilterTerbuka(false)}
        title={teks.kasir.filter.judul}
        description={ringkasanFilter}
        actions={
          <>
            <Button
              title={teks.kasir.filter.reset}
              variant="outline"
              size="md"
              className="flex-1"
              onPress={resetFilter}
            />
            <Button
              title={teks.kasir.filter.terapkan}
              size="md"
              className="flex-1"
              disabled={!!galatTanggal}
              onPress={terapkanFilter}
            />
          </>
        }
      >
        <ScrollView className="max-h-[60vh]" keyboardShouldPersistTaps="handled">
          {/* Status */}
          <Text className="mb-2 font-inter-medium text-xs text-neutral-700">
            {teks.kasir.filter.status}
          </Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {LABEL_STATUS.map((s) => (
              <Chip
                key={s.kunci}
                label={s.label}
                selected={filter.status === s.kunci}
                onPress={() => setFilter((f) => ({ ...f, status: s.kunci }))}
              />
            ))}
          </View>

          {/* Rentang tanggal */}
          <Text className="mb-2 font-inter-medium text-xs text-neutral-700">
            {teks.kasir.filter.rentang}
          </Text>
          <View className="mb-3 flex-row flex-wrap gap-2">
            {PRESET_RENTANG.map((r) => (
              <Chip
                key={r.kunci}
                label={r.label}
                selected={filter.rentang === r.kunci}
                onPress={() => setFilter((f) => ({ ...f, rentang: r.kunci }))}
              />
            ))}
            <Chip
              label={teks.kasir.filter.kustom}
              selected={filter.rentang === "kustom"}
              onPress={() => setFilter((f) => ({ ...f, rentang: "kustom" }))}
            />
          </View>

          {filter.rentang === "kustom" ? (
            <View className="mb-4" style={{ gap: 12 }}>
              <Input
                label={`${teks.kasir.filter.dariTanggal} (${teks.kasir.filter.formatTanggal})`}
                value={filter.dariTanggal}
                onChangeText={(dariTanggal) => setFilter((f) => ({ ...f, dariTanggal }))}
                placeholder="2026-10-01"
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
              <Input
                label={`${teks.kasir.filter.sampaiTanggal} (${teks.kasir.filter.formatTanggal})`}
                value={filter.sampaiTanggal}
                onChangeText={(sampaiTanggal) =>
                  setFilter((f) => ({ ...f, sampaiTanggal }))
                }
                placeholder="2026-10-27"
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          ) : null}

          {galatTanggal ? (
            <View className="mb-4 rounded-md border border-danger-100 bg-danger-50 p-3">
              <Text className="font-inter text-xs text-danger-700">{galatTanggal}</Text>
            </View>
          ) : null}

          {/* Metode bayar */}
          <Text className="mb-2 font-inter-medium text-xs text-neutral-700">
            {teks.kasir.filter.metode}
          </Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            <Chip
              label={teks.kasir.filter.semuaMetode}
              selected={filter.metodePembayaranId === null}
              onPress={() => setFilter((f) => ({ ...f, metodePembayaranId: null }))}
            />
            {metodeList.map((m) => (
              <Chip
                key={m.id}
                label={m.nama_metode ?? String(m.id)}
                selected={filter.metodePembayaranId === m.id}
                onPress={() =>
                  setFilter((f) => ({
                    ...f,
                    metodePembayaranId: f.metodePembayaranId === m.id ? null : m.id,
                  }))
                }
              />
            ))}
          </View>

          {filter.rentang === "kustom" && filter.dariTanggal ? (
            <Text className="font-inter text-caption text-neutral-500">
              {tanggalTampil(filter.dariTanggal)}
              {filter.sampaiTanggal ? ` – ${tanggalTampil(filter.sampaiTanggal)}` : ""}
            </Text>
          ) : null}
        </ScrollView>
      </Dialog>
    </SafeAreaView>
  );
}

interface KasirOrderCardProps {
  order: KasirOrder;
  busy: boolean;
  mencetak: boolean;
  rejecting: boolean;
  rejectReason: string;
  onChangeRejectReason: (v: string) => void;
  onVerify: () => void;
  onStartReject: () => void;
  onConfirmReject: () => void;
  onCetak: () => void;
}

const KasirOrderCard = ({
  order,
  busy,
  mencetak,
  rejecting,
  rejectReason,
  onChangeRejectReason,
  onVerify,
  onStartReject,
  onConfirmReject,
  onCetak,
}: KasirOrderCardProps) => {
  const expiry = useOrderExpiry(order.transaction.order_expires_at, "pending");
  const trx = order.transaction;
  // Order non-pending (hasil filter "Selesai"/"Ditolak"/"Semua") tidak boleh
  // menampilkan hitung mundur atau tombol Verifikasi/Tolak.
  const menunggu = (trx.status_transaksi ?? trx.status) === "pending";

  const badge =
    trx.status_transaksi === "selesai"
      ? { label: teks.kasir.selesai, kelas: "bg-success-100", teks: "text-success-700" }
      : trx.status_transaksi === "dibatalkan"
        ? { label: teks.kasir.ditolak, kelas: "bg-danger-50", teks: "text-danger-700" }
        : { label: teks.kasir.menunggu, kelas: "bg-warning-100", teks: "text-warning-700" };

  return (
    <View className="mb-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <View className="p-4">
        <View className="mb-2 flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text
                className="font-inter-semibold text-sm text-neutral-900"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {trx.nomor_transaksi}
              </Text>
              <TombolSalin nilai={trx.nomor_transaksi} denganTeks />
            </View>
            <Text
              className="font-inter text-xs text-neutral-500"
              maxFontSizeMultiplier={1.3}
            >
              {tanggalWaktu(trx.tanggal_transaksi)}
            </Text>
            {trx.pelanggan?.nama_pelanggan ? (
              <Text
                className="mt-1 font-inter text-xs text-neutral-700"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {trx.pelanggan.nama_pelanggan}
                {trx.pelanggan.telepon ? ` · ${trx.pelanggan.telepon}` : ""}
              </Text>
            ) : null}
          </View>
          <View className={`rounded-full px-2.5 py-1 ${badge.kelas}`}>
            <Text
              className={`font-inter-medium text-xs ${badge.teks}`}
              maxFontSizeMultiplier={1.3}
            >
              {badge.label}
            </Text>
          </View>
        </View>

        {menunggu && expiry.expired ? (
          <View className="mb-2 flex-row items-center gap-1.5">
            <XCircle size={14} color={colors.danger700} strokeWidth={1.75} />
            <Text className="font-inter text-xs text-danger-700">
              {teks.kasir.kedaluwarsa}
            </Text>
          </View>
        ) : menunggu && expiry.countdown ? (
          <View className="mb-2 flex-row items-center gap-1.5">
            <Clock size={14} color={colors.warning700} strokeWidth={1.75} />
            <Text className="font-inter text-xs text-warning-700 tabular-nums">
              {teks.kasir.sisaWaktu.replace("{waktu}", expiry.countdown)}
            </Text>
          </View>
        ) : null}

        <View className="mb-2 border-t border-neutral-100 pt-2">
          {order.items.length === 0 ? (
            <Text className="font-inter text-xs text-neutral-500">
              {teks.kasir.itemTidakAda}
            </Text>
          ) : (
            order.items.map((item, indeks) => (
              <View
                key={`${item.id ?? "item"}-${indeks}`}
                className="flex-row justify-between gap-2 py-1"
              >
                <Text
                  className="flex-1 font-inter text-sm text-neutral-700"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {item.jumlah}× {item.nama_produk}
                  {item.nama_varian ? ` (${item.nama_varian})` : ""}
                  {item.nama_satuan ? ` / ${item.nama_satuan}` : ""}
                </Text>
                <Text
                  className="font-inter text-sm text-neutral-700 tabular-nums"
                  maxFontSizeMultiplier={1.3}
                >
                  {rupiah(Number(item.subtotal) || 0)}
                </Text>
              </View>
            ))
          )}
        </View>

        {order.alamat ? (
          <View className="mb-2 rounded-md bg-neutral-50 p-2">
            <Text className="font-inter text-caption text-neutral-500">
              {teks.kasir.kirimKe}
            </Text>
            <Text className="font-inter text-xs text-neutral-700">{order.alamat}</Text>
          </View>
        ) : null}

        {order.catatan ? (
          <View className="mb-2 rounded-md bg-warning-50 p-2">
            <Text className="font-inter text-caption text-neutral-500">
              {teks.kasir.catatanPelanggan}
            </Text>
            <Text className="font-inter text-xs text-neutral-700">{order.catatan}</Text>
          </View>
        ) : null}

        <View className="mb-3 flex-row items-center justify-between gap-2">
          <Text
            className="flex-1 font-inter text-xs text-neutral-500"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {trx.metode_pembayaran || teks.checkout.cod}
          </Text>
          <Text
            className="font-inter-bold text-base text-neutral-900 tabular-nums"
            maxFontSizeMultiplier={1.3}
          >
            {rupiah(order.total)}
          </Text>
        </View>

        {rejecting ? (
          <View className="mb-2">
            <TextInput
              value={rejectReason}
              onChangeText={onChangeRejectReason}
              placeholder={teks.kasir.alasanPlaceholder}
              placeholderTextColor={colors.neutral400}
              accessibilityLabel={teks.kasir.alasanPlaceholder}
              multiline
              className="mb-2 rounded-md border border-neutral-200 bg-white px-3 py-2 font-inter text-sm text-neutral-900"
              style={{ minHeight: 56 }}
            />
            <Button
              title={teks.kasir.tolakPesanan}
              variant="outline"
              size="md"
              fullWidth
              loading={busy}
              className="border-danger-500"
              onPress={onConfirmReject}
            />
          </View>
        ) : null}

        <View className="flex-row gap-2">
          {menunggu ? (
            <>
              <Button
                title={rejecting ? teks.kasir.batalTolak : teks.kasir.tolak}
                variant="outline"
                size="md"
                className="flex-1 border-danger-500"
                disabled={busy}
                icon={<XCircle size={16} color={colors.danger700} strokeWidth={1.75} />}
                onPress={onStartReject}
              />
              <Button
                title={teks.kasir.verifikasi}
                size="md"
                className="flex-1"
                loading={busy}
                icon={<CheckCheck size={16} color={colors.white} strokeWidth={1.75} />}
                onPress={onVerify}
              />
            </>
          ) : (
            // Order yang sudah diproses tetap bisa dicetak ulang (struk hilang
            // / printer macet saat verifikasi).
            <Button
              title={mencetak ? teks.kasir.mencetak : teks.kasir.cetakStruk}
              variant="outline"
              size="md"
              fullWidth
              loading={mencetak}
              icon={<Printer size={16} color={colors.primary700} strokeWidth={1.75} />}
              onPress={onCetak}
            />
          )}
        </View>
      </View>
    </View>
  );
};
