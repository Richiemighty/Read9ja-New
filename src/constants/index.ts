import { ProductCategory } from '../types';

// App Configuration
export const APP_CONFIG = {
  name: 'Ready9ja Marketplace',
  version: '1.0.0',
  currency: {
    default: 'NGN',
    supported: ['NGN', 'USD']
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },
  referral: {
    bonusAmount: 1000, // NGN
    minimumWithdrawal: 5000 // NGN
  },
  delivery: {
    freeDeliveryThreshold: 10000, // NGN
    standardDeliveryFee: 500, // NGN
    expressDeliveryFee: 1000 // NGN
  }
};

// Colors
export const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#8b5cf6',
  secondary: '#10b981',
  accent: '#f59e0b',
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',
  white: '#ffffff',
  black: '#000000',
  // Light variants
  successLight: '#d1fae5',
  warningLight: '#fef3c7',
  errorLight: '#fecaca',
  primaryLight: '#e0e7ff',
  backgroundLight: '#f8fafc',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

// Typography
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  light: 'System',
};

// Product Categories with display info
export const PRODUCT_CATEGORIES: Record<ProductCategory, {
  label: string;
  icon: string;
  color: string;
}> = {
  'food-agriculture': {
    label: 'Food & Agriculture',
    icon: 'restaurant',
    color: '#10b981'
  },
  'electronics': {
    label: 'Electronics',
    icon: 'phone-android',
    color: '#3b82f6'
  },
  'fashion': {
    label: 'Fashion & Clothing',
    icon: 'checkroom',
    color: '#ec4899'
  },
  'beauty-health': {
    label: 'Beauty & Health',
    icon: 'spa',
    color: '#f59e0b'
  },
  'home-garden': {
    label: 'Home & Garden',
    icon: 'home',
    color: '#8b5cf6'
  },
  'sports': {
    label: 'Sports & Fitness',
    icon: 'sports-soccer',
    color: '#06b6d4'
  },
  'automotive': {
    label: 'Automotive',
    icon: 'directions-car',
    color: '#ef4444'
  },
  'books-media': {
    label: 'Books & Media',
    icon: 'book',
    color: '#84cc16'
  },
  'services': {
    label: 'Services',
    icon: 'business-center',
    color: '#6366f1'
  },
  'others': {
    label: 'Others',
    icon: 'category',
    color: '#6b7280'
  }
};

// Order Status Configuration
export const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Pending Payment',
    color: '#f59e0b',
    icon: 'pending',
    description: 'Order created, awaiting payment confirmation'
  },
  payment_verified: {
    label: 'Payment Verified',
    color: '#10b981',
    icon: 'payment',
    description: 'Payment confirmed, preparing for dispatch'
  },
  rider_assigned: {
    label: 'Rider Assigned',
    color: '#3b82f6',
    icon: 'delivery-dining',
    description: 'Delivery rider has been assigned'
  },
  picked_up: {
    label: 'Picked Up',
    color: '#8b5cf6',
    icon: 'local-shipping',
    description: 'Order picked up from seller'
  },
  in_transit: {
    label: 'In Transit',
    color: '#06b6d4',
    icon: 'location-on',
    description: 'Order is on the way to you'
  },
  delivered: {
    label: 'Delivered',
    color: '#10b981',
    icon: 'check-circle',
    description: 'Order delivered successfully'
  },
  cancelled: {
    label: 'Cancelled',
    color: '#ef4444',
    icon: 'cancel',
    description: 'Order has been cancelled'
  },
  refunded: {
    label: 'Refunded',
    color: '#6b7280',
    icon: 'undo',
    description: 'Payment has been refunded'
  }
};

// Navigation Routes
export const ROUTES = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  
  // Main Tabs
  HOME: 'Home',
  MARKETPLACE: 'Marketplace',
  ORDERS: 'Orders',
  MESSAGES: 'Messages',
  PROFILE: 'Profile',
  
  // Buyer Screens
  PRODUCT_DETAILS: 'ProductDetails',
  PRODUCT_LIST: 'ProductList',
  SEARCH: 'Search',
  CART: 'Cart',
  CHECKOUT: 'Checkout',
  ORDER_TRACKING: 'OrderTracking',
  FAVORITES: 'Favorites',
  
  // Seller Screens
  SELLER_DASHBOARD: 'SellerDashboard',
  ADD_PRODUCT: 'AddProduct',
  EDIT_PRODUCT: 'EditProduct',
  MANAGE_PRODUCTS: 'ManageProducts',
  SELLER_ORDERS: 'SellerOrders',
  
  // Chat
  CHAT_LIST: 'ChatList',
  CHAT_ROOM: 'ChatRoom',
  
  // Admin
  ADMIN_DASHBOARD: 'AdminDashboard',
  ADMIN_ORDERS: 'AdminOrders',
  ADMIN_USERS: 'AdminUsers',
  ADMIN_ANALYTICS: 'AdminAnalytics',
  
  // Common
  SETTINGS: 'Settings',
  NOTIFICATIONS: 'Notifications',
  HELP: 'Help',
  REFERRALS: 'Referrals',
  PAYMENT: 'Payment'
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  VALIDATION: 'Please check your input and try again.',
  GENERIC: 'Something went wrong. Please try again.',
  PAYMENT_FAILED: 'Payment failed. Please try again.',
  OUT_OF_STOCK: 'This product is currently out of stock.',
  LOCATION_DENIED: 'Location permission denied.',
  CAMERA_DENIED: 'Camera permission denied.',
  STORAGE_DENIED: 'Storage permission denied.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully!',
  PRODUCT_ADDED: 'Product added successfully!',
  ORDER_PLACED: 'Order placed successfully!',
  PAYMENT_SUCCESS: 'Payment completed successfully!',
  MESSAGE_SENT: 'Message sent successfully!',
  REVIEW_SUBMITTED: 'Review submitted successfully!',
  PASSWORD_RESET: 'Password reset email sent!'
};

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PHONE_MIN_LENGTH: 10,
  PRODUCT_NAME_MAX_LENGTH: 100,
  PRODUCT_DESCRIPTION_MAX_LENGTH: 1000,
  REVIEW_MAX_LENGTH: 500,
  MESSAGE_MAX_LENGTH: 1000
};

// Firebase Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  PROFILES: 'profiles',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  ORDER_TRACKING: 'orderTracking',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  REVIEWS: 'reviews',
  FAVORITES: 'favorites',
  RIDERS: 'riders',
  REFERRALS: 'referrals',
  NOTIFICATIONS: 'notifications'
};

// Storage Paths
export const STORAGE_PATHS = {
  AVATARS: 'avatars',
  PRODUCTS: 'products',
  CHAT_IMAGES: 'chat-images',
  CHAT_FILES: 'chat-files'
};

// Async Storage Keys
export const STORAGE_KEYS = {
  USER_TOKEN: '@user_token',
  USER_ROLE: '@user_role',
  CART_ITEMS: '@cart_items',
  RECENTLY_VIEWED: '@recently_viewed',
  SEARCH_HISTORY: '@search_history'
};

// API Endpoints (if using external APIs)
export const API_ENDPOINTS = {
  PAYSTACK_INITIALIZE: 'https://api.paystack.co/transaction/initialize',
  PAYSTACK_VERIFY: 'https://api.paystack.co/transaction/verify',
  GEOLOCATION: 'https://api.mapbox.com/geocoding/v5/mapbox.places'
};

// Push Notification Types
export const NOTIFICATION_TYPES = {
  ORDER_UPDATE: 'order_update',
  PAYMENT_RECEIVED: 'payment_received',
  NEW_MESSAGE: 'new_message',
  DELIVERY_UPDATE: 'delivery_update',
  REVIEW_RECEIVED: 'review_received',
  PROMOTION: 'promotion',
  REFERRAL_BONUS: 'referral_bonus'
};

// Default Images
export const DEFAULT_IMAGES = {
  AVATAR: 'https://via.placeholder.com/150x150?text=Avatar',
  PRODUCT: 'https://via.placeholder.com/300x300?text=Product',
  PLACEHOLDER: 'https://via.placeholder.com/400x300?text=Image'
};
