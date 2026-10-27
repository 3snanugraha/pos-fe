import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hargaEfektif } from '../src/lib/hargaGrosir';

export interface CartItem {
  id: number;
  produk_id: number;
  nama_produk: string;
  harga: number;
  quantity: number;
  gambar_url?: string;
  kategori_nama?: string;
  stok_tersedia: number;
  varian_id?: number;
  varian_nama?: string;
  subtotal: number;

  /** Harga ecer (tier jangkar) — acuan coret saat harga grosir dipakai. */
  harga_ecer?: number;
  /** Tier harga yang sedang dipakai ('Ecer', 'Grosir 1', …). */
  nama_tier?: string;
  /** Satuan jual baris ini (pcs/dus); dikirim ke API checkout. */
  satuan_id?: number | null;
  /** Semua tier grosir yang dikenal untuk baris ini (dari detail produk). */
  tier?: { nama_tier: string; harga: number; min_qty: number; is_default?: boolean }[];
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  isLoading: boolean;
  addItem: (product: any, quantity?: number, varian?: any) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  updateItemQuantity: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemById: (productId: number, varianId?: number) => CartItem | undefined;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = '@cart_items';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate derived values
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const totalAmount = items.reduce((total, item) => total + item.subtotal, 0);

  // Load cart from storage on app start
  useEffect(() => {
    loadCartFromStorage();
  }, []);

  // Save cart to storage whenever items change
  useEffect(() => {
    if (!isLoading) {
      saveCartToStorage();
    }
  }, [items, isLoading]);

  const loadCartFromStorage = async () => {
    try {
      const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (cartData) {
        const parsedCart = JSON.parse(cartData);
        if (Array.isArray(parsedCart)) {
          /**
           * Migrasi baris keranjang lama: `id` dulu dihitung dengan
           * penggabungan string (rapuh & bisa tabrakan), dan `harga`/`stok`
           * bisa tersimpan sebagai string karena backend mengirim desimal
           * sebagai string. Hitung ulang id + normalisasi angka supaya
           * `updateItemQuantity`/`removeItem` tetap menemukan barisnya.
           */
          const dinormalisasi: CartItem[] = parsedCart.map((item: any) => {
            const harga = Number(item.harga) || 0;
            const quantity = Number(item.quantity) || 1;
            const stok = Number(item.stok_tersedia) || quantity;
            return {
              ...item,
              id: generateCartItemId(Number(item.produk_id), item.varian_id ?? undefined),
              harga,
              quantity,
              stok_tersedia: stok,
              subtotal: harga * quantity,
            };
          });

          // Gabungkan baris yang ternyata sama setelah id dihitung ulang.
          const digabung: CartItem[] = [];
          for (const item of dinormalisasi) {
            const ada = digabung.find((x) => x.id === item.id);
            if (!ada) {
              digabung.push(item);
              continue;
            }
            const total = ada.quantity + item.quantity;
            ada.quantity = Math.min(total, ada.stok_tersedia);
            ada.subtotal = ada.harga * ada.quantity;
          }

          setItems(digabung);
        } else {
          setItems([]);
        }
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCartToStorage = async () => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  };

  /**
   * ID baris keranjang.
   *
   * Sebelumnya `parseInt(\`${productId}${varianId}\`)` — penggabungan string
   * tanpa pemisah, sehingga produk 1+varian 12 dan produk 11+varian 2
   * menghasilkan id yang SAMA (112) dan item saling menimpa.
   */
  const generateCartItemId = (productId: number, varianId?: number) => {
    return varianId
      ? productId * 1_000_000 + varianId
      : productId * 1_000_000;
  };

  const addItem = async (product: any, quantity: number = 1, varian?: any) => {
    const itemId = generateCartItemId(product.id, varian?.id);

    /**
     * Buang baris lama tanpa varian untuk produk yang sama.
     *
     * Baris seperti ini bisa tersisa dari versi app sebelumnya (wishlist dulu
     * menambahkan produk bervarian TANPA varian). Kalau dibiarkan, keranjang
     * menampilkan dua baris untuk produk yang sama dan salah satunya tidak
     * bisa diproses backend (varian_id kosong).
     */
    const bersihkanLegacy = (daftar: CartItem[]) =>
      varian
        ? daftar.filter(
            (item) => !(item.produk_id === product.id && !item.varian_id)
          )
        : daftar;

    const itemsBersih = bersihkanLegacy(items);
    const existingItem = itemsBersih.find((item) => item.id === itemId);

    /** Stok acuan: stok varian bila item bervarian, jika tidak stok produk. */
    const stokAcuan = Number(
      varian?.stok ?? product.stok ?? product.total_stok ?? 0
    ) || 0;

    /**
     * Harga SATUAN untuk qty yang benar-benar masuk keranjang.
     *
     * `varian.harga` dari layar detail sudah berupa harga efektif qty itu
     * (bisa grosir). Saat baris SUDAH ada, qty gabungan bisa melewati ambang
     * tier berikutnya — karena itu harga dihitung ulang di sini dengan aturan
     * yang sama (`hargaEfektif`). Tanpa perhitungan ulang, menambah 1 pcs ke
     * baris berisi 11 pcs tetap memakai harga ecer walau qty menjadi 12.
     */
    const tierBaris = varian?.tier ?? existingItem?.tier ?? [];
    const hargaEcer =
      Number(varian?.harga_ecer ?? existingItem?.harga_ecer ?? varian?.harga_jual ?? product.harga) || 0;

    const hitungHarga = (qty: number): { harga: number; nama_tier: string } => {
      const hasil = hargaEfektif(tierBaris, qty, hargaEcer);

      return { harga: hasil.harga, nama_tier: hasil.namaTier };
    };

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + quantity;
      const maxQuantity = Math.min(existingItem.stok_tersedia, stokAcuan);

      if (newQuantity > maxQuantity) {
        throw new Error(`Stok tidak mencukupi. Maksimal ${maxQuantity} item.`);
      }

      const hargaBaru = hitungHarga(newQuantity);

      setItems((prev) =>
        bersihkanLegacy(prev).map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: newQuantity,
                stok_tersedia: stokAcuan || item.stok_tersedia,
                harga: hargaBaru.harga,
                nama_tier: hargaBaru.nama_tier,
                harga_ecer: hargaEcer || item.harga_ecer,
                satuan_id: varian?.satuan_id ?? item.satuan_id ?? null,
                subtotal: hargaBaru.harga * newQuantity,
              }
            : item
        )
      );
    } else {
      // Add new item
      if (quantity > stokAcuan) {
        throw new Error(`Stok tidak mencukupi. Maksimal ${stokAcuan} item.`);
      }

      const hargaBaru = hitungHarga(quantity);

      const newItem: CartItem = {
        id: itemId,
        produk_id: product.id,
        nama_produk: product.nama_produk,
        harga: hargaBaru.harga,
        quantity,
        gambar_url: product.gambar_url,
        kategori_nama: product.kategori_nama,
        stok_tersedia: stokAcuan,
        varian_id: varian?.id,
        varian_nama: varian?.nama_varian,
        subtotal: hargaBaru.harga * quantity,
        harga_ecer: hargaEcer || undefined,
        nama_tier: hargaBaru.nama_tier,
        satuan_id: varian?.satuan_id ?? null,
        tier: tierBaris.length > 0 ? tierBaris : undefined,
      };

      setItems((prev) => [...bersihkanLegacy(prev), newItem]);
    }
  };

  const removeItem = async (itemId: number) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const updateItemQuantity = async (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const maxQuantity = item.stok_tersedia;
          const finalQuantity = Math.min(quantity, maxQuantity);

          /**
           * Harga dihitung ULANG untuk qty baru: menaikkan qty melewati
           * `min_qty` harus menurunkan harga per satuan (dan sebaliknya saat
           * qty diturunkan). Tanpa ini, subtotal memakai harga tier lama.
           */
          const hargaBaru = hargaEfektif(
            item.tier ?? [],
            finalQuantity,
            item.harga_ecer ?? item.harga,
          );

          return {
            ...item,
            quantity: finalQuantity,
            harga: hargaBaru.harga,
            nama_tier: hargaBaru.namaTier,
            subtotal: hargaBaru.harga * finalQuantity,
          };
        }
        return item;
      })
    );
  };

  const clearCart = async () => {
    setItems([]);
  };

  const getItemById = (productId: number, varianId?: number) => {
    const itemId = generateCartItemId(productId, varianId);
    return items.find(item => item.id === itemId);
  };

  const value: CartContextType = {
    items,
    itemCount,
    totalAmount,
    isLoading,
    addItem,
    removeItem,
    updateItemQuantity,
    clearCart,
    getItemById,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
