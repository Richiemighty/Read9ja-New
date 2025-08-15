import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { AdminService, PlatformStatistics } from '../../services/firebase/adminService';
import { AnalyticsService, AdminAnalytics } from '../../services/firebase/analyticsService';
import { COLORS, FONTS } from '../../constants';

interface AdminDashboardScreenProps {
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
  style: { borderRadius: 16 },
};

const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ navigation }) => {
  const [platformStats, setPlatformStats] = useState<PlatformStatistics | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'orders' | 'revenue'>('revenue');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, analyticsData] = await Promise.all([
        AdminService.getPlatformStatistics(),
        AnalyticsService.getAdminAnalytics(),
      ]);
      
      setPlatformStats(stats);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderOverviewCards = () => {
    if (!platformStats) return null;

    const cards = [
      {
        title: 'Total Users',
        value: platformStats.users.total.toString(),
        change: `+${platformStats.users.newThisMonth}`,
        icon: 'people',
        color: COLORS.primary,
        bgColor: COLORS.primaryLight,
      },
      {
        title: 'Total Orders',
        value: platformStats.orders.total.toString(),
        change: `+${platformStats.orders.newThisMonth}`,
        icon: 'receipt',
        color: COLORS.success,
        bgColor: COLORS.successLight,
      },
      {
        title: 'Revenue',
        value: `₦${(platformStats.orders.revenue / 1000000).toFixed(1)}M`,
        change: '+12.5%',
        icon: 'trending-up',
        color: COLORS.warning,
        bgColor: COLORS.warningLight,
      },
      {
        title: 'Active Products',
        value: platformStats.products.active.toString(),
        change: `+${platformStats.products.newThisMonth}`,
        icon: 'cube',
        color: COLORS.info,
        bgColor: COLORS.backgroundLight,
      },
    ];

    return (
      <View style={styles.overviewContainer}>
        {cards.map((card, index) => (
          <View key={index} style={styles.overviewCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: card.bgColor }]}>
                <Ionicons name={card.icon as any} size={24} color={card.color} />
              </View>
              <Text style={styles.changeText}>
                {card.change}
              </Text>
            </View>
            <Text style={styles.cardValue}>{card.value}</Text>
            <Text style={styles.cardTitle}>{card.title}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderGrowthChart = () => {
    if (!analytics?.growthMetrics) return null;

    let chartData;
    switch (selectedMetric) {
      case 'users':
        chartData = {
          labels: analytics.growthMetrics.userGrowth.slice(-7).map(item => 
            new Date(item.date).getDate().toString()
          ),
          datasets: [{
            data: analytics.growthMetrics.userGrowth.slice(-7).map(item => item.users),
          }],
        };
        break;
      case 'orders':
        chartData = {
          labels: analytics.growthMetrics.orderGrowth.slice(-7).map(item => 
            new Date(item.date).getDate().toString()
          ),
          datasets: [{
            data: analytics.growthMetrics.orderGrowth.slice(-7).map(item => item.orders),
          }],
        };
        break;
      case 'revenue':
        chartData = {
          labels: analytics.growthMetrics.revenueGrowth.slice(-7).map(item => 
            new Date(item.date).getDate().toString()
          ),
          datasets: [{
            data: analytics.growthMetrics.revenueGrowth.slice(-7).map(item => 
              Math.round(item.revenue / 1000)
            ),
          }],
        };
        break;
    }

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Growth Metrics (Last 7 Days)</Text>
          <View style={styles.metricToggle}>
            {(['users', 'orders', 'revenue'] as const).map((metric) => (
              <TouchableOpacity
                key={metric}
                style={[
                  styles.metricButton,
                  selectedMetric === metric && styles.metricButtonActive
                ]}
                onPress={() => setSelectedMetric(metric)}
              >
                <Text style={[
                  styles.metricButtonText,
                  selectedMetric === metric && styles.metricButtonTextActive
                ]}>
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
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

  const renderUserDistribution = () => {
    if (!platformStats) return null;

    const pieData = [
      {
        name: 'Buyers',
        population: platformStats.users.buyers,
        color: COLORS.primary,
        legendFontColor: COLORS.text,
        legendFontSize: 12,
      },
      {
        name: 'Sellers',
        population: platformStats.users.sellers,
        color: COLORS.success,
        legendFontColor: COLORS.text,
        legendFontSize: 12,
      },
      {
        name: 'Admins',
        population: platformStats.users.admins,
        color: COLORS.warning,
        legendFontColor: COLORS.text,
        legendFontSize: 12,
      },
    ];

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>User Distribution</Text>
        <PieChart
          data={pieData}
          width={width - 32}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
        />
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('UserManagement')}
        >
          <Ionicons name="people" size={32} color={COLORS.primary} />
          <Text style={styles.quickActionTitle}>User Management</Text>
          <Text style={styles.quickActionSubtitle}>Manage users & roles</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('Orders', { userRole: 'admin' })}
        >
          <Ionicons name="receipt" size={32} color={COLORS.success} />
          <Text style={styles.quickActionTitle}>Order Management</Text>
          <Text style={styles.quickActionSubtitle}>Track all orders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('ProductModeration')}
        >
          <Ionicons name="cube" size={32} color={COLORS.warning} />
          <Text style={styles.quickActionTitle}>Product Review</Text>
          <Text style={styles.quickActionSubtitle}>Moderate products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate('Analytics')}
        >
          <Ionicons name="analytics" size={32} color={COLORS.info} />
          <Text style={styles.quickActionTitle}>Analytics</Text>
          <Text style={styles.quickActionSubtitle}>Detailed insights</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRecentActivity = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ActivityLogs')}>
          <Text style={styles.viewAllButton}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {/* Sample activity items */}
      {[1, 2, 3, 4, 5].map((item, index) => (
        <View key={index} style={styles.activityItem}>
          <View style={styles.activityIcon}>
            <Ionicons name="person-add" size={16} color={COLORS.primary} />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>New user registered</Text>
            <Text style={styles.activityTime}>John Doe joined as a buyer</Text>
            <Text style={styles.activityTimestamp}>2 minutes ago</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSystemHealth = () => {
    if (!analytics?.systemHealth) return null;

    const healthItems = [
      {
        label: 'Active Conversations',
        value: analytics.systemHealth.activeConversations.toString(),
        status: 'good',
      },
      {
        label: 'Messages This Week',
        value: analytics.systemHealth.messagesLastWeek.toString(),
        status: 'good',
      },
      {
        label: 'Avg Response Time',
        value: `${analytics.systemHealth.averageResponseTime}ms`,
        status: 'good',
      },
      {
        label: 'Support Tickets',
        value: analytics.systemHealth.supportTickets.toString(),
        status: 'warning',
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Health</Text>
        <View style={styles.healthGrid}>
          {healthItems.map((item, index) => (
            <View key={index} style={styles.healthItem}>
              <View style={styles.healthIndicator}>
                <View style={[
                  styles.healthDot,
                  { backgroundColor: item.status === 'good' ? COLORS.success : COLORS.warning }
                ]} />
              </View>
              <Text style={styles.healthValue}>{item.value}</Text>
              <Text style={styles.healthLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
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
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="settings" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {renderOverviewCards()}
      {renderGrowthChart()}
      {renderUserDistribution()}
      {renderQuickActions()}
      {renderSystemHealth()}
      {renderRecentActivity()}

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.success,
  },
  cardValue: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  cardTitle: {
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
  metricToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    padding: 4,
  },
  metricButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  metricButtonActive: {
    backgroundColor: COLORS.primary,
  },
  metricButtonText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  metricButtonTextActive: {
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 64) / 2,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  healthItem: {
    width: (width - 64) / 2,
    alignItems: 'center',
    marginBottom: 16,
  },
  healthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  healthLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  activityTimestamp: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  bottomSpacer: {
    height: 32,
  },
});

export default AdminDashboardScreen;
