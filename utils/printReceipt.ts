import { Linking } from "react-native";
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

export const printOrderReceipt = async (
  order: OrderPrintData,
  storeInfo?: Partial<StoreInfo>
): Promise<boolean> => {
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

  const uri = encoder.getURI();

  try {
    const canOpen = await Linking.canOpenURL(uri);
    if (!canOpen) {
      return false;
    }
    await Linking.openURL(uri);
    return true;
  } catch {
    return false;
  }
};
