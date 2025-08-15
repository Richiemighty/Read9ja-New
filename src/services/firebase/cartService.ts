import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Cart, CartItem, Product } from '../../types';
import { ProductService } from './productService';

export class CartService {
  private static COLLECTION = 'carts';

  // Get user's cart
  static async getCart(userId: string): Promise<Cart> {
    try {
      const cartDoc = await getDoc(doc(db, this.COLLECTION, userId));
      
      if (!cartDoc.exists()) {
        // Create empty cart if doesn't exist
        const emptyCart: Cart = {
          userId,
          items: [],
          totalItems: 0,
          totalAmount: 0,
          updatedAt: new Date(),
        };
        await setDoc(doc(db, this.COLLECTION, userId), {
          ...emptyCart,
          updatedAt: serverTimestamp(),
        });
        return emptyCart;
      }

      const cartData = cartDoc.data();
      return {
        userId: cartData.userId,
        items: cartData.items || [],
        totalItems: cartData.totalItems || 0,
        totalAmount: cartData.totalAmount || 0,
        updatedAt: cartData.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting cart:', error);
      throw new Error('Failed to get cart');
    }
  }

  // Add item to cart
  static async addToCart(
    userId: string,
    productId: string,
    quantity: number = 1
  ): Promise<void> {
    try {
      // Get product details
      const product = await ProductService.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Check stock availability
      if (product.stock < quantity) {
        throw new Error('Insufficient stock available');
      }

      // Get current cart
      const cart = await this.getCart(userId);
      
      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.productId === productId
      );

      let updatedItems: CartItem[];

      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const existingItem = cart.items[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;

        // Check if new quantity exceeds stock
        if (newQuantity > product.stock) {
          throw new Error('Cannot add more items than available stock');
        }

        updatedItems = cart.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // Add new item to cart
        const newItem: CartItem = {
          id: `${productId}_${Date.now()}`,
          productId,
          product,
          quantity,
          addedAt: new Date(),
        };
        updatedItems = [...cart.items, newItem];
      }

      // Calculate totals
      const totals = this.calculateCartTotals(updatedItems);

      // Update cart in database
      await updateDoc(doc(db, this.COLLECTION, userId), {
        items: updatedItems,
        totalItems: totals.totalItems,
        totalAmount: totals.totalAmount,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  // Update item quantity in cart
  static async updateCartItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<void> {
    try {
      if (quantity < 0) {
        throw new Error('Quantity cannot be negative');
      }

      if (quantity === 0) {
        return this.removeFromCart(userId, productId);
      }

      // Get product to check stock
      const product = await ProductService.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      if (quantity > product.stock) {
        throw new Error('Quantity exceeds available stock');
      }

      // Get current cart
      const cart = await this.getCart(userId);
      
      // Update item quantity
      const updatedItems = cart.items.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      );

      // Calculate totals
      const totals = this.calculateCartTotals(updatedItems);

      // Update cart in database
      await updateDoc(doc(db, this.COLLECTION, userId), {
        items: updatedItems,
        totalItems: totals.totalItems,
        totalAmount: totals.totalAmount,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      throw error;
    }
  }

  // Remove item from cart
  static async removeFromCart(userId: string, productId: string): Promise<void> {
    try {
      // Get current cart
      const cart = await this.getCart(userId);
      
      // Remove item from cart
      const updatedItems = cart.items.filter(
        item => item.productId !== productId
      );

      // Calculate totals
      const totals = this.calculateCartTotals(updatedItems);

      // Update cart in database
      await updateDoc(doc(db, this.COLLECTION, userId), {
        items: updatedItems,
        totalItems: totals.totalItems,
        totalAmount: totals.totalAmount,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw new Error('Failed to remove item from cart');
    }
  }

  // Clear entire cart
  static async clearCart(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, userId), {
        items: [],
        totalItems: 0,
        totalAmount: 0,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw new Error('Failed to clear cart');
    }
  }

  // Get cart item count for a specific product
  static async getCartItemQuantity(
    userId: string,
    productId: string
  ): Promise<number> {
    try {
      const cart = await this.getCart(userId);
      const item = cart.items.find(item => item.productId === productId);
      return item ? item.quantity : 0;
    } catch (error) {
      console.error('Error getting cart item quantity:', error);
      return 0;
    }
  }

  // Subscribe to cart changes
  static subscribeToCart(
    userId: string,
    callback: (cart: Cart) => void
  ): () => void {
    const unsubscribe = onSnapshot(
      doc(db, this.COLLECTION, userId),
      (doc) => {
        if (doc.exists()) {
          const cartData = doc.data();
          const cart: Cart = {
            userId: cartData.userId,
            items: cartData.items || [],
            totalItems: cartData.totalItems || 0,
            totalAmount: cartData.totalAmount || 0,
            updatedAt: cartData.updatedAt?.toDate() || new Date(),
          };
          callback(cart);
        } else {
          // Create empty cart if doesn't exist
          const emptyCart: Cart = {
            userId,
            items: [],
            totalItems: 0,
            totalAmount: 0,
            updatedAt: new Date(),
          };
          callback(emptyCart);
        }
      },
      (error) => {
        console.error('Error subscribing to cart:', error);
      }
    );

    return unsubscribe;
  }

  // Validate cart before checkout
  static async validateCartForCheckout(userId: string): Promise<{
    isValid: boolean;
    errors: string[];
    unavailableItems: string[];
  }> {
    try {
      const cart = await this.getCart(userId);
      const errors: string[] = [];
      const unavailableItems: string[] = [];

      if (cart.items.length === 0) {
        errors.push('Cart is empty');
        return { isValid: false, errors, unavailableItems };
      }

      // Validate each item
      for (const cartItem of cart.items) {
        const product = await ProductService.getProduct(cartItem.productId);
        
        if (!product) {
          errors.push(`Product "${cartItem.product.title}" is no longer available`);
          unavailableItems.push(cartItem.productId);
          continue;
        }

        if (product.status !== 'active') {
          errors.push(`Product "${product.title}" is currently unavailable`);
          unavailableItems.push(cartItem.productId);
          continue;
        }

        if (product.stock < cartItem.quantity) {
          errors.push(
            `Only ${product.stock} units of "${product.title}" available, but ${cartItem.quantity} requested`
          );
          continue;
        }

        // Check if price has changed significantly
        if (Math.abs(product.price - cartItem.product.price) > 0.01) {
          errors.push(`Price of "${product.title}" has changed`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        unavailableItems,
      };
    } catch (error) {
      console.error('Error validating cart:', error);
      return {
        isValid: false,
        errors: ['Failed to validate cart'],
        unavailableItems: [],
      };
    }
  }

  // Sync cart with latest product data
  static async syncCartWithLatestData(userId: string): Promise<void> {
    try {
      const cart = await this.getCart(userId);
      let hasChanges = false;
      const updatedItems: CartItem[] = [];

      for (const cartItem of cart.items) {
        const latestProduct = await ProductService.getProduct(cartItem.productId);
        
        if (!latestProduct || latestProduct.status !== 'active') {
          // Remove unavailable products
          hasChanges = true;
          continue;
        }

        // Update with latest product data and adjust quantity if needed
        const adjustedQuantity = Math.min(cartItem.quantity, latestProduct.stock);
        
        if (adjustedQuantity !== cartItem.quantity || 
            JSON.stringify(latestProduct) !== JSON.stringify(cartItem.product)) {
          hasChanges = true;
        }

        if (adjustedQuantity > 0) {
          updatedItems.push({
            ...cartItem,
            product: latestProduct,
            quantity: adjustedQuantity,
          });
        } else {
          hasChanges = true;
        }
      }

      if (hasChanges) {
        // Calculate totals
        const totals = this.calculateCartTotals(updatedItems);

        // Update cart in database
        await updateDoc(doc(db, this.COLLECTION, userId), {
          items: updatedItems,
          totalItems: totals.totalItems,
          totalAmount: totals.totalAmount,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error syncing cart:', error);
      throw new Error('Failed to sync cart with latest data');
    }
  }

  // Calculate cart totals
  private static calculateCartTotals(items: CartItem[]): {
    totalItems: number;
    totalAmount: number;
  } {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.product.price * item.quantity),
      0
    );

    return { totalItems, totalAmount };
  }

  // Move cart items to saved for later (wishlist functionality)
  static async moveToSavedForLater(
    userId: string,
    productId: string
  ): Promise<void> {
    try {
      // This would integrate with a wishlist/saved items service
      // For now, we'll just remove from cart
      await this.removeFromCart(userId, productId);
    } catch (error) {
      console.error('Error moving to saved for later:', error);
      throw new Error('Failed to save item for later');
    }
  }

  // Get cart summary for checkout
  static async getCartSummary(userId: string): Promise<{
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
    itemCount: number;
  }> {
    try {
      const cart = await this.getCart(userId);
      const subtotal = cart.totalAmount;
      
      // Calculate tax (5% for example)
      const tax = subtotal * 0.05;
      
      // Calculate delivery fee (flat rate or based on location)
      const deliveryFee = subtotal > 10000 ? 0 : 1000; // Free delivery above ₦10,000
      
      const total = subtotal + tax + deliveryFee;

      return {
        subtotal,
        tax,
        deliveryFee,
        total,
        itemCount: cart.totalItems,
      };
    } catch (error) {
      console.error('Error getting cart summary:', error);
      throw new Error('Failed to get cart summary');
    }
  }
}
