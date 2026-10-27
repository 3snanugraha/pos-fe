import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import { CartItem, useCart } from "../../../contexts/CartContext";
import { rupiah } from "../../lib/format";
import { apiService } from "../../../services/apiService";
import type {
  CustomerAddress,
  CustomerProfile,
  PaymentMethod,
} from "../../../services/types";
import { getErrorMessage, handleAuthError } from "../../../utils/auth";
import { formatAlamatLengkap } from "../../../utils/formatters";
import {
  buildCatatanWithSplit,
  buildPaymentInstruction,
  isTunai,
  RUPIAH_PER_POIN,
  validasiSplitPembayaran,
} from "../../../utils/payment";
import {
  gabungCatatanTunai,
  hitungTunai,
  nominalTunai,
  validasiTunai,
} from "../../../utils/tunai";

export type SplitRow = {
  metode: PaymentMethod;
  nominal: string;
};

/**
 * State + logika checkout lama (dulu `app/checkout/index.tsx`).
 *
 * Dipindahkan apa adanya ke provider agar layar Ringkasan Pesanan dan
 * Pembayaran bisa berbagi satu sumber state tanpa menduplikasi perhitungan.
 * **Payload ke backend, aturan split payment, dan pemakaian poin TIDAK
 * diubah** — hanya tampilannya yang dipisah per layar.
 */
type CheckoutContextValue = {
  items: CartItem[];
  cartLoading: boolean;
  loading: boolean;
  error: string | null;
  alamatTersedia: CustomerAddress[];
  selectedAddress: CustomerAddress | null;
  setSelectedAddress: (alamat: CustomerAddress) => void;
  paymentMethods: PaymentMethod[];
  primaryPayment: PaymentMethod | null;
  setPrimaryPayment: (metode: PaymentMethod) => void;
  saldoPoin: number;
  promoCode: string;
  setPromoCode: (nilai: string) => void;
  handleApplyPromo: () => Promise<void>;
  promoDiscount: number;
  poinDigunakan: number;
  handlePoinChange: (nilai: string) => void;
  pakaiPoinMaksimal: () => void;
  poinValue: { dipakai: number; rupiah: number; maxSaldo: number; maxTagihan: number };
  useSplit: boolean;
  toggleSplit: () => void;
  splits: SplitRow[];
  addSplitRow: () => void;
  updateSplitNominal: (index: number, nilai: string) => void;
  updateSplitMetode: (index: number, metode: PaymentMethod) => void;
  removeSplitRow: (index: number) => void;
  isiSisaOtomatis: (index: number) => void;
  activeSplits: { metode: PaymentMethod; nominal: number }[];
  splitTotal: number;
  sisaSplit: number;
  paymentError: string | null;
  splitBelumLengkap: boolean;
  canProceedPayment: boolean;
  notes: string;
  setNotes: (nilai: string) => void;
  /** Uang tunai yang disiapkan pelanggan (teks mentah input). */
  uangTunai: string;
  setUangTunai: (nilai: string) => void;
  /** Angka uang tunai (0 bila kosong). */
  uangTunaiNominal: number;
  /** Kembalian / kekurangan untuk uang tunai yang diisi. */
  tunaiKembalian: number;
  tunaiKurang: number;
  /** Pesan peringatan bila uang tunai < tagihan (null = aman). */
  tunaiError: string | null;
  /** Total tagihan setelah promo + poin. */
  finalTotal: number;
  totalAmount: number;
  metodeTerpilih: PaymentMethod | null;
  instruksi: string[];
  isProcessingOrder: boolean;
  handlePlaceOrder: () => Promise<void>;
  muatUlang: () => void;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { items, totalAmount, clearCart, isLoading: cartLoading } = useCart();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [primaryPayment, setPrimaryPayment] = useState<PaymentMethod | null>(null);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [useSplit, setUseSplit] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [poinDigunakan, setPoinDigunakan] = useState(0);
  const [notes, setNotes] = useState("");
  const [uangTunai, setUangTunai] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  /**
   * Setelah order berhasil, keranjang sengaja dikosongkan. Tanpa penanda ini,
   * layar menampilkan empty state tepat saat halaman sukses tampil.
   */
  const orderPlacedRef = useRef(false);

  const saldoPoin = Number(profile?.total_poin ?? 0);

  /**
   * `segar = true` (dipakai tombol "Coba Lagi" / `muatUlang`) memaksa data
   * metode pembayaran diambil ulang dari jaringan, bukan dari cache. Tanpa
   * ini, admin yang baru menyimpan metode di halaman pengaturan tetap melihat
   * checkout kosong ("Belum ada metode pembayaran aktif") sampai TTL cache
   * 2 jam habis.
   */
  const loadCheckoutData = useCallback(async (segar = false) => {
    setLoading(true);
    setError(null);

    try {
      const [addressesData, paymentMethodsData, profileData] = await Promise.all([
        apiService.getCustomerAddresses(),
        apiService.getPaymentMethods(!segar),
        apiService.getCustomerProfile().catch(() => null),
      ]);

      setAddresses(addressesData);
      setPaymentMethods(paymentMethodsData);
      setProfile(profileData);

      const defaultAddress = addressesData.find((addr) => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      } else if (addressesData.length > 0) {
        setSelectedAddress(addressesData[0]);
      }

      if (paymentMethodsData.length > 0) {
        setPrimaryPayment((prev) => prev ?? paymentMethodsData[0]);
      }
    } catch (err: any) {
      console.error("Error loading checkout data:", err);
      const isAuthError = await handleAuthError(err);
      if (!isAuthError) {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orderPlacedRef.current || isProcessingOrder) return;
    // Keranjang dibaca dari AsyncStorage secara asinkron; sebelum hidrasi
    // selesai `items` selalu kosong.
    if (cartLoading) return;

    if (items.length === 0) {
      // Semua setState terjadi di dalam callback async supaya tidak memicu
      // cascading render dari body effect.
      queueMicrotask(() => setLoading(false));
      return;
    }

    loadCheckoutData();
  }, [items.length, isProcessingOrder, cartLoading, loadCheckoutData]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      Alert.alert("Error", "Masukkan kode promo");
      return;
    }

    try {
      const promoData = await apiService.validatePromoCode(promoCode, totalAmount);
      const diskon = promoData.nilai_diskon ?? promoData.total_diskon ?? 0;
      setPromoDiscount(diskon);
      Alert.alert(
        "Berhasil!",
        `Kode promo berhasil diterapkan. Diskon ${rupiah(diskon)}`
      );
    } catch (err: any) {
      console.error("Error applying promo:", err);
      Alert.alert("Error", "Kode promo tidak valid atau sudah tidak berlaku");
    }
  };

  // ---- Perhitungan (tidak diubah dari checkout lama) ---------------------

  const setelahPromo = Math.max(0, totalAmount - promoDiscount);

  /** Poin: 1 poin = Rp 1, dibatasi saldo & tagihan (CustomerOrderController@hitungPoin). */
  const poinValue = useMemo(() => {
    const maxSaldo = Math.max(0, Math.floor(saldoPoin));
    const maxTagihan = Math.floor(setelahPromo / RUPIAH_PER_POIN);
    const dipakai = Math.max(0, Math.min(poinDigunakan, maxSaldo, maxTagihan));
    return { dipakai, rupiah: dipakai * RUPIAH_PER_POIN, maxSaldo, maxTagihan };
  }, [poinDigunakan, saldoPoin, setelahPromo]);

  const finalTotal = Math.max(0, setelahPromo - poinValue.rupiah);

  const activeSplits = useMemo(
    () =>
      splits
        .map((row) => ({
          metode: row.metode,
          nominal: parseInt(row.nominal, 10) || 0,
        }))
        .filter((row) => row.nominal > 0),
    [splits]
  );

  const splitTotal = activeSplits.reduce((sum, row) => sum + row.nominal, 0);
  const sisaSplit = finalTotal - splitTotal;

  const paymentError = useSplit
    ? validasiSplitPembayaran(
        finalTotal,
        activeSplits.map((row) => ({
          nominal: row.nominal,
          jenis_pembayaran: row.metode.jenis_pembayaran,
        }))
      )
    : null;

  const splitBelumLengkap = useSplit && activeSplits.length < 2;

  /**
   * Uang tunai hanya relevan pada pembayaran TUNGGAL bertipe `tunai`.
   * Mode campuran sudah punya nominal per metode sendiri (`splits`), jadi
   * panel tunai disembunyikan agar tidak ada dua sumber angka.
   */
  const tunaiAktif = !useSplit && isTunai(primaryPayment?.jenis_pembayaran);

  const uangTunaiNominal = nominalTunai(uangTunai);
  const hasilTunai = hitungTunai(finalTotal, uangTunaiNominal);
  const tunaiError = tunaiAktif ? validasiTunai(finalTotal, uangTunaiNominal) : null;

  const canProceedPayment = useSplit
    ? !paymentError && !splitBelumLengkap
    : !!primaryPayment && !tunaiError;

  // ---- Split payment -----------------------------------------------------

  const toggleSplit = () => {
    const next = !useSplit;
    setUseSplit(next);

    if (next && splits.length === 0) {
      const utama = primaryPayment ?? paymentMethods[0];
      const kedua = paymentMethods.find((m) => m.id !== utama?.id);
      if (utama) {
        setSplits([
          { metode: utama, nominal: String(finalTotal) },
          ...(kedua ? [{ metode: kedua, nominal: "" }] : []),
        ]);
      }
    } else if (!next) {
      setSplits([]);
    }
  };

  const addSplitRow = () => {
    if (splits.length >= 4) {
      Alert.alert("Maksimal 4 metode", "Split pembayaran dibatasi 4 metode.");
      return;
    }
    const dipakai = new Set(splits.map((row) => row.metode.id));
    const sisa = paymentMethods.find((m) => !dipakai.has(m.id));
    if (!sisa) {
      Alert.alert("Tidak ada metode lain", "Semua metode sudah dipakai.");
      return;
    }
    setSplits((prev) => [...prev, { metode: sisa, nominal: "" }]);
  };

  const updateSplitNominal = (index: number, value: string) => {
    const bersih = value.replace(/[^0-9]/g, "");
    setSplits((prev) =>
      prev.map((row, i) => (i === index ? { ...row, nominal: bersih } : row))
    );
  };

  const updateSplitMetode = (index: number, metode: PaymentMethod) => {
    setSplits((prev) => prev.map((row, i) => (i === index ? { ...row, metode } : row)));
  };

  const removeSplitRow = (index: number) => {
    setSplits((prev) => prev.filter((_, i) => i !== index));
  };

  const isiSisaOtomatis = (index: number) => {
    const lain = splits.reduce(
      (sum, row, i) => (i === index ? sum : sum + (parseInt(row.nominal, 10) || 0)),
      0
    );
    updateSplitNominal(index, String(Math.max(0, finalTotal - lain)));
  };

  // ---- Poin --------------------------------------------------------------

  const handlePoinChange = (value: string) => {
    const angka = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(angka)) {
      setPoinDigunakan(0);
      return;
    }
    setPoinDigunakan(Math.max(0, Math.min(angka, poinValue.maxSaldo, poinValue.maxTagihan)));
  };

  const pakaiPoinMaksimal = () => {
    setPoinDigunakan(Math.min(poinValue.maxSaldo, poinValue.maxTagihan));
  };

  // ---- Submit ------------------------------------------------------------

  const metodeTerpilih: PaymentMethod | null = useSplit
    ? (activeSplits[0]?.metode ?? null)
    : primaryPayment;
  const instruksi = metodeTerpilih ? buildPaymentInstruction(metodeTerpilih) : [];

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      Alert.alert("Error", "Pilih alamat pengiriman");
      return;
    }

    if (!useSplit && !primaryPayment) {
      Alert.alert("Error", "Pilih metode pembayaran");
      return;
    }

    if (useSplit && splitBelumLengkap) {
      Alert.alert(
        "Pembayaran belum lengkap",
        "Pembayaran campuran butuh minimal 2 metode dengan nominal."
      );
      return;
    }

    if (useSplit && paymentError) {
      Alert.alert("Pembayaran belum valid", paymentError);
      return;
    }

    // Uang tunai kurang dari tagihan: hentikan sebelum request dibuat.
    if (!useSplit && tunaiAktif && tunaiError) {
      Alert.alert("Uang tunai kurang", tunaiError);
      return;
    }

    const metodeId = useSplit ? activeSplits[0]?.metode.id : primaryPayment?.id;

    if (!metodeId) {
      Alert.alert("Error", "Pilih metode pembayaran");
      return;
    }

    if (isProcessingOrder) return;

    setIsProcessingOrder(true);

    const fullAddress = formatAlamatLengkap(selectedAddress);

    try {
      const catatanSplit = useSplit
        ? buildCatatanWithSplit(
            notes,
            activeSplits.map((row) => ({
              nama_metode: row.metode.nama_metode,
              nominal: row.nominal,
            }))
          )
        : notes.trim() || undefined;

      /**
       * Uang tunai & kembalian ikut ditulis ke catatan order: backend
       * (`CustomerOrderController@store`) hanya menerima `metode_pembayaran_id`
       * + `catatan`, dan `jumlah_dibayar`/`kembalian` diisi 0 sampai kasir
       * memverifikasi. Penanda `[Tunai: diterima …; kembali …]` membuat kasir
       * dan struk pelanggan membaca angka yang sama tanpa mengubah kontrak API.
       */
      const catatanAkhir = gabungCatatanTunai(
        catatanSplit,
        tunaiAktif && uangTunaiNominal > 0
          ? { diterima: uangTunaiNominal, kembalian: hasilTunai.kembalian }
          : null
      );

      const payload = {
        items: items.map((item) => ({
          produk_id: item.produk_id,
          varian_id: item.varian_id || undefined,
          // Satuan jual baris ini: server memakai resolver (HargaService) dengan
          // satuan & qty yang sama, jadi harga grosir yang tampil di keranjang
          // juga yang ditagih. Tanpa `satuan_id`, server memakai satuan default
          // dan baris ber-satuan dus bisa dihargai sebagai ecer.
          satuan_id: item.satuan_id || undefined,
          jumlah: item.quantity,
        })),
        metode_pembayaran_id: metodeId,
        alamat_pengiriman: fullAddress,
        catatan: catatanAkhir,
        promo_code: promoCode.trim() || undefined,
        poin_digunakan: poinValue.dipakai,
      };

      let result;
      let poinTerpakai = poinValue.dipakai;
      try {
        result = await apiService.createOrder(payload);
      } catch (err: any) {
        // Backend punya bug: `riwayat_poin_pelanggan.jenis_transaksi` enum-nya
        // ('dapat','pakai','kadaluarsa','koreksi') tetapi controller menulis
        // 'penggunaan' → MySQL "Data truncated" dan seluruh order 422.
        // Order tanpa poin tetap harus jalan, jadi coba ulang tanpa poin.
        const pesan = String(err?.message ?? "").toLowerCase();
        const gagalKarenaPoin =
          poinValue.dipakai > 0 &&
          (pesan.includes("data truncated") || pesan.includes("poin"));

        if (!gagalKarenaPoin) throw err;

        console.warn("Order dengan poin ditolak backend, ulangi tanpa poin:", err);
        result = await apiService.createOrder({ ...payload, poin_digunakan: 0 });
        poinTerpakai = 0;
        Alert.alert(
          "Poin belum bisa dipakai",
          "Server menolak penggunaan poin (bug pencatatan riwayat poin di backend). Pesanan tetap dibuat tanpa poin — poin Anda tidak berkurang."
        );
      }

      // Tandai dulu supaya empty state tidak terpicu.
      orderPlacedRef.current = true;
      await clearCart();

      /**
       * Angka yang ditampilkan di halaman sukses diambil dari RESPONS server,
       * bukan dari hitungan lokal: saat jalur fallback tanpa poin dipakai,
       * total dan poin sebenarnya berbeda dari yang dihitung di layar.
       */
      const totalServer = Number((result as any)?.total_bayar);
      const totalAkhir =
        Number.isFinite(totalServer) && totalServer > 0 ? totalServer : finalTotal;

      router.replace({
        pathname: "/checkout/success",
        params: {
          orderNumber: result.nomor_transaksi || "N/A",
          orderId: String(result.id ?? ""),
          totalAmount: String(totalAkhir),
          poin: String(poinTerpakai),
          // Uang tunai & kembalian diteruskan sebagai cadangan: layar sukses
          // lebih dulu memakai `catatan` dari respons server bila sudah termuat.
          tunaiDiterima:
            tunaiAktif && uangTunaiNominal > 0 ? String(uangTunaiNominal) : "",
          tunaiKembalian:
            tunaiAktif && uangTunaiNominal > 0 ? String(hasilTunai.kembalian) : "",
        },
      });
    } catch (err: any) {
      console.error("Error placing order:", err);
      Alert.alert(
        "Error",
        getErrorMessage(err) || "Gagal membuat pesanan. Silakan coba lagi."
      );
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const value: CheckoutContextValue = {
    items,
    cartLoading,
    loading,
    error,
    alamatTersedia: addresses,
    selectedAddress,
    setSelectedAddress,
    paymentMethods,
    primaryPayment,
    setPrimaryPayment,
    saldoPoin,
    promoCode,
    setPromoCode,
    handleApplyPromo,
    promoDiscount,
    poinDigunakan,
    handlePoinChange,
    pakaiPoinMaksimal,
    poinValue,
    useSplit,
    toggleSplit,
    splits,
    addSplitRow,
    updateSplitNominal,
    updateSplitMetode,
    removeSplitRow,
    isiSisaOtomatis,
    activeSplits,
    splitTotal,
    sisaSplit,
    paymentError,
    splitBelumLengkap,
    canProceedPayment,
    notes,
    setNotes,
    uangTunai,
    setUangTunai,
    uangTunaiNominal,
    tunaiKembalian: hasilTunai.kembalian,
    tunaiKurang: hasilTunai.kurang,
    tunaiError,
    finalTotal,
    totalAmount,
    metodeTerpilih,
    instruksi,
    isProcessingOrder,
    handlePlaceOrder,
    muatUlang: () => loadCheckoutData(true),
  };

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) {
    throw new Error("useCheckout harus dipakai di dalam CheckoutProvider");
  }
  return ctx;
}
