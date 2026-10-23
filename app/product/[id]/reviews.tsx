import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, MessageSquare, Star } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBar } from "../../../src/components/layout";
import { EmptyState } from "../../../src/components/ui";
import { SkeletonBaris } from "../../../src/components/commerce/Skeleton";
import { waktuRelatif } from "../../../src/lib/format";
import { paddingBawahKonten } from "../../../src/lib/inset";
import { teks } from "../../../src/lib/i18n";
import { formatRating } from "../../../src/lib/produk";
import { useUlasanProduk } from "../../../src/screens/produk/useUlasanProduk";
import { colors, sizes } from "../../../src/theme/tokens";
import { kembaliAman } from "../../../src/lib/navigasi";

type OpsiUrut = "relevan" | "terbaru" | "tertinggi" | "terendah";

const LABEL_URUT: Record<OpsiUrut, string> = {
  relevan: teks.ulasan.palingRelevan,
  terbaru: teks.ulasan.terbaru,
  tertinggi: teks.ulasan.ratingTertinggi,
  terendah: teks.ulasan.ratingTerendah,
};

/**
 * Ulasan produk Zovora — guideline §3.10 + §4 (Reviews) + §5.
 *
 * Susunan: ringkasan rating (kotak kiri bg warning-50 border warning-500 dengan
 * angka besar + bintang; lima bar distribusi primary-500 di atas track
 * neutral-200) → header "N Ulasan" + dropdown urutkan → daftar review (bintang
 * 12 warning-500, teks 3 baris + "Selengkapnya", foto 48, "Nama · X hari lalu",
 * divider neutral-100).
 *
 * Bila backend tidak punya data ulasan (endpoint belum ada), layar menampilkan
 * empty state copy guideline — TIDAK error.
 */
export default function ReviewsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  /** Layar ini bisa dibuka langsung (deep link); kembali dengan aman. */
  const kembali = () => kembaliAman(router, "/products");
  const insets = useSafeAreaInsets();
  const idProduk = Number(params.id);
  const { ulasan, ringkasan, status } = useUlasanProduk(
    Number.isFinite(idProduk) && idProduk > 0 ? idProduk : null,
  );

  const [urut, setUrut] = useState<OpsiUrut>("relevan");
  const [bukaUrut, setBukaUrut] = useState(false);

  const daftar = useMemo(() => {
    const salinan = [...ulasan];
    if (urut === "terbaru") {
      salinan.sort((a, b) => new Date(b.tanggal ?? 0).getTime() - new Date(a.tanggal ?? 0).getTime());
    } else if (urut === "tertinggi") {
      salinan.sort((a, b) => b.rating - a.rating);
    } else if (urut === "terendah") {
      salinan.sort((a, b) => a.rating - b.rating);
    }
    return salinan;
  }, [ulasan, urut]);

  const totalUlasan = ringkasan.jumlahUlasan;
  const maksDistribusi = Math.max(1, ...ringkasan.distribusi);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <AppBar title={teks.ulasan.judul} onBack={kembali} />

      {status === "memuat" ? (
        <View className="pt-4">
          <View className="px-4">
            <SkeletonBaris jumlah={1} />
          </View>
          <SkeletonBaris jumlah={4} />
        </View>
      ) : totalUlasan === 0 ? (
        <View className="flex-1 justify-center px-4">
          <EmptyState
            icon={<MessageSquare size={36} color={colors.primary600} strokeWidth={1.75} />}
            title={teks.ulasan.belumAda}
            description={teks.ulasan.belumAdaDeskripsi}
            ctaLabel={teks.ulasan.judul}
            onCtaPress={kembali}
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: paddingBawahKonten(insets) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Ringkasan rating — kotak warning-50 + 5 bar distribusi. */}
          <View className="px-4 pt-4">
            <View className="flex-row gap-4">
              <View
                className="items-center justify-center rounded-md border border-warning-500 bg-warning-50 px-4 py-3"
                style={{ minWidth: 104 }}
                accessible
                accessibilityLabel={`${teks.ulasan.rating} ${formatRating(
                  ringkasan.rating ?? 0,
                )} ${teks.ulasan.dariRating}`}
              >
                <Text className="font-inter-bold text-4xl text-neutral-900 tabular-nums">
                  {formatRating(ringkasan.rating ?? 0)}
                </Text>
                <View className="mt-1 flex-row items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((b) => {
                    const isi = b <= Math.round(ringkasan.rating ?? 0);
                    return (
                      <Star
                        key={b}
                        size={12}
                        color={isi ? colors.warning500 : colors.neutral300}
                        fill={isi ? colors.warning500 : "transparent"}
                        strokeWidth={1.75}
                      />
                    );
                  })}
                </View>
                <Text className="mt-1 text-center font-inter text-caption text-neutral-500">
                  {teks.ulasan.jumlahRating
                    .replace("{jumlah}", String(ringkasan.jumlahRating))
                    .replace("{ulasan}", String(ringkasan.jumlahUlasan))}
                </Text>
              </View>

              <View className="flex-1 justify-center gap-1.5">
                {[5, 4, 3, 2, 1].map((bintang, i) => {
                  const jumlah = ringkasan.distribusi[i] ?? 0;
                  const persen = Math.round((jumlah / maksDistribusi) * 100);
                  return (
                    <View
                      key={bintang}
                      className="flex-row items-center gap-2"
                      accessible
                      accessibilityLabel={`${teks.ulasan.hanyaBintang.replace(
                        "{bintang}",
                        String(bintang),
                      )}: ${jumlah}`}
                    >
                      <Text className="w-2 font-inter-medium text-caption text-neutral-700 tabular-nums">
                        {bintang}
                      </Text>
                      <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                        <View
                          className="h-full rounded-full bg-primary-500"
                          style={{ width: `${Math.max(jumlah > 0 ? 4 : 0, persen)}%` }}
                        />
                      </View>
                      <Text className="w-6 text-right font-inter text-caption text-neutral-500 tabular-nums">
                        {jumlah}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Header daftar + dropdown urutkan. */}
          <View className="mt-6 flex-row items-center justify-between px-4">
            <Text
              className="font-inter-semibold text-base text-neutral-900"
              accessibilityRole="header"
            >
              {teks.ulasan.jumlahUlasan.replace("{jumlah}", String(totalUlasan))}
            </Text>

            <Pressable
              onPress={() => setBukaUrut((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={`${teks.ulasan.urutkan}: ${LABEL_URUT[urut]}`}
              accessibilityState={{ expanded: bukaUrut }}
              className="flex-row items-center gap-1"
              style={{ minHeight: sizes.minTouchTarget }}
              hitSlop={sizes.hitSlop}
            >
              <Text className="font-inter-medium text-xs text-primary-700">
                {LABEL_URUT[urut]}
              </Text>
              <ChevronDown size={14} color={colors.primary700} strokeWidth={1.75} />
            </Pressable>
          </View>

          {bukaUrut ? (
            <View className="mx-4 mt-1 overflow-hidden rounded-md border border-neutral-200 bg-white">
              {(Object.keys(LABEL_URUT) as OpsiUrut[]).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => {
                    setUrut(k);
                    setBukaUrut(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: urut === k }}
                  accessibilityLabel={LABEL_URUT[k]}
                  className={`justify-center px-3 ${
                    urut === k ? "bg-primary-50" : "bg-white"
                  }`}
                  style={{ minHeight: sizes.minTouchTarget }}
                >
                  <Text
                    className={`font-inter text-sm ${
                      urut === k ? "text-primary-700 font-inter-medium" : "text-neutral-700"
                    }`}
                  >
                    {LABEL_URUT[k]}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Daftar review. */}
          <View className="mt-2">
            {daftar.map((u) => (
              <ItemUlasan key={u.id} ulasan={u} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** Satu baris ulasan — guideline §3.10. */
function ItemUlasan({
  ulasan,
}: {
  ulasan: {
    id: number;
    nama: string;
    rating: number;
    teks: string;
    tanggal?: string | number | null;
    foto?: string[];
    varian?: string | null;
  };
}) {
  const [buka, setBuka] = useState(false);
  const perluToggle = ulasan.teks.length > 120;

  return (
    <View className="border-b border-neutral-100 px-4 py-4">
      <View
        className="flex-row items-center gap-1"
        accessible
        accessibilityLabel={teks.ulasan.bintangKe.replace("{bintang}", String(ulasan.rating))}
      >
        {[1, 2, 3, 4, 5].map((b) => (
          <Star
            key={b}
            size={12}
            color={b <= ulasan.rating ? colors.warning500 : colors.neutral300}
            fill={b <= ulasan.rating ? colors.warning500 : "transparent"}
            strokeWidth={1.75}
          />
        ))}
        {ulasan.varian ? (
          <Text className="ml-1 font-inter text-caption text-neutral-500">
            · {ulasan.varian}
          </Text>
        ) : null}
      </View>

      <Text
        className="mt-1 font-inter text-sm leading-5 text-neutral-700"
        numberOfLines={buka ? undefined : 3}
      >
        {ulasan.teks}
      </Text>

      {perluToggle ? (
        <Pressable
          onPress={() => setBuka((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={buka ? teks.ulasan.sembunyikan : teks.ulasan.selengkapnya}
          hitSlop={sizes.hitSlop}
          className="mt-1 self-start"
          style={{ minHeight: 32 }}
        >
          <Text className="font-inter-medium text-xs text-primary-700">
            {buka ? teks.ulasan.sembunyikan : teks.ulasan.selengkapnya}
          </Text>
        </Pressable>
      ) : null}

      {ulasan.foto && ulasan.foto.length > 0 ? (
        <View className="mt-2 flex-row gap-2">
          {ulasan.foto.slice(0, 4).map((f, i) => (
            <Image
              key={`${ulasan.id}-foto-${i}`}
              source={{ uri: f }}
              style={{ width: 48, height: 48, borderRadius: 8 }}
              resizeMode="cover"
              accessibilityLabel={teks.ulasan.fotoUlasan.replace("{index}", String(i + 1))}
            />
          ))}
        </View>
      ) : null}

      <Text className="mt-2 font-inter text-caption text-neutral-500">
        {ulasan.nama} · {waktuRelatif(ulasan.tanggal)}
      </Text>
    </View>
  );
}
