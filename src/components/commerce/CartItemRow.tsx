import { Image } from "expo-image";
import { ImageIcon, Trash2 } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { rupiah } from "../../lib/format";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";
import { Stepper } from "../ui/Stepper";

export type CartItemRowProps = {
  nama: string;
  /** Harga satuan. */
  harga: number;
  jumlah: number;
  /** Batas stok untuk tombol +. */
  stok?: number;
  gambarUrl?: string | null;
  /** Teks kecil di bawah judul: varian dan/atau satuan. */
  keterangan?: string | null;
  onPress?: () => void;
  onChangeJumlah?: (jumlah: number) => void;
  onHapus?: () => void;
  /** Sembunyikan stepper (mode read-only di Order Summary). */
  readOnly?: boolean;
  /** Subtotal di kanan bawah saat read-only. */
  subtotal?: number;
  disabled?: boolean;
  className?: string;
};

/**
 * Baris keranjang Zovora — guideline §3.11.
 * Thumbnail 72×80 `rounded-md`, judul Body medium maks 2 baris, keterangan
 * Small neutral-500, harga Section bold, trash-2 danger-500 di kanan atas
 * (target 44), Stepper di kanan bawah. Qty 1 + tombol − memunculkan konfirmasi
 * hapus (ditangani `Stepper`), tombol + dibatasi stok.
 */
export function CartItemRow({
  nama,
  harga,
  jumlah,
  stok,
  gambarUrl,
  keterangan,
  onPress,
  onChangeJumlah,
  onHapus,
  readOnly = false,
  subtotal,
  disabled = false,
  className = "",
}: CartItemRowProps) {
  return (
    <View className={`flex-row gap-3 py-4 ${className}`}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : "image"}
        accessibilityLabel={nama}
        className="overflow-hidden rounded-md bg-neutral-50"
        style={{ width: 72, height: 80 }}
      >
        {gambarUrl ? (
          <Image
            source={{ uri: gambarUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <ImageIcon size={24} color={colors.neutral300} strokeWidth={1.75} />
          </View>
        )}
      </Pressable>

      <View className="flex-1">
        <View className="flex-row items-start gap-2">
          <Pressable
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? "button" : "text"}
            accessibilityLabel={nama}
            className="flex-1"
          >
            <Text
              className="font-inter-medium text-sm text-neutral-900"
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
            >
              {nama}
            </Text>

            {keterangan ? (
              <Text
                className="mt-0.5 font-inter text-xs text-neutral-500"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
              >
                {keterangan}
              </Text>
            ) : null}

            <Text
              className="mt-1 font-inter-semibold text-base text-neutral-900 tabular-nums"
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {rupiah(harga)}
            </Text>
          </Pressable>

          {onHapus ? (
            <Pressable
              onPress={onHapus}
              accessibilityRole="button"
              accessibilityLabel={teks.keranjang.hapusItem.replace("{nama}", nama)}
              hitSlop={sizes.hitSlop}
              className="items-center justify-center"
              style={{ width: sizes.minTouchTarget, height: sizes.minTouchTarget }}
            >
              <Trash2 size={20} color={colors.danger500} strokeWidth={1.75} />
            </Pressable>
          ) : null}
        </View>

        <View className="mt-2 flex-row items-center justify-between gap-2">
          {readOnly ? (
            <Text className="font-inter text-xs text-neutral-500">
              {jumlah}× {rupiah(harga)}
            </Text>
          ) : (
            <Stepper
              value={jumlah}
              max={stok}
              min={1}
              contextLabel={nama}
              disabled={disabled}
              onChange={(next) => onChangeJumlah?.(next)}
              onRemove={onHapus}
              /*
               * `onRemove` di sini membuka dialog konfirmasi MILIK LAYAR
               * (satu `Dialog` di keranjang, dipakai bersama tombol trash).
               * Tanpa ini `Stepper` menampilkan dialognya SENDIRI lebih dulu,
               * lalu dialog layar muncul setelahnya: pengguna mengonfirmasi
               * dua kali, dan dua jendela modal bertukar dalam satu alur —
               * pola yang memicu bug "dialog tidak muncul" di Android.
               */
              confirmRemove={false}
            />
          )}

          {readOnly && subtotal != null ? (
            <Text
              className="font-inter-semibold text-sm text-neutral-900 tabular-nums"
              maxFontSizeMultiplier={1.3}
            >
              {rupiah(subtotal)}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default CartItemRow;
