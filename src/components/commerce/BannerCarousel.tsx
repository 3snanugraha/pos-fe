import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  Platform,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextStyle,
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

/** Porsi lebar kartu untuk kolom teks; sisanya tetap memperlihatkan foto. */
const PORSI_TEKS = 0.62;

/**
 * Hex (#RGB / #RRGGBB) → rgba() dengan alfa tertentu.
 *
 * Dipakai untuk bayangan teks di atas foto (BUKAN scrim/gradasi).
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
 * FOTO TANPA MASKING (bug pemilik 2026-10-23):
 * Dulu ada DUA lapisan di atas foto — gradien dasar tema + scrim horizontal
 * selebar ±62 % kartu — sehingga foto banner tampak biru dan tidak utuh.
 * Sekarang: bila banner punya `gambar_url` foto mengisi SELURUH kartu
 * (`cover`) dan TIDAK ada satu pun lapisan gradien dirender di atasnya
 * (ditandai `testID="banner-foto-tanpa-gradasi"` agar bisa diverifikasi di
 * DOM web). Gradien tema hanya menjadi latar pengganti saat foto tidak ada.
 * Kontras judul/deskripsi dijaga `textShadow` tipis, bukan lapisan gradasi.
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

  // Bayangan teks pengganti scrim. Warna bayangan berlawanan dengan warna
  // teks supaya judul tetap terbaca di atas foto terang maupun gelap:
  // teks putih → bayangan hitam 55 %; teks gelap → bayangan putih 65 %.
  //
  // Di web, prop `textShadow*` sudah deprecated (react-native-web memetakannya
  // ke CSS `text-shadow` sambil memperingatkan), jadi web memakai shorthand
  // `textShadow`; native tetap memakai tiga prop bertipe `TextStyle`.
  const bayangan: TextStyle = (() => {
    const warna = gelap ? denganAlfa("#000000", 0.55) : denganAlfa("#FFFFFF", 0.65);
    if (Platform.OS === "web") {
      return { textShadow: `0 1px 4px ${warna}` } as unknown as TextStyle;
    }
    return {
      textShadowColor: warna,
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    };
  })();

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
        {banners.map((banner, index) => {
          const punyaFoto = Boolean(banner.gambar_url);

          return (
            <View key={banner.id} style={{ width: lebarKartu }} className="shrink-0">
              <View
                className="overflow-hidden"
                style={{ height: TINGGI, borderRadius: radius.lg }}
                accessible
                accessibilityRole="summary"
                accessibilityLabel={`${teks.beranda.bannerLabel
                  .replace("{index}", String(index + 1))
                  .replace("{total}", String(jumlah))}. ${banner.judul_banner}`}
                /**
                 * Penanda QA web: kartu banner berfoto TIDAK boleh punya layer
                 * gradien. Nilai ini muncul sebagai `data-testid` di DOM
                 * react-native-web sehingga regresi masking bisa dideteksi.
                 */
                testID={punyaFoto ? "banner-foto-tanpa-gradasi" : "banner-latar-gradien"}
              >
                {/* Latar gradien tema — HANYA saat banner tidak punya foto, agar
                    tidak ada lapisan warna di atas/bawah foto. */}
                {punyaFoto ? null : (
                  <LinearGradient
                    colors={gradien}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    pointerEvents="none"
                  />
                )}

                {/* Foto: menutupi SELURUH kartu, tanpa scrim/gradasi di atasnya. */}
                {punyaFoto ? (
                  <Image
                    source={{ uri: banner.gambar_url }}
                    style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    contentFit="cover"
                    transition={150}
                    accessibilityIgnoresInvertColors
                  />
                ) : null}

                {/* Teks: overlay langsung di atas foto; kontras dari textShadow. */}
                <View
                  className="absolute bottom-0 left-0 top-0 justify-end px-4 py-3"
                  style={{ width: `${Math.round(PORSI_TEKS * 100)}%` }}
                >
                  <Text
                    className={`font-inter-bold text-base ${warnaJudul}`}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1.2}
                    style={[{ flexShrink: 1 }, bayangan]}
                  >
                    {banner.judul_banner}
                  </Text>

                  {banner.deskripsi ? (
                    <Text
                      className={`mt-1 font-inter text-xs ${warnaIsi}`}
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.2}
                      style={[{ flexShrink: 1 }, bayangan]}
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
          );
        })}
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
