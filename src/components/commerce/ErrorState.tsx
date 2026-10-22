import { RefreshCw, WifiOff } from "lucide-react-native";
import { Text, View } from "react-native";
import { teks } from "../../lib/i18n";
import { colors } from "../../theme/tokens";
import { Button } from "../ui/Button";

export type ErrorStateProps = {
  /** Pesan dari lapisan data; kosong → copy guideline `empty.jaringan`. */
  pesan?: string | null;
  judul?: string;
  onRetry?: () => void;
  /** Ikon alternatif (Lucide, ukuran 36). Default `wifi-off`. */
  ikon?: React.ReactNode;
  /** Versi ringkas (tanpa lingkaran 80) untuk dipakai di dalam kartu/section. */
  kompak?: boolean;
  className?: string;
};

/**
 * ErrorState Zovora — guideline §5.
 * Pola empty state dengan ikon `wifi-off` dan tombol "Coba Lagi". Dibedakan
 * dari EmptyState agar pesan error selalu memakai nada jaringan dan tidak
 * tertukar dengan kondisi "data kosong".
 */
export function ErrorState({
  pesan,
  judul = teks.empty.jaringan.judul,
  onRetry,
  ikon,
  kompak = false,
  className = "",
}: ErrorStateProps) {
  const deskripsi = pesan?.trim() ? pesan : teks.empty.jaringan.deskripsi;

  if (kompak) {
    return (
      <View
        className={`rounded-lg border border-danger-100 bg-danger-50 p-4 ${className}`}
        accessibilityRole="alert"
        accessibilityLabel={`${judul}. ${deskripsi}`}
      >
        <View className="flex-row items-start gap-2">
          <WifiOff size={20} color={colors.danger700} strokeWidth={1.75} />
          <View className="flex-1">
            <Text className="font-inter-semibold text-sm text-neutral-900">{judul}</Text>
            <Text className="mt-1 font-inter text-xs text-danger-700">{deskripsi}</Text>
          </View>
        </View>
        {onRetry ? (
          <View className="mt-3">
            <Button
              title={teks.tombol.cobaLagi}
              size="md"
              variant="outline"
              icon={<RefreshCw size={16} color={colors.primary600} strokeWidth={1.75} />}
              onPress={onRetry}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View
      className={`flex-1 items-center justify-center px-6 py-8 ${className}`}
      accessibilityRole="alert"
      accessibilityLabel={`${judul}. ${deskripsi}`}
    >
      <View
        className="items-center justify-center rounded-full bg-danger-50"
        style={{ width: 80, height: 80 }}
      >
        {ikon ?? <WifiOff size={36} color={colors.danger700} strokeWidth={1.75} />}
      </View>

      <Text className="mt-4 text-center font-inter-semibold text-lg text-neutral-900">
        {judul}
      </Text>
      <Text
        className="mt-2 text-center font-inter text-sm text-neutral-500"
        style={{ maxWidth: 260 }}
      >
        {deskripsi}
      </Text>

      {onRetry ? (
        <Button
          title={teks.tombol.cobaLagi}
          onPress={onRetry}
          variant="primary"
          size="lg"
          fullWidth
          className="mt-6"
          icon={<RefreshCw size={20} color={colors.white} strokeWidth={1.75} />}
        />
      ) : null}
    </View>
  );
}

export default ErrorState;
