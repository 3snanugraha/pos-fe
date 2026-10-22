import { ChevronRight, MapPin } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { teks } from "../../lib/i18n";
import { colors, sizes } from "../../theme/tokens";

export type AlamatRingkas = {
  nama_penerima: string;
  telepon_penerima: string;
  alamat_lengkap: string;
  /** Baris wilayah opsional (kota, provinsi, kode pos). */
  wilayah?: string;
};

export type AddressCardProps = {
  alamat?: AlamatRingkas | null;
  onPress?: () => void;
  onGanti?: () => void;
  /**
   * `ringkas` = satu baris ikon map-pin 16 + alamat terpotong (Cart).
   * `lengkap` = kartu tinggi berisi nama, alamat multi-baris, telepon
   * (Order Summary), sesuai guideline §3.13.
   */
  variant?: "ringkas" | "lengkap";
  label?: string;
  gantiLabel?: string;
  kosong?: string;
  loading?: boolean;
  className?: string;
};

/**
 * Address card Zovora — guideline §3.13.
 * Label "Alamat Pengiriman" Body semibold dengan link "Ganti" primary-700 di
 * kanan; kartu `rounded-lg` border neutral-200 padding 12. Varian `ringkas`
 * menampilkan satu baris (map-pin 16 + alamat Small neutral-700 dipotong);
 * varian `lengkap` menampilkan nama (Body semibold), alamat beberapa baris,
 * dan nomor telepon (Small neutral-500).
 */
export function AddressCard({
  alamat,
  onPress,
  onGanti,
  variant = "ringkas",
  label = teks.judul.deliveryAddress,
  gantiLabel = teks.keranjang.ganti,
  kosong = teks.keranjang.alamatBelumAda,
  loading = false,
  className = "",
}: AddressCardProps) {
  const isi = () => {
    if (variant === "ringkas") {
      return (
        <View className="flex-row items-center gap-2">
          <MapPin size={16} color={colors.primary600} strokeWidth={1.75} />
          <Text
            className="flex-1 font-inter text-xs text-neutral-700"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {loading
              ? teks.keranjang.memuatAlamat
              : alamat
                ? [alamat.alamat_lengkap, alamat.wilayah].filter(Boolean).join(", ")
                : kosong}
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text
          className="font-inter-semibold text-sm text-neutral-900"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {alamat?.nama_penerima}
        </Text>
        <Text
          className="mt-1 font-inter text-sm text-neutral-700"
          maxFontSizeMultiplier={1.3}
        >
          {[alamat?.alamat_lengkap, alamat?.wilayah].filter(Boolean).join(", ")}
        </Text>
        <Text className="mt-1 font-inter text-xs text-neutral-500" maxFontSizeMultiplier={1.3}>
          {alamat?.telepon_penerima}
        </Text>
      </View>
    );
  };

  return (
    <View className={className}>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-inter-semibold text-sm text-neutral-900" maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
        {onGanti ? (
          <Pressable
            onPress={onGanti}
            accessibilityRole="button"
            accessibilityLabel={gantiLabel}
            hitSlop={sizes.hitSlop}
            className="min-h-[44px] items-center justify-center px-1"
          >
            <Text className="font-inter-medium text-xs text-primary-700">{gantiLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : "text"}
        accessibilityLabel={
          alamat
            ? `${label}. ${alamat.nama_penerima}, ${alamat.alamat_lengkap}`
            : `${label}. ${kosong}`
        }
        className="rounded-lg border border-neutral-200 bg-white p-3"
      >
        {isi()}
      </Pressable>
    </View>
  );
}

/** Chevron kanan yang sering dipakai di baris alamat/metode. */
export const chevronAlamat = (
  <ChevronRight size={20} color={colors.neutral400} strokeWidth={1.75} />
);

export default AddressCard;
