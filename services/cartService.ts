import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEBUG_MODE } from './config';
import { Cart, CartItem } from './types';

const CART_STORAGE_KEY = 'shopping_cart';

export class CartService {
  private static instance: CartService;
  private cart: Cart | null = null;
  private listeners: Array<(cart: Cart) => void> = [];

  private constructor() {
    this.loadCart();
  }

  public static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  // Load cart from storage
  private async loadCart(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        this.cart = JSON.parse(stored);
        if (DEBUG_MODE) {
          console.log('🛒 Cart loaded:', this.cart?.total_items || 0, 'items');
        }
      } else {
        this.cart = this.createEmptyCart();
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to load cart:', error);
      }
      this.cart = this.createEmptyCart();
    }
  }

  // Save cart to storage
  private async saveCart(): Promise<void> {
    if (!this.cart) return;

    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.cart));
      if (DEBUG_MODE) {
        console.log('💾 Cart saved:', this.cart.total_items, 'items');
      }
      this.notifyListeners();
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to save cart:', error);
      }
    }
  }

  // Create empty cart
  private createEmptyCart(): Cart {
    return {
      items: [],
      total_items: 0,
      total_harga: 0,
      updated_at: new Date().toISOString(),
    };
  }

  // Calculate cart totals
  private calculateTotals(): void {
    if (!this.cart) return;

    this.cart.total_items = this.cart.items.reduce((sum, item) => sum + item.jumlah, 0);
    this.cart.total_harga = this.cart.items.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);
    this.cart.updated_at = new Date().toISOString();
  }

  // Generate unique cart item ID
  private generateCartItemId(produk_id: number, varian_id?: number): string {
    return varian_id ? `${produk_id}_${varian_id}` : `${produk_id}`;
  }

  // Add listener for cart changes
  addListener(listener: (cart: Cart) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    if (this.cart) {
      this.listeners.forEach(listener => listener(this.cart!));
    }
  }

  // Get current cart
  async getCart(): Promise<Cart> {
    if (!this.cart) {
      await this.loadCart();
    }
    return this.cart!;
  }

  // Add item to cart
  async addItem(item: {
    produk_id: number;
    varian_id?: number;
    nama_produk: string;
    nama_varian?: string;
    harga: number;
    jumlah: number;
    gambar_url?: string;
    stok_tersedia: number;
    catatan?: string;
  }): Promise<CartItem> {
    if (!this.cart) await this.loadCart();

    const itemId = this.generateCartItemId(item.produk_id, item.varian_id);
    const existingItemIndex = this.cart!.items.findIndex(cartItem => cartItem.id === itemId);

    if (existingItemIndex >= 0) {
      // Update existing item
      const existingItem = this.cart!.items[existingItemIndex];
      const newQuantity = existingItem.jumlah + item.jumlah;
      
      // Check stock availability
      if (newQuantity > item.stok_tersedia) {
        throw new Error(`Stok tidak mencukupi. Tersedia: ${item.stok_tersedia}, diminta: ${newQuantity}`);
      }

      existingItem.jumlah = newQuantity;
      existingItem.catatan = item.catatan || existingItem.catatan;
      
      if (DEBUG_MODE) {
        console.log(`🛒 Updated cart item:`, existingItem.nama_produk, `qty: ${existingItem.jumlah}`);
      }
    } else {
      // Add new item
      if (item.jumlah > item.stok_tersedia) {
        throw new Error(`Stok tidak mencukupi. Tersedia: ${item.stok_tersedia}, diminta: ${item.jumlah}`);
      }

      const newCartItem: CartItem = {
        id: itemId,
        produk_id: item.produk_id,
        varian_id: item.varian_id,
        nama_produk: item.nama_produk,
        nama_varian: item.nama_varian,
        harga: item.harga,
        jumlah: item.jumlah,
        gambar_url: item.gambar_url,
        stok_tersedia: item.stok_tersedia,
        catatan: item.catatan,
      };

      this.cart!.items.push(newCartItem);
      
      if (DEBUG_MODE) {
        console.log(`🛒 Added new cart item:`, newCartItem.nama_produk, `qty: ${newCartItem.jumlah}`);
      }
    }

    this.calculateTotals();
    await this.saveCart();

    return this.cart!.items.find(cartItem => cartItem.id === itemId)!;
  }

  // Update item quantity
  async updateItemQuantity(itemId: string, jumlah: number): Promise<void> {
    if (!this.cart) await this.loadCart();

    const itemIndex = this.cart!.items.findIndex(item => item.id === itemId);
    if (itemIndex < 0) {
      throw new Error('Item tidak ditemukan di keranjang');
    }

    const item = this.cart!.items[itemIndex];

    if (jumlah <= 0) {
      // Remove item if quantity is 0 or negative
      await this.removeItem(itemId);
      return;
    }

    // Check stock availability
    if (jumlah > item.stok_tersedia) {
      throw new Error(`Stok tidak mencukupi. Tersedia: ${item.stok_tersedia}`);
    }

    item.jumlah = jumlah;
    
    if (DEBUG_MODE) {
      console.log(`🛒 Updated quantity:`, item.nama_produk, `qty: ${jumlah}`);
    }

    this.calculateTotals();
    await this.saveCart();
  }

  // Remove item from cart
  async removeItem(itemId: string): Promise<void> {
    if (!this.cart) await this.loadCart();

    const itemIndex = this.cart!.items.findIndex(item => item.id === itemId);
    if (itemIndex < 0) {
      throw new Error('Item tidak ditemukan di keranjang');
    }

    const removedItem = this.cart!.items.splice(itemIndex, 1)[0];
    
    if (DEBUG_MODE) {
      console.log(`🛒 Removed item:`, removedItem.nama_produk);
    }

    this.calculateTotals();
    await this.saveCart();
  }

  // Update item note
  async updateItemNote(itemId: string, catatan: string): Promise<void> {
    if (!this.cart) await this.loadCart();

    const item = this.cart!.items.find(item => item.id === itemId);
    if (!item) {
      throw new Error('Item tidak ditemukan di keranjang');
    }

    item.catatan = catatan;
    await this.saveCart();
  }

  // Clear entire cart
  async clearCart(): Promise<void> {
    this.cart = this.createEmptyCart();
    await this.saveCart();
    
    if (DEBUG_MODE) {
      console.log('🛒 Cart cleared');
    }
  }

  // Get cart item count
  async getItemCount(): Promise<number> {
    const cart = await this.getCart();
    return cart.total_items;
  }

  // Get cart total
  async getCartTotal(): Promise<number> {
    const cart = await this.getCart();
    return cart.total_harga;
  }

  // Check if item is in cart
  async isItemInCart(produk_id: number, varian_id?: number): Promise<boolean> {
    const cart = await this.getCart();
    const itemId = this.generateCartItemId(produk_id, varian_id);
    return cart.items.some(item => item.id === itemId);
  }

  // Get specific cart item
  async getCartItem(produk_id: number, varian_id?: number): Promise<CartItem | null> {
    const cart = await this.getCart();
    const itemId = this.generateCartItemId(produk_id, varian_id);
    return cart.items.find(item => item.id === itemId) || null;
  }

  // Validate cart (check stock availability)
  async validateCart(): Promise<{
    isValid: boolean;
    errors: Array<{ itemId: string; message: string; availableStock: number }>;
  }> {
    const cart = await this.getCart();
    const errors: Array<{ itemId: string; message: string; availableStock: number }> = [];

    // This would typically involve checking with the API for current stock levels
    // For now, we'll just validate against cached stock data
    cart.items.forEach(item => {
      if (item.jumlah > item.stok_tersedia) {
        errors.push({
          itemId: item.id,
          message: `${item.nama_produk} - Stok tidak mencukupi`,
          availableStock: item.stok_tersedia,
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Apply discount to cart (for promotions)
  calculateDiscountedTotal(discountAmount: number): number {
    if (!this.cart) return 0;
    return Math.max(0, this.cart.total_harga - discountAmount);
  }

  // Get cart items grouped by product
  async getGroupedItems(): Promise<Array<{
    produk_id: number;
    nama_produk: string;
    items: CartItem[];
    totalQuantity: number;
    totalPrice: number;
  }>> {
    const cart = await this.getCart();
    const grouped = new Map<number, {
      produk_id: number;
      nama_produk: string;
      items: CartItem[];
      totalQuantity: number;
      totalPrice: number;
    }>();

    cart.items.forEach(item => {
      if (!grouped.has(item.produk_id)) {
        grouped.set(item.produk_id, {
          produk_id: item.produk_id,
          nama_produk: item.nama_produk,
          items: [],
          totalQuantity: 0,
          totalPrice: 0,
        });
      }

      const group = grouped.get(item.produk_id)!;
      group.items.push(item);
      group.totalQuantity += item.jumlah;
      group.totalPrice += item.harga * item.jumlah;
    });

    return Array.from(grouped.values());
  }

  // Convert cart to order format
  async convertToOrderData(): Promise<{
    items: Array<{
      produk_id: number;
      varian_id?: number;
      jumlah: number;
    }>;
    total_harga: number;
    total_items: number;
  }> {
    const cart = await this.getCart();
    
    return {
      items: cart.items.map(item => ({
        produk_id: item.produk_id,
        varian_id: item.varian_id,
        jumlah: item.jumlah,
      })),
      total_harga: cart.total_harga,
      total_items: cart.total_items,
    };
  }

  // Sync cart with latest product data (prices, stock, etc.)
  async syncWithProductData(productData: Array<{
    produk_id: number;
    varian_id?: number;
    harga: number;
    stok_tersedia: number;
    nama_produk?: string;
    nama_varian?: string;
    gambar_url?: string;
  }>): Promise<{
    updated: boolean;
    changes: Array<{
      itemId: string;
      changes: Array<string>;
    }>;
  }> {
    if (!this.cart) await this.loadCart();

    const changes: Array<{ itemId: string; changes: Array<string> }> = [];
    let hasUpdates = false;

    this.cart!.items.forEach(cartItem => {
      const productUpdate = productData.find(p => 
        p.produk_id === cartItem.produk_id && 
        (p.varian_id || null) === (cartItem.varian_id || null)
      );

      if (productUpdate) {
        const itemChanges: Array<string> = [];

        // Update price if changed
        if (productUpdate.harga !== cartItem.harga) {
          itemChanges.push(`Harga berubah dari ${cartItem.harga} ke ${productUpdate.harga}`);
          cartItem.harga = productUpdate.harga;
          hasUpdates = true;
        }

        // Update stock availability
        if (productUpdate.stok_tersedia !== cartItem.stok_tersedia) {
          itemChanges.push(`Stok berubah dari ${cartItem.stok_tersedia} ke ${productUpdate.stok_tersedia}`);
          cartItem.stok_tersedia = productUpdate.stok_tersedia;
          hasUpdates = true;
        }

        // Update product name if provided
        if (productUpdate.nama_produk && productUpdate.nama_produk !== cartItem.nama_produk) {
          cartItem.nama_produk = productUpdate.nama_produk;
          hasUpdates = true;
        }

        // Update variant name if provided
        if (productUpdate.nama_varian && productUpdate.nama_varian !== cartItem.nama_varian) {
          cartItem.nama_varian = productUpdate.nama_varian;
          hasUpdates = true;
        }

        // Update image if provided
        if (productUpdate.gambar_url) {
          cartItem.gambar_url = productUpdate.gambar_url;
          hasUpdates = true;
        }

        if (itemChanges.length > 0) {
          changes.push({
            itemId: cartItem.id,
            changes: itemChanges,
          });
        }
      }
    });

    if (hasUpdates) {
      this.calculateTotals();
      await this.saveCart();
    }

    return {
      updated: hasUpdates,
      changes,
    };
  }
}

// Singleton instance
export const cartService = CartService.getInstance();

// React hook for cart state (would be used in a React hook)
export const createCartHook = () => {
  let cart: Cart | null = null;
  let listeners: Array<() => void> = [];

  const subscribe = (callback: () => void) => {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  };

  const getSnapshot = () => cart;

  // Initialize cart
  cartService.getCart().then(c => {
    cart = c;
    listeners.forEach(l => l());
  });

  // Listen for cart changes
  cartService.addListener((newCart) => {
    cart = newCart;
    listeners.forEach(l => l());
  });

  return {
    subscribe,
    getSnapshot,
  };
};
