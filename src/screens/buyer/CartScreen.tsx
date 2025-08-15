import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { CartService } from '../../services/firebase/cartService';
import { COLORS, FONTS } from '../../constants';
import { Cart, CartItem } from '../../types';

interface CartScreenProps {
  navigation: any;
}

const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    // Subscribe to cart changes
    const unsubscribe = CartService.subscribeToCart(user.uid, (cartData) => {
      setCart(cartData);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (!user?.uid || updating) return;

    setUpdating(productId);
    try {
      if (newQuantity === 0) {
        await CartService.removeFromCart(user.uid, productId);
      } else {
        await CartService.updateCartItemQuantity(user.uid, productId, newQuantity);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!user?.uid) return;

    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await CartService.removeFromCart(user.uid!, productId);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove item');
            }
          },
        },
      ]
    );
  };

  const handleCheckout = async () => {
    if (!user?.uid || !cart?.items.length) return;

    try {
      // Validate cart before proceeding
      const validation = await CartService.validateCartForCheckout(user.uid);
      
      if (!validation.isValid) {
        Alert.alert('Cart Issues', validation.errors.join('\n'));
        return;
      }

      // Navigate to checkout
      navigation.navigate('Checkout');
    } catch (error) {
      console.error('Error validating cart:', error);
      Alert.alert('Error', 'Failed to validate cart');
    }
  };

  const renderQuantityControls = (item: CartItem) => (
    <View style={styles.quantityControls}>
      <TouchableOpacity
        style={styles.quantityButton}
        onPress={() => handleQuantityChange(item.productId, item.quantity - 1)}
        disabled={updating === item.productId}
      >
        <Ionicons name="remove" size={16} color={COLORS.primary} />
      </TouchableOpacity>
      
      <Text style={styles.quantityText}>{item.quantity}</Text>
      
      <TouchableOpacity
        style={styles.quantityButton}
        onPress={() => handleQuantityChange(item.productId, item.quantity + 1)}
        disabled={updating === item.productId}
      >
        <Ionicons name="add" size={16} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <Image
        source={{
          uri: item.product.images[0] || 'https://via.placeholder.com/80x80?text=No+Image'
        }}
        style={styles.productImage}
      />
      
      <View style={styles.itemDetails}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product.title}
        </Text>
        
        <Text style={styles.productPrice}>
          {item.product.currency} {item.product.price.toLocaleString()}
        </Text>
        
        <View style={styles.itemActions}>
          {renderQuantityControls(item)}
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveItem(item.productId)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.itemTotal}>
        <Text style={styles.itemTotalText}>
          {item.product.currency} {(item.product.price * item.quantity).toLocaleString()}
        </Text>
        {updating === item.productId && (
          <ActivityIndicator size="small" color={COLORS.primary} />
        )}
      </View>
    </View>
  );

  const renderCartSummary = () => {
    if (!cart?.items.length) return null;

    const subtotal = cart.totalAmount;
    const tax = subtotal * 0.05; // 5% tax
    const deliveryFee = subtotal > 10000 ? 0 : 1000; // Free delivery above ₦10,000
    const total = subtotal + tax + deliveryFee;

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal ({cart.totalItems} items)</Text>
          <Text style={styles.summaryValue}>₦{subtotal.toLocaleString()}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax (5%)</Text>
          <Text style={styles.summaryValue}>₦{tax.toLocaleString()}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={[
            styles.summaryValue,
            deliveryFee === 0 && { color: COLORS.success }
          ]}>
            {deliveryFee === 0 ? 'FREE' : `₦${deliveryFee.toLocaleString()}`}
          </Text>
        </View>
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₦{total.toLocaleString()}</Text>
        </View>
        
        <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
          <Text style={styles.checkoutButtonText}>
            Proceed to Checkout (₦{total.toLocaleString()})
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        <View style={styles.headerRight}>
          {cart && cart.items.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.totalItems}</Text>
            </View>
          )}
        </View>
      </View>

      {!cart?.items.length ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add items to your cart to see them here
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cart.items}
            keyExtractor={(item) => item.id}
            renderItem={renderCartItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          
          {renderCartSummary()}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  headerRight: {
    width: 24,
    alignItems: 'center',
  },
  cartBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  shopButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  shopButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 12,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: COLORS.white,
  },
  quantityText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.error,
    marginLeft: 4,
  },
  itemTotal: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 80,
  },
  itemTotalText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  summaryContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
});

export default CartScreen;
