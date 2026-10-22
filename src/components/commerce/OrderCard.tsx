import { ChevronRight, Clock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { rupiah } from "../../lib/format";
import { teks } from "../../lib/i18n";
import { statusFinal, warnaNada, infoStatus } from "../../lib/pesanan";
import { colors, sizes } from "../../theme/tokens";
import type { Order } from "../../../services/types";
import {
  formatDateTime,
  useOrderExpiry,
} from "../../../utils/orderExpiry";
import { Button } from "../ui/Button";
import { StatusBadge } from "./StatusBadge";

export type OrderCardProps = {
  order: Order;
  onPress: () => void;
  /** Tampilkan tombol "Beli Lagi" (hanya status final dengan item). */
  onReorder?: () => void;
  reordering?: boolean;
  className?: string;
};

const namaMetode = (metode: Order["metode_pembayaran"]): string => {
  if (!metode) return "-";
  if (typeof metode === "string") return metode;
  return metode.nama_metode ?? "-";
};

/**
 * Kartu riwayat pesanan Zovora — guideline §3.8/§3.9/§5.
 *
 * Baris atas: nomor pesanan (Body semibold) + tanggal (Small neutral-500) di
 * kiri, `StatusBadge` di kanan. Badge kedaluwarsa memakai nada danger dengan
 * label "Kedaluwarsa" — status tidak disampaikan lewat warna saja (§7).
 * Countdown pembayaran tampil di kotak warning-50 untuk pesanan `pending`.
 * Pratinjau maksimal 2 item + "+N item lainnya", lalu total bold tabular-nums.
 * Seluruh kartu bertarget 44 pt; chevron di kanan menandakan bisa dibuka.
 */
export function OrderCard({
  order,
  onPress,
  onReorder,
  reordering = false,
  className = "",
}: OrderCardProps) {
  const status = (order.status_transaksi ?? order.status ?? "pending") as string;
  const expiry = useOrderExpiry(order.order_expires_at, status);
  const info = infoStatus(status);
  const items = order.items ?? [];
  const nomor = order.nomor_transaksi || order.nomor_order || `#${order.id}`;
  const selesai = statusFinal(status);

  return (
    <View
      className={`overflow-hidden rounded-lg border border-neutral-200 bg-white ${className}`}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${nomor}, status ${info.label}, total ${rupiah(
          Number(order.total_bayar) || 0
        )}`}
        accessibilityHint={teks.umum.lihat}
        className="p-4 active:opacity-95"
      >
        <View className="mb-3 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text
              className="font-inter-semibold text-sm text-neutral-900"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {nomor}
            </Text>
            <Text
              className="mt-0.5 font-inter text-xs text-neutral-500"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {formatDateTime(order.tanggal_transaksi ?? order.created_at)}
            </Text>
          </View>

          <StatusBadge
            status={status}
            label={expiry.expired ? teks.status.kedaluwarsa : undefined}
            nada={expiry.expired ? "batal" : undefined}
          />
        </View>

        {status === "pending" && !expiry.expired && expiry.countdown ? (
          <View className="mb-3 flex-row items-center gap-1.5 rounded-md border border-warning-500 bg-warning-50 px-2 py-1.5">
            <Clock size={14} color={warnaNada.menunggu} strokeWidth={1.75} />
            <Text
              className="flex-1 font-inter-medium text-xs text-warning-700 tabular-nums"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {teks.pesanan.bayarDalam.replace("{waktu}", expiry.countdown)}
            </Text>
          </View>
        ) : null}

        <View className="mb-2 flex-row items-center gap-2">
          <Text
            className="flex-1 font-inter text-xs text-neutral-500"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {teks.pesanan.jumlahItem.replace("{jumlah}", String(items.length))} •{" "}
            {namaMetode(order.metode_pembayaran)}
          </Text>
        </View>

        {items.slice(0, 2).map((item) => (
          <Text
            key={item.id}
            className="font-inter text-sm text-neutral-700"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {item.jumlah}× {item.nama_produk}
          </Text>
        ))}
        {items.length > 2 ? (
          <Text
            className="font-inter text-xs text-neutral-500"
            maxFontSizeMultiplier={1.3}
          >
            {teks.pesanan.itemLainnya.replace("{jumlah}", String(items.length - 2))}
          </Text>
        ) : null}

        <View className="mt-3 flex-row items-center justify-between border-t border-neutral-100 pt-3">
          <Text
            className="font-inter text-xs text-neutral-500"
            maxFontSizeMultiplier={1.3}
          >
            {teks.pesanan.totalPembayaran}
          </Text>
          <View className="flex-row items-center gap-1">
            <Text
              className="font-inter-bold text-base text-neutral-900 tabular-nums"
              maxFontSizeMultiplier={1.3}
            >
              {rupiah(Number(order.total_bayar) || 0)}
            </Text>
            <ChevronRight size={16} color={colors.neutral400} strokeWidth={1.75} />
          </View>
        </View>
      </Pressable>

      {selesai && items.length > 0 && onReorder ? (
        <View className="border-t border-neutral-100 px-4 pb-4 pt-3">
          <Button
            title={teks.pesanan.beliLagi}
            variant="outline"
            size="md"
            fullWidth
            loading={reordering}
            loadingText={teks.umum.memuat}
            accessibilityLabel={`${teks.pesanan.beliLagi} ${nomor}`}
            onPress={onReorder}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Tinggi minimum area sentuh kartu (dipakai layar untuk padding). */
export const ORDER_CARD_TOUCH = sizes.minTouchTarget;

export default OrderCard;
