import { ChevronLeft, ChevronRight, ImageIcon, Star } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatRating } from "../../lib/produk";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";
import { offsetMengambang } from "../../lib/inset";
import { Skeleton } from "./Skeleton";

export type GambarProduk = { id: number; url?: string | null; gambar_utama?: boolean };

export type ProductGalleryProps = {
  gambar: GambarProduk[];
  /** Rating chip kanan bawah pada gambar (guideline §3.10). */
  rating?: number | null;
  jumlahUlasan?: number;
  onBack?: () => void;
  /** Aksi kanan di atas gambar (mis. tombol wishlist). */
  aksiKanan?: React.ReactNode;
  loading?: boolean;
};

/**
 * Galeri produk detail Zovora — guideline §2.5 + §3.10.
 * Carousel gambar rasio 1:1 (hero), dot pagination 6 pt (aktif 16 pt
 * primary-600), rating chip kanan bawah gambar (bg putih 90%, `rounded-sm`,
 * bintang + angka Caption bold + jumlah ulasan), serta tombol kembali 36
 * `shadow-float` di atas gambar.
 */
export function ProductGallery({
  gambar,
  rating,
  jumlahUlasan = 0,
  onBack,
  aksiKanan,
  loading = false,
}: ProductGalleryProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [aktif, setAktif] = useState(0);
  const listRef = useRef<FlatList<GambarProduk>>(null);
  const sisi = Math.min(width, 720);

  const daftar = gambar.filter((g) => !!g.url);

  if (loading) {
    return (
      <View className="bg-white">
        <Skeleton width={sisi} height={sisi} radiusClassName="rounded-none" />
      </View>
    );
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / sisi);
    if (index !== aktif && index >= 0 && index < daftar.length) setAktif(index);
  };

  const geser = (arah: -1 | 1) => {
    const target = Math.min(Math.max(aktif + arah, 0), daftar.length - 1);
    if (target === aktif) return;
    setAktif(target);
    listRef.current?.scrollToOffset({ offset: target * sisi, animated: true });
  };

  const labelRating =
    rating != null
      ? `Rating ${formatRating(rating)} ${teks.ulasan.dariRating}` +
        (jumlahUlasan > 0 ? `, ${jumlahUlasan} ${teks.satuan.ulasan}` : "")
      : undefined;

  return (
    <View className="bg-white">
      <View style={{ height: sisi, width: sisi }} className="self-center bg-neutral-50">
        {daftar.length === 0 ? (
          <View className="h-full w-full items-center justify-center">
            <ImageIcon size={48} color={colors.neutral300} strokeWidth={1.5} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={daftar}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            keyExtractor={(g, i) => `${g.id}-${i}`}
            getItemLayout={(_, index) => ({ length: sisi, offset: sisi * index, index })}
            accessibilityLabel={teks.produk.galeriProduk}
            renderItem={({ item, index }) => (
              <View style={{ width: sisi, height: sisi }}>
                <Image
                  source={{ uri: item.url ?? undefined }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                  accessibilityLabel={teks.produk.gambarKe
                    .replace("{index}", String(index + 1))
                    .replace("{total}", String(daftar.length))}
                />
              </View>
            )}
          />
        )}

        {/* Rating chip: kanan bawah gambar (guideline §3.10). */}
        {rating != null ? (
          <View
            className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-sm bg-white/90 px-2 py-1"
            accessible
            accessibilityLabel={labelRating}
          >
            <Star size={12} color={colors.warning500} fill={colors.warning500} strokeWidth={0} />
            <Text className="font-inter-bold text-caption text-neutral-900 tabular-nums">
              {formatRating(rating)}
            </Text>
            {jumlahUlasan > 0 ? (
              <Text className="font-inter text-caption text-neutral-500">({jumlahUlasan})</Text>
            ) : null}
          </View>
        ) : null}

        {/* Navigasi manual — target sentuh 44 pt. */}
        {daftar.length > 1 && aktif > 0 ? (
          <Pressable
            onPress={() => geser(-1)}
            accessibilityRole="button"
            accessibilityLabel="Gambar sebelumnya"
            className="absolute left-2 top-1/2 items-center justify-center rounded-full bg-white/90"
            style={{ width: 44, height: 44 }}
          >
            <ChevronLeft size={20} color={colors.neutral700} strokeWidth={2} />
          </Pressable>
        ) : null}
        {daftar.length > 1 && aktif < daftar.length - 1 ? (
          <Pressable
            onPress={() => geser(1)}
            accessibilityRole="button"
            accessibilityLabel="Gambar berikutnya"
            className="absolute right-2 top-1/2 items-center justify-center rounded-full bg-white/90"
            style={{ width: 44, height: 44 }}
          >
            <ChevronRight size={20} color={colors.neutral700} strokeWidth={2} />
          </Pressable>
        ) : null}

        {/* Tombol kembali & aksi di atas gambar (icon button 36 shadow-float).
            Gambar hero boleh menembus status bar (§2.5), tetapi tombol harus
            mulai di bawah inset atas agar tidak tertutup notif bar. */}
        <View
          className="absolute left-3 right-3 flex-row items-center justify-between"
          style={{ top: offsetMengambang(insets) }}
          pointerEvents="box-none"
        >
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={teks.umum.kembali}
              hitSlop={sizes.hitSlop}
              className="items-center justify-center rounded-full bg-white shadow-float active:opacity-90"
              style={{ width: sizes.iconButton, height: sizes.iconButton }}
            >
              <ChevronLeft size={20} color={colors.neutral900} strokeWidth={2} />
            </Pressable>
          ) : (
            <View />
          )}
          {aksiKanan ? <View className="flex-row items-center gap-2">{aksiKanan}</View> : null}
        </View>
      </View>

      {/* Dot pagination 6 pt (aktif 16 pt primary-600). */}
      {daftar.length > 1 ? (
        <View className="flex-row items-center justify-center gap-2 py-3">
          {daftar.map((g, i) => (
            <View
              key={`dot-${g.id}-${i}`}
              className={`rounded-full ${i === aktif ? "bg-primary-600" : "bg-neutral-300"}`}
              style={{ width: i === aktif ? 16 : 6, height: 6 }}
              accessibilityLabel={`${i + 1}/${daftar.length}`}
            />
          ))}
        </View>
      ) : (
        <View style={{ height: 12 }} />
      )}

      {daftar.length > 1 ? (
        <Text
          className="absolute opacity-0"
          style={{ height: 1, width: 1 }}
          accessibilityLiveRegion="polite"
        >
          {teks.produk.gambarKe
            .replace("{index}", String(aktif + 1))
            .replace("{total}", String(daftar.length))}
        </Text>
      ) : null}
    </View>
  );
}

export default ProductGallery;
