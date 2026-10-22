import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { teks } from "../../lib/i18n";
import { useReduceMotion } from "../../lib/motion";
import { colors, radius, sizes } from "../../theme/tokens";
import type { TemaKategori } from "../../theme/temaKategori";
import type { Banner } from "../../../services/types";
import { SkeletonBanner } from "./Skeleton";

export type BannerCarouselProps = {
  banners: Banner[];
  loading?: boolean;
  /**
   * Tema kategori aktif — menentukan gradien kartu (guideline §3.7:
   * For You primary-500 → 600, Beauty peach-300 dengan teks neutral-900).
   */
  tema?: TemaKategori;
  onPressBanner?: (banner: Banner) => void;
  /** Padding horizontal layar (kartu memenuhi lebar konten). */
  paddingHorizontal?: number;
  className?: string;
};

const TINGGI = 140;
const INTERVAL = 4000;

/**
 * Banner carousel Zovora — guideline §3.7 + §2.6.
 * Kartu `rounded-lg` tinggi ~140 padding 16, judul Heading, deskripsi Small,
 * tombol kecil "Belanja Sekarang" (bg putih, teks primary-700), foto di sisi
 * kanan. Dots 6 pt neutral-300; yang aktif memanjang 16 pt primary-600, 8 pt
 * di bawah banner.
 *
 * Auto-play 4 dtk — DINONAKTIFKAN bila Reduce Motion aktif (guideline §7).
 * Geser manual tetap bekerja dan memperbarui indeks.
 */
export function BannerCarousel({
  banners,
  loading = false,
  tema,
  onPressBanner,
  paddingHorizontal = 16,
  className = "",
}: BannerCarouselProps) {
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  const scrollRef = useRef<ScrollView>(null);
  const [aktif, setAktif] = useState(0);
  const lebarKartu = Math.max(240, width - paddingHorizontal * 2);

  const jumlah = banners.length;

  // Auto-play 4 dtk — hanya bila >1 banner dan Reduce Motion mati.
  useEffect(() => {
    if (reduce || jumlah < 2) return;
    const timer = setInterval(() => {
      setAktif((prev) => {
        const berikut = (prev + 1) % jumlah;
        scrollRef.current?.scrollTo({ x: berikut * lebarKartu, animated: true });
        return berikut;
      });
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [reduce, jumlah, lebarKartu]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / lebarKartu);
    if (index >= 0 && index < jumlah && index !== aktif) setAktif(index);
  };

  if (loading) {
    return (
      <View className={className}>
        <SkeletonBanner />
      </View>
    );
  }

  if (jumlah === 0) return null;

  // Banner cerah (peach) memakai teks neutral-900 sesuai aturan kontras §2.1.
  const gelap = tema?.teksBanner !== "dark";
  const warnaJudul = gelap ? "text-white" : "text-neutral-900";
  const warnaIsi = gelap ? "text-white/90" : "text-neutral-700";
  const gradien = (tema?.banner ?? [colors.primary500, colors.primary600]) as [string, string];

  return (
    <View className={className}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        accessibilityLabel={teks.beranda.geserBanner}
      >
        {banners.map((banner, index) => (
          <View key={banner.id} style={{ width: lebarKartu }}>
            <LinearGradient
              colors={gradien}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-row overflow-hidden rounded-lg"
              style={{ height: TINGGI, borderRadius: radius.lg }}
              accessible
              accessibilityRole="summary"
              accessibilityLabel={`${teks.beranda.bannerLabel
                .replace("{index}", String(index + 1))
                .replace("{total}", String(jumlah))}. ${banner.judul_banner}`}
            >
              <View className="flex-1 justify-center px-4 py-4" style={{ maxWidth: "70%" }}>
                <Text
                  className={`font-inter-bold text-xl ${warnaJudul}`}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.3}
                >
                  {banner.judul_banner}
                </Text>
                {banner.deskripsi ? (
                  <Text
                    className={`mt-1 font-inter text-xs ${warnaIsi}`}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.3}
                  >
                    {banner.deskripsi}
                  </Text>
                ) : null}

                <Pressable
                  onPress={() => onPressBanner?.(banner)}
                  accessibilityRole="button"
                  accessibilityLabel={`${teks.beranda.bannerCta}: ${banner.judul_banner}`}
                  className="mt-2 flex-row items-center justify-center self-start rounded-md bg-white px-3 active:opacity-90"
                  style={{ height: sizes.buttonSm }}
                  hitSlop={{ top: 6, bottom: 6, left: 0, right: 6 }}
                >
                  <Text
                    className="font-inter-semibold text-xs text-primary-700"
                    maxFontSizeMultiplier={1.3}
                  >
                    {teks.beranda.bannerCta}
                  </Text>
                </Pressable>
              </View>

              {banner.gambar_url ? (
                <Image
                  source={{ uri: banner.gambar_url }}
                  style={{ flex: 1, height: TINGGI }}
                  contentFit="cover"
                  transition={150}
                  accessibilityIgnoresInvertColors
                />
              ) : null}
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      {/* Dots — 6 pt, aktif memanjang 16 pt primary-600 (guideline §3.7). */}
      {jumlah > 1 ? (
        <View className="mt-2 flex-row items-center justify-center gap-2">
          {banners.map((b, i) => (
            <View
              key={b.id}
              className={`rounded-full ${i === aktif ? "bg-primary-600" : "bg-neutral-300"}`}
              style={{ width: i === aktif ? 16 : 6, height: 6 }}
              accessibilityLabel={`${i + 1}/${jumlah}`}
            />
          ))}
        </View>
      ) : null}

      {/* Status untuk pembaca layar, teks visual disembunyikan. */}
      <Text
        className="absolute opacity-0"
        style={{ height: 1, width: 1 }}
        accessibilityLiveRegion="polite"
      >
        {teks.beranda.bannerLabel
          .replace("{index}", String(aktif + 1))
          .replace("{total}", String(jumlah))}
      </Text>
    </View>
  );
}

export default BannerCarousel;
