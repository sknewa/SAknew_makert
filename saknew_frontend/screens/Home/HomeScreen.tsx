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
  Dimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Product as AppProduct } from '../../types';
import { Product as ServiceProduct } from '../../services/shop.types';
import { PaginatedResponse } from '../../types/api.types';
import { MainNavigationProp } from '../../navigation/types';
import { shopService } from '../../services/apiService';
import { getImageUrl, isImageAccessible } from '../../utils/imageUtils';
import { testApiConnectivity } from '../../utils/apiTest';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - 24; // 2 cards per row with margins

// Modern color palette
const colors = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  primary: '#3498DB',
  secondary: '#2ECC71',
  accent: '#F39C12',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E6ED',
  error: '#E74C3C',
  shadow: 'rgba(0, 0, 0, 0.1)',
  white: '#FFFFFF', // Adding white color
};

const HomeScreen = () => {
  const { logout, loading } = useAuth();
  const navigation = useNavigation<MainNavigationProp>();
  const [products, setProducts] = useState<AppProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Removed categories and selectedCategory state
  // Add cartUpdated state to trigger UI updates when cart changes
  const [cartUpdated, setCartUpdated] = useState(0);

  // getImageUrl is now imported from utils/imageUtils

  // Format currency
  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `R${num.toFixed(2)}`;
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

  // Render product item using shared ProductCard, pass onCartUpdated
  const renderProductItem = ({ item }: { item: AppProduct }) => {
    // Ensure images is always an array for ProductCard
    const productWithImages = {
      ...item,
      images: item.images ?? [],
    };
    return (
      <ProductCard
        key={item.id}
        product={productWithImages}
        isShopOwner={false}
        navigation={navigation as any}
        onCartUpdated={() => setCartUpdated(c => c + 1)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontWeight: '900' }]}>Discover</Text>
        <TouchableOpacity
          onPress={logout}
          disabled={loading}
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
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
            <Ionicons name="close-circle" size={20} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>
      
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
          
          {/* Products */}
          <View style={styles.productsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Arrivals</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SearchResults', { query: '' })}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={products}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="basket-outline" size={60} color={colors.textLight} />
                  <Text style={styles.emptyText}>No products found</Text>
                  <Text style={styles.emptySubText}>
                    {searchQuery
                      ? `No results for "${searchQuery}". Try a different search term`
                      : `Check back later for new products`}
                  </Text>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={onRefresh}
                  >
                    <Ionicons name="refresh-outline" size={16} color={colors.white} />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 36, // Increased top padding for visibility and to avoid cut-off
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
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
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollIndicator: {
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
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
    marginTop: 16,
    paddingHorizontal: 16,
  },
  productsList: {
    paddingBottom: 16,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    paddingVertical: 40,
    paddingHorizontal: 20,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: colors.white,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default HomeScreen;