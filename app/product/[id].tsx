import { useLocalSearchParams, useRouter } from "expo-router";
import { Heart, MessageSquare, Share2, Star } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { kembaliAman } from "../../src/lib/navigasi";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ErrorState,
  ProductGallery,
  SectionHeader,
  Skeleton,
} from "../../src/components/commerce";
import { Badge } from "../../src/components/ui/Badge";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { Stepper } from "../../src/components/ui/Stepper";
import { rupiah } from "../../src/lib/format";
import { paddingBawahStickyBar } from "../../src/lib/inset";
import { teks } from "../../src/lib/i18n";
import { formatRating, stokTampil } from "../../src/lib/produk";
import { barisUntukVarian, hargaEfektifBaris, NAMA_TIER_FLASH, teksUpsell } from "../../src/lib/hargaGrosir";
import type { BarisHargaSatuan, GrosirRingkas } from "../../src/lib/hargaGrosir";
import { useRingkasanProduk } from "../../src/screens/produk/useRingkasanProduk";
import { colors, shadowStyle, sizes } from "../../src/theme/tokens";
import { useCart } from "../../contexts/CartContext";
import { addToWishlist, fetchProductById } from "../../services/api";
import { handleAuthError, getErrorMessage } from "../../utils/auth";
import { bagikanProduk, urlProdukWeb } from "../../utils/bagikanProduk";

type Varian = {
  id: number;
  nama_varian: string;
  harga_beli?: number;
  harga_jual: number;
  stok?: number;
};

type ProdukDetail = {
  id: number;
  nama_produk: string;
  deskripsi?: string;
  harga: number;
  stok: number;
  kategori_nama?: string;
  gambar_url?: string | null;
  gambar?: { id: number; url?: string; gambar_utama?: boolean }[];
  varian?: Varian[];
  has_variants?: boolean;
  variants_count?: number;
  rating?: number;
  reviews_count?: number;
  /** Matriks harga varian × satuan + tier (dari endpoint detail publik). */
  harga_jual_satuan?: BarisHargaSatuan[];
  /** Ringkasan grosir dari endpoint publik. */
  grosir?: GrosirRingkas | null;
  /** Flash sale: harga efektif sudah ada di `harga_jual_satuan` (K1);
   * dua field ini untuk badge + fallback produk legacy tanpa matriks. */
  is_flash_sale?: boolean;
  harga_flash_sale?: number | null;
};

/**
 * Detail produk Zovora — guideline §3.9/§3.10 + §4 (Product Detail) + §5.
 *
 * Susunan: carousel gambar 1:1 dengan rating chip (kanan bawah) → nama, harga +
 * coret + badge diskon → chip varian (terpilih: border-2 primary-600 bg
 * primary-50) → jumlah (Stepper) → deskripsi → ringkasan ulasan → sticky CTA
 * bar dua tombol (outline "Tambah ke Keranjang" + primary "Beli Sekarang",
 * flex 1 : 1,3, gap 12, shadow-bar + safe area).
 *
 * Logika varian, stok, dan add-to-cart TIDAK diubah: masih memakai
 * `fetchProductById`, `addItem(product, quantity, varian)` dan aturan
 * "pilih varian dulu" yang sama.
 */
export default function ProductDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/products");
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();

  const idProduk = Number(params.id);
  const idValid = Number.isFinite(idProduk) && idProduk > 0;

  const [produk, setProduk] = useState<ProdukDetail | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [jumlah, setJumlah] = useState(1);
  const [varianTerpilih, setVarianTerpilih] = useState<Varian | null>(null);
  const [diWishlist, setDiWishlist] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const [membagikan, setMembagikan] = useState(false);

  const muatProduk = useCallback(async () => {
    if (!idValid) {
      setMemuat(false);
      setGalat(teks.error.umum);
      return;
    }
    setMemuat(true);
    setGalat(null);
    try {
      const data = (await fetchProductById(idProduk)) as unknown as ProdukDetail;
      setProduk(data);
      // Varian pertama dipilih otomatis — perilaku lama dipertahankan.
      if (data.varian && data.varian.length > 0) setVarianTerpilih(data.varian[0]);
    } catch (e) {
      const isAuthError = await handleAuthError(e);
      if (!isAuthError) setGalat(getErrorMessage(e));
    } finally {
      setMemuat(false);
    }
  }, [idProduk, idValid]);

  useEffect(() => {
    // SetState baru dijalankan setelah tick berikutnya agar tidak sinkron di
    // body effect (menghindari render berantai yang diperingatkan React).
    let aktif = true;
    (async () => {
      await Promise.resolve();
      if (aktif) muatProduk();
    })();
    return () => {
      aktif = false;
    };
  }, [muatProduk]);

  /**
   * Ganti varian → jumlah direset ke 1 (aturan lama dipertahankan).
   * Dilakukan di handler, bukan effect, agar tidak memicu render berantai.
   */
  const pilihVarian = useCallback((v: Varian) => {
    setVarianTerpilih(v);
    setJumlah(1);
  }, []);

  const hargaSatuan = varianTerpilih ? Number(varianTerpilih.harga_jual) : (produk?.harga ?? 0);
  const stokEfektif = varianTerpilih?.stok ?? stokTampil(produk ?? { id: 0, nama_produk: "" });
  const stokHabis = Number(stokEfektif) <= 0;

  /**
   * Harga grosir untuk varian yang sedang dipilih.
   *
   * Sumbernya matriks `harga_jual_satuan` dari endpoint detail. Sejak keputusan
   * K1 matriks itu sudah membawa HARGA EFEKTIF: `harga_ecer` = harga yang
   * ditagih untuk qty 1 (harga flash bila promo aktif), `harga_ecer_normal` =
   * harga master untuk coret, dan tier yang lebih mahal dari flash sudah
   * berganti label `Flash Sale`. `hargaEfektifBaris` membaca kontrak itu, jadi
   * angka di layar detail = angka yang ditagih checkout untuk qty yang sama.
   * `flashFallback` menutup produk legacy / payload lama tanpa matriks.
   */
  const barisHarga = useMemo(
    () => barisUntukVarian(produk?.harga_jual_satuan, varianTerpilih?.id ?? produk?.varian?.[0]?.id),
    [produk, varianTerpilih],
  );

  const flashFallback = produk?.is_flash_sale ? Number(produk.harga_flash_sale ?? 0) || null : null;

  const hargaQty = useMemo(
    () => hargaEfektifBaris(barisHarga, jumlah, hargaSatuan, flashFallback),
    [barisHarga, jumlah, hargaSatuan, flashFallback],
  );

  /** Harga yang ditampilkan besar: harga efektif qty saat ini. */
  const hargaTampilQty = hargaQty.harga;
  const teksGrosir = teksUpsell(hargaQty.berikut, rupiah);
  /** Flash dianggap tampil bila harga efektif lebih murah dari harga master. */
  const flashTampil = hargaQty.flash && hargaQty.hargaNormal > hargaTampilQty;

  /**
   * Seluruh tingkat harga untuk daftar "Ecer & Grosir": tier dari matriks
   * backend, ditambah baris ecer bila backend hanya mengirim tier grosir.
   * Diurutkan menurut min_qty supaya terbaca sebagai tangga harga.
   *
   * Saat flash aktif, baris pertama matriks sudah berupa `Flash Sale` (harga
   * efektif), jadi baris "Ecer" sintetis tidak ditambahkan — harga ecer master
   * tetap terlihat sebagai harga coret di judul, bukan sebagai tingkat harga
   * yang bisa dipilih.
   */
  const tierTampil = useMemo(() => {
    const dariBackend = (barisHarga?.tier ?? []).map((t) => ({
      nama_tier: String(t.nama_tier ?? "Grosir"),
      harga: Number(t.harga) || 0,
      min_qty: Number(t.min_qty) || 1,
      is_default: Boolean(t.is_default),
    }));

    if (dariBackend.length === 0) return [];

    const adaEcer = dariBackend.some((t) => t.min_qty <= 1);
    const ecer = hargaQty.hargaEcer;

    if (adaEcer || ecer <= 0) return [...dariBackend].sort((a, b) => a.min_qty - b.min_qty);

    // Produk yang hanya punya tier grosir: lengkapi dengan harga qty 1 —
    // labelnya `Flash Sale` bila angka itu berasal dari promo.
    const barisPertama = {
      nama_tier: flashTampil ? NAMA_TIER_FLASH : "Ecer",
      harga: ecer,
      min_qty: 1,
      is_default: !flashTampil,
    };

    return [barisPertama, ...dariBackend].sort((a, b) => a.min_qty - b.min_qty);
  }, [barisHarga, hargaQty.hargaEcer, flashTampil]);

  /**
   * Rating & jumlah ulasan dibaca langsung dari endpoint publik lewat hook
   * terpisah: `fetchProductById` (services/api.ts, tidak diubah pada W3) hanya
   * meneruskan field yang dipakai keranjang sehingga rating hilang di sana.
   */
  const { rating, jumlahUlasan: jumlahUlasanProduk } = useRingkasanProduk(
    idValid ? idProduk : null,
  );

  /**
   * Harga coret: acuan tertinggi antara harga master varian dan harga normal
   * dari matriks (`harga_ecer_normal`), supaya saat flash/grosir aktif harga
   * normal tampil sebagai pembanding yang sah (bukan badge diskon karangan).
   */
  const hargaCoret = useMemo(() => {
    const masterVarian = (produk?.varian ?? []).map((v) => Number(v.harga_jual) || 0);
    const termahal = masterVarian.length > 0 ? Math.max(...masterVarian) : 0;

    return Math.max(termahal, hargaQty.hargaNormal);
  }, [produk, hargaQty.hargaNormal]);

  const diskon =
    hargaCoret > hargaTampilQty
      ? Math.round(((hargaCoret - hargaTampilQty) / hargaCoret) * 100)
      : 0;

  const gambarGaleri = useMemo(() => {
    if (!produk) return [];
    if (produk.gambar && produk.gambar.length > 0) {
      return [...produk.gambar]
        .sort((a, b) => Number(b.gambar_utama) - Number(a.gambar_utama))
        .map((g, i) => ({ id: g.id ?? i, url: g.url }));
    }
    if (produk.gambar_url) return [{ id: 0, url: produk.gambar_url }];
    return [];
  }, [produk]);

  /** Varian yang belum dipilih padahal produk bervarian → wajib pilih dulu. */
  const perluPilihVarian = (produk?.varian?.length ?? 0) > 0 && !varianTerpilih;

  const tambahKeKeranjang = useCallback(async (): Promise<boolean> => {
    if (!produk) return false;
    if (perluPilihVarian) {
      Alert.alert(teks.produk.pilihVarian, teks.produk.pilihVarianDeskripsi);
      return false;
    }
    try {
      /**
       * Harga yang dikirim ke keranjang = harga EFEKTIF qty ini (bisa harga
       * grosir), bukan selalu harga ecer varian. Sebelumnya baris keranjang
       * memakai `harga_jual` sehingga pembeli yang memesan 12 pcs melihat
       * harga grosir di layar tetapi ditagih ecer di keranjang.
       *
       * Server tetap menghitung ulang harga saat checkout (otoritas di sana);
       * ini hanya supaya tampilan keranjang/ringkasan tidak menipu.
       */
      const varianUntukKeranjang = varianTerpilih
        ? {
            ...varianTerpilih,
            harga: hargaQty.harga,
            harga_ecer: hargaQty.hargaEcer,
            nama_tier: hargaQty.namaTier,
            satuan_id: barisHarga?.satuan_id ?? null,
            // Tier lengkap dipakai CartContext untuk menghitung ulang harga saat
            // qty berubah (mis. 11 → 12 melewati ambang).
            tier: barisHarga?.tier ?? [],
          }
        : undefined;

      await addItem(produk, jumlah, varianUntukKeranjang);
      return true;
    } catch (e) {
      Alert.alert(
        teks.umum.gagal,
        e instanceof Error && e.message ? e.message : teks.error.umum,
      );
      return false;
    }
  }, [produk, perluPilihVarian, varianTerpilih, addItem, jumlah, hargaQty, barisHarga]);

  const onTambahKeranjang = async () => {
    setMemproses(true);
    const berhasil = await tambahKeKeranjang();
    setMemproses(false);
    if (berhasil) {
      Alert.alert(
        teks.umum.berhasil,
        teks.produk.tambahKeranjangBerhasil.replace("{nama}", produk?.nama_produk ?? ""),
        [{ text: "OK" }],
      );
    }
  };

  const onBeliSekarang = async () => {
    setMemproses(true);
    const berhasil = await tambahKeKeranjang();
    setMemproses(false);
    if (berhasil) router.push("/checkout/summary");
  };

  const onTambahWishlist = async () => {
    if (!produk) return;
    try {
      await addToWishlist(produk.id);
      setDiWishlist(true);
    } catch {
      Alert.alert(teks.umum.gagal, teks.error.umum);
    }
  };

  /**
   * Bagikan produk — tautan selalu menunjuk versi WEB ecommerce
   * (`<origin-web>/product/<id>`) supaya penerima di chat bisa membukanya.
   * Native memakai share sheet sistem; web memakai Web Share API dengan
   * fallback salin tautan (lihat `utils/bagikanProduk.ts`).
   */
  const onBagikan = async () => {
    if (!produk) return;
    setMembagikan(true);
    try {
      const hasil = await bagikanProduk({
        idProduk: produk.id,
        namaProduk: produk.nama_produk,
      });

      if (hasil.mode === "copy") {
        Alert.alert(teks.produk.tautanDisalin, teks.produk.tautanDisalinDeskripsi, [
          { text: "OK" },
        ]);
      } else if (hasil.mode === "gagal") {
        Alert.alert(teks.umum.gagal, `${teks.produk.bagikanGagal}\n\n${hasil.url}`, [
          { text: "OK" },
        ]);
      }
      // `share` dan `batal` tidak perlu dialog tambahan: dialog sistem sudah
      // menjadi umpan baliknya (dan `batal` = pengguna menutup sheet).
    } finally {
      setMembagikan(false);
    }
  };

  /* ---------------------------- state layar ---------------------------- */

  if (memuat) {
    return (
      /* Skeleton memakai tata letak akhir: galeri menembus status bar,
         tombol kembali di galeri sudah memakai inset atas sendiri. */
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["left", "right"]}>
        <ProductGallery
          gambar={[]}
          loading
          onBack={kembali}
        />
        <View className="gap-3 p-4">
          <Skeleton height={20} width="80%" />
          <Skeleton height={28} width="45%" />
          <Skeleton height={14} width="35%" />
          <Skeleton height={44} width="100%" />
          <Skeleton height={96} width="100%" radiusClassName="rounded-lg" />
        </View>
      </SafeAreaView>
    );
  }

  if (galat || !produk) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
        <View className="flex-row items-center px-2" style={{ height: sizes.appBar }}>
          <Pressable
            onPress={() => kembali()}
            accessibilityRole="button"
            accessibilityLabel={teks.umum.kembali}
            hitSlop={sizes.hitSlop}
            className="h-11 w-11 items-center justify-center"
          >
            <Text className="font-inter-semibold text-base text-primary-700">
              {teks.umum.kembali}
            </Text>
          </Pressable>
        </View>
        <ErrorState pesan={galat} onRetry={muatProduk} />
      </SafeAreaView>
    );
  }

  /* ------------------------------- render ------------------------------ */

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <ProductGallery
          gambar={gambarGaleri}
          rating={rating}
          jumlahUlasan={jumlahUlasanProduk}
          onBack={kembali}
          aksiKanan={
            <>
              {/*
                Bagikan — ikon Share2 di kiri tombol wishlist. Tautan yang
                dibagikan adalah versi WEB ecommerce (`/product/<id>`), bukan
                skema `deadeastore://`, supaya bisa dibuka penerima.
              */}
              <Pressable
                onPress={onBagikan}
                disabled={membagikan}
                accessibilityRole="button"
                accessibilityLabel={teks.produk.bagikanProduk}
                accessibilityState={{ busy: membagikan, disabled: membagikan }}
                hitSlop={sizes.hitSlop}
                testID="tombol-bagikan-produk"
                className={`items-center justify-center rounded-full bg-white shadow-float active:opacity-90 ${
                  membagikan ? "opacity-50" : ""
                }`}
                style={{ width: sizes.iconButton, height: sizes.iconButton }}
              >
                <Share2 size={18} color={colors.neutral700} strokeWidth={1.75} />
              </Pressable>

              <Pressable
                onPress={onTambahWishlist}
                accessibilityRole="button"
                accessibilityLabel={
                  diWishlist ? teks.a11y.hapusDariWishlist : teks.a11y.tambahKeWishlist
                }
                accessibilityState={{ selected: diWishlist }}
                hitSlop={sizes.hitSlop}
                className="items-center justify-center rounded-full bg-white shadow-float active:opacity-90"
                style={{ width: sizes.iconButton, height: sizes.iconButton }}
              >
                <Heart
                  size={18}
                  color={diWishlist ? colors.danger500 : colors.neutral700}
                  fill={diWishlist ? colors.danger500 : "transparent"}
                  strokeWidth={1.75}
                />
              </Pressable>
            </>
          }
        />

        {/* Judul + harga. */}
        <View className="bg-white px-4 pb-4">
          <Text
            className="font-inter-semibold text-xl text-neutral-900"
            accessibilityRole="header"
            maxFontSizeMultiplier={1.3}
          >
            {produk.nama_produk}
          </Text>

          <View className="mt-2 flex-row flex-wrap items-baseline gap-x-2">
            <Text className="font-inter-bold text-2xl text-neutral-900 tabular-nums">
              {rupiah(hargaTampilQty)}
            </Text>
            {/*
              Harga coret: acuan tertinggi antara harga master varian dan harga
              normal matriks, supaya saat grosir/flash aktif harga normal tampil
              sebagai pembanding yang sah (bukan badge diskon karangan).
            */}
            {Math.max(hargaCoret, hargaQty.hargaEcer) > hargaTampilQty ? (
              <Text className="font-inter text-sm text-neutral-400 line-through tabular-nums">
                {rupiah(Math.max(hargaCoret, hargaQty.hargaEcer))}
              </Text>
            ) : null}
            {flashTampil ? (
              <Badge
                label={teks.judul.flashSale}
                variant="danger"
                accessibilityLabel={`Harga ${teks.judul.flashSale} berlaku untuk ${jumlah} item`}
              />
            ) : hargaQty.grosir ? (
              <Badge
                label={hargaQty.namaTier}
                variant="success"
                accessibilityLabel={`Harga ${hargaQty.namaTier} berlaku untuk ${jumlah} item`}
              />
            ) : diskon > 0 ? (
              <Badge label={`-${diskon}%`} accessibilityLabel={teks.produk.diskonPersen.replace("{persen}", String(diskon))} />
            ) : null}
          </View>

          {/* Upsell grosir: menyebut ambang & harga berikutnya, bukan sekadar "ada grosir". */}
          {teksGrosir ? (
            <Text
              className="mt-1 font-inter-medium text-xs text-success-700"
              maxFontSizeMultiplier={1.3}
            >
              {teksGrosir}
            </Text>
          ) : null}

          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <Text className="font-inter text-xs text-neutral-500">
              {teks.produk.stokTersedia.replace("{jumlah}", String(stokEfektif))}
            </Text>
            {produk.kategori_nama ? (
              <>
                <Text className="font-inter text-xs text-neutral-300">·</Text>
                <Text className="font-inter text-xs text-neutral-500">
                  {produk.kategori_nama}
                </Text>
              </>
            ) : null}
          </View>

          {/*
            Baris bagikan eksplisit (label + tautan versi web yang terlihat).
            Ikon di galeri berguna di ponsel; di web tombol berlabel ini yang
            memakai Web Share API dan, bila browser tidak mendukungnya, menyalin
            tautan lalu memberi tahu "Tautan produk disalin".
          */}
          <View className="mt-3 flex-row items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
            <Pressable
              onPress={onBagikan}
              disabled={membagikan}
              accessibilityRole="button"
              accessibilityLabel={teks.produk.bagikanProduk}
              accessibilityState={{ busy: membagikan, disabled: membagikan }}
              testID="tombol-bagikan-baris"
              className={`flex-row items-center gap-1.5 rounded-sm bg-white px-3 ${
                membagikan ? "opacity-50" : "active:bg-primary-50"
              }`}
              style={{ minHeight: sizes.minTouchTarget }}
            >
              <Share2 size={16} color={colors.primary700} strokeWidth={1.75} />
              <Text
                className="font-inter-medium text-xs text-primary-700"
                maxFontSizeMultiplier={1.3}
              >
                {teks.produk.bagikan}
              </Text>
            </Pressable>
            <Text
              className="flex-1 font-inter text-caption text-neutral-500"
              numberOfLines={1}
              testID="tautan-produk-web"
            >
              {urlProdukWeb(produk.id)}
            </Text>
          </View>
        </View>

        {/* Chip varian — terpilih border-2 primary-600 + bg primary-50. */}
        {produk.varian && produk.varian.length > 0 ? (
          <View className="mt-2 bg-white px-4 py-4">
            <Text className="mb-3 font-inter-semibold text-base text-neutral-900">
              {teks.produk.varian}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {produk.varian.map((v) => {
                const terpilih = varianTerpilih?.id === v.id;
                const habis = Number(v.stok ?? 0) <= 0;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => pilihVarian(v)}
                    disabled={habis}
                    accessibilityRole="button"
                    accessibilityState={{ selected: terpilih, disabled: habis }}
                    accessibilityLabel={`${v.nama_varian}${habis ? `, ${teks.beranda.stokHabis}` : ""}`}
                    className={`items-center justify-center rounded-md border px-3 ${
                      terpilih
                        ? "border-2 border-primary-600 bg-primary-50"
                        : "border-neutral-200 bg-white"
                    } ${habis ? "opacity-40" : ""}`}
                    style={{ minHeight: sizes.minTouchTarget }}
                    hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                  >
                    <Text
                      className={`font-inter-medium text-sm ${
                        terpilih ? "text-primary-700" : "text-neutral-700"
                      }`}
                      maxFontSizeMultiplier={1.3}
                    >
                      {v.nama_varian}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Jumlah. */}
        <View className="mt-2 flex-row items-center justify-between bg-white px-4 py-4">
          <Text className="font-inter-semibold text-base text-neutral-900">
            {teks.produk.jumlah}
          </Text>
          <Stepper
            value={jumlah}
            onChange={setJumlah}
            max={Number(stokEfektif) || undefined}
            contextLabel={produk.nama_produk}
          />
        </View>

        {/*
          Daftar harga Ecer & Grosir — pembeli melihat seluruh tingkat harga
          sebelum menambah qty. Daftar ini hanya muncul bila backend benar-benar
          mengirim tier (produk legacy tetap bersih tanpa bagian kosong).
        */}
        {tierTampil.length > 0 ? (
          <View className="mt-2 bg-white px-4 py-4" testID="tabel-harga-grosir">
            <Text className="mb-1 font-inter-semibold text-base text-neutral-900">
              {teks.produk.hargaGrosir}
            </Text>
            <Text className="mb-3 font-inter text-xs text-neutral-500">
              {teks.produk.hargaGrosirDeskripsi.replace(
                "{satuan}",
                barisHarga?.nama_satuan ?? "pcs",
              )}
            </Text>

            <View className="gap-1.5">
              {tierTampil.map((t) => {
                const aktif = hargaQty.namaTier === t.nama_tier;

                return (
                  <View
                    key={t.nama_tier}
                    className={`flex-row items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                      aktif ? "border-success-500 bg-success-50" : "border-neutral-200 bg-white"
                    }`}
                    style={{ minHeight: sizes.minTouchTarget }}
                  >
                    <View className="min-w-0 flex-1">
                      <Text
                        className={`font-inter-medium text-sm ${
                          aktif ? "text-success-700" : "text-neutral-900"
                        }`}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.3}
                      >
                        {t.nama_tier}
                      </Text>
                      <Text
                        className="font-inter text-caption text-neutral-500"
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.3}
                      >
                        {t.min_qty <= 1
                          ? teks.produk.berlakuSemuaQty
                          : teks.produk.mulaiQty.replace("{jumlah}", String(t.min_qty))}
                      </Text>
                    </View>

                    <Text
                      className={`font-inter-semibold text-sm tabular-nums ${
                        aktif ? "text-success-700" : "text-neutral-900"
                      }`}
                      maxFontSizeMultiplier={1.3}
                    >
                      {rupiah(t.harga)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Deskripsi. */}
        {produk.deskripsi ? (
          <View className="mt-2 bg-white px-4 py-4">
            <Text className="mb-2 font-inter-semibold text-base text-neutral-900">
              {teks.produk.deskripsi}
            </Text>
            <Text className="font-inter text-sm leading-5 text-neutral-700">
              {produk.deskripsi}
            </Text>
          </View>
        ) : null}

        {/* Ringkasan ulasan → layar Reviews. */}
        <View className="mt-2 bg-white px-4 py-4">
          <SectionHeader
            judul={teks.produk.ulasan}
            aksiLabel={teks.produk.lihatSemuaUlasan}
            onPressAksi={() => router.push(`/product/${produk.id}/reviews`)}
          />
          {rating != null ? (
            <Pressable
              onPress={() => router.push(`/product/${produk.id}/reviews`)}
              accessibilityRole="button"
              accessibilityLabel={`${teks.judul.reviews}: ${formatRating(rating)} ${teks.ulasan.dariRating}`}
              className="flex-row items-center gap-2 rounded-lg border border-neutral-100 px-3 py-3 active:bg-neutral-50"
              style={{ minHeight: sizes.minTouchTarget }}
            >
              <Text className="font-inter-bold text-xl text-neutral-900 tabular-nums">
                {formatRating(rating)}
              </Text>
              <View className="flex-row items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((b) => (
                  <Star
                    key={b}
                    size={12}
                    color={colors.warning500}
                    fill={b <= Math.round(rating) ? colors.warning500 : "transparent"}
                    strokeWidth={1.75}
                  />
                ))}
              </View>
              <Text className="font-inter text-xs text-neutral-500">
                {jumlahUlasanProduk > 0
                  ? `${jumlahUlasanProduk} ${teks.satuan.ulasan}`
                  : teks.produk.belumAdaUlasan}
              </Text>
            </Pressable>
          ) : (
            <View className="rounded-lg border border-neutral-100 py-4">
              <EmptyState
                icon={<MessageSquare size={36} color={colors.primary600} strokeWidth={1.75} />}
                title={teks.produk.belumAdaUlasan}
                description={teks.produk.belumAdaUlasanDeskripsi}
                className="py-0"
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA bar — dua tombol flex 1 : 1,3, gap 12 (guideline §3.1). */}
      <View
        className="w-full flex-row items-center gap-3 border-t border-neutral-100 bg-white px-4 pt-3"
        style={[{ paddingBottom: paddingBawahStickyBar(insets) }, shadowStyle("bar")]}
      >
        <Pressable
          onPress={onTambahKeranjang}
          disabled={stokHabis || memproses}
          accessibilityRole="button"
          accessibilityLabel={teks.tombol.tambahKeKeranjang}
          accessibilityState={{ disabled: stokHabis || memproses, busy: memproses }}
          className={`items-center justify-center rounded-md border border-primary-600 bg-white ${
            stokHabis ? "opacity-50" : ""
          }`}
          style={{ flex: 1, height: sizes.buttonLg }}
        >
          <Text
            className="font-inter-semibold text-sm text-primary-700"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {teks.tombol.tambahKeKeranjang}
          </Text>
        </Pressable>

        <Pressable
          onPress={onBeliSekarang}
          disabled={stokHabis || memproses}
          accessibilityRole="button"
          accessibilityLabel={teks.tombol.beliSekarang}
          accessibilityState={{ disabled: stokHabis || memproses, busy: memproses }}
          className={`items-center justify-center rounded-md bg-primary-600 active:bg-primary-700 ${
            stokHabis ? "opacity-50" : ""
          }`}
          style={{ flex: 1.3, height: sizes.buttonLg }}
        >
          <Text
            className="font-inter-semibold text-base text-white"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {stokHabis ? teks.beranda.stokHabis : teks.tombol.beliSekarang}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
