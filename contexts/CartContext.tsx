import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        setItems(parsedCart);
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

  const generateCartItemId = (productId: number, varianId?: number) => {
    return varianId ? parseInt(`${productId}${varianId}`) : productId;
  };

  const addItem = async (product: any, quantity: number = 1, varian?: any) => {
    const itemId = generateCartItemId(product.id, varian?.id);
    const existingItem = items.find(item => item.id === itemId);

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + quantity;
      const maxQuantity = existingItem.stok_tersedia;
      
      if (newQuantity > maxQuantity) {
        throw new Error(`Stok tidak mencukupi. Maksimal ${maxQuantity} item.`);
      }

      await updateItemQuantity(itemId, newQuantity);
    } else {
      // Add new item
      if (quantity > product.stok) {
        throw new Error(`Stok tidak mencukupi. Maksimal ${product.stok} item.`);
      }

      const newItem: CartItem = {
        id: itemId,
        produk_id: product.id,
        nama_produk: product.nama_produk,
        harga: varian?.harga || product.harga,
        quantity,
        gambar_url: product.gambar_url,
        kategori_nama: product.kategori_nama,
        stok_tersedia: product.stok,
        varian_id: varian?.id,
        varian_nama: varian?.nama_varian,
        subtotal: (varian?.harga || product.harga) * quantity,
      };

      setItems(prevItems => [...prevItems, newItem]);
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
          
          return {
            ...item,
            quantity: finalQuantity,
            subtotal: item.harga * finalQuantity,
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
