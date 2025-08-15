import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, ROUTES } from '../constants';
import { UserRole } from '../types';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Loading Component
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// Create navigators
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Loading Screen Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Placeholder screens (we'll create these later)
const HomeScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="home" size={64} color={COLORS.primary} />
    <Text style={styles.placeholderText}>Home Screen</Text>
  </View>
);

const MarketplaceScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="storefront" size={64} color={COLORS.primary} />
    <Text style={styles.placeholderText}>Marketplace Screen</Text>
  </View>
);

const OrdersScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="receipt" size={64} color={COLORS.primary} />
    <Text style={styles.placeholderText}>Orders Screen</Text>
  </View>
);

const MessagesScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="chatbubbles" size={64} color={COLORS.primary} />
    <Text style={styles.placeholderText}>Messages Screen</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="person" size={64} color={COLORS.primary} />
    <Text style={styles.placeholderText}>Profile Screen</Text>
  </View>
);

const SellerDashboardScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="bar-chart" size={64} color={COLORS.primary} />
    <Text style={styles.placeholderText}>Seller Dashboard</Text>
  </View>
);

const AdminDashboardScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="settings" size={64} color={COLORS.primary} />
    <Text style={styles.placeholderText}>Admin Dashboard</Text>
  </View>
);

// Auth Navigator
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
    <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
    <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

// Buyer Tab Navigator
const BuyerTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === ROUTES.HOME) {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === ROUTES.MARKETPLACE) {
          iconName = focused ? 'storefront' : 'storefront-outline';
        } else if (route.name === ROUTES.ORDERS) {
          iconName = focused ? 'receipt' : 'receipt-outline';
        } else if (route.name === ROUTES.MESSAGES) {
          iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        } else if (route.name === ROUTES.PROFILE) {
          iconName = focused ? 'person' : 'person-outline';
        } else {
          iconName = 'circle';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: {
        backgroundColor: COLORS.white,
        borderTopColor: COLORS.borderLight,
        paddingTop: 8,
        paddingBottom: 8,
        height: 80,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name={ROUTES.HOME} 
      component={HomeScreen}
      options={{ tabBarLabel: 'Home' }}
    />
    <Tab.Screen 
      name={ROUTES.MARKETPLACE} 
      component={MarketplaceScreen}
      options={{ tabBarLabel: 'Marketplace' }}
    />
    <Tab.Screen 
      name={ROUTES.ORDERS} 
      component={OrdersScreen}
      options={{ tabBarLabel: 'Orders' }}
    />
    <Tab.Screen 
      name={ROUTES.MESSAGES} 
      component={MessagesScreen}
      options={{ tabBarLabel: 'Messages' }}
    />
    <Tab.Screen 
      name={ROUTES.PROFILE} 
      component={ProfileScreen}
      options={{ tabBarLabel: 'Profile' }}
    />
  </Tab.Navigator>
);

// Seller Tab Navigator
const SellerTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === ROUTES.SELLER_DASHBOARD) {
          iconName = focused ? 'bar-chart' : 'bar-chart-outline';
        } else if (route.name === ROUTES.MARKETPLACE) {
          iconName = focused ? 'storefront' : 'storefront-outline';
        } else if (route.name === ROUTES.ORDERS) {
          iconName = focused ? 'receipt' : 'receipt-outline';
        } else if (route.name === ROUTES.MESSAGES) {
          iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        } else if (route.name === ROUTES.PROFILE) {
          iconName = focused ? 'person' : 'person-outline';
        } else {
          iconName = 'circle';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: {
        backgroundColor: COLORS.white,
        borderTopColor: COLORS.borderLight,
        paddingTop: 8,
        paddingBottom: 8,
        height: 80,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name={ROUTES.SELLER_DASHBOARD} 
      component={SellerDashboardScreen}
      options={{ tabBarLabel: 'Dashboard' }}
    />
    <Tab.Screen 
      name={ROUTES.MARKETPLACE} 
      component={MarketplaceScreen}
      options={{ tabBarLabel: 'Marketplace' }}
    />
    <Tab.Screen 
      name={ROUTES.ORDERS} 
      component={OrdersScreen}
      options={{ tabBarLabel: 'Orders' }}
    />
    <Tab.Screen 
      name={ROUTES.MESSAGES} 
      component={MessagesScreen}
      options={{ tabBarLabel: 'Messages' }}
    />
    <Tab.Screen 
      name={ROUTES.PROFILE} 
      component={ProfileScreen}
      options={{ tabBarLabel: 'Profile' }}
    />
  </Tab.Navigator>
);

// Admin Tab Navigator
const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === ROUTES.ADMIN_DASHBOARD) {
          iconName = focused ? 'settings' : 'settings-outline';
        } else if (route.name === ROUTES.ADMIN_ORDERS) {
          iconName = focused ? 'receipt' : 'receipt-outline';
        } else if (route.name === ROUTES.ADMIN_USERS) {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === ROUTES.ADMIN_ANALYTICS) {
          iconName = focused ? 'analytics' : 'analytics-outline';
        } else if (route.name === ROUTES.PROFILE) {
          iconName = focused ? 'person' : 'person-outline';
        } else {
          iconName = 'circle';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: {
        backgroundColor: COLORS.white,
        borderTopColor: COLORS.borderLight,
        paddingTop: 8,
        paddingBottom: 8,
        height: 80,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen 
      name={ROUTES.ADMIN_DASHBOARD} 
      component={AdminDashboardScreen}
      options={{ tabBarLabel: 'Dashboard' }}
    />
    <Tab.Screen 
      name={ROUTES.ADMIN_ORDERS} 
      component={OrdersScreen}
      options={{ tabBarLabel: 'Orders' }}
    />
    <Tab.Screen 
      name={ROUTES.ADMIN_USERS} 
      component={ProfileScreen}
      options={{ tabBarLabel: 'Users' }}
    />
    <Tab.Screen 
      name={ROUTES.ADMIN_ANALYTICS} 
      component={ProfileScreen}
      options={{ tabBarLabel: 'Analytics' }}
    />
    <Tab.Screen 
      name={ROUTES.PROFILE} 
      component={ProfileScreen}
      options={{ tabBarLabel: 'Profile' }}
    />
  </Tab.Navigator>
);

// Main App Navigator
const MainAppNavigator = ({ userRole }: { userRole: UserRole }) => {
  switch (userRole) {
    case 'buyer':
      return <BuyerTabNavigator />;
    case 'seller':
      return <SellerTabNavigator />;
    case 'admin':
      return <AdminTabNavigator />;
    default:
      return <BuyerTabNavigator />;
  }
};

// Root App Navigator
export const AppNavigator = () => {
  const { isAuthenticated, loading, userRole } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated && userRole ? (
        <MainAppNavigator userRole={userRole} />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
});

export default AppNavigator;
