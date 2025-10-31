import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  RefreshControl
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
import * as Location from 'expo-location';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

/**
 * Converts a product from the service layer type to the app's product type.
 * Provides default values for potentially missing fields to ensure type safety.
 * @param p - The product object from the service.
 * @returns A product object conforming to the AppProduct interface.
 */
const convertServiceProduct = (p: ServiceProduct): AppProduct => {
  const serviceProduct = p as any; // Using 'as any' to bridge potential type gaps from the backend.
  return {
    ...serviceProduct,
    user: serviceProduct.user || { id: 0, username: 'Unknown', email: '' },
    images: serviceProduct.images || [],
  } as AppProduct;
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const HomeScreen = () => {
  const { logout, loading } = useAuth();
  const navigation = useNavigation<MainNavigationProp>();
  const [products, setProducts] = useState<AppProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [groupedProducts, setGroupedProducts] = useState<{[key: string]: AppProduct[]}>({});
  const [statusRefreshTrigger, setStatusRefreshTrigger] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [allProducts, setAllProducts] = useState<AppProduct[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Memoize the category data structure for the FlatList to prevent re-renders
  const categorySections = useMemo(() => 
    Object.entries(groupedProducts), 
  [groupedProducts]);

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

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await shopService.getCategories();
      const categoryList = Array.isArray(response) ? response : response.results || [];
      setCategories([{ id: 0, name: 'All', slug: 'all' }, ...categoryList]);
    } catch (err) {
      safeError('Error fetching categories:', err);
    }
  }, []);

  // Filter and sort categories based on product count from all products, not filtered
  const visibleCategories = useMemo(() => {
    if (categories.length === 0) return [];
    
    const allCategoryName = categories[0];
    const categoriesWithCount = categories.slice(1).map(cat => ({
      ...cat,
      productCount: allProducts.filter(p => p.category_name === cat.name).length
    })).filter(cat => cat.productCount > 0).sort((a, b) => b.productCount - a.productCount);
    
    return [allCategoryName, ...categoriesWithCount];
  }, [categories, allProducts]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      }
    })();
  }, []);

  const enrichProductWithShopData = async (product: ServiceProduct) => {
    try {
      const shopData = await shopService.getShopBySlug(product.shop_name.toLowerCase().replace(/\s+/g, '-'));
      return {
        ...product,
        shop_latitude: shopData?.latitude,
        shop_longitude: shopData?.longitude
      };
    } catch {
      return product;
    }
  };

  const fetchProducts = useCallback(async (categorySlug?: string) => {
    setProductsLoading(true);
    setError(null);
    try {
      const response = await shopService.getRecommendedProducts();
      
      const isPaginatedResponse = response && typeof response === 'object' && 'results' in response;
      
      if (response && (isPaginatedResponse || Array.isArray(response))) {
        const productList = Array.isArray(response) ? response : (isPaginatedResponse ? (response as PaginatedResponse<ServiceProduct>).results : []);
        
        const enrichedProducts = await Promise.all(productList.map(enrichProductWithShopData));
        let convertedProducts = enrichedProducts.map(convertServiceProduct);
        
        if (userLocation) {
          convertedProducts = convertedProducts.sort((a, b) => {
            const distA = (a as any).shop_latitude && (a as any).shop_longitude 
              ? calculateDistance(userLocation.latitude, userLocation.longitude, (a as any).shop_latitude, (a as any).shop_longitude)
              : Infinity;
            const distB = (b as any).shop_latitude && (b as any).shop_longitude
              ? calculateDistance(userLocation.latitude, userLocation.longitude, (b as any).shop_latitude, (b as any).shop_longitude)
              : Infinity;
            return distA - distB;
          });
        }
        
        setAllProducts(convertedProducts);
        
        const filteredProducts = categorySlug && categorySlug !== 'all'
          ? convertedProducts.filter(p => p.category_slug === categorySlug)
          : convertedProducts;
        
        setProducts(filteredProducts);
        
        const grouped = filteredProducts.reduce((acc, product) => {
          const categoryName = product.category_name || 'Other';
          if (!acc[categoryName]) acc[categoryName] = [];
          acc[categoryName].push(product);
          return acc;
        }, {} as {[key: string]: AppProduct[]});
        setGroupedProducts(grouped);
      } else {
        setProducts([]);
        setError(null);
      }
    } catch (err: any) {
      setError('Unable to connect to the server. Please check your internet connection.');
    } finally {
      setProductsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Search products
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsSearching(false);
      fetchProducts();
      return;
    }
    
    setIsSearching(true);
    setProductsLoading(true);
    try {
      const response = await shopService.searchProducts(query);
      const isPaginatedResponse = response && typeof response === 'object' && 'results' in response;
      
      if (isPaginatedResponse) {
        const convertedProducts = (response as PaginatedResponse<ServiceProduct>).results.map(convertServiceProduct);
        setProducts(convertedProducts);
        const grouped = convertedProducts.reduce((acc, product) => {
          const categoryName = product.category_name || 'Other';
          if (!acc[categoryName]) acc[categoryName] = [];
          acc[categoryName].push(product);
          return acc;
        }, {} as {[key: string]: AppProduct[]});
        setGroupedProducts(grouped);
      } else {
        setProducts([]);
        setGroupedProducts({});
        setError(null);
      }
    } catch (err: any) {
      setError('Search failed. Please try again later.');
    } finally {
      setProductsLoading(false);
    }
  }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Load categories and products when screen is focused
  useFocusEffect(
    useCallback(() => {
      setStatusRefreshTrigger(prev => prev + 1);
      fetchCategories();
      testApiConnectivity().then(isConnected => {
        if (isConnected) {
          fetchProducts();
        } else {
          setError('Cannot connect to server. Please check your network connection.');
          setProductsLoading(false);
        }
      });
    }, [fetchProducts, fetchCategories])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery('');
    setSelectedCategory('all');
    fetchProducts();
  }, [fetchProducts]);

  // Handle category selection
  const handleCategorySelect = useCallback((categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSearchQuery('');
    fetchProducts(categorySlug === 'all' ? undefined : categorySlug);
  }, [fetchProducts]);

  return (
    <SafeAreaView style={globalStyles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SA_knew markets</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          disabled={loading}
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={20} color={'#DC3545'} />
        </TouchableOpacity>
      </View>
      
      {/* Status Section */}
      <View style={styles.statusSectionContainer}>
        <StatusSection 
          onStatusPress={handleStatusPress}
          onCreateStatus={handleCreateStatus}
          refreshTrigger={statusRefreshTrigger}
        />
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      {/* Categories Navigation */}
      {visibleCategories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            data={visibleCategories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.slug}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  selectedCategory === item.slug && styles.activeCategoryItem
                ]}
                onPress={() => handleCategorySelect(item.slug)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === item.slug && styles.activeCategoryText
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}

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
          <FlatList
            data={categorySections}
            keyExtractor={([categoryName]) => categoryName}
            renderItem={({ item: [categoryName, products] }) => (
              <CategorySection
                categoryName={categoryName}
                products={products}
                navigation={navigation}
              />
            )}
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
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="basket-outline" size={60} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No products found</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </>
      )}
      
      {/* Feedback Button */}
      <TouchableOpacity 
        style={styles.feedbackButton}
        onPress={() => navigation.navigate('Feedback' as any)}
        accessibilityLabel="Send Feedback"
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

interface CategorySectionProps {
  categoryName: string;
  products: AppProduct[];
  navigation: MainNavigationProp;
}

const CategorySection: React.FC<CategorySectionProps> = React.memo(({
  categoryName,
  products,
  navigation,
}) => {
  // All products in this group should have the same category slug.
  const categorySlug = products.length > 0 ? products[0].category_slug : null;

  const handleViewMore = () => {
    // Navigate with a category identifier instead of the whole product list.
    // Note: The 'CategoryProducts' screen must be updated to fetch products using this identifier.
    if (categorySlug) {
      navigation.navigate('CategoryProducts', {
        categoryName,
        categorySlug,
      });
    } else {
      // Handle cases where there's no slug, like the "Other" category
      safeWarn(`View More clicked for category "${categoryName}" with no slug.`);
    }
  };

  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{categoryName}</Text>
      <FlatList
        data={products.slice(0, 6)}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            isShopOwner={false}
            navigation={navigation}
            shopLatitude={(item as any).shop_latitude}
            shopLongitude={(item as any).shop_longitude}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        scrollEnabled={false}
        contentContainerStyle={styles.categoryGrid}
      />
      {products.length > 6 && (
        <TouchableOpacity style={styles.viewMoreButton} onPress={handleViewMore}>
          <Text style={styles.viewMoreText}>View More ({products.length - 6})</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
    textShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
  },
  logoutButton: {
    padding: 6,
    borderRadius: 8,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 32,
    fontSize: 14,
    color: colors.textPrimary,
  },
  statusSectionContainer: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
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
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
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
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },
  categoriesList: {
    paddingVertical: 2,
  },
  categoryItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeCategoryItem: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  activeCategoryText: {
    color: 'white',
    fontWeight: '600',
  },
  productsContainer: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  categorySection: {
    marginBottom: spacing.md,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  categoryGrid: {
    paddingBottom: spacing.xs,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginTop: spacing.xs,
  },
  viewMoreText: {
    color: colors.primary,
    fontSize: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
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
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  feedbackButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default HomeScreen;
