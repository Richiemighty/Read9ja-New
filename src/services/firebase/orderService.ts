import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Order, OrderStatus, DeliveryInfo, OrderTracking, CartItem } from '../../types';
import { ProductService } from './productService';
import { CartService } from './cartService';
import { NotificationService } from './notificationService';

export class OrderService {
  private static ORDERS_COLLECTION = 'orders';
  private static TRACKING_COLLECTION = 'order_tracking';

  // Generate unique order code
  private static generateOrderCode(): string {
    const prefix = 'R9J';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Generate unique verification code for order
  private static generateVerificationCode(): string {
    return Math.random().toString().substr(2, 6);
  }

  // Create order from cart items
  static async createOrderFromCart(
    userId: string,
    deliveryInfo: DeliveryInfo,
    paymentMethod: string,
    specialInstructions?: string
  ): Promise<string[]> {
    try {
      // Get and validate cart
      const cart = await CartService.getCart(userId);
      const validation = await CartService.validateCartForCheckout(userId);

      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      const orderIds: string[] = [];

      // Create separate orders for different sellers
      const ordersBySeller = this.groupCartItemsBySeller(cart.items);

      for (const [sellerId, items] of ordersBySeller.entries()) {
        const orderId = await this.createSingleOrder(
          userId,
          sellerId,
          items,
          deliveryInfo,
          paymentMethod,
          specialInstructions
        );
        orderIds.push(orderId);
      }

      // Clear cart after successful order creation
      await CartService.clearCart(userId);

      return orderIds;
    } catch (error) {
      console.error('Error creating orders from cart:', error);
      throw error;
    }
  }

  // Create a single order for one seller
  private static async createSingleOrder(
    buyerId: string,
    sellerId: string,
    items: CartItem[],
    deliveryInfo: DeliveryInfo,
    paymentMethod: string,
    specialInstructions?: string
  ): Promise<string> {
    return await runTransaction(db, async (transaction) => {
      // Calculate order totals
      const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // For now, we'll create one order per product. In a real app, you might group by seller
      const firstItem = items[0];
      const orderNumber = this.generateOrderCode();
      const verificationCode = this.generateVerificationCode();

      // Create order data
      const orderData = {
        orderNumber,
        buyerId,
        sellerId,
        productId: firstItem.productId,
        product: {
          name: firstItem.product.title,
          image: firstItem.product.images[0] || '',
          price: firstItem.product.price,
          currency: firstItem.product.currency,
        },
        quantity,
        totalAmount: subtotal,
        status: 'pending' as OrderStatus,
        deliveryInfo,
        verificationCode,
        paymentMethod,
        paymentReference: '', // Will be updated after payment
        specialInstructions: specialInstructions || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add order to database
      const orderRef = await addDoc(collection(db, this.ORDERS_COLLECTION), orderData);

      // Update product stock
      for (const item of items) {
        await ProductService.updateStock(item.productId, item.quantity, 'subtract');
      }

      // Create initial tracking entry
      await this.addTrackingEntry(orderRef.id, 'pending', 'Order placed successfully', buyerId);

      // Send notifications to all parties
      await this.sendOrderNotifications(orderRef.id, 'pending', {
        buyerId,
        sellerId,
        orderNumber,
        verificationCode,
        productName: firstItem.product.title,
        totalAmount: subtotal,
      });

      return orderRef.id;
    });
  }

  // Get order by ID
  static async getOrder(orderId: string): Promise<Order | null> {
    try {
      const orderDoc = await getDoc(doc(db, this.ORDERS_COLLECTION, orderId));
      
      if (!orderDoc.exists()) {
        return null;
      }

      return {
        id: orderDoc.id,
        ...orderDoc.data(),
        createdAt: orderDoc.data().createdAt?.toDate(),
        updatedAt: orderDoc.data().updatedAt?.toDate(),
        estimatedDeliveryTime: orderDoc.data().estimatedDeliveryTime?.toDate(),
        actualDeliveryTime: orderDoc.data().actualDeliveryTime?.toDate(),
      } as Order;
    } catch (error) {
      console.error('Error getting order:', error);
      throw new Error('Failed to get order');
    }
  }

  // Get orders with filtering and pagination
  static async getOrders(options: {
    userId?: string;
    userRole?: 'buyer' | 'seller' | 'rider' | 'admin';
    status?: OrderStatus;
    limit?: number;
    lastDoc?: QueryDocumentSnapshot<DocumentData>;
  } = {}): Promise<{
    orders: Order[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    try {
      let q = query(collection(db, this.ORDERS_COLLECTION));

      // Apply filters based on user role
      if (options.userId && options.userRole) {
        switch (options.userRole) {
          case 'buyer':
            q = query(q, where('buyerId', '==', options.userId));
            break;
          case 'seller':
            q = query(q, where('sellerId', '==', options.userId));
            break;
          case 'rider':
            q = query(q, where('riderId', '==', options.userId));
            break;
          // Admin sees all orders, no additional filter needed
        }
      }

      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      // Add ordering and pagination
      q = query(q, orderBy('createdAt', 'desc'));

      if (options.lastDoc) {
        q = query(q, startAfter(options.lastDoc));
      }

      const limitCount = options.limit || 20;
      q = query(q, limit(limitCount + 1));

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;
      
      const hasMore = docs.length > limitCount;
      const orders = docs.slice(0, limitCount).map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        estimatedDeliveryTime: doc.data().estimatedDeliveryTime?.toDate(),
        actualDeliveryTime: doc.data().actualDeliveryTime?.toDate(),
      })) as Order[];

      return {
        orders,
        lastDoc: hasMore ? docs[docs.length - 2] : null,
        hasMore,
      };
    } catch (error) {
      console.error('Error getting orders:', error);
      throw new Error('Failed to get orders');
    }
  }

  // Update order status
  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    updatedBy: string,
    message?: string,
    riderInfo?: {
      riderId: string;
      name: string;
      phoneNumber: string;
      rating: number;
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      // Add rider info if status is rider_assigned
      if (newStatus === 'rider_assigned' && riderInfo) {
        updateData.riderId = riderInfo.riderId;
        updateData.riderInfo = {
          name: riderInfo.name,
          phoneNumber: riderInfo.phoneNumber,
          rating: riderInfo.rating,
        };
      }

      // Set delivery time if delivered
      if (newStatus === 'delivered') {
        updateData.actualDeliveryTime = serverTimestamp();
      }

      await updateDoc(doc(db, this.ORDERS_COLLECTION, orderId), updateData);

      // Add tracking entry
      await this.addTrackingEntry(
        orderId,
        newStatus,
        message || this.getDefaultStatusMessage(newStatus),
        updatedBy
      );

      // Send notifications
      const order = await this.getOrder(orderId);
      if (order) {
        await this.sendOrderNotifications(orderId, newStatus, {
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          riderId: order.riderId,
          orderNumber: order.orderNumber,
          verificationCode: order.verificationCode,
          productName: order.product.name,
          totalAmount: order.totalAmount,
          riderInfo: riderInfo,
        });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error('Failed to update order status');
    }
  }

  // Add tracking entry
  private static async addTrackingEntry(
    orderId: string,
    status: OrderStatus,
    message: string,
    updatedBy: string,
    location?: { latitude: number; longitude: number }
  ): Promise<void> {
    try {
      await addDoc(collection(db, this.TRACKING_COLLECTION), {
        orderId,
        status,
        message,
        updatedBy,
        location,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding tracking entry:', error);
      throw new Error('Failed to add tracking entry');
    }
  }

  // Get order tracking history
  static async getOrderTracking(orderId: string): Promise<OrderTracking[]> {
    try {
      const q = query(
        collection(db, this.TRACKING_COLLECTION),
        where('orderId', '==', orderId),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as OrderTracking[];
    } catch (error) {
      console.error('Error getting order tracking:', error);
      throw new Error('Failed to get order tracking');
    }
  }

  // Verify order with code
  static async verifyOrderDelivery(
    orderId: string,
    verificationCode: string,
    verifiedBy: string
  ): Promise<boolean> {
    try {
      const order = await this.getOrder(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.verificationCode !== verificationCode) {
        throw new Error('Invalid verification code');
      }

      if (order.status !== 'in_transit') {
        throw new Error('Order is not ready for delivery verification');
      }

      // Update order status to delivered
      await this.updateOrderStatus(
        orderId,
        'delivered',
        verifiedBy,
        'Order delivered and verified'
      );

      return true;
    } catch (error) {
      console.error('Error verifying order delivery:', error);
      throw error;
    }
  }

  // Cancel order
  static async cancelOrder(
    orderId: string,
    cancelledBy: string,
    reason: string
  ): Promise<void> {
    try {
      const order = await this.getOrder(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      if (!['pending', 'payment_verified', 'rider_assigned'].includes(order.status)) {
        throw new Error('Order cannot be cancelled at this stage');
      }

      await runTransaction(db, async (transaction) => {
        // Update order status
        transaction.update(doc(db, this.ORDERS_COLLECTION, orderId), {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });

        // Restore product stock
        await ProductService.updateStock(order.productId, order.quantity, 'add');
      });

      // Add tracking entry
      await this.addTrackingEntry(
        orderId,
        'cancelled',
        `Order cancelled: ${reason}`,
        cancelledBy
      );

      // Send notifications
      await this.sendOrderNotifications(orderId, 'cancelled', {
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        riderId: order.riderId,
        orderNumber: order.orderNumber,
        verificationCode: order.verificationCode,
        productName: order.product.name,
        totalAmount: order.totalAmount,
        cancellationReason: reason,
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Send notifications to all relevant parties
  private static async sendOrderNotifications(
    orderId: string,
    status: OrderStatus,
    data: {
      buyerId: string;
      sellerId: string;
      riderId?: string;
      orderNumber: string;
      verificationCode: string;
      productName: string;
      totalAmount: number;
      riderInfo?: any;
      cancellationReason?: string;
    }
  ): Promise<void> {
    try {
      const notifications = [];

      switch (status) {
        case 'pending':
          // Notify buyer
          notifications.push(
            NotificationService.sendNotification(data.buyerId, {
              title: 'Order Placed Successfully',
              message: `Your order #${data.orderNumber} has been placed. Verification code: ${data.verificationCode}`,
              type: 'order_update',
              data: { orderId, orderNumber: data.orderNumber },
            })
          );

          // Notify seller
          notifications.push(
            NotificationService.sendNotification(data.sellerId, {
              title: 'New Order Received',
              message: `New order #${data.orderNumber} for ${data.productName}. Code: ${data.verificationCode}`,
              type: 'order_update',
              data: { orderId, orderNumber: data.orderNumber },
            })
          );
          break;

        case 'rider_assigned':
          // Notify all parties
          notifications.push(
            NotificationService.sendNotification(data.buyerId, {
              title: 'Rider Assigned',
              message: `${data.riderInfo?.name || 'A rider'} has been assigned to your order #${data.orderNumber}`,
              type: 'delivery_update',
              data: { orderId, orderNumber: data.orderNumber },
            })
          );

          notifications.push(
            NotificationService.sendNotification(data.sellerId, {
              title: 'Rider Coming',
              message: `Rider is coming to pick up order #${data.orderNumber}. Code: ${data.verificationCode}`,
              type: 'delivery_update',
              data: { orderId, orderNumber: data.orderNumber },
            })
          );

          if (data.riderId) {
            notifications.push(
              NotificationService.sendNotification(data.riderId, {
                title: 'New Delivery Assignment',
                message: `You've been assigned order #${data.orderNumber}. Code: ${data.verificationCode}`,
                type: 'delivery_update',
                data: { orderId, orderNumber: data.orderNumber },
              })
            );
          }
          break;

        case 'picked_up':
          notifications.push(
            NotificationService.sendNotification(data.buyerId, {
              title: 'Order Picked Up',
              message: `Your order #${data.orderNumber} has been picked up and is on the way!`,
              type: 'delivery_update',
              data: { orderId, orderNumber: data.orderNumber },
            })
          );
          break;

        case 'delivered':
          notifications.push(
            NotificationService.sendNotification(data.buyerId, {
              title: 'Order Delivered',
              message: `Your order #${data.orderNumber} has been delivered successfully!`,
              type: 'delivery_update',
              data: { orderId, orderNumber: data.orderNumber },
            })
          );

          notifications.push(
            NotificationService.sendNotification(data.sellerId, {
              title: 'Order Completed',
              message: `Order #${data.orderNumber} has been delivered successfully`,
              type: 'order_update',
              data: { orderId, orderNumber: data.orderNumber },
            })
          );
          break;

        case 'cancelled':
          const reason = data.cancellationReason || 'Unknown reason';
          notifications.push(
            NotificationService.sendNotification(data.buyerId, {
              title: 'Order Cancelled',
              message: `Your order #${data.orderNumber} has been cancelled. Reason: ${reason}`,
              type: 'order_update',
              data: { orderId, orderNumber: data.orderNumber },
            })
          );

          notifications.push(
            NotificationService.sendNotification(data.sellerId, {
              title: 'Order Cancelled',
              message: `Order #${data.orderNumber} has been cancelled. Reason: ${reason}`,
              type: 'order_update',
              data: { orderId, orderNumber: data.orderNumber },
            })
          );
          break;
      }

      await Promise.all(notifications);
    } catch (error) {
      console.error('Error sending order notifications:', error);
      // Don't throw error here as it shouldn't break the main order flow
    }
  }

  // Group cart items by seller
  private static groupCartItemsBySeller(items: CartItem[]): Map<string, CartItem[]> {
    const groupedItems = new Map<string, CartItem[]>();

    for (const item of items) {
      const sellerId = item.product.sellerId;
      if (!groupedItems.has(sellerId)) {
        groupedItems.set(sellerId, []);
      }
      groupedItems.get(sellerId)!.push(item);
    }

    return groupedItems;
  }

  // Get default status message
  private static getDefaultStatusMessage(status: OrderStatus): string {
    const messages = {
      pending: 'Order placed and waiting for payment verification',
      payment_verified: 'Payment verified, preparing order',
      rider_assigned: 'Rider assigned for pickup',
      picked_up: 'Order picked up by rider',
      in_transit: 'Order is on the way',
      delivered: 'Order delivered successfully',
      cancelled: 'Order has been cancelled',
      refunded: 'Order refunded',
    };
    
    return messages[status] || 'Order status updated';
  }

  // Get order statistics for admin/analytics
  static async getOrderStatistics(sellerId?: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    try {
      let q = query(collection(db, this.ORDERS_COLLECTION));
      
      if (sellerId) {
        q = query(q, where('sellerId', '==', sellerId));
      }

      const querySnapshot = await getDocs(q);
      const orders = querySnapshot.docs.map(doc => doc.data());

      const stats = {
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => ['pending', 'payment_verified', 'rider_assigned', 'picked_up', 'in_transit'].includes(o.status)).length,
        completedOrders: orders.filter(o => o.status === 'delivered').length,
        cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
        totalRevenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.totalAmount, 0),
        averageOrderValue: 0,
      };

      stats.averageOrderValue = stats.completedOrders > 0 ? stats.totalRevenue / stats.completedOrders : 0;

      return stats;
    } catch (error) {
      console.error('Error getting order statistics:', error);
      throw new Error('Failed to get order statistics');
    }
  }
}
