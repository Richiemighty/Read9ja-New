import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { OrderService } from '../../services/firebase/orderService';
import { COLORS, FONTS } from '../../constants';
import { Order, OrderStatus, UserRole } from '../../types';

interface OrdersScreenProps {
  navigation: any;
  route?: {
    params?: {
      userRole?: UserRole;
    };
  };
}

const STATUS_COLORS = {
  pending: COLORS.warning,
  payment_verified: COLORS.info,
  rider_assigned: COLORS.primary,
  picked_up: COLORS.success,
  in_transit: COLORS.success,
  delivered: COLORS.success,
  cancelled: COLORS.error,
  refunded: COLORS.textSecondary,
};

const STATUS_LABELS = {
  pending: 'Pending',
  payment_verified: 'Payment Verified',
  rider_assigned: 'Rider Assigned',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const FILTER_OPTIONS = [
  { label: 'All Orders', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation, route }) => {
  const { user, userRole } = useAuth();
  const currentUserRole = route?.params?.userRole || userRole;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  const getFilteredStatus = (filter: string): OrderStatus | undefined => {
    switch (filter) {
      case 'pending':
        return 'pending';
      case 'delivered':
        return 'delivered';
      case 'cancelled':
        return 'cancelled';
      default:
        return undefined;
    }
  };

  const loadOrders = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const status = getFilteredStatus(selectedFilter);
      const { orders: fetchedOrders } = await OrderService.getOrders({
        userId: user.uid,
        userRole: currentUserRole,
        status,
      });
      
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleOrderPress = (order: Order) => {
    navigation.navigate('OrderDetails', { orderId: order.id });
  };

  const handleVerifyOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowVerificationModal(true);
  };

  const submitVerification = async () => {
    if (!selectedOrder || !verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    try {
      await OrderService.verifyOrderDelivery(
        selectedOrder.id,
        verificationCode.trim(),
        user?.uid || ''
      );

      setShowVerificationModal(false);
      setVerificationCode('');
      setSelectedOrder(null);
      loadOrders(); // Refresh orders
      Alert.alert('Success', 'Order delivery verified successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify order');
    }
  };

  const handleCancelOrder = (order: Order) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await OrderService.cancelOrder(
                order.id,
                user?.uid || '',
                'Cancelled by user'
              );
              loadOrders();
              Alert.alert('Success', 'Order cancelled successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Apply search filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(
        order =>
          order.orderNumber.toLowerCase().includes(searchTerm) ||
          order.product.name.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter for in_progress
    if (selectedFilter === 'in_progress') {
      filtered = filtered.filter(order =>
        ['payment_verified', 'rider_assigned', 'picked_up', 'in_transit'].includes(order.status)
      );
    }

    return filtered;
  };

  const getHeaderTitle = () => {
    switch (currentUserRole) {
      case 'seller':
        return 'Sales Orders';
      case 'admin':
        return 'All Orders';
      case 'rider':
        return 'Delivery Orders';
      default:
        return 'My Orders';
    }
  };

  const canCancelOrder = (order: Order) => {
    return ['pending', 'payment_verified', 'rider_assigned'].includes(order.status);
  };

  const canVerifyOrder = (order: Order) => {
    return order.status === 'in_transit';
  };

  const renderOrderActions = (order: Order) => {
    const actions = [];

    if (currentUserRole === 'buyer' && canCancelOrder(order)) {
      actions.push(
        <TouchableOpacity
          key="cancel"
          style={[styles.actionButton, { backgroundColor: COLORS.error }]}
          onPress={() => handleCancelOrder(order)}
        >
          <Text style={styles.actionButtonText}>Cancel</Text>
        </TouchableOpacity>
      );
    }

    if (currentUserRole === 'buyer' && canVerifyOrder(order)) {
      actions.push(
        <TouchableOpacity
          key="verify"
          style={[styles.actionButton, { backgroundColor: COLORS.success }]}
          onPress={() => handleVerifyOrder(order)}
        >
          <Text style={styles.actionButtonText}>Verify Delivery</Text>
        </TouchableOpacity>
      );
    }

    if (currentUserRole === 'seller') {
      actions.push(
        <TouchableOpacity
          key="details"
          style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
          onPress={() => handleOrderPress(order)}
        >
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      );
    }

    return actions;
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => handleOrderPress(order)}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: STATUS_COLORS[order.status] }
        ]}>
          <Text style={styles.statusText}>
            {STATUS_LABELS[order.status]}
          </Text>
        </View>
      </View>

      <View style={styles.orderContent}>
        <Image
          source={{
            uri: order.product.image || 'https://via.placeholder.com/60x60?text=No+Image'
          }}
          style={styles.productImage}
        />
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {order.product.name}
          </Text>
          <Text style={styles.productPrice}>
            {order.product.currency} {order.totalAmount.toLocaleString()}
          </Text>
          <Text style={styles.productQuantity}>Qty: {order.quantity}</Text>
          
          {order.verificationCode && (
            <Text style={styles.verificationCode}>
              Code: {order.verificationCode}
            </Text>
          )}
        </View>
      </View>

      {currentUserRole === 'admin' && (
        <View style={styles.adminInfo}>
          <Text style={styles.adminInfoText}>
            Buyer: {order.buyerId.substring(0, 8)}...
          </Text>
          <Text style={styles.adminInfoText}>
            Seller: {order.sellerId.substring(0, 8)}...
          </Text>
        </View>
      )}

      <View style={styles.orderActions}>
        {renderOrderActions(order)}
      </View>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Orders</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterOption,
                selectedFilter === option.value && styles.selectedFilterOption
              ]}
              onPress={() => {
                setSelectedFilter(option.value);
                setShowFilterModal(false);
              }}
            >
              <Text style={[
                styles.filterOptionText,
                selectedFilter === option.value && styles.selectedFilterOptionText
              ]}>
                {option.label}
              </Text>
              {selectedFilter === option.value && (
                <Ionicons name="checkmark" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  const renderVerificationModal = () => (
    <Modal
      visible={showVerificationModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowVerificationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Verify Delivery</Text>
            <TouchableOpacity onPress={() => setShowVerificationModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.verificationInstructions}>
            Please enter the verification code provided by the delivery rider:
          </Text>
          
          <TextInput
            style={styles.verificationInput}
            value={verificationCode}
            onChangeText={setVerificationCode}
            placeholder="Enter 6-digit code"
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
            maxLength={6}
          />
          
          <TouchableOpacity
            style={styles.verificationButton}
            onPress={submitVerification}
          >
            <Text style={styles.verificationButtonText}>Verify Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [selectedFilter])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search orders..."
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredOrders()}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'You haven\'t placed any orders yet'
                }
              </Text>
            </View>
          }
        />
      )}

      {renderFilterModal()}
      {renderVerificationModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  filterButton: {
    marginLeft: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundLight,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  orderDate: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  orderContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  productInfo: {
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
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  verificationCode: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.success,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  adminInfo: {
    backgroundColor: COLORS.backgroundLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  adminInfoText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  listContent: {
    paddingBottom: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  selectedFilterOption: {
    backgroundColor: COLORS.primaryLight,
  },
  filterOptionText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  selectedFilterOptionText: {
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  verificationInstructions: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  verificationInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  verificationButton: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  verificationButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
});

export default OrdersScreen;
