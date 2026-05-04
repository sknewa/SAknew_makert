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
  ScrollView,
  Share,
  Linking,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useAuth } from '../../context/AuthContext';
import CustomAlert from '../../components/CustomAlert';

// Derive a unique accent color from the shop name so every shop looks different
const PALETTE = [
  ['#6B46C1', '#9F7AEA'], // purple
  ['#2B6CB0', '#63B3ED'], // blue
  ['#276749', '#68D391'], // green
  ['#C05621', '#F6AD55'], // orange
  ['#97266D', '#F687B3'], // pink
  ['#2C7A7B', '#81E6D9'], // teal
  ['#744210', '#F6E05E'], // gold
  ['#1A365D', '#90CDF4'], // navy
];

function shopColorPair(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// Pre-computed star positions for the galaxy default banner
const STARS = Array.from({ length: 60 }, (_, i) => ({
  top: `${(i * 37 + 11) % 100}%` as any,
  left: `${(i * 53 + 7) % 100}%` as any,
  size: i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  opacity: 0.4 + (i % 6) * 0.1,
}));

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
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [priceFilter, setPriceFilter] = useState<'low' | 'high' | null>(null);

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

  const handleShareShop = useCallback(async () => {
    if (!shop) return;
    const webUrl = `https://samakert.netlify.app/PublicShop/${shop.slug}`;
    const location = [shop.town, shop.province].filter(Boolean).join(', ');
    const lines = [
      `\uD83D\uDECD\uFE0F ${shop.name}`,
      shop.description ? `"${shop.description}"` : null,
      location ? `\uD83D\uDCCD ${location}` : null,
      ``,
      `Shop now \uD83D\uDC49 ${webUrl}`,
      ``,
      `Found on SAknew Market \u2014 South Africa's local marketplace`,
    ].filter(l => l !== null).join('\n');
    try { await Share.share({ message: lines }); } catch (_) {}
  }, [shop]);

  const renderHeader = () => {
    if (!shop) return null;
    const [dark, light] = shopColorPair(shop.name);
    const location = [shop.town, shop.province].filter(Boolean).join(', ');
    const initials = shop.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
    const socialLinks = shop.social_links || {};
    const bannerUrl = (shop as any).banner_image_url;

    const BannerContent = (
      <>
        {/* Dark overlay so text is always readable */}
        <LinearGradient
          colors={bannerUrl
            ? ['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.72)']
            : [`${dark}CC`, `${dark}99`, 'rgba(0,0,0,0.82)']}
          style={styles.bannerOverlay}
        >
          {/* Share button top-right */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareShop}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Shop name + location pinned to bottom of banner */}
          <View style={styles.bannerTextBlock}>
            <Text style={styles.shopName} numberOfLines={2}>{shop.name}</Text>
            {location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.locationText}>{location}</Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </>
    );

    return (
      <View style={styles.headerWrapper}>
        {bannerUrl ? (
          <ImageBackground
            source={{ uri: bannerUrl }}
            style={styles.headerBanner}
            resizeMode="cover"
          >
            {BannerContent}
          </ImageBackground>
        ) : (
          // Galaxy / universe default — deep space dots on dark background
          <View style={[styles.headerBanner, styles.galaxyBanner]}>
            {/* Scattered star dots */}
            {STARS.map((s, i) => (
              <View key={i} style={[styles.star, { top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity }]} />
            ))}
            {BannerContent}
          </View>
        )}

        <View style={styles.shopInfoCard}>
          {shop.description ? (
            <Text style={styles.shopDescription}>{shop.description}</Text>
          ) : null}

          <View style={styles.shopMetaContainer}>
            <View style={styles.shopMetaItem}>
              <Ionicons name="cube" size={13} color={dark} />
              <Text style={styles.shopMetaText}>{allProducts.length} Products</Text>
            </View>
          </View>

          {/* Contact row */}
          {(shop.phone_number || shop.email_contact) ? (
            <View style={styles.contactRow}>
              {shop.phone_number ? (
                <TouchableOpacity
                  style={[styles.contactBtn, { borderColor: dark }]}
                  onPress={() => Linking.openURL(`tel:${shop.phone_number}`)}
                >
                  <Ionicons name="call" size={13} color={dark} />
                  <Text style={[styles.contactBtnText, { color: dark }]}>{shop.phone_number}</Text>
                </TouchableOpacity>
              ) : null}
              {shop.email_contact ? (
                <TouchableOpacity
                  style={[styles.contactBtn, { borderColor: dark }]}
                  onPress={() => Linking.openURL(`mailto:${shop.email_contact}`)}
                >
                  <Ionicons name="mail" size={13} color={dark} />
                  <Text style={[styles.contactBtnText, { color: dark }]}>{shop.email_contact}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Social links */}
          {Object.keys(socialLinks).length > 0 ? (
            <View style={styles.socialRow}>
              {socialLinks.facebook ? (
                <TouchableOpacity onPress={() => Linking.openURL(socialLinks.facebook)}>
                  <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                </TouchableOpacity>
              ) : null}
              {socialLinks.instagram ? (
                <TouchableOpacity onPress={() => Linking.openURL(socialLinks.instagram)}>
                  <Ionicons name="logo-instagram" size={22} color="#E4405F" />
                </TouchableOpacity>
              ) : null}
              {socialLinks.twitter ? (
                <TouchableOpacity onPress={() => Linking.openURL(socialLinks.twitter)}>
                  <Ionicons name="logo-twitter" size={22} color="#1DA1F2" />
                </TouchableOpacity>
              ) : null}
              {socialLinks.linkedin ? (
                <TouchableOpacity onPress={() => Linking.openURL(socialLinks.linkedin)}>
                  <Ionicons name="logo-linkedin" size={22} color="#0A66C2" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

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
      
      {/* Quick Filter Chips with Search Icon */}
      <View style={styles.filterChipsContainer}>
        <TouchableOpacity 
          style={[styles.filterChip, priceFilter === 'low' && styles.filterChipActive]}
          onPress={() => setPriceFilter(priceFilter === 'low' ? null : 'low')}
        >
          <Ionicons name="arrow-down" size={14} color={priceFilter === 'low' ? 'white' : colors.primary} />
          <Text style={[styles.filterChipText, priceFilter === 'low' && styles.filterChipTextActive]}>Low Price</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, priceFilter === 'high' && styles.filterChipActive]}
          onPress={() => setPriceFilter(priceFilter === 'high' ? null : 'high')}
        >
          <Ionicons name="arrow-up" size={14} color={priceFilter === 'high' ? 'white' : colors.primary} />
          <Text style={[styles.filterChipText, priceFilter === 'high' && styles.filterChipTextActive]}>High Price</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.searchIconButton}
          onPress={() => setShowSearchInput(!showSearchInput)}
        >
          <Ionicons name="search" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Expandable Search Input */}
      {showSearchInput && (
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
              autoFocus
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => setShowSearchInput(false)} style={styles.closeSearchButton}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
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
  headerWrapper: {
    backgroundColor: colors.card,
    marginBottom: 0,
  },
  headerBanner: {
    height: 180,
    width: '100%',
    overflow: 'hidden',
  },
  galaxyBanner: {
    backgroundColor: '#060818',
  },
  star: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: '#ffffff',
  },
  bannerOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  shareBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    padding: 8,
  },
  bannerTextBlock: {
    marginTop: 'auto',
  },
  shopName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  shopInfoCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shopDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  shopMetaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  shopMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  shopMetaText: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 2,
  },
  stickyHeaderContainer: {
    backgroundColor: colors.background,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    color: colors.primary,
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  searchIconButton: {
    padding: 8,
    marginLeft: 'auto',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  closeSearchButton: {
    marginLeft: 8,
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
    paddingHorizontal: 0,
  },
  categorySection: {
    marginBottom: 0,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    marginHorizontal: 0,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
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
