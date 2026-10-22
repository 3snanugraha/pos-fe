import { LinearGradient } from "expo-linear-gradient";
import { ChevronDown, Heart, Search, ShoppingBag } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { badgeJumlah } from "../../lib/format";
import { teks } from "../../lib/i18n";
import { colors, gradients, sizes } from "../../theme/tokens";
import { CategoryTabs, type KategoriTab } from "./CategoryTabs";

export type TemaHeader = "forYou" | "beauty";

const gradienTema: Record<TemaHeader, readonly [string, string, ...string[]]> = {
  // guideline §3.5/§2.1: gradien tema kategori primary-200 → primary-50 → putih.
  forYou: gradients.forYou,
  beauty: [colors.peach200, colors.neutral50, colors.white],
};

export type HomeHeaderProps = {
  /** Judul baris pertama ("Halo, Nama" / "Beranda"). */
  judul?: string;
  /** Alamat pengiriman aktif — dipotong satu baris. */
  alamat?: string;
  onPressAlamat?: () => void;
  /** Tombol ikon kanan. */
  onPressWishlist?: () => void;
  onPressCart?: () => void;
  jumlahKeranjang?: number;
  /** Search bar: tampilkan sebagai tombol (mode home) atau input. */
  onPressSearch?: () => void;
  searchPlaceholder?: string;
  /** Category tabs di dalam header. */
  tabs?: KategoriTab[];
  tabAktif?: string | number;
  onTabChange?: (id: string | number) => void;
  tema?: TemaHeader;
  /** Aksesori tambahan di bawah tabs (mis. banner). */
  children?: ReactNode;
};

/**
 * HomeHeader Zovora — guideline §3.5.
 * Gradien tema kategori (primary-200 → primary-50 → putih) yang menjangkau
 * hingga di bawah category tabs. Baris 1: judul Section bold + alamat Small
 * neutral-700 + chevron-down, di kanan dua icon button (heart dan bag).
 * Baris 2: search bar 44. Baris 3: category tabs.
 */
export function HomeHeader({
  judul = teks.judul.home,
  alamat,
  onPressAlamat,
  onPressWishlist,
  onPressCart,
  jumlahKeranjang = 0,
  onPressSearch,
  searchPlaceholder = teks.placeholder.search,
  tabs,
  tabAktif,
  onTabChange,
  tema = "forYou",
  children,
}: HomeHeaderProps) {
  const badge = jumlahKeranjang > 0 ? badgeJumlah(jumlahKeranjang) : null;

  return (
    <LinearGradient colors={gradienTema[tema]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      <View className="px-4 pt-2">
        {/* Baris 1 — judul, alamat, ikon kanan. */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text
              className="font-inter-bold text-base text-neutral-900"
              accessibilityRole="header"
              maxFontSizeMultiplier={1.3}
            >
              {judul}
            </Text>
            {alamat ? (
              <Pressable
                onPress={onPressAlamat}
                accessibilityRole="button"
                accessibilityLabel={`${teks.judul.deliveryAddress}: ${alamat}`}
                className="mt-0.5 flex-row items-center gap-1"
                hitSlop={sizes.hitSlop}
              >
                <Text
                  className="flex-shrink font-inter text-xs text-neutral-700"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {alamat}
                </Text>
                <ChevronDown size={14} color={colors.neutral700} strokeWidth={1.75} />
              </Pressable>
            ) : null}
          </View>

          <View className="flex-row items-center gap-2">
            <TombolIkon
              onPress={onPressWishlist}
              label={teks.nav.wishlist}
              ikon={<Heart size={20} color={colors.neutral700} strokeWidth={1.75} />}
            />
            <View>
              <TombolIkon
                onPress={onPressCart}
                label={teks.a11y.bukaKeranjang}
                ikon={<ShoppingBag size={20} color={colors.neutral700} strokeWidth={1.75} />}
              />
              {badge ? (
                <View
                  className="absolute -right-1 -top-1 items-center justify-center rounded-full bg-danger-500 px-1"
                  style={{ minWidth: 16, height: 16 }}
                  accessibilityLabel={`${badge} ${teks.satuan.item}`}
                >
                  <Text
                    className="font-inter-semibold text-caption text-white"
                    maxFontSizeMultiplier={1.3}
                  >
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Baris 2 — search bar 44. */}
        <Pressable
          onPress={onPressSearch}
          accessibilityRole="search"
          accessibilityLabel={searchPlaceholder}
          className="mt-3 flex-row items-center gap-2 rounded-md border border-neutral-200 bg-white px-3"
          style={{ height: sizes.searchBar }}
        >
          <Search size={20} color={colors.neutral400} strokeWidth={1.75} />
          <Text className="flex-1 font-inter text-sm text-neutral-400" numberOfLines={1}>
            {searchPlaceholder}
          </Text>
        </Pressable>
      </View>

      {/* Baris 3 — category tabs. */}
      {tabs && tabs.length > 0 ? (
        <View className="mt-3">
          <CategoryTabs items={tabs} value={tabAktif} onChange={onTabChange} />
        </View>
      ) : null}

      {children}
    </LinearGradient>
  );
}

/** Icon button lingkaran 36 bg putih + shadow-float (guideline §3.1). */
function TombolIkon({
  ikon,
  label,
  onPress,
}: {
  ikon: ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={sizes.hitSlop}
      className="items-center justify-center rounded-full bg-white shadow-float active:opacity-90"
      style={{ width: sizes.iconButton, height: sizes.iconButton }}
    >
      {ikon}
    </Pressable>
  );
}

export default HomeHeader;
