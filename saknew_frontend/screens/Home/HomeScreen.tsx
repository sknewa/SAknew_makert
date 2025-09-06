import React, { useState, useCallback, useEffect } from 'react';
import ProductCard from '../../components/ProductCard';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  StatusBar,
  RefreshControl,
  Dimensions,
  ScrollView
} from 'react-native';
import { globalStyles, colors, spacing } from '../../styles/globalStyles';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext.minimal';
import { Product as AppProduct } from '../../types';
import { Product as ServiceProduct } from '../../services/shop.types';
import { PaginatedResponse } from '../../types/api.types';
import { MainNavigationProp } from '../../navigation/types';
import { shopService } from '../../services/apiService';
import { getImageUrl, isImageAccessible } from '../../utils/imageUtils';
import { testApiConnectivity } from '../../utils/apiTest';
import StatusSection from '../../components/StatusSection';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 3 - spacing.md;

const HomeScreen = () => {
  const { logout, loading } = useAuth();
  const navigation = useNavigation<MainNavigationProp>();
  const [products, setProducts] = useState<AppProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cartUpdated, setCartUpdated] = useState(0);
  const [groupedProducts, setGroupedProducts] = useState<{[key: string]: AppProduct[]}>({});

  const handleStatusPress = (userStatus: any) => {
    navigation.navigate('StatusViewer', { userStatus });
  };

  const handleCreateStatus = () => {
    navigation.navigate('CreateStatus');
  };

  // getImageUrl is now imported from utils/imageUtils

  // Format currency
  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${(num || 0).toFixed(2)}`;
  };

  // Removed fetchCategories logic

  // Fetch products
  const fetchProducts = useCallback(async (categorySlug?: string) => {
    setProductsLoading(true);
    setError(null);
    try {
      let response;
      
      if (categorySlug && categorySlug !== 'all') {
        // Fetch products by category
        response = await shopService.getCategoryProducts(categorySlug);
        console.log(`Fetching products for category: ${categorySlug}`);
      } else {
        // Fetch all products
        response = await shopService.getRecommendedProducts();
        console.log('Fetching all products');
      }
      
      // Check if response is an array or has results property
      const isPaginatedResponse = response && typeof response === 'object' && 'results' in response;
      
      if (response && (isPaginatedResponse || Array.isArray(response))) {
        // Handle both paginated responses and direct arrays
        const productList = Array.isArray(response) ? response : (isPaginatedResponse ? (response as PaginatedResponse<ServiceProduct>).results : []);
        console.log(`Fetched ${productList.length} products`);
        
        // Log the first product's image URL for debugging
        if (productList.length > 0) {
          console.log('First product image URL:', productList[0].main_image_url);
          const absoluteUrl = getImageUrl(productList[0].main_image_url);
          console.log('Absolute URL:', absoluteUrl);
          
          // Verify image URL is accessible
          isImageAccessible(absoluteUrl)
            .then(accessible => {
              if (!accessible) {
                console.warn('Image URL may not be accessible:', absoluteUrl);
              }
            });
        }
        // Convert ServiceProduct[] to AppProduct[] by adding missing properties
        const convertedProducts = productList.map(p => {
          const product = p as any;
          if (!product.user) {
            product.user = { id: 0, username: '', email: '' };
          }
          return product as AppProduct;
        });
        
        setProducts(convertedProducts);
        
        // Group products by category
        const grouped = convertedProducts.reduce((acc, product) => {
          const categoryName = product.category_name || 'Other';
          if (!acc[categoryName]) acc[categoryName] = [];
          acc[categoryName].push(product);
          return acc;
        }, {} as {[key: string]: AppProduct[]});
        setGroupedProducts(grouped);
      } else {
        setProducts([]);
        // Don't set error, just show empty state
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err.message);
      setError('Unable to connect to the server. Please check your internet connection.');
    } finally {
    setProductsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Search products
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchProducts();
      return;
    }
    
    setProductsLoading(true);
    try {
      const response = await shopService.searchProducts(searchQuery);
      // Check if response has results property
      const isPaginatedResponse = response && typeof response === 'object' && 'results' in response;
      
      if (isPaginatedResponse) {
        // Convert ServiceProduct[] to AppProduct[]
        const convertedProducts = (response as PaginatedResponse<ServiceProduct>).results.map(p => {
          const product = p as any;
          if (!product.user) {
            product.user = { id: 0, username: '', email: '' };
          }
          return product as AppProduct;
        });
        
        setProducts(convertedProducts);
      } else {
        setProducts([]);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error searching products:', err.message);
      setError('Search failed. Please try again later.');
    } finally {
      setProductsLoading(false);
    }
  }, [searchQuery, fetchProducts]);

  // Removed handleCategorySelect logic

  // Load categories and products when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Test API connectivity first
      testApiConnectivity().then(isConnected => {
        if (isConnected) {
          fetchProducts();
        } else {
          setError('Cannot connect to server. Please check your network connection.');
          setProductsLoading(false);
        }
      });
    }, [fetchProducts])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery('');
    fetchProducts();
  }, [fetchProducts]);

  // Render category section
  const renderCategorySection = (categoryName: string, categoryProducts: AppProduct[]) => (
    <View key={categoryName} style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{categoryName}</Text>
      <FlatList
        data={categoryProducts.slice(0, 6)}
        renderItem={({ item }) => {
          const productWithImages = { ...item, images: item.images ?? [] };
          return (
            <ProductCard
              key={item.id}
              product={productWithImages}
              isShopOwner={false}
              navigation={navigation as any}
              onCartUpdated={() => setCartUpdated(c => c + 1)}
            />
          );
        }}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        scrollEnabled={false}
        contentContainerStyle={styles.categoryGrid}
      />
      {categoryProducts.length > 6 && (
        <TouchableOpacity 
          style={styles.viewMoreButton}
          onPress={() => navigation.navigate('CategoryProducts', {
            categoryName,
            products: categoryProducts
          })}
        >
          <Text style={styles.viewMoreText}>View More ({categoryProducts.length - 6})</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>Find amazing products</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          disabled={loading}
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      {/* Status Section */}
      <StatusSection 
        onStatusPress={handleStatusPress}
        onCreateStatus={handleCreateStatus}
      />
      
      {/* Main Content */}
      {productsLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchProducts()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Categories removed */}
          
          {/* Products by Category */}
          <ScrollView 
            style={styles.productsContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {Object.keys(groupedProducts).length > 0 ? (
              Object.entries(groupedProducts).map(([categoryName, categoryProducts]) =>
                renderCategorySection(categoryName, categoryProducts)
              )
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="basket-outline" size={60} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No products found</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: spacing.lg,
    borderBottomRightRadius: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 12,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginTop: -spacing.md - spacing.xs,
    marginBottom: spacing.md,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 24,
    fontSize: 16,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollIndicator: {
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },
  categoriesList: {
    paddingVertical: 8,
    paddingRight: 16, // Add extra padding at the end for better scrolling
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 80, // Ensure minimum width for categories
    alignItems: 'center', // Center text horizontally
  },
  activeCategoryItem: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  activeCategoryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  productsContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    paddingBottom: spacing.sm,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewMoreText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  productsList: {
    paddingBottom: 20,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
    backgroundColor: '#E0E6ED',
    overflow: 'hidden',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E6ED',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productInfo: {
    padding: 12,
  },
  shopName: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  outOfStock: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
  },
  lowStock: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    marginHorizontal: 8,
    marginTop: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshButtonText: {
    color: colors.white,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default HomeScreen;