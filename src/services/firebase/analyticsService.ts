import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAt,
  endAt,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { OrderService } from './orderService';
import { ProductService } from './productService';
import { ChatService } from './chatService';

export interface SellerAnalytics {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  revenueData: {
    daily: Array<{ date: string; revenue: number; orders: number }>;
    monthly: Array<{ month: string; revenue: number; orders: number }>;
  };
  productPerformance: {
    topProducts: Array<{
      id: string;
      title: string;
      revenue: number;
      orders: number;
      views: number;
      image: string;
    }>;
    lowStockProducts: Array<{
      id: string;
      title: string;
      stock: number;
      image: string;
    }>;
  };
  orderAnalytics: {
    statusBreakdown: Record<string, number>;
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      customerName: string;
      amount: number;
      status: string;
      date: Date;
    }>;
  };
  customerInsights: {
    totalCustomers: number;
    repeatCustomers: number;
    averageOrdersPerCustomer: number;
    topCustomers: Array<{
      id: string;
      name: string;
      totalOrders: number;
      totalSpent: number;
    }>;
  };
}

export interface AdminAnalytics {
  platformOverview: {
    totalUsers: number;
    totalSellers: number;
    totalBuyers: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  growthMetrics: {
    userGrowth: Array<{ date: string; users: number }>;
    orderGrowth: Array<{ date: string; orders: number }>;
    revenueGrowth: Array<{ date: string; revenue: number }>;
  };
  topPerformers: {
    topSellers: Array<{
      id: string;
      name: string;
      revenue: number;
      orders: number;
    }>;
    topProducts: Array<{
      id: string;
      title: string;
      seller: string;
      revenue: number;
      orders: number;
    }>;
    topCategories: Array<{
      category: string;
      products: number;
      orders: number;
      revenue: number;
    }>;
  };
  systemHealth: {
    activeConversations: number;
    messagesLastWeek: number;
    averageResponseTime: number;
    supportTickets: number;
  };
}

export class AnalyticsService {
  // Get seller analytics
  static async getSellerAnalytics(sellerId: string): Promise<SellerAnalytics> {
    try {
      // Get seller's orders
      const { orders } = await OrderService.getOrders({
        userId: sellerId,
        userRole: 'seller',
        limit: 1000,
      });

      // Get seller's products with analytics
      const { products, analytics: productAnalytics } = 
        await ProductService.getSellerProductsWithAnalytics(sellerId);

      // Calculate overview metrics
      const completedOrders = orders.filter(order => order.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

      // Calculate conversion rate (simplified - orders vs product views)
      const totalViews = products.reduce((sum, product) => sum + (product.views || 0), 0);
      const conversionRate = totalViews > 0 ? (completedOrders.length / totalViews) * 100 : 0;

      // Generate revenue data for the last 30 days
      const dailyRevenue = this.generateDailyRevenueData(completedOrders, 30);
      const monthlyRevenue = this.generateMonthlyRevenueData(completedOrders, 12);

      // Get top performing products
      const topProducts = products
        .map(product => ({
          id: product.id,
          title: product.title,
          revenue: (product.orders || 0) * product.price,
          orders: product.orders || 0,
          views: product.views || 0,
          image: product.images[0] || '',
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get low stock products
      const lowStockProducts = products
        .filter(product => product.stock > 0 && product.stock <= 10)
        .map(product => ({
          id: product.id,
          title: product.title,
          stock: product.stock,
          image: product.images[0] || '',
        }))
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 10);

      // Order status breakdown
      const statusBreakdown = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Recent orders
      const recentOrders = orders
        .slice(0, 10)
        .map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.deliveryInfo.recipientName,
          amount: order.totalAmount,
          status: order.status,
          date: order.createdAt,
        }));

      // Customer insights (simplified)
      const customerIds = [...new Set(orders.map(order => order.buyerId))];
      const customerOrders = customerIds.map(customerId => {
        const customerOrdersList = orders.filter(order => order.buyerId === customerId);
        return {
          id: customerId,
          orders: customerOrdersList,
          totalSpent: customerOrdersList
            .filter(order => order.status === 'delivered')
            .reduce((sum, order) => sum + order.totalAmount, 0),
        };
      });

      const repeatCustomers = customerOrders.filter(customer => customer.orders.length > 1);
      const averageOrdersPerCustomer = customerIds.length > 0 ? orders.length / customerIds.length : 0;

      const topCustomers = customerOrders
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5)
        .map(customer => ({
          id: customer.id,
          name: customer.orders[0]?.deliveryInfo.recipientName || 'Unknown',
          totalOrders: customer.orders.length,
          totalSpent: customer.totalSpent,
        }));

      return {
        overview: {
          totalRevenue,
          totalOrders: orders.length,
          totalProducts: products.length,
          averageOrderValue: Math.round(averageOrderValue),
          conversionRate: Math.round(conversionRate * 100) / 100,
        },
        revenueData: {
          daily: dailyRevenue,
          monthly: monthlyRevenue,
        },
        productPerformance: {
          topProducts,
          lowStockProducts,
        },
        orderAnalytics: {
          statusBreakdown,
          recentOrders,
        },
        customerInsights: {
          totalCustomers: customerIds.length,
          repeatCustomers: repeatCustomers.length,
          averageOrdersPerCustomer: Math.round(averageOrdersPerCustomer * 100) / 100,
          topCustomers,
        },
      };
    } catch (error) {
      console.error('Error getting seller analytics:', error);
      throw new Error('Failed to get seller analytics');
    }
  }

  // Get admin analytics
  static async getAdminAnalytics(): Promise<AdminAnalytics> {
    try {
      // Get all orders for platform analytics
      const { orders } = await OrderService.getOrders({ limit: 10000 });
      
      // Get platform statistics
      const orderStats = await OrderService.getOrderStatistics();
      
      // Get conversation statistics
      const chatStats = await ChatService.getConversationStatistics();

      // Calculate growth metrics (simplified)
      const userGrowth = this.generateGrowthData('users', 30);
      const orderGrowth = this.generateDailyOrderGrowth(orders, 30);
      const revenueGrowth = this.generateDailyRevenueGrowth(orders, 30);

      // Platform overview
      const completedOrders = orders.filter(order => order.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      // Top performers (simplified - would need more complex queries in production)
      const topSellers = this.calculateTopSellers(orders).slice(0, 5);
      const topProducts = this.calculateTopProducts(orders).slice(0, 5);
      const topCategories = this.calculateTopCategories().slice(0, 5);

      return {
        platformOverview: {
          totalUsers: 1000, // Would be calculated from users collection
          totalSellers: 150, // Would be calculated from profiles with role=seller
          totalBuyers: 850, // Would be calculated from profiles with role=buyer
          totalProducts: 500, // Would be calculated from products collection
          totalOrders: orders.length,
          totalRevenue,
          averageOrderValue: Math.round(orderStats.averageOrderValue),
        },
        growthMetrics: {
          userGrowth,
          orderGrowth,
          revenueGrowth,
        },
        topPerformers: {
          topSellers,
          topProducts,
          topCategories,
        },
        systemHealth: {
          activeConversations: chatStats.activeConversations,
          messagesLastWeek: chatStats.messagesLastWeek,
          averageResponseTime: 45, // Would be calculated from message timestamps
          supportTickets: 12, // Would come from support system
        },
      };
    } catch (error) {
      console.error('Error getting admin analytics:', error);
      throw new Error('Failed to get admin analytics');
    }
  }

  // Helper method to generate daily revenue data
  private static generateDailyRevenueData(
    orders: any[],
    days: number
  ): Array<{ date: string; revenue: number; orders: number }> {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === dateString && order.status === 'delivered';
      });

      const revenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      data.push({
        date: dateString,
        revenue,
        orders: dayOrders.length,
      });
    }

    return data;
  }

  // Helper method to generate monthly revenue data
  private static generateMonthlyRevenueData(
    orders: any[],
    months: number
  ): Array<{ month: string; revenue: number; orders: number }> {
    const data = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthString = date.toISOString().slice(0, 7); // YYYY-MM format

      const monthOrders = orders.filter(order => {
        const orderMonth = new Date(order.createdAt).toISOString().slice(0, 7);
        return orderMonth === monthString && order.status === 'delivered';
      });

      const revenue = monthOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      data.push({
        month: monthString,
        revenue,
        orders: monthOrders.length,
      });
    }

    return data;
  }

  // Helper methods for admin analytics
  private static generateGrowthData(type: string, days: number) {
    // Simplified - would query actual user registration data
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        users: Math.floor(Math.random() * 20) + 5, // Mock data
      });
    }

    return data;
  }

  private static generateDailyOrderGrowth(orders: any[], days: number) {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === dateString;
      });

      data.push({
        date: dateString,
        orders: dayOrders.length,
      });
    }

    return data;
  }

  private static generateDailyRevenueGrowth(orders: any[], days: number) {
    const data = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === dateString && order.status === 'delivered';
      });

      const revenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

      data.push({
        date: dateString,
        revenue,
      });
    }

    return data;
  }

  private static calculateTopSellers(orders: any[]) {
    const sellerStats = orders
      .filter(order => order.status === 'delivered')
      .reduce((acc, order) => {
        if (!acc[order.sellerId]) {
          acc[order.sellerId] = {
            id: order.sellerId,
            name: `Seller ${order.sellerId.substring(0, 8)}`, // Would get actual name from profiles
            revenue: 0,
            orders: 0,
          };
        }
        acc[order.sellerId].revenue += order.totalAmount;
        acc[order.sellerId].orders += 1;
        return acc;
      }, {} as any);

    return Object.values(sellerStats).sort((a: any, b: any) => b.revenue - a.revenue);
  }

  private static calculateTopProducts(orders: any[]) {
    const productStats = orders
      .filter(order => order.status === 'delivered')
      .reduce((acc, order) => {
        if (!acc[order.productId]) {
          acc[order.productId] = {
            id: order.productId,
            title: order.product.name,
            seller: `Seller ${order.sellerId.substring(0, 8)}`,
            revenue: 0,
            orders: 0,
          };
        }
        acc[order.productId].revenue += order.totalAmount;
        acc[order.productId].orders += 1;
        return acc;
      }, {} as any);

    return Object.values(productStats).sort((a: any, b: any) => b.revenue - a.revenue);
  }

  private static calculateTopCategories() {
    // Simplified mock data - would query products collection
    return [
      { category: 'Electronics', products: 45, orders: 123, revenue: 456000 },
      { category: 'Fashion', products: 78, orders: 98, revenue: 234000 },
      { category: 'Food & Agriculture', products: 34, orders: 67, revenue: 123000 },
      { category: 'Home & Garden', products: 23, orders: 45, revenue: 89000 },
      { category: 'Beauty & Health', products: 56, orders: 34, revenue: 67000 },
    ];
  }
}
