import { Wallet } from "lucide-react-native";
import { Text, View } from "react-native";
import { teks } from "../../lib/i18n";
import { colors } from "../../theme/tokens";
import {
  buildPaymentInstruction,
  jenisLabel,
  normalisasiMetodePembayaran,
  punyaNomorTujuan,
} from "../../../utils/payment";

export type PaymentInstructionCardProps = {
  /**
   * Metode apa adanya dari API: string nama, objek `{nama, jenis, ...}`
   * (detail order), atau `{nama_metode, jenis_pembayaran, ...}` (endpoint
   * metode pembayaran). Dinormalisasi di sini.
   */
  metode: unknown;
  /** Judul kartu; default "Instruksi Pembayaran". */
  judul?: string;
  className?: string;
};

/**
 * Kartu instruksi pembayaran — guideline §3.14.
 *
 * Satu sumber untuk layar checkout sukses dan detail pesanan: daftar
 * instruksi disusun `buildPaymentInstruction()` (utils/payment) — helper yang
 * sama dengan layar metode pembayaran/kasir — lalu blok rekening tujuan
 * (nomor + atas nama) tampil untuk metode transfer **dan** e-wallet, karena
 * pelanggan butuh nomor DANA/OVO untuk membayar, bukan hanya nomor bank.
 *
 * Nomor rekening dibuat `selectable` supaya pelanggan bisa menyalinnya.
 * Bila metode tidak punya nomor tujuan (Tunai/Kartu), cukup instruksi teks —
 * tidak ada kotak rekening kosong.
 */
export function PaymentInstructionCard({
  metode,
  judul = teks.checkout.instruksiPembayaran,
  className = "",
}: PaymentInstructionCardProps) {
  const info = normalisasiMetodePembayaran(metode);
  if (!info) return null;

  const instruksi = buildPaymentInstruction({
    nama_metode: info.nama,
    jenis_pembayaran: info.jenis,
    nomor_rekening: info.nomor_rekening,
    atas_nama: info.atas_nama,
    instruksi: info.instruksi,
  });

  if (instruksi.length === 0) return null;

  const tampilRekening = punyaNomorTujuan(info.jenis);
  const adaNomor = !!info.nomor_rekening;

  return (
    <View
      className={`rounded-lg border border-neutral-200 bg-white p-4 ${className}`}
      testID="instruksi-pembayaran"
    >
      <View className="mb-2 flex-row items-center gap-2">
        <Wallet size={18} color={colors.primary600} strokeWidth={1.75} />
        <Text
          className="flex-1 font-inter-semibold text-base text-neutral-900"
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
        >
          {judul}
        </Text>
      </View>

      <Text className="mb-2 font-inter text-xs text-neutral-500" maxFontSizeMultiplier={1.3}>
        {info.nama} · {jenisLabel(info.jenis)}
      </Text>

      <View className="rounded-md bg-neutral-50 p-3">
        {instruksi.map((baris, i) => (
          <Text
            key={i}
            className="mb-1 font-inter text-xs text-neutral-700"
            maxFontSizeMultiplier={1.3}
          >
            • {baris}
          </Text>
        ))}
      </View>

      {tampilRekening && adaNomor ? (
        <View className="mt-2 rounded-md border border-primary-100 bg-primary-50 p-3">
          <Text className="font-inter text-caption text-neutral-500">
            {info.jenis?.toLowerCase() === "transfer"
              ? teks.checkout.nomorRekening
              : teks.checkout.nomorTujuan}
          </Text>
          <Text
            className="font-inter-bold text-base text-neutral-900 tabular-nums"
            selectable
            maxFontSizeMultiplier={1.3}
          >
            {info.nomor_rekening}
          </Text>
          <Text
            className="mt-0.5 font-inter text-caption text-neutral-500"
            maxFontSizeMultiplier={1.3}
            selectable
          >
            {teks.checkout.atasNama}: {info.atas_nama ?? "-"}
          </Text>
        </View>
      ) : null}

      {tampilRekening && !adaNomor ? (
        <Text className="mt-2 font-inter text-xs text-warning-700" maxFontSizeMultiplier={1.3}>
          {teks.checkout.rekeningBelumDiatur}
        </Text>
      ) : null}
    </View>
  );
}

export default PaymentInstructionCard;
