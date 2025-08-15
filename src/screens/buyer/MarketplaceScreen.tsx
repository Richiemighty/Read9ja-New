import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
  Modal,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ProductService } from '../../services/firebase/products';
import { COLORS, PRODUCT_CATEGORIES, DEFAULT_IMAGES } from '../../constants';
import { Product, ProductCategory, SearchParams, Currency } from '../../types';

const { width } = Dimensions.get('window');
const PRODUCT_CARD_WIDTH = (width - 60) / 2;

interface MarketplaceScreenProps {
  navigation: any;
}

export const MarketplaceScreen: React.FC<MarketplaceScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | undefined>(undefined);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('NGN');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular'>('newest');
  const [inStockOnly, setInStockOnly] = useState(true);

  useEffect(() => {
    loadProducts(true);
  }, []);

  const loadProducts = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setLastDoc(null);
        setHasMoreData(true);
      } else {
        setLoadingMore(true);
      }

      const searchParams: SearchParams = {
        query: searchText.trim() || undefined,
        filters: {
          category: selectedCategory,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          currency: selectedCurrency,
          inStock: inStockOnly,
        },
        sortBy,
        limit: 20
      };

      const result = await ProductService.searchProducts(searchParams);

      if (result.success && result.data) {
        const newProducts = result.data.products;
        
        if (reset) {
          setProducts(newProducts);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
        }

        setLastDoc(result.data.lastDoc);
        setHasMoreData(newProducts.length === 20);
      } else {
        if (reset) setProducts([]);
        Alert.alert('Error', result.error || 'Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchText, selectedCategory, minPrice, maxPrice, selectedCurrency, sortBy, inStockOnly]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMoreData && lastDoc) {
      loadProducts(false);
    }
  };

  const handleSearch = () => {
    loadProducts(true);
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    loadProducts(true);
  };

  const handleClearFilters = () => {
    setSelectedCategory(undefined);
    setMinPrice('');
    setMaxPrice('');
    setSelectedCurrency('NGN');
    setSortBy('newest');
    setInStockOnly(true);
    setSearchText('');
    setShowFilters(false);
    loadProducts(true);
  };

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetails', { product });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Marketplace</Text>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
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
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategories = () => (
    <View style={styles.categoriesSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipSelected
          ]}
          onPress={() => {
            setSelectedCategory(undefined);
            loadProducts(true);
          }}
        >
          <Text style={[
            styles.categoryChipText,
            !selectedCategory && styles.categoryChipTextSelected
          ]}>All</Text>
        </TouchableOpacity>
        
        {Object.entries(PRODUCT_CATEGORIES).map(([key, category]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryChip,
              selectedCategory === key && styles.categoryChipSelected
            ]}
            onPress={() => {
              setSelectedCategory(key as ProductCategory);
              loadProducts(true);
            }}
          >
            <Ionicons 
              name={category.icon as any} 
              size={16} 
              color={selectedCategory === key ? COLORS.white : category.color} 
            />
            <Text style={[
              styles.categoryChipText,
              selectedCategory === key && styles.categoryChipTextSelected
            ]}>{category.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleProductPress(item)}
    >
      <Image
        source={{ uri: item.images[0] || DEFAULT_IMAGES.PRODUCT }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>
          {item.currency} {item.price.toLocaleString()}
        </Text>
        <View style={styles.productMeta}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={COLORS.accent} />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
          <Text style={styles.soldText}>{item.totalSold} sold</Text>
        </View>
        <Text style={styles.sellerName} numberOfLines={1}>{item.sellerInfo.name}</Text>
        {item.stock < 5 && item.stock > 0 && (
          <Text style={styles.lowStockText}>Only {item.stock} left!</Text>
        )}
        {!item.isAvailable && (
          <Text style={styles.outOfStockText}>Out of Stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filtersModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Products</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Sort By</Text>
              <View style={styles.sortOptions}>
                {[
                  { key: 'newest', label: 'Newest First' },
                  { key: 'price_asc', label: 'Price: Low to High' },
                  { key: 'price_desc', label: 'Price: High to Low' },
                  { key: 'rating', label: 'Highest Rated' },
                  { key: 'popular', label: 'Most Popular' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.sortOption,
                      sortBy === option.key && styles.sortOptionSelected
                    ]}
                    onPress={() => setSortBy(option.key as any)}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      sortBy === option.key && styles.sortOptionTextSelected
                    ]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Price Range</Text>
              <View style={styles.priceInputs}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Min Price</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={styles.priceSeparator}>-</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Max Price</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="∞"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Currency */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Currency</Text>
              <View style={styles.currencyOptions}>
                {['NGN', 'USD'].map((currency) => (
                  <TouchableOpacity
                    key={currency}
                    style={[
                      styles.currencyOption,
                      selectedCurrency === currency && styles.currencyOptionSelected
                    ]}
                    onPress={() => setSelectedCurrency(currency as Currency)}
                  >
                    <Text style={[
                      styles.currencyOptionText,
                      selectedCurrency === currency && styles.currencyOptionTextSelected
                    ]}>{currency}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Stock Filter */}
            <View style={styles.filterSection}>
              <TouchableOpacity 
                style={styles.stockFilter}
                onPress={() => setInStockOnly(!inStockOnly)}
              >
                <View style={[styles.checkbox, inStockOnly && styles.checkboxSelected]}>
                  {inStockOnly && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.stockFilterText}>Show in-stock items only</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.filtersActions}>
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClearFilters}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search" size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyStateTitle}>No products found</Text>
      <Text style={styles.emptyStateText}>
        Try adjusting your search criteria or filters
      </Text>
      <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
        <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <Text style={styles.loadingText}>Loading more products...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderCategories()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      )}

      {renderFiltersModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  filterButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 25,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  categoriesSection: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
  },
  categoriesContainer: {
    paddingLeft: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 4,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: COLORS.white,
  },
  productsList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  productImage: {
    width: '100%',
    height: 140,
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
    marginBottom: 4,
  },
  lowStockText: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600',
  },
  outOfStockText: {
    fontSize: 11,
    color: COLORS.error,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  clearFiltersButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filtersModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  filtersContent: {
    maxHeight: '70%',
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  sortOptionTextSelected: {
    color: COLORS.white,
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  priceInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceSeparator: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  currencyOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyOption: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currencyOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  currencyOptionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  currencyOptionTextSelected: {
    color: COLORS.white,
  },
  stockFilter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stockFilterText: {
    fontSize: 14,
    color: COLORS.text,
  },
  filtersActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  clearButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default MarketplaceScreen;
