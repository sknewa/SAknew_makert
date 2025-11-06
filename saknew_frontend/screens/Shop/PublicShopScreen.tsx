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
  StatusBar,
  RefreshControl,
  ScrollView
} from 'react-native';
import { globalStyles, colors, spacing } from '../../styles/globalStyles';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Product as AppProduct } from '../../types';
import { Product as ServiceProduct } from '../../services/shop.types';
import { MainNavigationProp } from '../../navigation/types';
import { shopService } from '../../services/apiService';
import { getImageUrl } from '../../utils/imageUtils';
import StatusItem from '../../components/StatusItem';
import statusService from '../../services/statusService';
import { UserStatus } from '../../services/status.types';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';
import { useBadges } from '../../context/BadgeContext';
import { useAuth } from '../../context/AuthContext.minimal';
import CustomAlert from '../../components/CustomAlert';

const convertServiceProduct = (p: ServiceProduct): AppProduct => {
  const serviceProduct = p as any;
  return {
    ...serviceProduct,
    user: serviceProduct.user || { id: 0, username: 'Unknown', email: '' },
    images: serviceProduct.images || [],
  } as AppProduct;
};

const PublicShopScreen = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const route = useRoute();
  const { shopSlug } = route.params as { shopSlug: string };
  const { cartCount, orderCount, walletBalance } = useBadges();
  const { isAuthenticated } = useAuth();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });
  
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<AppProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [groupedProducts, setGroupedProducts] = useState<{[key: string]: AppProduct[]}>({});
  const [shopStatus, setShopStatus] = useState<UserStatus | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [allProducts, setAllProducts] = useState<AppProduct[]>([]);

  const categorySections = useMemo(() => 
    Object.entries(groupedProducts), 
  [groupedProducts]);

  const handleStatusPress = (userStatus: any) => {
    navigation.navigate('StatusViewer', { userStatus });
  };

  const fetchShopData = useCallback(async () => {
    try {
      const shopData = await shopService.getShopBySlug(shopSlug);
      setShop(shopData);
      setError(null);
    } catch (err: any) {
      safeError('Error fetching shop:', err);
      if (err.response?.status === 404) {
        setError('Shop not found. This shop may have been removed or the link is incorrect.');
      } else {
        setError('Unable to load shop. Please try again later.');
      }
    }
  }, [shopSlug]);

  const fetchShopStatus = useCallback(async () => {
    if (!shop) return;
    const ownerId = shop.owner?.id || shop.user_id || shop.user?.id;
    if (!ownerId) {
      safeLog('No shop owner ID available:', shop);
      return;
    }
    try {
      const statuses = await statusService.getUserStatuses();
      const shopUserStatus = statuses.find(s => s.user.id === ownerId);
      setShopStatus(shopUserStatus || null);
    } catch (err) {
      safeLog('Error fetching shop status:', err);
    }
  }, [shop]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await shopService.getCategories();
      const categoryList = Array.isArray(response) ? response : response.results || [];
      setCategories([{ id: 0, name: 'All', slug: 'all' }, ...categoryList]);
    } catch (err) {
      safeError('Error fetching categories:', err);
    }
  }, []);

  const visibleCategories = useMemo(() => {
    if (categories.length === 0) return [];
    
    const allCategoryName = categories[0];
    const categoriesWithCount = categories.slice(1).map(cat => ({
      ...cat,
      productCount: allProducts.filter(p => p.category_name === cat.name).length
    })).filter(cat => cat.productCount > 0).sort((a, b) => b.productCount - a.productCount);
    
    return [allCategoryName, ...categoriesWithCount];
  }, [categories, allProducts]);

  const fetchProducts = useCallback(async (categorySlug?: string) => {
    if (!shop) return;
    setProductsLoading(true);
    try {
      const response = await shopService.getShopProducts(shopSlug);
      const productList = Array.isArray(response) ? response : response.results || [];
      
      const enrichedProducts = await Promise.all(productList.map(async (product) => {
        try {
          const shopData = await shopService.getShopBySlug(product.shop_name.toLowerCase().replace(/[''\s]/g, '-').replace(/-+/g, '-'));
          return {
            ...product,
            shop_latitude: shopData?.latitude,
            shop_longitude: shopData?.longitude
          };
        } catch {
          return product;
        }
      }));
      const convertedProducts = enrichedProducts.map(convertServiceProduct);
      
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
    } catch (err: any) {
      if (err.response?.status !== 404) {
        safeError('Error fetching products:', err);
      }
    } finally {
      setProductsLoading(false);
      setRefreshing(false);
    }
  }, [shopSlug, shop]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetchProducts();
      return;
    }
    
    setProductsLoading(true);
    const filtered = allProducts.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    setProducts(filtered);
    const grouped = filtered.reduce((acc, product) => {
      const categoryName = product.category_name || 'Other';
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(product);
      return acc;
    }, {} as {[key: string]: AppProduct[]});
    setGroupedProducts(grouped);
    setProductsLoading(false);
  }, [allProducts, fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchShopData();
      fetchCategories();
    }, [fetchShopData, fetchCategories])
  );

  useEffect(() => {
    if (shop) {
      fetchProducts();
    }
  }, [shop, fetchProducts]);

  useEffect(() => {
    if (shop) {
      fetchShopStatus();
    }
  }, [shop, fetchShopStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery('');
    setSelectedCategory('all');
    fetchShopData();
    fetchProducts();
    fetchShopStatus();
  }, [fetchShopData, fetchProducts, fetchShopStatus]);

  const handleCategorySelect = useCallback((categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSearchQuery('');
    fetchProducts(categorySlug === 'all' ? undefined : categorySlug);
  }, [fetchProducts]);

  const renderHeader = () => (
    <>
      {shop && (
        <View style={styles.combinedHeader}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={styles.howItWorksButton}
              onPress={() => navigation.navigate('HowItWorks' as any)}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.howItWorksText}>How it works</Text>
            </TouchableOpacity>
            {isAuthenticated ? (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
              >
                <Ionicons name="home-outline" size={20} color={colors.primary} />
                <Text style={styles.logoutText}>Home</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => navigation.navigate('Login' as any)}
                >
                  <Ionicons name="log-in-outline" size={20} color={colors.primary} />
                  <Text style={styles.loginText}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={() => navigation.navigate('Register' as any)}
                >
                  <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                  <Text style={styles.registerText}>Register</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <View style={styles.shopContent}>
            <View style={styles.shopIconContainer}>
              <Ionicons name="storefront" size={32} color={colors.primary} />
            </View>
            <Text style={styles.shopName}>
              {shop.name}
            </Text>
            {shop.description && (
              <Text style={styles.shopDescription}>{shop.description}</Text>
            )}
            <View style={styles.shopMetaContainer}>
              <View style={styles.shopMetaItem}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={styles.shopMetaText}>
                  {shop.province || 'South Africa'}
                  {shop.city ? `, ${shop.city}` : ''}
                  {shop.location && shop.location !== shop.city && shop.location !== shop.province ? `, ${shop.location}` : ''}
                </Text>
              </View>
              <View style={styles.shopMetaItem}>
                <Ionicons name="cube" size={16} color={colors.primary} />
                <Text style={styles.shopMetaText}>{allProducts.length} Products</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </>
  );

  const renderStickyHeader = () => (
    <View style={styles.stickyHeaderContainer}>
      {shopStatus && (
        <View style={styles.statusSectionContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
            <StatusItem
              userStatus={shopStatus}
              onPress={() => handleStatusPress(shopStatus)}
            />
          </ScrollView>
        </View>
      )}
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
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.safeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            fetchShopData();
          }}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : productsLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={[{ type: 'header' }, { type: 'sticky' }, ...categorySections.map(([name, prods]) => ({ type: 'category', categoryName: name, products: prods }))]}
          keyExtractor={(item, index) => item.type === 'category' ? item.categoryName : item.type + index}
          renderItem={({ item }) => {
            if (item.type === 'header') return renderHeader();
            if (item.type === 'sticky') return renderStickyHeader();
            return (
              <CategorySection
                categoryName={item.categoryName}
                products={item.products}
                navigation={navigation}
              />
            );
          }}
          stickyHeaderIndices={[1]}
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
            categorySections.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="basket-outline" size={60} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No products found</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}>
          <Ionicons name="home-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => {
          if (!isAuthenticated) {
            setAlertConfig({
              visible: true,
              title: 'Login Required',
              message: 'Please login to view your cart',
              onConfirm: () => {
                setAlertConfig({ ...alertConfig, visible: false });
                navigation.navigate('Login' as any);
              },
            });
          } else {
            navigation.navigate('MainTabs', { screen: 'CartTab' });
          }
        }}>
          <View>
            <Ionicons name="cart-outline" size={24} color={colors.textSecondary} />
            {isAuthenticated && cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.navText}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => {
          if (!isAuthenticated) {
            setAlertConfig({
              visible: true,
              title: 'Login Required',
              message: 'Please login to view your orders',
              onConfirm: () => {
                setAlertConfig({ ...alertConfig, visible: false });
                navigation.navigate('Login' as any);
              },
            });
          } else {
            navigation.navigate('MainTabs', { screen: 'OrdersTab' });
          }
        }}>
          <View>
            <Ionicons name="receipt-outline" size={24} color={colors.textSecondary} />
            {isAuthenticated && orderCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{orderCount > 99 ? '99+' : orderCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.navText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => {
          if (!isAuthenticated) {
            setAlertConfig({
              visible: true,
              title: 'Login Required',
              message: 'Please login to access your wallet',
              onConfirm: () => {
                setAlertConfig({ ...alertConfig, visible: false });
                navigation.navigate('Login' as any);
              },
            });
          } else {
            navigation.navigate('MainTabs', { screen: 'WalletTab' });
          }
        }}>
          <Ionicons name="wallet-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.navText}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => {
          if (!isAuthenticated) {
            setAlertConfig({
              visible: true,
              title: 'Login Required',
              message: 'Please login to manage your shop',
              onConfirm: () => {
                setAlertConfig({ ...alertConfig, visible: false });
                navigation.navigate('Login' as any);
              },
            });
          } else {
            navigation.navigate('MainTabs', { screen: 'ShopTab' });
          }
        }}>
          <Ionicons name="storefront-outline" size={24} color={colors.textSecondary} />
          <Text style={styles.navText}>Shop</Text>
        </TouchableOpacity>
      </View>
      
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onCancel={() => setAlertConfig({ ...alertConfig, visible: false })}
        onConfirm={alertConfig.onConfirm}
        confirmText="Login"
      />
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
  const categorySlug = products.length > 0 ? products[0].category_slug : null;

  const handleViewMore = () => {
    if (categorySlug) {
      navigation.navigate('CategoryProducts', {
        categoryName,
        categorySlug,
      });
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
  combinedHeader: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 8,
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  shopContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  howItWorksButton: {
    padding: 6,
    alignItems: 'center',
  },
  howItWorksText: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  logoutButton: {
    padding: 6,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  loginButton: {
    padding: 6,
    alignItems: 'center',
  },
  loginText: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  registerButton: {
    padding: 6,
    alignItems: 'center',
  },
  registerText: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  shopIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  shopName: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 1.5,
    color: '#6B46C1',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  shopDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  shopMetaContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  shopMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  shopMetaText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  stickyHeaderContainer: {
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
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
  scrollView: {
    paddingHorizontal: 4,
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingBottom: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default PublicShopScreen;
