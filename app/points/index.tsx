import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Navbar from "../../components/Navbar";
import { apiService } from "../../services/apiService";
import { CustomerProfile } from "../../services/types";
import { getErrorMessage, handleAuthError } from "../../utils/auth";
import { formatRupiah, RUPIAH_PER_POIN } from "../../utils/payment";

/**
 * Riwayat poin pelanggan.
 * Backend: `GET /api/customer/points-history` (PelangganController@pointsHistory)
 * → `data.data[]` + `meta.total_points`.
 *
 * Enum backend untuk `jenis_transaksi`: dapat | pakai | kadaluarsa | koreksi.
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

const JENIS_META: {
  [key: string]: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string };
} = {
  dapat: {
    label: "Poin didapat",
    icon: "add-circle-outline",
    color: "#15803D",
    bg: "bg-green-100",
  },
  pakai: {
    label: "Poin dipakai",
    icon: "remove-circle-outline",
    color: "#B45309",
    bg: "bg-orange-100",
  },
  kadaluarsa: {
    label: "Poin kedaluwarsa",
    icon: "time-outline",
    color: "#B91C1C",
    bg: "bg-red-100",
  },
  koreksi: {
    label: "Koreksi poin",
    icon: "build-outline",
    color: "#1D4ED8",
    bg: "bg-blue-100",
  },
  // Nilai lama yang mungkin dikirim backend versi lain
  penggunaan: {
    label: "Poin dipakai",
    icon: "remove-circle-outline",
    color: "#B45309",
    bg: "bg-orange-100",
  },
  refund: {
    label: "Pengembalian poin",
    icon: "refresh-outline",
    color: "#1D4ED8",
    bg: "bg-blue-100",
  },
};

/**
 * Backend mengirim `tanggal`/`dibuat_pada` sebagai **epoch detik** (mis.
 * 1792650491), bukan string ISO. `Date.parse(1792650491)` selalu NaN sehingga
 * kolom tanggal tampil "-". Konversi dulu ke milidetik.
 */
const toMs = (value?: string | number | null): number | null => {
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

const formatDate = (value?: string | number | null): string => {
  const ms = toMs(value);
  if (ms === null) return "-";
  return new Date(ms).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PointsHistoryScreen = () => {
  const [rows, setRows] = useState<PointRow[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [history, profileData] = await Promise.all([
        apiService.getPointsHistory({ per_page: 50 }),
        apiService.getCustomerProfile().catch(() => null),
      ]);

      const list = (history.data ?? []) as unknown as PointRow[];
      setRows(
        list
          .slice()
          .sort(
            (a, b) =>
              (toMs(b.tanggal ?? b.dibuat_pada) ?? 0) -
              (toMs(a.tanggal ?? a.dibuat_pada) ?? 0)
          )
      );
      setProfile(profileData);
    } catch (err: any) {
      const isAuthError = await handleAuthError(err);
      if (!isAuthError) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const saldo = Number(profile?.total_poin ?? 0);
  const totalDapat = rows
    .filter((r) => (r.jumlah_poin ?? 0) > 0)
    .reduce((sum, r) => sum + Number(r.jumlah_poin ?? 0), 0);
  const totalPakai = rows
    .filter((r) => (r.jumlah_poin ?? 0) < 0)
    .reduce((sum, r) => sum + Math.abs(Number(r.jumlah_poin ?? 0)), 0);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <Navbar title="Poin Saya" showBackButton={true} />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {/* Kartu saldo */}
          <View className="bg-primary rounded-2xl p-5 mb-4">
            <Text className="text-white/80 text-sm">Saldo Poin</Text>
            <Text className="text-white text-3xl font-bold mt-1">
              {saldo.toLocaleString("id-ID")}
            </Text>
            <Text className="text-white/80 text-xs mt-1">
              Setara {formatRupiah(saldo * RUPIAH_PER_POIN)} (1 poin ={" "}
              {formatRupiah(RUPIAH_PER_POIN)})
            </Text>

            <View className="flex-row mt-4">
              <View className="flex-1">
                <Text className="text-white/70 text-xs">Total didapat</Text>
                <Text className="text-white font-semibold">
                  +{totalDapat.toLocaleString("id-ID")}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white/70 text-xs">Total dipakai</Text>
                <Text className="text-white font-semibold">
                  -{totalPakai.toLocaleString("id-ID")}
                </Text>
              </View>
            </View>
          </View>

          <Text className="text-gray-500 text-xs mb-2">
            Poin dapat digunakan saat checkout. 1 poin = Rp 1 dan akan dikembalikan
            otomatis bila pesanan dibatalkan/ditolak.
          </Text>

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          )}

          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-gray-500 mt-3">Memuat riwayat poin...</Text>
            </View>
          ) : rows.length === 0 ? (
            <View className="items-center py-12 bg-white rounded-xl">
              <Ionicons name="ribbon-outline" size={56} color="#9CA3AF" />
              <Text className="text-gray-600 font-semibold mt-3">
                Belum ada riwayat poin
              </Text>
              <Text className="text-gray-400 text-sm mt-1 text-center px-6">
                Poin akan tercatat setelah transaksi pertama Anda selesai.
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-xl overflow-hidden">
              {rows.map((row, index) => {
                const meta = JENIS_META[row.jenis_transaksi] ?? {
                  label: row.jenis_transaksi,
                  icon: "ellipse-outline" as keyof typeof Ionicons.glyphMap,
                  color: "#6B7280",
                  bg: "bg-gray-100",
                };
                const jumlah = Number(row.jumlah_poin ?? 0);

                return (
                  <View
                    key={row.id}
                    className={`flex-row items-start p-4 ${
                      index < rows.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${meta.bg}`}
                    >
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>

                    <View className="flex-1">
                      <Text className="font-medium text-gray-900 text-sm">
                        {meta.label}
                      </Text>
                      {row.keterangan && (
                        <Text className="text-gray-500 text-xs mt-0.5">
                          {row.keterangan}
                        </Text>
                      )}
                      <Text className="text-gray-400 text-xs mt-1">
                        {formatDate(row.tanggal ?? row.dibuat_pada)}
                        {row.transaksi?.nomor_transaksi
                          ? ` • ${row.transaksi.nomor_transaksi}`
                          : ""}
                      </Text>
                      {row.saldo_sesudah !== null &&
                        row.saldo_sesudah !== undefined && (
                          <Text className="text-gray-400 text-xs">
                            Saldo akhir: {Number(row.saldo_sesudah).toLocaleString("id-ID")}
                          </Text>
                        )}
                    </View>

                    <Text
                      className={`font-bold text-sm ${
                        jumlah >= 0 ? "text-green-600" : "text-orange-600"
                      }`}
                    >
                      {jumlah >= 0 ? "+" : ""}
                      {jumlah.toLocaleString("id-ID")}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PointsHistoryScreen;
