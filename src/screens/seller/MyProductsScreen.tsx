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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { ProductService } from '../../services/firebase/productService';
import { COLORS, FONTS } from '../../constants';
import { Product, ProductCategory } from '../../types';

interface MyProductsScreenProps {
  navigation: any;
}

const SORT_OPTIONS = [
  { label: 'Recent', value: 'createdAt' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Most Viewed', value: 'views' },
  { label: 'Best Selling', value: 'orders' },
];

const FILTER_OPTIONS = [
  { label: 'All Products', value: 'all' },
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Low Stock', value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
];

const MyProductsScreen: React.FC<MyProductsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState('createdAt');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const [analytics, setAnalytics] = useState({
    totalProducts: 0,
    totalViews: 0,
    totalOrders: 0,
    averageRating: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
  });

  const loadProducts = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const { products: sellerProducts, analytics: productAnalytics } = 
        await ProductService.getSellerProductsWithAnalytics(user.uid);
      
      setProducts(sellerProducts);
      setAnalytics(productAnalytics);
      filterAndSortProducts(sellerProducts, searchQuery, selectedSort, selectedFilter);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load your products');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const filterAndSortProducts = (
    productsList: Product[],
    search: string,
    sort: string,
    filter: string
  ) => {
    let filtered = [...productsList];

    // Apply search filter
    if (search.trim()) {
      const searchTerm = search.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.title.toLowerCase().includes(searchTerm) ||
          product.description.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm)
      );
    }

    // Apply stock filter
    switch (filter) {
      case 'in_stock':
        filtered = filtered.filter(product => product.stock > 10);
        break;
      case 'low_stock':
        filtered = filtered.filter(product => product.stock > 0 && product.stock <= 10);
        break;
      case 'out_of_stock':
        filtered = filtered.filter(product => product.stock === 0);
        break;
      default:
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'views':
          return (b.views || 0) - (a.views || 0);
        case 'orders':
          return (b.orders || 0) - (a.orders || 0);
        case 'createdAt':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredProducts(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    filterAndSortProducts(products, text, selectedSort, selectedFilter);
  };

  const handleSort = (sortValue: string) => {
    setSelectedSort(sortValue);
    filterAndSortProducts(products, searchQuery, sortValue, selectedFilter);
    setShowSortModal(false);
  };

  const handleFilter = (filterValue: string) => {
    setSelectedFilter(filterValue);
    filterAndSortProducts(products, searchQuery, selectedSort, filterValue);
    setShowFilterModal(false);
  };

  const handleEditProduct = (product: Product) => {
    navigation.navigate('EditProduct', { productId: product.id });
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    
    try {
      await ProductService.updateProduct(product.id, { status: newStatus });
      loadProducts(); // Refresh the list
    } catch (error) {
      console.error('Error updating product status:', error);
      Alert.alert('Error', 'Failed to update product status');
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductService.deleteProduct(product.id);
              loadProducts(); // Refresh the list
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return COLORS.error;
    if (stock <= 10) return COLORS.warning;
    return COLORS.success;
  };

  const getStockStatusText = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 10) return 'Low Stock';
    return 'In Stock';
  };

  const renderAnalyticsCard = () => (
    <View style={styles.analyticsCard}>
      <Text style={styles.analyticsTitle}>Your Performance</Text>
      <View style={styles.analyticsRow}>
        <View style={styles.analyticsItem}>
          <Text style={styles.analyticsValue}>{analytics.totalProducts}</Text>
          <Text style={styles.analyticsLabel}>Products</Text>
        </View>
        <View style={styles.analyticsItem}>
          <Text style={styles.analyticsValue}>{analytics.totalViews}</Text>
          <Text style={styles.analyticsLabel}>Views</Text>
        </View>
        <View style={styles.analyticsItem}>
          <Text style={styles.analyticsValue}>{analytics.totalOrders}</Text>
          <Text style={styles.analyticsLabel}>Orders</Text>
        </View>
        <View style={styles.analyticsItem}>
          <Text style={styles.analyticsValue}>⭐ {analytics.averageRating}</Text>
          <Text style={styles.analyticsLabel}>Rating</Text>
        </View>
      </View>
      
      {(analytics.lowStockProducts > 0 || analytics.outOfStockProducts > 0) && (
        <View style={styles.stockWarning}>
          <Ionicons name="warning" size={16} color={COLORS.warning} />
          <Text style={styles.stockWarningText}>
            {analytics.outOfStockProducts > 0 && `${analytics.outOfStockProducts} out of stock`}
            {analytics.outOfStockProducts > 0 && analytics.lowStockProducts > 0 && ', '}
            {analytics.lowStockProducts > 0 && `${analytics.lowStockProducts} low stock`}
          </Text>
        </View>
      )}
    </View>
  );

  const renderProductItem = ({ item: product }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image
        source={{
          uri: product.images[0] || 'https://via.placeholder.com/100x100?text=No+Image'
        }}
        style={styles.productImage}
      />
      
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.title}
        </Text>
        
        <Text style={styles.productPrice}>
          {product.currency} {product.price.toLocaleString()}
        </Text>
        
        <View style={styles.productStats}>
          <View style={styles.statItem}>
            <Ionicons name="eye" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statText}>{product.views || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="bag" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statText}>{product.orders || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statText}>{product.rating || 0}</Text>
          </View>
        </View>
        
        <View style={styles.stockContainer}>
          <Text style={[
            styles.stockText,
            { color: getStockStatusColor(product.stock) }
          ]}>
            {getStockStatusText(product.stock)} ({product.stock})
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: product.status === 'active' ? COLORS.success : COLORS.textSecondary }
          ]}>
            <Text style={styles.statusText}>
              {product.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditProduct(product)}
        >
          <Ionicons name="create" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleStatus(product)}
        >
          <Ionicons
            name={product.status === 'active' ? 'pause' : 'play'}
            size={20}
            color={product.status === 'active' ? COLORS.warning : COLORS.success}
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteProduct(product)}
        >
          <Ionicons name="trash" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Products</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search products..."
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        
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
          <Text style={styles.loadingText}>Loading your products...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductItem}
          ListHeaderComponent={renderAnalyticsCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bag-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start by adding your first product'
                }
              </Text>
            </View>
          }
        />
      )}
    </View>
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
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
  analyticsCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  analyticsTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  analyticsLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  stockWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  stockWarningText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.warning,
    marginLeft: 8,
  },
  productCard: {
    flexDirection: 'row',
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
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: 8,
  },
  productStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  productActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    padding: 8,
    marginVertical: 4,
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
});

export default MyProductsScreen;
