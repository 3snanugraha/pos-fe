import { Linking, Platform } from "react-native";
import { EscPosEncoder } from "./escpos";

interface OrderPrintData {
  id: number;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  total_harga: number;
  total_diskon: number;
  total_bayar: number;
  status: string;
  metode_pembayaran: { nama: string; jenis: string };
  alamat_pengiriman: string | null;
  catatan: string | null;
  items: {
    nama_produk: string;
    nama_varian: string | null;
    jumlah: number;
    harga: number;
    subtotal: number;
  }[];
}

interface StoreInfo {
  name: string;
  address: string;
  footer: string;
}

export type PrintResult =
  | { ok: true; mode: "rawbt" | "browser" }
  | { ok: false; reason: "no-app" | "error"; message?: string };

const DEFAULT_STORE: StoreInfo = {
  name: "Toko Kami",
  address: "",
  footer: "Terima kasih atas pembelian Anda!",
};

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString("id-ID");
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Susun payload ESC/POS untuk satu order. */
export const buildOrderReceipt = (
  order: OrderPrintData,
  storeInfo?: Partial<StoreInfo>
): EscPosEncoder => {
  const store = { ...DEFAULT_STORE, ...storeInfo };
  const encoder = new EscPosEncoder();

  // Header
  encoder.align("center").bold(true).text(store.name).newline().bold(false);

  if (store.address) {
    encoder.text(store.address).newline();
  }

  encoder.line("=");

  // Order info
  encoder
    .align("left")
    .text(`No: ${order.nomor_transaksi || `#${order.id}`}`)
    .newline()
    .text(`Tgl: ${formatDate(order.tanggal_transaksi)}`)
    .newline()
    .text(`Status: ${order.status}`)
    .newline();

  if (order.metode_pembayaran?.nama) {
    encoder.text(`Bayar: ${order.metode_pembayaran.nama}`).newline();
  }

  encoder.line("-");

  // Items
  order.items.forEach((item) => {
    encoder.text(item.nama_produk).newline();
    if (item.nama_varian) {
      encoder.text(`  (${item.nama_varian})`).newline();
    }
    const qtyPrice = `${item.jumlah} x ${formatCurrency(item.harga)}`;
    const lineTotal = formatCurrency(item.subtotal);
    encoder.text(`${qtyPrice} = ${lineTotal}`).newline();
  });

  encoder.line("-");

  // Totals
  encoder.align("right");
  encoder.text(`Subtotal: ${formatCurrency(order.total_harga)}`).newline();

  if (Number(order.total_diskon) > 0) {
    encoder.text(`Diskon: -${formatCurrency(order.total_diskon)}`).newline();
  }

  encoder
    .bold(true)
    .text(`TOTAL: ${formatCurrency(order.total_bayar)}`)
    .newline()
    .bold(false);

  // Shipping address
  if (order.alamat_pengiriman) {
    encoder.newline().align("left").bold(true).text("Kirim ke:").newline().bold(false);
    // Wrap address to 32 chars per line
    const addr = order.alamat_pengiriman;
    for (let i = 0; i < addr.length; i += 32) {
      encoder.text(addr.substring(i, i + 32)).newline();
    }
  }

  // Notes
  if (order.catatan) {
    encoder.newline().align("left").bold(true).text("Catatan:").newline().bold(false);
    const note = order.catatan;
    for (let i = 0; i < note.length; i += 32) {
      encoder.text(note.substring(i, i + 32)).newline();
    }
  }

  // Footer
  encoder
    .newline()
    .align("center")
    .text(store.footer)
    .newline()
    .newline();

  // QR code with transaction ID
  if (order.nomor_transaksi) {
    encoder.text(`ID: ${order.nomor_transaksi}`).newline();
    encoder.qr(order.nomor_transaksi).newline();
  }

  encoder.cut();

  return encoder;
};

/**
 * Unduh payload ESC/POS mentah (`*.bin`) di browser.
 *
 * Dipakai sebagai jalur aman saat `rawbt:` tidak tersedia (web/desktop):
 * berkas bisa dicetak lewat RawBT "print file", driver printer thermal,
 * atau `copy /b file.bin \\\\.\\COM3`.
 */
const downloadReceiptBinary = (order: OrderPrintData): boolean => {
  if (typeof document === "undefined") return false;

  const encoder = buildOrderReceipt(order);
  const base64 = encoder.toBase64();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const nama = `struk-${order.nomor_transaksi || order.id}.bin`;

  const link = document.createElement("a");
  link.href = url;
  link.download = nama;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Beri waktu browser memulai unduhan sebelum URL dilepas.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
};

export const printOrderReceipt = async (
  order: OrderPrintData,
  storeInfo?: Partial<StoreInfo>
): Promise<PrintResult> => {
  const encoder = buildOrderReceipt(order, storeInfo);
  const uri = encoder.getURI();

  // Web tidak punya intent `rawbt:`; unduh berkas ESC/POS agar tombol tidak
  // terasa mati dan struk tetap bisa dicetak lewat printer thermal.
  if (Platform.OS === "web") {
    try {
      const ok = downloadReceiptBinary(order);
      return ok
        ? { ok: true, mode: "browser" }
        : { ok: false, reason: "error", message: "Browser tidak mendukung unduhan." };
    } catch (error: any) {
      return {
        ok: false,
        reason: "error",
        message: error?.message ?? "Gagal membuat berkas struk.",
      };
    }
  }

  try {
    const canOpen = await Linking.canOpenURL(uri);
    if (!canOpen) {
      return { ok: false, reason: "no-app" };
    }
    await Linking.openURL(uri);
    return { ok: true, mode: "rawbt" };
  } catch (error: any) {
    return { ok: false, reason: "error", message: error?.message };
  }
};
