import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '../../contexts/AuthContext';
import { AnalyticsService, SellerAnalytics } from '../../services/firebase/analyticsService';
import { COLORS, FONTS } from '../../constants';

interface SellerDashboardScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');
const chartConfig = {
  backgroundColor: COLORS.primary,
  backgroundGradientFrom: COLORS.primary,
  backgroundGradientTo: COLORS.primaryDark,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: COLORS.primary,
  },
};

const SellerDashboardScreen: React.FC<SellerDashboardScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChart, setSelectedChart] = useState<'revenue' | 'orders'>('revenue');

  useEffect(() => {
    loadAnalytics();
  }, [user?.uid]);

  const loadAnalytics = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const data = await AnalyticsService.getSellerAnalytics(user.uid);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const renderOverviewCards = () => {
    if (!analytics) return null;

    const cards = [
      {
        title: 'Total Revenue',
        value: `₦${analytics.overview.totalRevenue.toLocaleString()}`,
        icon: 'trending-up',
        color: COLORS.success,
        bgColor: COLORS.successLight,
      },
      {
        title: 'Total Orders',
        value: analytics.overview.totalOrders.toString(),
        icon: 'receipt',
        color: COLORS.primary,
        bgColor: COLORS.primaryLight,
      },
      {
        title: 'Products',
        value: analytics.overview.totalProducts.toString(),
        icon: 'cube',
        color: COLORS.info,
        bgColor: COLORS.backgroundLight,
      },
      {
        title: 'Avg Order Value',
        value: `₦${analytics.overview.averageOrderValue.toLocaleString()}`,
        icon: 'calculator',
        color: COLORS.warning,
        bgColor: COLORS.warningLight,
      },
    ];

    return (
      <View style={styles.overviewContainer}>
        {cards.map((card, index) => (
          <View key={index} style={styles.overviewCard}>
            <View style={[styles.overviewIconContainer, { backgroundColor: card.bgColor }]}>
              <Ionicons name={card.icon as any} size={24} color={card.color} />
            </View>
            <Text style={styles.overviewValue}>{card.value}</Text>
            <Text style={styles.overviewTitle}>{card.title}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderRevenueChart = () => {
    if (!analytics?.revenueData.daily.length) return null;

    const chartData = {
      labels: analytics.revenueData.daily.slice(-7).map(item => {
        const date = new Date(item.date);
        return date.getDate().toString();
      }),
      datasets: [{
        data: analytics.revenueData.daily.slice(-7).map(item => 
          selectedChart === 'revenue' ? item.revenue : item.orders
        ),
      }],
    };

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Last 7 Days</Text>
          <View style={styles.chartToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, selectedChart === 'revenue' && styles.toggleButtonActive]}
              onPress={() => setSelectedChart('revenue')}
            >
              <Text style={[
                styles.toggleButtonText,
                selectedChart === 'revenue' && styles.toggleButtonTextActive
              ]}>
                Revenue
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, selectedChart === 'orders' && styles.toggleButtonActive]}
              onPress={() => setSelectedChart('orders')}
            >
              <Text style={[
                styles.toggleButtonText,
                selectedChart === 'orders' && styles.toggleButtonTextActive
              ]}>
                Orders
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <LineChart
          data={chartData}
          width={width - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
        />
      </View>
    );
  };

  const renderTopProducts = () => {
    if (!analytics?.productPerformance.topProducts.length) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Performing Products</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyProducts')}>
            <Text style={styles.viewAllButton}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {analytics.productPerformance.topProducts.map((product, index) => (
          <View key={product.id} style={styles.productItem}>
            <Text style={styles.productRank}>#{index + 1}</Text>
            <Image
              source={{ uri: product.image || 'https://via.placeholder.com/50x50' }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {product.title}
              </Text>
              <View style={styles.productStats}>
                <Text style={styles.productStat}>
                  ₦{product.revenue.toLocaleString()}
                </Text>
                <Text style={styles.productStatLabel}>
                  • {product.orders} orders • {product.views} views
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderRecentOrders = () => {
    if (!analytics?.orderAnalytics.recentOrders.length) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.viewAllButton}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {analytics.orderAnalytics.recentOrders.slice(0, 5).map((order) => (
          <View key={order.id} style={styles.orderItem}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
              <Text style={styles.orderCustomer}>{order.customerName}</Text>
            </View>
            <View style={styles.orderDetails}>
              <Text style={styles.orderAmount}>
                ₦{order.amount.toLocaleString()}
              </Text>
              <View style={[
                styles.orderStatus,
                { backgroundColor: getStatusColor(order.status) }
              ]}>
                <Text style={styles.orderStatusText}>
                  {order.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Ionicons name="add-circle" size={32} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Add Product</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('MyProducts')}
        >
          <Ionicons name="cube" size={32} color={COLORS.success} />
          <Text style={styles.quickActionText}>My Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Orders')}
        >
          <Ionicons name="receipt" size={32} color={COLORS.warning} />
          <Text style={styles.quickActionText}>Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Messages')}
        >
          <Ionicons name="chatbubbles" size={32} color={COLORS.info} />
          <Text style={styles.quickActionText}>Messages</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return COLORS.success;
      case 'cancelled': return COLORS.error;
      case 'pending': return COLORS.warning;
      default: return COLORS.info;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-circle" size={32} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {renderOverviewCards()}
      {renderRevenueChart()}
      {renderTopProducts()}
      {renderRecentOrders()}
      {renderQuickActions()}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return COLORS.success;
    case 'cancelled': return COLORS.error;
    case 'pending': return COLORS.warning;
    default: return COLORS.info;
  }
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
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
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
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: (width - 48) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  overviewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  overviewValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  overviewTitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  chartContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  chartToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  toggleButtonTextActive: {
    color: COLORS.white,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  viewAllButton: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  productRank: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    width: 24,
    marginRight: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  productStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productStat: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.success,
  },
  productStatLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.success,
    marginBottom: 4,
  },
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 16,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default SellerDashboardScreen;
