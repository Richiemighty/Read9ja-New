import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  FlatList,
  TextInput,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { ProductService } from '../../services/firebase/products';
import { ProfileService } from '../../services/firebase/profiles';
import { COLORS, PRODUCT_CATEGORIES, DEFAULT_IMAGES } from '../../constants';
import { Product, Profile, ProductCategory } from '../../types';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 180;
const PRODUCT_CARD_WIDTH = width * 0.45;

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, profile, userRole } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [topSellers, setTopSellers] = useState<Profile[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Load featured products and top sellers in parallel
      const [productsResult, sellersResult] = await Promise.all([
        ProductService.getFeaturedProducts(10),
        ProfileService.getSellers(8)
      ]);

      if (productsResult.success && productsResult.data) {
        setFeaturedProducts(productsResult.data);
      }

      if (sellersResult.success && sellersResult.data) {
        setTopSellers(sellersResult.data);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      navigation.navigate('Search', { query: searchText });
      setSearchText('');
    }
  };

  const handleCategoryPress = (category: ProductCategory) => {
    navigation.navigate('ProductList', { category });
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetails', { product });
  };

  const handleSellerPress = (seller: Profile) => {
    navigation.navigate('SellerProfile', { seller });
  };

  const handleViewAllProducts = () => {
    navigation.navigate('Marketplace');
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <View style={styles.headerTop}>
          <View style={styles.userGreeting}>
            <Image
              source={{ uri: profile?.avatar || DEFAULT_IMAGES.AVATAR }}
              style={styles.userAvatar}
            />
            <View style={styles.greetingText}>
              <Text style={styles.greeting}>Good morning!</Text>
              <Text style={styles.userName}>{profile?.firstName || 'User'}</Text>
            </View>
          </View>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products, sellers..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const renderPromoBanner = () => (
    <View style={styles.promoBanner}>
      <LinearGradient
        colors={[COLORS.secondary, COLORS.accent]}
        style={styles.bannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Special Offer!</Text>
            <Text style={styles.bannerSubtitle}>Get 20% off on your first order</Text>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>Shop Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bannerImage}>
            <Ionicons name="gift" size={60} color={COLORS.white} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <TouchableOpacity onPress={handleViewAllProducts}>
          <Text style={styles.seeAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {Object.entries(PRODUCT_CATEGORIES).map(([key, category]) => (
          <TouchableOpacity
            key={key}
            style={styles.categoryCard}
            onPress={() => handleCategoryPress(key as ProductCategory)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
              <Ionicons name={category.icon as any} size={28} color={category.color} />
            </View>
            <Text style={styles.categoryLabel}>{category.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderFeaturedProducts = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Products</Text>
        <TouchableOpacity onPress={handleViewAllProducts}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={featuredProducts}
        renderItem={({ item }) => renderProductCard(item)}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );

  const renderProductCard = (product: Product) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(product)}
    >
      <Image
        source={{ uri: product.images[0] || DEFAULT_IMAGES.PRODUCT }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.productPrice}>
          {product.currency} {product.price.toLocaleString()}
        </Text>
        <View style={styles.productMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={COLORS.accent} />
            <Text style={styles.ratingText}>{product.rating}</Text>
          </View>
          <Text style={styles.soldText}>{product.totalSold} sold</Text>
        </View>
        <Text style={styles.sellerName}>{product.sellerInfo.name}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderTopSellers = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Sellers</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={topSellers}
        renderItem={({ item }) => renderSellerCard(item)}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sellersContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );

  const renderSellerCard = (seller: Profile) => (
    <TouchableOpacity
      style={styles.sellerCard}
      onPress={() => handleSellerPress(seller)}
    >
      <Image
        source={{ uri: seller.avatar || DEFAULT_IMAGES.AVATAR }}
        style={styles.sellerAvatar}
      />
      <View style={styles.sellerInfo}>
        <Text style={styles.sellerName} numberOfLines={1}>
          {seller.businessName || seller.displayName}
        </Text>
        <View style={styles.sellerStats}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={COLORS.accent} />
            <Text style={styles.ratingText}>{seller.rating}</Text>
          </View>
          {seller.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
          )}
        </View>
        <Text style={styles.sellerCategory}>
          {seller.businessCategory && PRODUCT_CATEGORIES[seller.businessCategory]?.label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickActionCard}>
          <Ionicons name="heart-outline" size={28} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Favorites</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickActionCard}>
          <Ionicons name="receipt-outline" size={28} color={COLORS.primary} />
          <Text style={styles.quickActionText}>My Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickActionCard}>
          <Ionicons name="chatbubbles-outline" size={28} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Messages</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickActionCard}>
          <Ionicons name="gift-outline" size={28} color={COLORS.primary} />
          <Text style={styles.quickActionText}>Referrals</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {renderHeader()}
      {renderPromoBanner()}
      {renderCategories()}
      {renderFeaturedProducts()}
      {renderTopSellers()}
      {renderQuickActions()}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ in Nigeria</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: COLORS.white,
  },
  greetingText: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  promoBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    height: BANNER_HEIGHT,
  },
  bannerGradient: {
    flex: 1,
    padding: 20,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  bannerImage: {
    marginLeft: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingLeft: 20,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  productsContainer: {
    paddingLeft: 20,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 4,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.surface,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  soldText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sellerName: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sellersContainer: {
    paddingLeft: 20,
  },
  sellerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    width: 140,
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
  },
  sellerInfo: {
    alignItems: 'center',
  },
  sellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sellerCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
  },
  quickActionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 60) / 2,
    marginBottom: 12,
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default HomeScreen;
