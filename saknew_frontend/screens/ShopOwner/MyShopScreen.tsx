// saknew_frontend/screens/ShopOwner/MyShopScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ShopOwnerStackParamList } from '../../navigation/ShopOwnerNavigator';
import ProductCard from '../../components/ProductCard';
import StatusSection from '../../components/StatusSection';
import statusService from '../../services/statusService';

// Import types from shop.types.ts instead of types.ts
import { Shop, Product } from '../../services/shop.types';
import { UserStatus } from '../../services/status.types';

// Import shopService directly
import shopService from '../../services/shopService';
import apiClient from '../../services/apiClient';

// Define common colors, used throughout the component and stylesheet
const colors = {
  background: '#F8F9FA',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  card: '#FFFFFF',
  border: '#DEE2E6',
  primary: '#28A745',
  primaryLight: '#2ECC71',
  buttonBg: '#28A745',
  buttonText: '#FFFFFF',
  inputBorder: '#CED4DA',
  inputFocusBorder: '#28A745',
  errorText: '#DC3545',
  successText: '#28A745',
  shadowColor: '#000',
  infoAction: '#17A2B8',
  dangerAction: '#DC3545',
  shareAction: '#6F42C1',
  warningAction: '#FFC107',
  white: '#FFFFFF',
  accent: '#FFD700', // Added for star icon
};

const screenWidth = Dimensions.get('window').width;
const productCardWidth = (screenWidth - (20 * 2) - (10 * 2)) / 2;

// Status Cards Component
const StatusCards: React.FC<{ userId: number; onStatusPress: (userStatus: UserStatus) => void }> = ({ userId, onStatusPress }) => {
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const userStatuses = await statusService.getUserStatuses();
        const myStatuses = userStatuses.filter(s => s.user.id === userId);
        setStatuses(myStatuses);
      } catch (error) {
        // Error fetching statuses
      }
    };
    fetchStatuses();
  }, [userId]);
  
  return (
    <>
      {statuses.map((userStatus) => (
        <TouchableOpacity 
          key={userStatus.user.id} 
          style={styles.statusCard} 
          onPress={() => onStatusPress(userStatus)}
        >
          <View style={[styles.statusPreview, { backgroundColor: userStatus.latest_status?.background_color || '#25D366' }]}>
            <Text style={styles.statusContent} numberOfLines={3}>
              {userStatus.latest_status?.content || userStatus.statuses[0]?.content}
            </Text>
          </View>
          <Text style={styles.statusTime}>
            {userStatus.latest_status ? 
              formatStatusTime(userStatus.latest_status.created_at) : 
              userStatus.statuses[0] ? formatStatusTime(userStatus.statuses[0].created_at) : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );
};

const formatStatusTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString();
};

const MyShopScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ShopOwnerStackParamList>>();
  const { user, isAuthenticated, loading: authLoading, refreshUserProfile } = useAuth(); // Get refreshUserProfile

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const groupProductsByCategory = useCallback((allProducts: Product[]) => {
    const grouped: { [categoryId: number]: { categoryId: number; categoryName: string; categorySlug: string; products: Product[] } } = {};
    const ungrouped: Product[] = [];

    (allProducts || []).forEach(product => {
      // Ensure category is a number, and category_name/category_slug exist
      if (typeof product.category === 'number' && product.category_name && product.category_slug) {
        if (!grouped[product.category]) {
          grouped[product.category] = {
            categoryId: product.category,
            categoryName: product.category_name,
            categorySlug: product.category_slug,
            products: []
          };
        }
        grouped[product.category].products.push(product);
      } else {
        ungrouped.push(product);
      }
    });

    const groupedArray = Object.values(grouped).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    return { groupedArray, ungrouped };
  }, []);

  const fetchShopData = useCallback(async () => {
    if (!refreshing) setLoading(true);
    setError(null);
    
    try {
      if (!user || !isAuthenticated) {
        setShop(null);
        setProducts([]);
        return;
      }
      
      if (!user.profile?.is_seller) {
        setShop(null);
        setProducts([]);
        return;
      }

      // Try to fetch user's shop directly from API
      try {
        const fetchedShop = await shopService.getMyShop();
        
        if (!fetchedShop) {
          setShop(null);
          setProducts([]);
          return;
        }
        
        setShop(fetchedShop);

        // Get products for the shop only if slug exists
        if (fetchedShop.slug) {
          const productResponse: any = await shopService.getShopProducts(fetchedShop.slug);
        
        // FIX: Handle paginated response from the API
        if (productResponse && Array.isArray(productResponse.results)) {
          setProducts(productResponse.results);
        } else if (Array.isArray(productResponse)) {
          // Handle cases where the API might just return an array directly.
          setProducts(productResponse);
          } else {
            setProducts([]);
          }
        } else {
          setProducts([]);
        }
        
        // Fetch new orders count
        await fetchNewOrdersCount();
        
      } catch (shopError: any) {
        if (shopError.response?.status === 404) {
          setShop(null);
          setProducts([]);
        } else {
          throw shopError;
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError('Failed to load shop data. Please try again.');
      }
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isAuthenticated, refreshing]);
  
  const fetchNewOrdersCount = useCallback(async () => {
    if (!user?.profile?.is_seller || !user?.profile?.shop_slug) return;
    
    try {
      const response = await apiClient.get('/api/orders/');
      const allOrders = response.data.results || [];
      
      const shopNameToSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
      
      const activeOrders = allOrders.filter(order => {
        // Only count paid orders
        if (order.payment_status !== 'Completed') return false;
        
        // Only count active orders (not completed or cancelled)
        if (!['processing', 'ready_for_delivery'].includes(order.order_status)) return false;
        
        // Check if order has items from this shop
        const hasSellerItems = order.items?.some(item => {
          const productShopSlug = item.product?.shop_name ? shopNameToSlug(item.product.shop_name) : null;
          return item.product?.shop?.slug === user.profile.shop_slug || productShopSlug === user.profile.shop_slug;
        });
        
        return hasSellerItems;
      });
      
      setNewOrdersCount(activeOrders.length);
    } catch (error) {
      console.error('Error fetching orders count:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        fetchShopData();
      }
    }, [authLoading, fetchShopData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Also refresh user profile in case shop_slug changed due to an external action
    if (isAuthenticated) {
      refreshUserProfile()
        .then(() => fetchShopData())
        .catch(err => {
          fetchShopData(); // Still try to fetch shop data even if profile refresh fails
        });
    } else {
      fetchShopData();
    }
  }, [fetchShopData, refreshUserProfile, isAuthenticated]);

  const handleShareShopLink = async () => {
    if (shop?.slug) {
      // Use a dynamic URL that includes the shop slug
      const shareableUrl = `saknew://shop/${shop.slug}`;
      try {
        await Share.share({
          message: `Check out my shop on Saknew Market: ${shop.name}\n${shareableUrl}`,
          url: shareableUrl,
        });
      } catch (shareError: any) {
        Alert.alert('Error Sharing', 'Could not share the shop link. Please try again.');
      }
    } else {
      Alert.alert('No Shop Link', 'Cannot share link as your shop details are not available.');
    }
  };

  const handleCategoryTitlePress = (categorySlug: string, categoryName: string) => {
    if (shop?.slug) {
      // Navigate to the category products screen with correct params and route name
      navigation.navigate('CategoryProductsScreen', {
        shopSlug: shop.slug,
        categorySlug,
        categoryName
      });
    } else {
      Alert.alert('Shop Not Found', 'Cannot view category products without a shop context.');
    }
  };

  const handleStatusPress = (userStatus: UserStatus) => {
    navigation.getParent()?.navigate('StatusViewer', { userStatus });
  };

  const handleCreateStatus = () => {
    navigation.getParent()?.navigate('CreateStatus');
  };

  // Check if the current user is the shop owner
  const isShopOwner = isAuthenticated && 
                     user?.profile?.is_seller && 
                     shop?.user?.id === user?.id && 
                     shop?.slug === user?.profile?.shop_slug;

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>Loading shop data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state with retry button
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.infoContainer}>
          <Ionicons name="warning-outline" size={60} color={colors.errorText} />
          <Text style={styles.title}>Error</Text>
          <Text style={styles.messageText}>{error}</Text>
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={fetchShopData}>
            <Ionicons name="refresh-outline" size={20} color={colors.buttonText} />
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user?.profile?.is_seller) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.infoContainer}>
            <Ionicons name="lock-closed-outline" size={60} color={colors.textSecondary} />
            <Text style={styles.title}>Access Denied</Text>
            <Text style={styles.messageText}>
              You must be an authenticated seller to manage your shop. Please log in or register.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => navigation.getParent()?.navigate('AuthStack', { screen: 'Login' })}
            >
              <Ionicons name="log-in-outline" size={20} color={colors.buttonText} />
              <Text style={styles.buttonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          <View style={styles.infoContainer}>
            <Ionicons name="storefront-outline" size={60} color={colors.primaryLight} />
            <Text style={styles.title}>Welcome, Seller!</Text>
            <Text style={styles.messageText}>It looks like you haven't created your shop yet. Get started and create one to begin selling!</Text>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => navigation.getParent()?.navigate('CreateShop')}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.buttonText} />
              <Text style={styles.buttonText}>Create Your Shop Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  const { groupedArray: groupedProducts, ungrouped: ungroupedProducts } = groupProductsByCategory(products ?? []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.container}>
          {/* Shop Header Section */}
          <View style={styles.shopHeader}>
            <View style={styles.shopNameRow}>
              <Text style={styles.shopName}>{shop.name}</Text>
              
              {isShopOwner && (
                <View style={styles.shopActions}>
                  <TouchableOpacity 
                    style={styles.iconButton} 
                    onPress={() => navigation.navigate('EditShop', { shopSlug: shop.slug })}
                  >
                    <Ionicons name="pencil-outline" size={18} color={colors.infoAction} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.iconButton} 
                    onPress={() => Alert.alert('Delete Shop', 'Are you sure you want to delete your shop? This action cannot be undone.', [
                      {text: 'Cancel', style: 'cancel'}, 
                      {text: 'Delete', onPress: async () => {
                        try {
                          await shopService.deleteShop(shop.slug);
                          Alert.alert('Shop Deleted', 'Your shop has been successfully deleted.');
                          setShop(null);
                          setProducts([]);
                          await refreshUserProfile(); // Await to ensure state is up-to-date
                        } catch (deleteError: any) {
          Alert.alert('Deletion Failed', 'Could not delete shop. Please try again.');
                        }
                      }}
                    ])}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.dangerAction} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            {/* Shop Description */}
            {shop.description && (
              <Text style={styles.shopDescription}>{shop.description}</Text>
            )}
            
            {isShopOwner && (
              <View style={styles.ownerTag}>
                <Ionicons name="star" size={14} color={colors.warningAction} />
                <Text style={styles.ownerTagText}>You are the owner</Text>
              </View>
            )}

            {/* Shop Stats Section */}
            <View style={styles.shopStatsSection}>
              <View style={styles.statsSectionHeader}>
                <Text style={styles.statsSectionTitle}>Shop Statistics</Text>
                <View style={styles.headerButtons}>
                  <TouchableOpacity style={styles.shareButton} onPress={handleShareShopLink}>
                    <Ionicons name="share-social-outline" size={14} color={colors.buttonText} />
                    <Text style={styles.shareButtonText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.statsGrid}>
                <TouchableOpacity 
                  style={styles.statCard}
                  onPress={() => navigation.navigate('CategoryProductsScreen', { shopSlug: shop.slug, categorySlug: 'all', categoryName: 'All Products' })}
                >
                  <Ionicons name="cube-outline" size={18} color={colors.primary} />
                  <Text style={styles.statValue}>{shop.products_count || products.length}</Text>
                  <Text style={styles.statLabel}>Total Products</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statCard}
                  onPress={() => navigation.navigate('CategoryProductsScreen', { shopSlug: shop.slug, categorySlug: 'in-stock', categoryName: 'In Stock' })}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.successText} />
                  <Text style={styles.statValue}>{shop.active_products_count || products.filter(p => p.stock > 0).length}</Text>
                  <Text style={styles.statLabel}>In Stock</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statCard}
                  onPress={() => navigation.navigate('CategoryProductsScreen', { shopSlug: shop.slug, categorySlug: 'out-of-stock', categoryName: 'Out of Stock' })}
                >
                  <Ionicons name="alert-circle-outline" size={18} color={colors.errorText} />
                  <Text style={styles.statValue}>{(shop.products_count || 0) - (shop.active_products_count || 0)}</Text>
                  <Text style={styles.statLabel}>Out of Stock</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statCard}
                  onPress={() => navigation.navigate('SellerOrders')}
                >
                  <View style={styles.statCardContent}>
                    <Ionicons name="bag-handle-outline" size={18} color={colors.infoAction} />
                    {newOrdersCount > 0 && (
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeText}>{newOrdersCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.statValue}>{newOrdersCount}</Text>
                  <Text style={styles.statLabel}>New Orders</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Section */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScrollView}>
              {/* My Status Button */}
              <TouchableOpacity style={styles.myStatusCard} onPress={handleCreateStatus}>
                <View style={styles.myStatusContent}>
                  <Ionicons name="add" size={24} color="#25D366" />
                  <Text style={styles.myStatusText}>My Status</Text>
                </View>
              </TouchableOpacity>
              
              {/* Status Cards */}
              {shop?.user?.id && (
                <StatusCards userId={shop.user.id} onStatusPress={handleStatusPress} />
              )}
            </ScrollView>
          </View>

          {/* Product Listing Section */}
          <View style={styles.productListingSection}>

                {products.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="cube-outline" size={70} color={colors.textSecondary} />
                <Text style={styles.title}>No Products Yet!</Text>
                <Text style={styles.messageText}>Your shop is currently empty. Add your first product to get started!</Text>
                {isShopOwner && (
                  <TouchableOpacity 
                    style={[styles.button, styles.buttonPrimary]} 
                    onPress={() => navigation.navigate('AddProduct')}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.buttonText} />
                    <Text style={styles.buttonText}>Add First Product</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {groupedProducts.map((group) => (
                  <View key={group.categoryId} style={styles.categorySection}>
                    <TouchableOpacity
                      style={styles.categoryTitleTouchable}
                      onPress={() => handleCategoryTitlePress(group.categorySlug, group.categoryName)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryTitle}>
                        {group.categoryName} <Text style={styles.productCountText}>({group.products.length})</Text>
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.carouselWrapper}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.productCarousel}
                        scrollEventThrottle={16}
                      >
                        {group.products.map(product => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            isShopOwner={isShopOwner}
                            navigation={navigation.getParent()}
                            onPress={() => {
                              if (isShopOwner) {
                                navigation.getParent()?.navigate('ProductManagement', { productId: product.id });
                              } else {
                                navigation.getParent()?.navigate('ProductDetail', { productId: product.id });
                              }
                            }}
                            onProductDeleted={fetchShopData}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                ))}

                {ungroupedProducts.length > 0 && (
                  <View style={styles.categorySection}>
                    <TouchableOpacity
                      style={styles.categoryTitleTouchable}
                      onPress={() => handleCategoryTitlePress('ungrouped', 'Other Products')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryTitle}>
                        Other Products <Text style={styles.productCountText}>({ungroupedProducts.length})</Text>
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.carouselWrapper}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.productCarousel}
                        scrollEventThrottle={16}
                      >
                        {ungroupedProducts.map(product => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            isShopOwner={isShopOwner}
                            navigation={navigation.getParent()}
                            onPress={() => {
                              if (isShopOwner) {
                                navigation.getParent()?.navigate('ProductManagement', { productId: product.id });
                              } else {
                                navigation.getParent()?.navigate('ProductDetail', { productId: product.id });
                              }
                            }}
                            onProductDeleted={fetchShopData}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    paddingHorizontal: 15,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.card,
    borderRadius: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    margin: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.buttonBg,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    marginTop: 10,
    marginHorizontal: 5,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonInfo: { backgroundColor: colors.infoAction },
  buttonDanger: { backgroundColor: colors.dangerAction },

  shopHeader: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  shopName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textTransform: 'capitalize',
    flex: 1,
  },
  shopDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  ownerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 8,
    alignSelf: 'center',
  },
  ownerTagText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  shopNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
  },
  shopActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // --- NEW STYLES FOR HEADER LAYOUT ---
  shopStatsSection: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardContent: {
    position: 'relative',
    alignItems: 'center',
  },
  orderBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.errorText,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 3,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsButton: {
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  shareButton: {
    backgroundColor: colors.shareAction,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: colors.buttonText,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  descriptionContainer: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  // --- END NEW STYLES FOR HEADER LAYOUT ---

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: '100%',
    marginTop: 0,
    marginBottom: 0,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 6, // Slightly less rounded
    paddingVertical: 5, // Reduced padding
    paddingHorizontal: 8, // Reduced padding
    margin: 3, // Reduced margin
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, // Even softer shadow
    shadowRadius: 2,
    elevation: 1, // Reduced elevation
  },
  statText: {
    fontSize: 11, // Further reduced font size
    color: colors.textPrimary,
    fontWeight: '600',
    marginLeft: 5, // Reduced icon margin
  },
  productListingSection: {
    width: '100%',
    marginTop: 10,
  },

  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 30,
    backgroundColor: colors.card,
    borderRadius: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categorySection: {
    marginBottom: 15,
  },
  categoryTitleTouchable: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginBottom: 5,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  productCountText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: 'normal',
  },
  carouselWrapper: {
    // Add any specific styling for your carousel wrapper if needed
  },
  productCarousel: {
    paddingRight: 10, // Add some padding so the last item isn't cut off
  },
  statusScrollView: {
    paddingLeft: 15,
    marginTop: 12,
  },
  myStatusCard: {
    width: 80,
    height: 100,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  myStatusContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myStatusText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  statusCard: {
    width: 80,
    height: 100,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusPreview: {
    flex: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusTime: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 6,
  },
});

export default MyShopScreen;