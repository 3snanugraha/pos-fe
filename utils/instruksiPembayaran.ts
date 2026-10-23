/**
 * Instruksi pembayaran untuk pelanggan — modul bebas dependensi
 * (tanpa React Native/expo) supaya bisa diuji dengan `node --test`.
 *
 * Backend tidak punya kolom `instruksi`; bila ada dipakai apa adanya, selain
 * itu instruksi disusun dari jenis pembayaran + nomor tujuan.
 */

export type PaymentJenis =
  | "tunai"
  | "transfer"
  | "kartu"
  | "ewallet"
  | "kredit"
  | "cicilan"
  | string;

/**
 * Instruksi pembayaran untuk pelanggan.
 *
 * Backend tidak punya kolom `instruksi`; bila ada dipakai apa adanya,
 * selain itu instruksi disusun dari jenis pembayaran + rekening tujuan.
 */
export const buildPaymentInstruction = (metode: {
  nama_metode: string;
  jenis_pembayaran?: PaymentJenis | null;
  nomor_rekening?: string | null;
  atas_nama?: string | null;
  instruksi?: string | null;
}): string[] => {
  const lines: string[] = [];
  const jenis = (metode.jenis_pembayaran ?? "").toLowerCase();

  if (metode.instruksi && metode.instruksi.trim() !== "") {
    lines.push(metode.instruksi.trim());
  }

  if (jenis === "transfer") {
    if (metode.nomor_rekening) {
      lines.push(
        `Transfer ke ${metode.nama_metode} — No. Rekening ${metode.nomor_rekening}` +
          (metode.atas_nama ? ` a.n. ${metode.atas_nama}` : "")
      );
    } else {
      lines.push(
        "Nomor rekening belum diatur admin. Silakan hubungi toko untuk detail rekening tujuan."
      );
    }
    lines.push(
      "Cantumkan nomor pesanan pada berita transfer, lalu kirim bukti transfer ke kasir."
    );
  } else if (jenis === "ewallet") {
    if (metode.nomor_rekening) {
      lines.push(
        `Bayar menggunakan ${metode.nama_metode} ke ${metode.nomor_rekening}` +
          (metode.atas_nama ? ` a.n. ${metode.atas_nama}` : "")
      );
    } else {
      lines.push(`Bayar menggunakan ${metode.nama_metode} ke nomor/akun toko.`);
    }
    lines.push("Tunjukkan bukti pembayaran saat verifikasi kasir.");
  } else if (jenis === "kartu") {
    lines.push(`Pembayaran dengan ${metode.nama_metode} diproses saat verifikasi kasir.`);
  } else if (jenis === "tunai") {
    lines.push("Pembayaran tunai dilakukan di toko saat pesanan diambil/diverifikasi.");
  } else if (jenis === "kredit" || jenis === "cicilan") {
    lines.push("Pembayaran tempo/kredit akan dicatat oleh kasir saat verifikasi.");
  } else if (lines.length === 0) {
    lines.push("Ikuti instruksi dari kasir untuk menyelesaikan pembayaran.");
  }

  return lines;
};

