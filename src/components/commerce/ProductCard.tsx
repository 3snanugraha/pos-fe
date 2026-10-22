import { Image } from "expo-image";
import { ImageIcon, Star } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import {
  diskonPersen,
  formatRating,
  hargaCoret,
  hargaTampil,
  jumlahUlasan,
  ratingTampil,
  stokTampil,
  type ProdukApi,
} from "../../lib/produk";
import { rupiah } from "../../lib/format";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";
import { Badge } from "../ui/Badge";

export type ProdukKartu = ProdukApi;

export type ProductCardProps = {
  produk: ProdukKartu;
  onPress?: () => void;
  /** Lebar kartu pada scroll horizontal (default: penuh, untuk grid). */
  width?: number;
  className?: string;
};

/**
 * Kartu produk vertikal Zovora — guideline §3.9.
 * Gambar 3:4 `rounded-lg` bg neutral-50, badge diskon di kiri atas (offset 8),
 * nama Body medium 1–2 baris, harga Section bold + harga coret + rating.
 * Target sentuh seluruh kartu >= 44 pt dan berlabel aksesibilitas lengkap.
 */
export function ProductCardGrid({ produk, onPress, width, className = "" }: ProductCardProps) {
  const harga = hargaTampil(produk);
  const coret = hargaCoret(produk);
  const diskon = diskonPersen(produk);
  const rating = ratingTampil(produk);
  const ulasan = jumlahUlasan(produk);
  const stok = stokTampil(produk);

  const labelHarga = rupiah(harga);
  const labelA11y = [
    produk.nama_produk,
    labelHarga,
    diskon > 0 ? `diskon ${diskon} persen` : null,
    rating != null ? `rating ${formatRating(rating)}` : null,
    stok <= 0 ? teks.beranda.stokHabis : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={labelA11y}
      className={`rounded-lg border border-neutral-100 bg-white p-2 active:opacity-95 ${className}`}
      style={({ pressed }) => [
        width ? { width } : { flex: 1 },
        pressed ? { transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <View
        className="overflow-hidden rounded-lg bg-neutral-50"
        style={{ width: "100%", aspectRatio: 3 / 4 }}
      >
        {produk.gambar_url ? (
          <Image
            source={{ uri: produk.gambar_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <ImageIcon size={28} color={colors.neutral300} strokeWidth={1.75} />
          </View>
        )}

        {diskon > 0 ? (
          <View className="absolute left-2 top-2">
            <Badge label={`-${diskon}%`} accessibilityLabel={`Diskon ${diskon} persen`} />
          </View>
        ) : null}

        {stok <= 0 ? (
          <View className="absolute inset-x-0 bottom-0 bg-neutral-900/60 px-2 py-1">
            <Text
              className="font-inter-semibold text-caption text-white"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {teks.beranda.stokHabis}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        className="mt-2 font-inter-medium text-sm text-neutral-900"
        numberOfLines={2}
        maxFontSizeMultiplier={1.3}
      >
        {produk.nama_produk}
      </Text>

      <View className="mt-1 flex-row flex-wrap items-baseline gap-x-1.5">
        <Text
          className="font-inter-semibold text-base text-neutral-900 tabular-nums"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {labelHarga}
        </Text>
        {coret ? (
          <Text
            className="font-inter text-xs text-neutral-400 line-through tabular-nums"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {rupiah(coret)}
          </Text>
        ) : null}
      </View>

      {rating != null ? (
        <View className="mt-1 flex-row items-center gap-1">
          <Star size={12} color={colors.warning500} fill={colors.warning500} strokeWidth={0} />
          <Text className="font-inter-medium text-caption text-neutral-700 tabular-nums">
            {formatRating(rating)}
          </Text>
          {ulasan > 0 ? (
            <Text className="font-inter text-caption text-neutral-500">
              ({ulasan})
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export type KategoriAvatarProps = {
  nama: string;
  gambarUrl?: string | null;
  onPress?: () => void;
  /** Ikon fallback bila kategori tidak punya foto. */
  ikon?: React.ReactNode;
};

/**
 * Avatar kategori bulat 56 — guideline §2.3/§2.5.
 * Lingkaran 56 berisi foto (atau ikon), label Small di bawahnya. Dipakai di
 * baris "Kategori Pilihan" yang dapat digeser horizontal.
 */
export function KategoriAvatar({ nama, gambarUrl, onPress, ikon }: KategoriAvatarProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={nama}
      className="items-center active:opacity-80"
      style={{ width: 64 }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <View
        className="items-center justify-center overflow-hidden rounded-full border border-neutral-100 bg-primary-50"
        style={{ width: 56, height: 56 }}
      >
        {gambarUrl ? (
          <Image
            source={{ uri: gambarUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          (ikon ?? <ImageIcon size={22} color={colors.primary600} strokeWidth={1.75} />)
        )}
      </View>
      <Text
        className="mt-1.5 text-center font-inter text-xs text-neutral-700"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {nama}
      </Text>
    </Pressable>
  );
}

/** Lebar minimum target sentuh kartu horizontal (dipakai pemanggil). */
export const KARTU_MIN_TOUCH = sizes.minTouchTarget;

export default ProductCardGrid;
