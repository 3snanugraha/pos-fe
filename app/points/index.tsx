import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Gift,
  RotateCcw,
  Toolbox,
  type LucideIcon,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorState, Skeleton } from "../../src/components/commerce";
import { AppBar } from "../../src/components/layout";
import { EmptyState } from "../../src/components/ui";
import { angka, rupiah, waktuRelatif } from "../../src/lib/format";
import { teks } from "../../src/lib/i18n";
import { colors } from "../../src/theme/tokens";
import { apiService } from "../../services/apiService";
import type { CustomerProfile } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";
import { RUPIAH_PER_POIN } from "../../utils/payment";

/**
 * Riwayat poin pelanggan.
 * Backend: `GET /api/customer/points-history` (PelangganController@pointsHistory)
 * → `data.data[]` + `meta.total_points`. Enum `jenis_transaksi`:
 * dapat | pakai | kadaluarsa | koreksi (plus nilai lama penggunaan/refund).
 */
interface PointRow {
  id: number;
  jumlah_poin: number;
  jenis_transaksi: string;
  keterangan?: string | null;
  saldo_sebelum?: number | null;
  saldo_sesudah?: number | null;
  /** Epoch detik dari backend (bisa juga string ISO pada versi lain). */
  tanggal?: string | number | null;
  dibuat_pada?: string | number | null;
  transaksi?: { nomor_transaksi?: string } | null;
}

type MetaJenis = {
  label: string;
  ikon: LucideIcon;
  /** Kelas warna ikon (nada token). */
  warna: string;
  latar: string;
};

const META_JENIS: Record<string, MetaJenis> = {
  dapat: {
    label: teks.poin.jenis.dapat,
    ikon: ArrowDownLeft,
    warna: colors.success700,
    latar: "bg-success-100",
  },
  pakai: {
    label: teks.poin.jenis.pakai,
    ikon: ArrowUpRight,
    warna: colors.warning700,
    latar: "bg-warning-100",
  },
  penggunaan: {
    label: teks.poin.jenis.pakai,
    ikon: ArrowUpRight,
    warna: colors.warning700,
    latar: "bg-warning-100",
  },
  kadaluarsa: {
    label: teks.poin.jenis.kadaluarsa,
    ikon: Clock,
    warna: colors.danger700,
    latar: "bg-danger-100",
  },
  koreksi: {
    label: teks.poin.jenis.koreksi,
    ikon: Toolbox,
    warna: colors.primary700,
    latar: "bg-primary-100",
  },
  refund: {
    label: teks.poin.jenis.refund,
    ikon: RotateCcw,
    warna: colors.primary700,
    latar: "bg-primary-100",
  },
};

/**
 * Backend mengirim `tanggal`/`dibuat_pada` sebagai **epoch detik** (mis.
 * 1792650491), bukan string ISO. `Date.parse(1792650491)` selalu NaN sehingga
 * kolom tanggal tampil "-". Konversi dulu ke milidetik.
 */
const keMs = (value?: string | number | null): number | null => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value < 1e12 ? value * 1000 : value;
  }

  const trimmed = String(value).trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return n < 1e12 ? n * 1000 : n;
  }

  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : ms;
};

/**
 * Riwayat Poin Zovora — guideline §3.12 (kartu saldo) + §5 (state).
 *
 * Kartu saldo besar (primary-600, teks putih, angka Heading tabular-nums),
 * keterangan konversi 1 poin = Rp 1, ringkasan total didapat/dipakai, lalu
 * daftar mutasi: ikon 36 berlatar tint per jenis, label + keterangan + waktu
 * relatif + nomor transaksi + saldo akhir, dan jumlah poin bertanda +/-.
 * Loading memakai skeleton baris, galat memakai `ErrorState`, kosong memakai
 * `EmptyState` "Belum Ada Riwayat Poin".
 */
export default function PointsHistoryScreen() {
  const router = useRouter();
  const [baris, setBaris] = useState<PointRow[]>([]);
  const [profil, setProfil] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ambil = useCallback(async () => {
    try {
      const [riwayat, profilData] = await Promise.all([
        apiService.getPointsHistory({ per_page: 50 }),
        apiService.getCustomerProfile().catch(() => null),
      ]);

      const daftar = (riwayat.data ?? []) as unknown as PointRow[];
      return {
        baris: daftar
          .slice()
          .sort(
            (a, b) =>
              (keMs(b.tanggal ?? b.dibuat_pada) ?? 0) -
              (keMs(a.tanggal ?? a.dibuat_pada) ?? 0)
          ),
        profil: profilData as CustomerProfile | null,
        galat: null,
      };
    } catch (err: any) {
      const isAuthError = await handleAuthError(err);
      return {
        baris: [] as PointRow[],
        profil: null as CustomerProfile | null,
        galat: isAuthError ? null : getErrorMessage(err),
      };
    }
  }, []);

  useEffect(() => {
    let aktif = true;
    (async () => {
      const hasil = await ambil();
      if (!aktif) return;
      setBaris(hasil.baris);
      setProfil(hasil.profil);
      setError(hasil.galat);
      setLoading(false);
    })();
    return () => {
      aktif = false;
    };
  }, [ambil]);

  const onRefresh = async () => {
    setRefreshing(true);
    const hasil = await ambil();
    setBaris(hasil.baris);
    setProfil(hasil.profil);
    setError(hasil.galat);
    setRefreshing(false);
  };

  const muatUlang = async () => {
    setLoading(true);
    const hasil = await ambil();
    setBaris(hasil.baris);
    setProfil(hasil.profil);
    setError(hasil.galat);
    setLoading(false);
  };

  const saldo = Number(profil?.total_poin ?? 0);
  const totalDapat = baris
    .filter((r) => (r.jumlah_poin ?? 0) > 0)
    .reduce((sum, r) => sum + Number(r.jumlah_poin ?? 0), 0);
  const totalPakai = baris
    .filter((r) => (r.jumlah_poin ?? 0) < 0)
    .reduce((sum, r) => sum + Math.abs(Number(r.jumlah_poin ?? 0)), 0);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={["top", "left", "right"]}>
      <AppBar title={teks.poin.judul} onBack={() => router.back()} />

      {loading ? (
        <View className="flex-1 px-4 pt-4">
          <Skeleton height={132} radiusClassName="rounded-lg" width="100%" />
          <View className="mt-4 rounded-lg border border-neutral-200 bg-white">
            {[0, 1, 2, 3].map((i) => (
              <View key={i} className="flex-row items-center gap-3 border-b border-neutral-100 p-4">
                <Skeleton width={36} height={36} radiusClassName="rounded-full" />
                <View className="flex-1">
                  <Skeleton height={12} width="50%" />
                  <Skeleton height={10} width="70%" className="mt-2" />
                </View>
                <Skeleton height={14} width={48} />
              </View>
            ))}
          </View>
        </View>
      ) : error && baris.length === 0 ? (
        <ErrorState pesan={error} onRetry={muatUlang} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary600]}
              tintColor={colors.primary600}
            />
          }
        >
          {/*
            Kartu saldo — bg primary-700 (bukan primary-600): label Caption 10pt
            dan nilai kecil di atas primary-600 hanya 4,1:1 dan gagal AA untuk
            teks kecil. primary-700 = 5,9:1 (guideline §2.1 & §7).
          */}
          <View className="rounded-lg bg-primary-700 p-5">
            <Text
              className="font-inter text-sm text-white"
              maxFontSizeMultiplier={1.3}
            >
              {teks.poin.saldo}
            </Text>
            <Text
              className="mt-1 font-inter-bold text-4xl text-white tabular-nums"
              maxFontSizeMultiplier={1.3}
            >
              {angka(saldo)}
            </Text>
            <Text
              className="mt-1 font-inter text-xs text-white"
              maxFontSizeMultiplier={1.3}
            >
              {teks.poin.setara
                .replace("{nilai}", rupiah(saldo * RUPIAH_PER_POIN))
                .replace("{perPoin}", rupiah(RUPIAH_PER_POIN))}
            </Text>

            <View className="mt-4 flex-row gap-4">
              <View className="flex-1">
                <Text className="font-inter text-caption text-white" maxFontSizeMultiplier={1.3}>
                  {teks.poin.totalDidapat}
                </Text>
                <Text
                  className="font-inter-semibold text-sm text-white tabular-nums"
                  maxFontSizeMultiplier={1.3}
                >
                  +{angka(totalDapat)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-inter text-caption text-white" maxFontSizeMultiplier={1.3}>
                  {teks.poin.totalDipakai}
                </Text>
                <Text
                  className="font-inter-semibold text-sm text-white tabular-nums"
                  maxFontSizeMultiplier={1.3}
                >
                  −{angka(totalPakai)}
                </Text>
              </View>
            </View>
          </View>

          <Text
            className="mt-3 font-inter text-xs text-neutral-500"
            maxFontSizeMultiplier={1.3}
          >
            {teks.poin.keterangan}
          </Text>

          {error ? (
            <View className="mt-3">
              <ErrorState pesan={error} onRetry={muatUlang} kompak />
            </View>
          ) : null}

          {baris.length === 0 ? (
            <View className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <EmptyState
                icon={<Gift size={36} color={colors.primary600} strokeWidth={1.75} />}
                title={teks.poin.kosong.judul}
                description={teks.poin.kosong.deskripsi}
              />
            </View>
          ) : (
            <View className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <Text
                className="px-4 pb-1 pt-4 font-inter-semibold text-base text-neutral-900"
                accessibilityRole="header"
                maxFontSizeMultiplier={1.3}
              >
                {teks.poin.riwayat}
              </Text>

              {baris.map((row, index) => {
                const meta: MetaJenis =
                  META_JENIS[row.jenis_transaksi] ?? {
                    label: row.jenis_transaksi,
                    ikon: Gift,
                    warna: colors.neutral500,
                    latar: "bg-neutral-100",
                  };
                const Ikon = meta.ikon;
                const jumlah = Number(row.jumlah_poin ?? 0);
                const positif = jumlah >= 0;

                return (
                  <View
                    key={row.id}
                    className={`flex-row items-start gap-3 p-4 ${
                      index < baris.length - 1 ? "border-b border-neutral-100" : ""
                    }`}
                  >
                    <View
                      className={`items-center justify-center rounded-full ${meta.latar}`}
                      style={{ width: 36, height: 36 }}
                    >
                      <Ikon size={18} color={meta.warna} strokeWidth={1.75} />
                    </View>

                    <View className="flex-1">
                      <Text
                        className="font-inter-medium text-sm text-neutral-900"
                        maxFontSizeMultiplier={1.3}
                      >
                        {meta.label}
                      </Text>
                      {row.keterangan ? (
                        <Text
                          className="mt-0.5 font-inter text-xs text-neutral-500"
                          numberOfLines={2}
                          maxFontSizeMultiplier={1.3}
                        >
                          {row.keterangan}
                        </Text>
                      ) : null}
                      <Text
                        className="mt-1 font-inter text-caption text-neutral-500"
                        maxFontSizeMultiplier={1.3}
                      >
                        {waktuRelatif(keMs(row.tanggal ?? row.dibuat_pada) ?? null)}
                        {row.transaksi?.nomor_transaksi
                          ? ` · ${row.transaksi.nomor_transaksi}`
                          : ""}
                      </Text>
                      {row.saldo_sesudah !== null && row.saldo_sesudah !== undefined ? (
                        <Text
                          className="font-inter text-caption text-neutral-500 tabular-nums"
                          maxFontSizeMultiplier={1.3}
                        >
                          {teks.poin.saldoAkhir.replace(
                            "{jumlah}",
                            angka(Number(row.saldo_sesudah))
                          )}
                        </Text>
                      ) : null}
                    </View>

                    <Text
                      className={`font-inter-bold text-sm tabular-nums ${
                        positif ? "text-success-700" : "text-warning-700"
                      }`}
                      maxFontSizeMultiplier={1.3}
                    >
                      {positif ? "+" : "−"}
                      {angka(Math.abs(jumlah))}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
