// User Types
export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber: string;
  address?: string;
  avatar?: string;
  businessName?: string; // For sellers
  businessDescription?: string;
  businessCategory?: string;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  totalTransactions: number;
  referralCode: string;
  referredBy?: string;
  bonus: number;
  createdAt: Date;
  updatedAt: Date;
}

// Product Types
export type ProductCategory = 
  | 'food-agriculture'
  | 'electronics'
  | 'fashion'
  | 'beauty-health'
  | 'home-garden'
  | 'sports'
  | 'automotive'
  | 'books-media'
  | 'services'
  | 'others';

export type Currency = 'NGN' | 'USD';

export interface ProductFormData {
  title: string;
  description: string;
  category: ProductCategory;
  price: number;
  currency: Currency;
  stock: number;
  images?: string[];
  tags?: string[];
  specifications?: Record<string, string>;
  isCustomizable?: boolean;
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: ProductCategory;
  price: number;
  currency: Currency;
  images: string[];
  stock: number;
  status: 'active' | 'inactive' | 'draft';
  tags?: string[];
  specifications?: Record<string, string>;
  isCustomizable?: boolean;
  views: number;
  orders: number;
  rating: number;
  reviewCount: number;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

// Order Types
export type OrderStatus = 
  | 'pending'
  | 'payment_verified'
  | 'rider_assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface DeliveryInfo {
  recipientName: string;
  phoneNumber: string;
  address: string;
  landmark?: string;
  deliveryInstructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  product: {
    name: string;
    image: string;
    price: number;
    currency: Currency;
  };
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryInfo: DeliveryInfo;
  riderId?: string;
  riderInfo?: {
    name: string;
    phoneNumber: string;
    rating: number;
  };
  verificationCode: string;
  paymentMethod: string;
  paymentReference: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderTracking {
  id: string;
  orderId: string;
  status: OrderStatus;
  message: string;
  updatedBy: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
}

// Chat Types
export interface Conversation {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  productInfo: {
    name: string;
    image: string;
    price: number;
  };
  lastMessage: string;
  lastMessageTime: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: UserRole;
  text: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

// Review Types
export interface Review {
  id: string;
  orderId: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment: string;
  type: 'product' | 'seller';
  isVerified: boolean;
  createdAt: Date;
}

// Cart Types
export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  addedAt: Date;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  updatedAt: Date;
}

// Favorites
export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  addedAt: Date;
}

// Rider Types
export interface Rider {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  vehicleType: string;
  licenseNumber: string;
  isAvailable: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  totalDeliveries: number;
  createdAt: Date;
}

// Referral Types
export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  bonusAmount: number;
  status: 'pending' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

// Notification Types
export type NotificationType = 
  | 'order_update'
  | 'payment_received'
  | 'new_message'
  | 'delivery_update'
  | 'review_received'
  | 'promotion'
  | 'referral_bonus';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Search and Filter Types
export interface SearchFilters {
  category?: ProductCategory;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  rating?: number;
  inStock?: boolean;
  currency?: Currency;
}

export interface SearchParams {
  query?: string;
  filters?: SearchFilters;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

// Analytics Types
export interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  ordersByStatus: Record<OrderStatus, number>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  topCategories: Array<{
    category: ProductCategory;
    sales: number;
  }>;
  topSellers: Array<{
    sellerId: string;
    sellerName: string;
    revenue: number;
  }>;
}
