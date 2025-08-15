import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { CartService } from '../../services/firebase/cartService';
import { OrderService } from '../../services/firebase/orderService';
import { ProfileService } from '../../services/firebase/profileService';
import { COLORS, FONTS } from '../../constants';
import { Cart, DeliveryInfo, Profile } from '../../types';

interface CheckoutScreenProps {
  navigation: any;
}

const PAYMENT_METHODS = [
  { id: 'paystack', label: 'Pay with Card', icon: 'card' },
  { id: 'transfer', label: 'Bank Transfer', icon: 'business' },
  { id: 'pod', label: 'Pay on Delivery', icon: 'cash' },
];

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('paystack');
  
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    recipientName: '',
    phoneNumber: '',
    address: '',
    landmark: '',
    deliveryInstructions: '',
  });

  const [errors, setErrors] = useState<Partial<DeliveryInfo>>({});

  useEffect(() => {
    loadData();
  }, [user?.uid]);

  const loadData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const [cartData, profileData] = await Promise.all([
        CartService.getCart(user.uid),
        ProfileService.getProfile(user.uid),
      ]);

      setCart(cartData);
      setProfile(profileData);

      // Pre-fill delivery info from profile
      if (profileData) {
        setDeliveryInfo({
          recipientName: `${profileData.firstName} ${profileData.lastName}`,
          phoneNumber: profileData.phoneNumber,
          address: profileData.address || '',
          landmark: '',
          deliveryInstructions: '',
        });
      }
    } catch (error) {
      console.error('Error loading checkout data:', error);
      Alert.alert('Error', 'Failed to load checkout information');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<DeliveryInfo> = {};

    if (!deliveryInfo.recipientName.trim()) {
      newErrors.recipientName = 'Recipient name is required';
    }

    if (!deliveryInfo.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (deliveryInfo.phoneNumber.length < 10) {
      newErrors.phoneNumber = 'Phone number must be at least 10 digits';
    }

    if (!deliveryInfo.address.trim()) {
      newErrors.address = 'Delivery address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateOrderSummary = () => {
    if (!cart?.items.length) return null;

    const subtotal = cart.totalAmount;
    const tax = subtotal * 0.05; // 5% tax
    const deliveryFee = subtotal > 10000 ? 0 : 1000; // Free delivery above ₦10,000
    const total = subtotal + tax + deliveryFee;

    return { subtotal, tax, deliveryFee, total };
  };

  const handlePlaceOrder = async () => {
    if (!validateForm() || !user?.uid || !cart?.items.length) return;

    setPlacing(true);
    try {
      // Validate cart one more time
      const validation = await CartService.validateCartForCheckout(user.uid);
      if (!validation.isValid) {
        Alert.alert('Cart Issues', validation.errors.join('\n'));
        return;
      }

      // Create order
      const orderIds = await OrderService.createOrderFromCart(
        user.uid,
        deliveryInfo,
        selectedPaymentMethod,
        deliveryInfo.deliveryInstructions
      );

      // Show success message
      Alert.alert(
        'Order Placed Successfully!',
        `Your order${orderIds.length > 1 ? 's have' : ' has'} been placed successfully. You will receive a confirmation shortly.`,
        [
          {
            text: 'View Orders',
            onPress: () => navigation.navigate('Orders'),
          },
          {
            text: 'Continue Shopping',
            onPress: () => navigation.navigate('Marketplace'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error placing order:', error);
      Alert.alert('Error', error.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const renderOrderSummary = () => {
    const summary = calculateOrderSummary();
    if (!summary || !cart?.items.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items ({cart.totalItems})</Text>
          <Text style={styles.summaryValue}>₦{summary.subtotal.toLocaleString()}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax (5%)</Text>
          <Text style={styles.summaryValue}>₦{summary.tax.toLocaleString()}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={[
            styles.summaryValue,
            summary.deliveryFee === 0 && { color: COLORS.success }
          ]}>
            {summary.deliveryFee === 0 ? 'FREE' : `₦${summary.deliveryFee.toLocaleString()}`}
          </Text>
        </View>
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₦{summary.total.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  const renderDeliverySection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery Information</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Recipient Name *</Text>
        <TextInput
          style={[styles.textInput, errors.recipientName && styles.inputError]}
          value={deliveryInfo.recipientName}
          onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, recipientName: text }))}
          placeholder="Enter recipient name"
          placeholderTextColor={COLORS.textSecondary}
        />
        {errors.recipientName && <Text style={styles.errorText}>{errors.recipientName}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <TextInput
          style={[styles.textInput, errors.phoneNumber && styles.inputError]}
          value={deliveryInfo.phoneNumber}
          onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, phoneNumber: text }))}
          placeholder="Enter phone number"
          placeholderTextColor={COLORS.textSecondary}
          keyboardType="phone-pad"
        />
        {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Delivery Address *</Text>
        <TextInput
          style={[styles.textAreaInput, errors.address && styles.inputError]}
          value={deliveryInfo.address}
          onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, address: text }))}
          placeholder="Enter your delivery address"
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Landmark (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={deliveryInfo.landmark}
          onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, landmark: text }))}
          placeholder="Nearby landmark"
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Delivery Instructions (Optional)</Text>
        <TextInput
          style={styles.textAreaInput}
          value={deliveryInfo.deliveryInstructions}
          onChangeText={(text) => setDeliveryInfo(prev => ({ ...prev, deliveryInstructions: text }))}
          placeholder="Any special delivery instructions"
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderPaymentSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Payment Method</Text>
      
      {PAYMENT_METHODS.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.paymentMethod,
            selectedPaymentMethod === method.id && styles.selectedPaymentMethod
          ]}
          onPress={() => setSelectedPaymentMethod(method.id)}
        >
          <View style={styles.paymentMethodLeft}>
            <Ionicons name={method.icon as any} size={24} color={COLORS.primary} />
            <Text style={styles.paymentMethodText}>{method.label}</Text>
          </View>
          <Ionicons
            name={selectedPaymentMethod === method.id ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  if (!cart?.items.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bag-outline" size={80} color={COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('Marketplace')}
        >
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderOrderSummary()}
        {renderDeliverySection()}
        {renderPaymentSection()}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, placing && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.placeOrderButtonText}>
              Place Order (₦{calculateOrderSummary()?.total.toLocaleString()})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
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
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    minHeight: 80,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginLeft: 12,
  },
  bottomContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  placeOrderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  bottomSpacer: {
    height: 100,
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
});

export default CheckoutScreen;
