import {
  BadgeCheck,
  Bell,
  CreditCard,
  Package,
  Tag,
  Truck,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { waktuRelatif } from "../../lib/format";
import { teks } from "../../lib/i18n";
import { colors } from "../../theme/tokens";

export type TipeNotifikasi =
  | "order"
  | "promo"
  | "payment"
  | "shipping"
  | "system"
  | "general"
  | string;

type TampilanTipe = {
  ikon: (warna: string) => ReactNode;
  /** Kelas bg lingkaran 36. */
  bg: string;
  /** Hex warna ikon (dari tokens). */
  warna: string;
};

/**
 * Tint per tipe notifikasi — guideline §3.15.
 * Order Confirmed (primary), Order Shipped (success), Special Offer (peach).
 */
const TAMPILAN: Record<string, TampilanTipe> = {
  order: {
    ikon: (w) => <Package size={20} color={w} strokeWidth={1.75} />,
    bg: "bg-primary-100",
    warna: colors.primary600,
  },
  payment: {
    ikon: (w) => <CreditCard size={20} color={w} strokeWidth={1.75} />,
    bg: "bg-primary-100",
    warna: colors.primary600,
  },
  shipping: {
    ikon: (w) => <Truck size={20} color={w} strokeWidth={1.75} />,
    bg: "bg-success-100",
    warna: colors.success700,
  },
  promo: {
    ikon: (w) => <Tag size={20} color={w} strokeWidth={1.75} />,
    bg: "bg-peach-100",
    warna: colors.warning700,
  },
  system: {
    ikon: (w) => <BadgeCheck size={20} color={w} strokeWidth={1.75} />,
    bg: "bg-neutral-100",
    warna: colors.neutral600,
  },
  general: {
    ikon: (w) => <Bell size={20} color={w} strokeWidth={1.75} />,
    bg: "bg-neutral-100",
    warna: colors.neutral600,
  },
};

export type NotificationItemProps = {
  judul: string;
  pesan?: string | null;
  tipe?: TipeNotifikasi;
  waktu?: string | number | null;
  belumDibaca?: boolean;
  onPress?: () => void;
  className?: string;
};

/**
 * Item notifikasi Zovora — guideline §3.15.
 * Padding 16, ikon 20 di dalam lingkaran 36 dengan tint per tipe, judul Body
 * semibold, isi Small neutral-500 maks 2 baris, waktu Caption neutral-400 di
 * kanan atas, dot unread 6 pt danger-500. Status unread disampaikan lewat dot
 * + judul lebih tebal (bukan warna saja, guideline §7).
 */
export function NotificationItem({
  judul,
  pesan,
  tipe = "general",
  waktu,
  belumDibaca = false,
  onPress,
  className = "",
}: NotificationItemProps) {
  const tampilan = TAMPILAN[String(tipe).toLowerCase()] ?? TAMPILAN.general;
  const labelWaktu = waktu != null && waktu !== "" ? waktuRelatif(waktu) : "";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[judul, pesan, labelWaktu, belumDibaca ? teks.notifikasi.belumDibacaA11y : null]
        .filter(Boolean)
        .join(". ")}
      className={`flex-row gap-3 p-4 ${className}`}
    >
      <View
        className={`items-center justify-center rounded-full ${tampilan.bg}`}
        style={{ width: 36, height: 36 }}
      >
        {tampilan.ikon(tampilan.warna)}
      </View>

      <View className="flex-1">
        <View className="flex-row items-start gap-2">
          <Text
            className={`flex-1 font-inter-semibold text-sm text-neutral-900 ${
              belumDibaca ? "font-inter-bold" : ""
            }`}
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {judul}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {labelWaktu ? (
              <Text
                className="font-inter-medium text-caption text-neutral-400"
                maxFontSizeMultiplier={1.3}
              >
                {labelWaktu}
              </Text>
            ) : null}
            {belumDibaca ? (
              <View
                className="rounded-full bg-danger-500"
                style={{ width: 6, height: 6 }}
                accessibilityElementsHidden
              />
            ) : null}
          </View>
        </View>

        {pesan ? (
          <Text
            className="mt-1 font-inter text-xs text-neutral-500"
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
          >
            {pesan}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default NotificationItem;
