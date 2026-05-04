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
    const socialLinks = shop.social_links || {};
    const bannerUrl = (shop as any).banner_image_url;

    const BannerInner = (
      <LinearGradient
        colors={[
          bannerUrl ? 'rgba(0,0,0,0.32)' : `${dark}DD`,
          'rgba(0,0,0,0.52)',
          'rgba(0,0,0,0.76)',
          // fade into the page background colour at the very bottom
          '#F0F0EE',
        ]}
        locations={[0, 0.38, 0.72, 1]}
        style={styles.bannerOverlay}
      >
        {/* ── All shop info, fully centred ── */}
        <View style={styles.bannerCenter}>

          {/* Shop name — 3D calm effect:
              layer 1: dark shadow offset down-right (depth)
              layer 2: bright highlight offset up-left (lift)
              layer 3: the actual white text on top */}
          <View style={styles.shopNameWrapper}>
            {/* depth shadow */}
            <Text style={[styles.shopName, styles.shopNameShadowDepth]} numberOfLines={2}>
              {shop.name}
            </Text>
            {/* highlight */}
            <Text style={[styles.shopName, styles.shopNameHighlight]} numberOfLines={2}>
              {shop.name}
            </Text>
            {/* main text */}
            <Text style={[styles.shopName, styles.shopNameMain]} numberOfLines={2}>
              {shop.name}
            </Text>
          </View>

          {/* Thin divider line */}
          <View style={styles.bannerDivider} />

          {/* Description */}
          {shop.description ? (
            <Text style={styles.bannerDescription} numberOfLines={2}>
              {shop.description}
            </Text>
          ) : null}

          {/* Location */}
          {location ? (
            <View style={styles.bannerRow}>
              <Ionicons name="location" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.bannerMeta}>{location}</Text>
            </View>
          ) : null}

          {/* Product count */}
          <View style={styles.bannerRow}>
            <Ionicons name="cube-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.bannerMeta}>{allProducts.length} Products</Text>
          </View>

          {/* Phone */}
          {shop.phone_number ? (
            <TouchableOpacity
              style={styles.bannerRow}
              onPress={() => Linking.openURL(`tel:${shop.phone_number}`)}
            >
              <Ionicons name="call" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.bannerMeta, styles.bannerLink]}>{shop.phone_number}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Email */}
          {shop.email_contact ? (
            <TouchableOpacity
              style={styles.bannerRow}
              onPress={() => Linking.openURL(`mailto:${shop.email_contact}`)}
            >
              <Ionicons name="mail" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.bannerMeta, styles.bannerLink]}>{shop.email_contact}</Text>
            </TouchableOpacity>
          ) : null}

          {/* Social icons */}
          {Object.keys(socialLinks).length > 0 ? (
            <View style={styles.bannerSocialRow}>
              {socialLinks.facebook ? (
                <TouchableOpacity onPress={() => Linking.openURL(socialLinks.facebook)} style={styles.socialIcon}>
                  <Ionicons name="logo-facebook" size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
              {socialLinks.instagram ? (
                <TouchableOpacity onPress={() => Linking.openURL(socialLinks.instagram)} style={styles.socialIcon}>
                  <Ionicons name="logo-instagram" size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
              {socialLinks.twitter ? (
                <TouchableOpacity onPress={() => Linking.openURL(socialLinks.twitter)} style={styles.socialIcon}>
                  <Ionicons name="logo-twitter" size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
              {socialLinks.linkedin ? (
                <TouchableOpacity onPress={() => Linking.openURL(socialLinks.linkedin)} style={styles.socialIcon}>
                  <Ionicons name="logo-linkedin" size={20} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </LinearGradient>
    );

    return (
      <View style={styles.headerWrapper}>
        {bannerUrl ? (
          <ImageBackground
            source={{ uri: bannerUrl }}
            style={styles.headerBanner}
            resizeMode="cover"
          >
            {BannerInner}
          </ImageBackground>
        ) : (
          <View style={[styles.headerBanner, styles.galaxyBanner]}>
            {STARS.map((s, i) => (
              <View key={i} style={[styles.star, { top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity }]} />
            ))}
            {BannerInner}
          </View>
        )}
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#060818" />
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setError(null); fetchShopData(); }}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : productsLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading shop...</Text>
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
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

      {/* Floating "Main Market" button — bottom centre */}
      <TouchableOpacity
        style={styles.floatingBtn}
        onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
        activeOpacity={0.85}
      >
        <Ionicons name="storefront" size={16} color="#fff" />
        <Text style={styles.floatingBtnText}>Main Market</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F0EE', // dark-white dimmed tone
  },
  headerWrapper: {
    backgroundColor: '#060818',
    marginBottom: 0,
  },
  headerBanner: {
    height: 320,
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,   // gradient bleeds to edge, no padding needed
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCenter: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    // push content up slightly so it sits in the dark zone, not the fade zone
    marginBottom: 32,
  },

  // ── 3D calm shop name ──
  // Three absolutely-stacked Text nodes create depth + lift + main
  shopNameWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 10,
  },
  shopName: {
    fontSize: 28,
    fontFamily: 'Poppins-ExtraBold',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  // Layer 1 — dark offset shadow (gives depth / ground)
  shopNameShadowDepth: {
    color: 'rgba(0,0,0,0.55)',
    position: 'absolute',
    top: 3,
    left: 3,
  },
  // Layer 2 — soft light offset (gives lift / emboss)
  shopNameHighlight: {
    color: 'rgba(255,255,255,0.18)',
    position: 'absolute',
    top: -1,
    left: -1,
  },
  // Layer 3 — the real white text on top
  shopNameMain: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  bannerDivider: {
    width: 48,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: 10,
  },
  bannerDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  bannerMeta: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.2,
  },
  bannerLink: {
    textDecorationLine: 'underline',
    color: 'rgba(255,255,255,0.95)',
  },
  bannerSocialRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  socialIcon: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  stickyHeaderContainer: {
    backgroundColor: '#F0F0EE',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E2',
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
    backgroundColor: '#F0F0EE',
  },
  listContent: {
    paddingBottom: 90, // space for floating button
  },
  categorySection: {
    marginBottom: 2,
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
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
  // Floating Main Market button
  floatingBtn: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -80 }],
    width: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.3,
  },
});

export default PublicShopScreen;
