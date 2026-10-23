import { ShoppingBasket } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AddressCard,
  CartItemRow,
  PriceSummary,
  Skeleton,
  StickyBar,
  StickyTotal,
} from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { Button, Dialog, EmptyState } from "../../src/components/ui";
import { rupiah } from "../../src/lib/format";
import { teks } from "../../src/lib/i18n";
import { colors } from "../../src/theme/tokens";
import { CartItem, useCart } from "../../contexts/CartContext";
import { apiService } from "../../services/apiService";
import type { CustomerAddress } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";

/**
 * Keranjang Zovora — guideline §3.11–§3.13 + §5.
 *
 * Susunan: alamat pengiriman ringkas (ikon map-pin 16 + link "Ganti") →
 * daftar item (thumbnail 72×80, stepper, trash) → ringkasan harga (kartu
 * primary-50) → sticky bar (total Heading + CTA "Lanjutkan" ±140).
 *
 * Logika keranjang sepenuhnya dari `CartContext` (tidak diubah): jumlah,
 * batas stok, dan alur ke `/checkout/summary` tetap sama.
 */
export default function CartScreen() {
  const router = useRouter();
  const {
    items,
    itemCount,
    totalAmount,
    removeItem,
    updateItemQuantity,
    isLoading: memuatKeranjang,
  } = useCart();

  const [alamat, setAlamat] = useState<CustomerAddress | null>(null);
  const [memuatAlamat, setMemuatAlamat] = useState(true);
  const [galatAlamat, setGalatAlamat] = useState<string | null>(null);
  const [menyegarkan, setMenyegarkan] = useState(false);
  /**
   * Baris yang menunggu konfirmasi hapus. Tombol trash di baris item dulu
   * langsung menghapus tanpa dialog; dialog konfirmasi sudah ada di i18n dan
   * dipakai Stepper, jadi aksi hapus harus lewat jalur yang sama.
   */
  const [hapusMenunggu, setHapusMenunggu] = useState<CartItem | null>(null);

  const ambilAlamat = async () => {
    try {
      const daftar = await apiService.getCustomerAddresses();
      return { utama: daftar.find((a) => a.is_default) ?? daftar[0] ?? null, galat: null };
    } catch (err: any) {
      const auth = await handleAuthError(err);
      return { utama: null, galat: auth ? null : getErrorMessage(err) };
    }
  };

  // Muat sekali saat layar dibuka; state hanya diubah di dalam callback async
  // (pola yang sama dengan beranda W3 — menghindari setState sinkron di effect).
  useEffect(() => {
    let aktif = true;
    (async () => {
      const hasil = await ambilAlamat();
      if (!aktif) return;
      setAlamat(hasil.utama);
      setGalatAlamat(hasil.galat);
      setMemuatAlamat(false);
    })();
    return () => {
      aktif = false;
    };
  }, []);

  const muatUlangAlamat = async () => {
    const hasil = await ambilAlamat();
    setAlamat(hasil.utama);
    setGalatAlamat(hasil.galat);
    setMemuatAlamat(false);
  };

  const onRefresh = async () => {
    setMenyegarkan(true);
    await muatUlangAlamat();
    setMenyegarkan(false);
  };

  const ubahJumlah = async (item: CartItem, next: number) => {
    // `updateItemQuantity` sudah membatasi ke stok; nilai <= 0 menghapus baris.
    await updateItemQuantity(item.id, next);
  };

  const ringkasan = useMemo(
    () => [
      { label: teks.checkout.subTotal, nilai: totalAmount },
      // Backend belum menghitung ongkir pada tahap ini — ditampilkan apa
      // adanya sebagai "Gratis" agar struktur ringkasan sesuai guideline.
      { label: teks.checkout.ongkosKirim, nilai: 0, teksNilai: teks.checkout.ongkirGratis },
    ],
    [totalAmount]
  );

  const keCheckout = () => {
    if (items.length === 0) return;
    router.push("/checkout/summary");
  };

  const memuat = memuatKeranjang && items.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <AppBar title={teks.judul.cart} showBack={false} />

      {memuat ? (
        <View className="flex-1 px-4 pt-4">
          <Skeleton height={64} radiusClassName="rounded-lg" width="100%" />
          {[0, 1, 2].map((i) => (
            <View key={i} className="mt-4 flex-row gap-3">
              <Skeleton width={72} height={80} radiusClassName="rounded-md" />
              <View className="flex-1">
                <Skeleton height={14} width="85%" />
                <Skeleton height={12} width="45%" className="mt-2" />
                <Skeleton height={16} width="35%" className="mt-2" />
              </View>
            </View>
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBasket size={36} color={colors.primary600} strokeWidth={1.75} />}
          title={teks.empty.keranjang.judul}
          description={teks.empty.keranjang.deskripsi}
          ctaLabel={teks.empty.keranjang.cta}
          onCtaPress={() => router.push("/(tabs)/products")}
        />
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={menyegarkan}
                onRefresh={onRefresh}
                colors={[colors.primary600]}
                tintColor={colors.primary600}
              />
            }
          >
            <View className="px-4 pt-2">
              <AddressCard
                variant="ringkas"
                alamat={
                  alamat
                    ? {
                        nama_penerima: alamat.nama_penerima,
                        telepon_penerima: alamat.telepon_penerima,
                        alamat_lengkap: alamat.alamat_lengkap,
                        wilayah: [alamat.kota, alamat.provinsi, alamat.kode_pos]
                          .filter(Boolean)
                          .join(", "),
                      }
                    : null
                }
                loading={memuatAlamat}
                onPress={() => router.push("/addresses")}
                onGanti={() => router.push("/addresses")}
              />

              {galatAlamat ? (
                <View className="mt-2">
                  <Button
                    title={teks.tombol.cobaLagi}
                    variant="ghost"
                    size="sm"
                    onPress={muatUlangAlamat}
                  />
                </View>
              ) : null}

              <View className="mt-4 divide-y divide-neutral-100">
                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    nama={item.nama_produk}
                    harga={item.harga}
                    jumlah={item.quantity}
                    stok={item.stok_tersedia}
                    gambarUrl={item.gambar_url ?? null}
                    keterangan={
                      [
                        item.varian_nama
                          ? teks.keranjang.varian.replace("{nama}", item.varian_nama)
                          : null,
                        item.kategori_nama,
                      ]
                        .filter(Boolean)
                        .join(" · ") || null
                    }
                    onPress={() => router.push(`/product/${item.produk_id}`)}
                    onChangeJumlah={(next) => ubahJumlah(item, next)}
                    onHapus={() => setHapusMenunggu(item)}
                  />
                ))}
              </View>

              <PriceSummary
                className="mt-2"
                baris={ringkasan}
                total={totalAmount}
                totalLabel={teks.checkout.total}
              />
            </View>
          </ScrollView>

          <StickyBar denganInset={false}>
            <StickyTotal
              nilai={rupiah(totalAmount)}
              catatan={teks.checkout.totalItem.replace("{jumlah}", String(itemCount))}
            />
            <Button
              title={teks.tombol.lanjutkan}
              variant="primary"
              size="lg"
              onPress={keCheckout}
              accessibilityLabel={`${teks.tombol.lanjutkan} ke ${teks.judul.orderSummary.toLowerCase()}`}
              className="w-[140px]"
            />
          </StickyBar>
        </>
      )}

      {/* Konfirmasi hapus item — satu jalur untuk tombol trash dan stepper. */}
      <Dialog
        visible={hapusMenunggu !== null}
        onClose={() => setHapusMenunggu(null)}
        title={teks.dialog.hapusItem.judul}
        description={
          hapusMenunggu
            ? `${hapusMenunggu.nama_produk} — ${teks.dialog.hapusItem.deskripsi}`
            : teks.dialog.hapusItem.deskripsi
        }
        actions={
          <>
            <Button
              title={teks.dialog.hapusItem.batal}
              variant="outline"
              size="md"
              className="flex-1"
              onPress={() => setHapusMenunggu(null)}
            />
            <Button
              title={teks.dialog.hapusItem.ya}
              variant="primary"
              size="md"
              className="flex-1"
              onPress={() => {
                const target = hapusMenunggu;
                setHapusMenunggu(null);
                if (target) removeItem(target.id);
              }}
            />
          </>
        }
      />
    </SafeAreaView>
  );
}
