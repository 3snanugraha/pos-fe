import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
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

/**
 * Tinggi kartu. Guideline §3.7 menyebut "sekitar 140"; 148 dipakai karena
 * isi terburuk (judul 2 baris + deskripsi 2 baris + tombol 32) butuh ~124 px
 * ditambah padding vertikal. Dengan 140 px tombol CTA terpotong oleh
 * `overflow-hidden` kartu — itu sebab banner tampak "tidak tampil benar".
 */
const TINGGI = 148;
const INTERVAL = 4000;

/** Porsi lebar kartu untuk kolom teks; sisanya untuk foto. */
const PORSI_TEKS = 0.52;

/**
 * Hex (#RGB / #RRGGBB) → rgba() dengan alfa tertentu.
 *
 * Dipakai untuk scrim banner. Alfa sengaja lebih rendah daripada warna solid
 * (permintaan pemilik: "overlay opacity-nya sedikit"), tetapi tetap pekat di
 * area teks supaya kontras judul tidak turun (guideline §2.1 & §7).
 */
export function denganAlfa(hex: string, alfa: number): string {
  const bersih = hex.replace("#", "");
  const penuh =
    bersih.length === 3
      ? bersih
          .split("")
          .map((c) => c + c)
          .join("")
      : bersih;

  if (penuh.length !== 6) return hex;

  const r = parseInt(penuh.slice(0, 2), 16);
  const g = parseInt(penuh.slice(2, 4), 16);
  const b = parseInt(penuh.slice(4, 6), 16);

  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;

  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

/**
 * Banner carousel Zovora — guideline §3.7 + §2.6.
 * Kartu `rounded-lg` tinggi 148, padding 12–16, judul Heading, deskripsi
 * Small, tombol kecil "Belanja Sekarang" (bg putih, teks primary-700), foto
 * di sisi kanan. Dots 6 pt neutral-300; yang aktif memanjang 16 pt
 * primary-600, 8 pt di bawah banner.
 *
 * Tata letak (anti-overflow):
 * - lebar kartu diukur dari KONTAINER lewat `onLayout`, bukan dari lebar
 *   jendela. Di web (dan di layar yang masih memberi padding) lebar jendela
 *   lebih besar daripada kontainer, sehingga kartu melebihi batas dan
 *   muncul scroll horizontal;
 * - foto `position: absolute` supaya tidak pernah menambah lebar konten;
 * - teks memakai `numberOfLines` + `flexShrink` sehingga tidak menembus
 *   tinggi kartu;
 * - `snapToInterval` sebagai ganti `pagingEnabled`, yang tidak didukung
 *   react-native-web sehingga geser tidak pernah "mendarat" di satu kartu.
 *
 * Overlay: scrim horizontal berwarna tema — alfa 0.92 di sisi teks lalu
 * luruh ke 0 sebelum sisi kanan, jadi foto tetap terlihat.
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
  const { width: lebarJendela } = useWindowDimensions();
  const reduce = useReduceMotion();
  const scrollRef = useRef<ScrollView>(null);
  const [aktif, setAktif] = useState(0);
  const [lebarKontainer, setLebarKontainer] = useState(0);

  const jumlah = banners.length;

  // Sebelum onLayout, pakai lebar jendela sebagai perkiraan supaya render
  // pertama tidak berkedip; setelah terukur, kontainer yang menentukan.
  const lebarAcuan = lebarKontainer > 0 ? lebarKontainer : lebarJendela;
  const lebarKartu = Math.max(0, Math.round(lebarAcuan - paddingHorizontal * 2));

  const onLayoutKontainer = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== lebarKontainer) setLebarKontainer(w);
  };

  // Indeks aktif dijaga valid saat daftar banner berubah.
  useEffect(() => {
    if (jumlah > 0 && aktif > jumlah - 1) setAktif(0);
  }, [jumlah, aktif]);

  // Auto-play 4 dtk — hanya bila >1 banner, Reduce Motion mati, dan lebar
  // kartu sudah diketahui (kalau belum, scrollTo akan meleset).
  useEffect(() => {
    if (reduce || jumlah < 2 || lebarKartu <= 0) return;
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
    if (lebarKartu <= 0) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / lebarKartu);
    if (index >= 0 && index < jumlah && index !== aktif) setAktif(index);
  };

  if (loading) {
    return (
      <View className={className} style={{ paddingHorizontal }}>
        <SkeletonBanner />
      </View>
    );
  }

  if (jumlah === 0) return null;

  // Banner cerah (peach) memakai teks neutral-900 sesuai aturan kontras §2.1.
  const gelap = tema?.teksBanner !== "dark";
  const warnaJudul = gelap ? "text-white" : "text-neutral-900";
  const warnaIsi = gelap ? "text-white" : "text-neutral-700";
  const gradien = (tema?.banner ?? [colors.primary500, colors.primary600]) as [string, string];

  // Scrim: warna gelap tema di area teks, lalu luruh ke 0 sebelum sisi kanan
  // sehingga foto tetap terlihat. Alfa dipilih dari perhitungan kontras
  // (putih di atas komposit, foto terang #FED7AA sebagai kasus terburuk):
  //   primary-600 α.86 → 3,6:1 (kurang untuk teks 16 px)
  //   primary-700 α.86 → 4,9:1 (lolos AA)
  // Karena itu tema terang memakai primary-700, bukan stop gradien 600.
  const warnaScrim = gelap ? colors.primary700 : gradien[1];
  const scrim: readonly [string, string, string] = [
    denganAlfa(warnaScrim, gelap ? 0.88 : 0.8),
    denganAlfa(warnaScrim, gelap ? 0.8 : 0.42),
    denganAlfa(warnaScrim, 0),
  ];

  return (
    <View
      className={className}
      onLayout={onLayoutKontainer}
      style={{ overflow: "hidden", width: "100%" }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={lebarKartu > 0 ? lebarKartu : undefined}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal }}
        accessibilityLabel={teks.beranda.geserBanner}
      >
        {banners.map((banner, index) => (
          <View key={banner.id} style={{ width: lebarKartu }} className="shrink-0">
            <View
              className="overflow-hidden"
              style={{ height: TINGGI, borderRadius: radius.lg }}
              accessible
              accessibilityRole="summary"
              accessibilityLabel={`${teks.beranda.bannerLabel
                .replace("{index}", String(index + 1))
                .replace("{total}", String(jumlah))}. ${banner.judul_banner}`}
            >
              {/* Dasar: gradien tema (guideline §3.7). */}
              <LinearGradient
                colors={gradien}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                pointerEvents="none"
              />

              {/* Foto: dipotong di sisi kanan, posisi absolut → tidak
                  menambah lebar maupun tinggi konten. */}
              {banner.gambar_url ? (
                <Image
                  source={{ uri: banner.gambar_url }}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: `${Math.round((1 - PORSI_TEKS) * 100 + 8)}%`,
                  }}
                  contentFit="cover"
                  transition={150}
                  accessibilityIgnoresInvertColors
                />
              ) : null}

              {/* Scrim halus di atas foto sebelah kiri — alfa turun ke 0
                  sebelum sisi kanan, jadi foto tetap terlihat. */}
              <LinearGradient
                colors={scrim}
                locations={[0, 0.5, 0.62]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                pointerEvents="none"
              />

              {/* Teks — lebar dibatasi porsi teks, tinggi dijaga flexShrink. */}
              <View
                className="absolute bottom-0 left-0 top-0 justify-center px-4 py-3"
                style={{ width: `${Math.round(PORSI_TEKS * 100 + 6)}%` }}
              >
                <Text
                  className={`font-inter-bold text-base ${warnaJudul}`}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.2}
                  style={{ flexShrink: 1 }}
                >
                  {banner.judul_banner}
                </Text>

                {banner.deskripsi ? (
                  <Text
                    className={`mt-1 font-inter text-xs ${warnaIsi}`}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                    style={{ flexShrink: 1 }}
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
                    maxFontSizeMultiplier={1.2}
                    numberOfLines={1}
                  >
                    {teks.beranda.bannerCta}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots — 6 pt, aktif memanjang 16 pt primary-600 (guideline §3.7). */}
      {jumlah > 1 ? (
        <View
          className="mt-2 flex-row items-center justify-center gap-2"
          style={{ paddingHorizontal }}
        >
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
