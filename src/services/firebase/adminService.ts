import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Profile, Order, Product, Conversation } from '../../types';
import { OrderService } from './orderService';
import { ProductService } from './productService';
import { ChatService } from './chatService';
import { ProfileService } from './profileService';

export interface UserManagement {
  id: string;
  email: string;
  role: string;
  profile: Profile;
  isActive: boolean;
  joinedAt: Date;
  lastActive?: Date;
}

export interface PlatformStatistics {
  users: {
    total: number;
    buyers: number;
    sellers: number;
    admins: number;
    active: number;
    newThisMonth: number;
  };
  products: {
    total: number;
    active: number;
    inactive: number;
    lowStock: number;
    newThisMonth: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    revenue: number;
    newThisMonth: number;
  };
  conversations: {
    total: number;
    active: number;
    messagesThisWeek: number;
    averageResponseTime: number;
  };
}

export class AdminService {
  private static USERS_COLLECTION = 'users';
  private static PROFILES_COLLECTION = 'profiles';

  // Get platform statistics
  static async getPlatformStatistics(): Promise<PlatformStatistics> {
    try {
      // Get user statistics (simplified - would need actual user collection)
      const profilesSnapshot = await getDocs(collection(db, this.PROFILES_COLLECTION));
      const profiles = profilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const userStats = {
        total: profiles.length,
        buyers: profiles.filter(p => p.role === 'buyer').length,
        sellers: profiles.filter(p => p.role === 'seller').length,
        admins: profiles.filter(p => p.role === 'admin').length,
        active: profiles.length, // Simplified
        newThisMonth: Math.floor(profiles.length * 0.1), // Simplified
      };

      // Get product statistics
      const { products } = await ProductService.getProducts({ limitCount: 10000 });
      const productStats = {
        total: products.length,
        active: products.filter(p => p.status === 'active').length,
        inactive: products.filter(p => p.status === 'inactive').length,
        lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
        newThisMonth: Math.floor(products.length * 0.15), // Simplified
      };

      // Get order statistics
      const orderStats = await OrderService.getOrderStatistics();
      const orderData = {
        total: orderStats.totalOrders,
        pending: orderStats.pendingOrders,
        completed: orderStats.completedOrders,
        cancelled: orderStats.cancelledOrders,
        revenue: orderStats.totalRevenue,
        newThisMonth: Math.floor(orderStats.totalOrders * 0.2), // Simplified
      };

      // Get conversation statistics
      const conversationStats = await ChatService.getConversationStatistics();

      return {
        users: userStats,
        products: productStats,
        orders: orderData,
        conversations: conversationStats,
      };
    } catch (error) {
      console.error('Error getting platform statistics:', error);
      throw new Error('Failed to get platform statistics');
    }
  }

  // Get users for management
  static async getUsers(options: {
    role?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
    lastDoc?: QueryDocumentSnapshot<DocumentData>;
  } = {}): Promise<{
    users: UserManagement[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    hasMore: boolean;
  }> {
    try {
      let q = query(collection(db, this.PROFILES_COLLECTION));

      // Apply filters
      if (options.role) {
        q = query(q, where('role', '==', options.role));
      }

      // Add ordering
      q = query(q, orderBy('createdAt', 'desc'));

      // Add pagination
      if (options.lastDoc) {
        q = query(q, startAfter(options.lastDoc));
      }

      const limitCount = options.limit || 50;
      q = query(q, limit(limitCount + 1));

      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;
      
      const hasMore = docs.length > limitCount;
      const profiles = docs.slice(0, limitCount);

      let users = profiles.map(doc => ({
        id: doc.id,
        email: doc.data().email || 'N/A',
        role: doc.data().role || 'buyer',
        profile: { id: doc.id, ...doc.data() } as Profile,
        isActive: true, // Simplified - would check last activity
        joinedAt: doc.data().createdAt?.toDate() || new Date(),
        lastActive: doc.data().updatedAt?.toDate(),
      })) as UserManagement[];

      // Apply search filter
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        users = users.filter(user =>
          user.profile.firstName?.toLowerCase().includes(searchTerm) ||
          user.profile.lastName?.toLowerCase().includes(searchTerm) ||
          user.profile.businessName?.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
        );
      }

      return {
        users,
        lastDoc: hasMore ? docs[docs.length - 2] : null,
        hasMore: hasMore && users.length === limitCount,
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error('Failed to get users');
    }
  }

  // Update user status (activate/deactivate)
  static async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, this.PROFILES_COLLECTION, userId), {
        isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      throw new Error('Failed to update user status');
    }
  }

  // Update user role
  static async updateUserRole(userId: string, newRole: 'buyer' | 'seller' | 'admin'): Promise<void> {
    try {
      await updateDoc(doc(db, this.PROFILES_COLLECTION, userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });

      // Also update in users collection if it exists
      try {
        await updateDoc(doc(db, this.USERS_COLLECTION, userId), {
          role: newRole,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.warn('User document not found in users collection');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error('Failed to update user role');
    }
  }

  // Delete user account
  static async deleteUser(userId: string): Promise<void> {
    try {
      // Delete user profile
      await deleteDoc(doc(db, this.PROFILES_COLLECTION, userId));

      // Delete user document if it exists
      try {
        await deleteDoc(doc(db, this.USERS_COLLECTION, userId));
      } catch (error) {
        console.warn('User document not found in users collection');
      }

      // Note: In a production app, you'd also need to:
      // - Delete user's products
      // - Handle ongoing orders
      // - Delete conversations
      // - Remove from Firebase Auth
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Get user details with related data
  static async getUserDetails(userId: string): Promise<{
    user: UserManagement;
    products: Product[];
    orders: Order[];
    conversations: Conversation[];
  }> {
    try {
      // Get user profile
      const profile = await ProfileService.getProfile(userId);
      if (!profile) {
        throw new Error('User not found');
      }

      const user: UserManagement = {
        id: userId,
        email: 'user@example.com', // Would get from auth
        role: profile.role || 'buyer',
        profile,
        isActive: true,
        joinedAt: profile.createdAt,
        lastActive: profile.updatedAt,
      };

      // Get user's products (if seller)
      let products: Product[] = [];
      if (profile.role === 'seller') {
        const { products: userProducts } = await ProductService.getProducts({
          sellerId: userId,
          limitCount: 100,
        });
        products = userProducts;
      }

      // Get user's orders
      const { orders } = await OrderService.getOrders({
        userId,
        userRole: profile.role === 'seller' ? 'seller' : 'buyer',
        limit: 50,
      });

      // Get user's conversations
      const conversations = await ChatService.getUserConversations(userId);

      return {
        user,
        products,
        orders,
        conversations,
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      throw new Error('Failed to get user details');
    }
  }

  // Verify seller account
  static async verifySeller(sellerId: string): Promise<void> {
    try {
      await ProfileService.updateVerification(sellerId, true);
    } catch (error) {
      console.error('Error verifying seller:', error);
      throw new Error('Failed to verify seller');
    }
  }

  // Get pending verification requests
  static async getPendingVerifications(): Promise<Profile[]> {
    try {
      const q = query(
        collection(db, this.PROFILES_COLLECTION),
        where('role', '==', 'seller'),
        where('isVerified', '==', false),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Profile[];
    } catch (error) {
      console.error('Error getting pending verifications:', error);
      throw new Error('Failed to get pending verifications');
    }
  }

  // Suspend/unsuspend product
  static async updateProductStatus(productId: string, status: 'active' | 'inactive'): Promise<void> {
    try {
      await ProductService.updateProduct(productId, { status });
    } catch (error) {
      console.error('Error updating product status:', error);
      throw new Error('Failed to update product status');
    }
  }

  // Get reported content (simplified)
  static async getReportedContent(): Promise<{
    products: Product[];
    users: Profile[];
    conversations: Conversation[];
  }> {
    try {
      // This is simplified - in a real app you'd have a reports collection
      // For now, return recent inactive products and unverified sellers
      const { products } = await ProductService.getProducts({
        limitCount: 20,
      });

      const reportedProducts = products.filter(p => p.status === 'inactive').slice(0, 10);

      const unverifiedSellers = await this.getPendingVerifications();

      const conversations = await ChatService.getUserConversations('admin'); // Simplified

      return {
        products: reportedProducts,
        users: unverifiedSellers,
        conversations: conversations.slice(0, 10),
      };
    } catch (error) {
      console.error('Error getting reported content:', error);
      throw new Error('Failed to get reported content');
    }
  }

  // Send system notification to all users
  static async sendSystemNotification(
    title: string,
    message: string,
    targetRole?: 'buyer' | 'seller' | 'admin'
  ): Promise<void> {
    try {
      const { users } = await this.getUsers({
        role: targetRole,
        limit: 1000,
      });

      // Send notification to each user (simplified)
      const notificationPromises = users.map(user =>
        // NotificationService.sendNotification(user.id, {
        //   title,
        //   message,
        //   type: 'promotion',
        // })
        Promise.resolve() // Placeholder
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error sending system notification:', error);
      throw new Error('Failed to send system notification');
    }
  }

  // Get system health metrics
  static async getSystemHealth(): Promise<{
    uptime: number;
    activeUsers: number;
    errorRate: number;
    averageResponseTime: number;
    databaseHealth: 'good' | 'warning' | 'critical';
    storageUsage: number;
  }> {
    try {
      // Simplified system health metrics
      return {
        uptime: 99.9,
        activeUsers: 245,
        errorRate: 0.1,
        averageResponseTime: 145,
        databaseHealth: 'good',
        storageUsage: 65.4,
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      throw new Error('Failed to get system health');
    }
  }

  // Export platform data (simplified)
  static async exportPlatformData(
    dataType: 'users' | 'orders' | 'products' | 'all',
    format: 'csv' | 'json' = 'json'
  ): Promise<string> {
    try {
      let data: any = {};

      switch (dataType) {
        case 'users':
          const { users } = await this.getUsers({ limit: 10000 });
          data = users;
          break;
        case 'orders':
          const { orders } = await OrderService.getOrders({ limit: 10000 });
          data = orders;
          break;
        case 'products':
          const { products } = await ProductService.getProducts({ limitCount: 10000 });
          data = products;
          break;
        case 'all':
          const [usersData, ordersData, productsData] = await Promise.all([
            this.getUsers({ limit: 10000 }),
            OrderService.getOrders({ limit: 10000 }),
            ProductService.getProducts({ limitCount: 10000 }),
          ]);
          data = {
            users: usersData.users,
            orders: ordersData.orders,
            products: productsData.products,
          };
          break;
      }

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else {
        // CSV conversion would be implemented here
        return 'CSV export not implemented';
      }
    } catch (error) {
      console.error('Error exporting platform data:', error);
      throw new Error('Failed to export platform data');
    }
  }

  // Get recent activity logs (simplified)
  static async getActivityLogs(limit: number = 50): Promise<Array<{
    id: string;
    action: string;
    userId: string;
    userName: string;
    timestamp: Date;
    details: string;
  }>> {
    try {
      // This is simplified - in a real app you'd have an activity logs collection
      const { orders } = await OrderService.getOrders({ limit: 20 });
      
      return orders.map((order, index) => ({
        id: `log_${index}`,
        action: 'Order Placed',
        userId: order.buyerId,
        userName: order.deliveryInfo.recipientName,
        timestamp: order.createdAt,
        details: `Order #${order.orderNumber} for ₦${order.totalAmount.toLocaleString()}`,
      }));
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw new Error('Failed to get activity logs');
    }
  }
}
