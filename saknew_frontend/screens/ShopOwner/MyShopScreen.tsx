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
  Platform,
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
import { Order, OrderItem } from '../../types';
import { UserStatus } from '../../services/status.types';

// Import shopService directly
import shopService from '../../services/shopService';
import apiClient from '../../services/apiClient';

const colors = {
  background: '#F5F5F5',
  textPrimary: '#222',
  textSecondary: '#999',
  card: '#FFFFFF',
  border: '#E0E0E0',
  primary: '#10B981',
  buttonText: '#FFFFFF',
  errorText: '#FF4444',
  successText: '#10B981',
  shadowColor: '#000',
  infoAction: '#3B82F6',
  dangerAction: '#FF4444',
  shareAction: '#8B5CF6',
  warningAction: '#FF9800',
  white: '#FFFFFF',
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
  const [salesCount, setSalesCount] = useState(0);

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
    if (!user?.profile?.is_seller || !user?.profile?.shop_slug) {
      return;
    }
    
    try {
      const response = await apiClient.get('/api/orders/');
      const allOrders = response.data.results || response.data || [];
      
      const shopNameToSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
      
      const activeOrders = allOrders.filter((order: Order) => {
        if (order.payment_status !== 'paid') return false;
        if (order.user.email === user.email) return false;
        if (!['pending', 'processing', 'ready_for_delivery'].includes(order.order_status)) return false;
        
        const hasSellerItems = order.items?.some((item: OrderItem) => {
          const productShopSlug = item.product?.shop_name ? shopNameToSlug(item.product.shop_name) : null;
          return productShopSlug === user.profile.shop_slug;
        });
        
        return hasSellerItems;
      });
      
      setNewOrdersCount(activeOrders.length);
      
      const completedOrders = allOrders.filter((order: Order) => {
        if (order.payment_status !== 'paid') return false;
        if (order.user.email === user.email) return false;
        if (order.order_status !== 'delivered') return false;
        
        const hasSellerItems = order.items?.some((item: OrderItem) => {
          const productShopSlug = item.product?.shop_name ? shopNameToSlug(item.product.shop_name) : null;
          return productShopSlug === user.profile.shop_slug;
        });
        
        return hasSellerItems;
      });
      
      setSalesCount(completedOrders.length);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        fetchShopData();
        fetchNewOrdersCount();
      }
    }, [authLoading, fetchShopData, fetchNewOrdersCount])
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
    console.log('🔍 Share button pressed');
    console.log('Shop data:', { slug: shop?.slug, name: shop?.name });
    
    if (shop?.slug) {
      const webUrl = `https://saknew-makert-e7ac1361decc.herokuapp.com/shop/${shop.slug}`;
      const shareMessage = `🛍️ Check out my shop on Saknew Market!\n\n${shop.name}${shop.description ? `\n${shop.description}` : ''}\n\n${webUrl}`;
      
      console.log('Share message:', shareMessage);
      
      try {
        await Share.share({
          message: shareMessage,
        });
        console.log('✅ Share completed');
      } catch (shareError: any) {
        console.error('Share error:', shareError);
        Alert.alert('Error Sharing', `Could not share the shop link: ${shareError.message}`);
      }
    } else {
      console.warn('⚠️ No shop slug available');
      Alert.alert('No Shop Link', 'Cannot share link as your shop details are not available.');
    }
  };

  const handleCategoryTitlePress = (categorySlug: string, categoryName: string) => {
    const categoryProducts = products.filter(p => p.category_slug === categorySlug);
    navigation.navigate('CategoryProductsScreen', {
      categoryName,
      products: categoryProducts
    });
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
            <Ionicons name="storefront-outline" size={60} color={colors.primary} />
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
                    onPress={handleShareShopLink}
                  >
                    <Ionicons name="share-social-outline" size={16} color={colors.shareAction} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconButton} 
                    onPress={() => navigation.navigate('EditShop', { shopSlug: shop.slug })}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.infoAction} />
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
                          await refreshUserProfile();
                        } catch (deleteError: any) {
          Alert.alert('Deletion Failed', 'Could not delete shop. Please try again.');
                        }
                      }}
                    ])}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.dangerAction} />
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
            <View style={styles.statsRow}>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('CategoryProductsScreen', { categoryName: 'All Products', products: products })}
              >
                <Text style={styles.statLabel}>Total</Text>
                <View style={styles.statValueRow}>
                  <Ionicons name="cube-outline" size={14} color={colors.primary} />
                  <Text style={styles.statText}>{products.length}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('CategoryProductsScreen', { categoryName: 'In Stock', products: products.filter(p => p.stock > 0) })}
              >
                <Text style={styles.statLabel}>In Stock</Text>
                <View style={styles.statValueRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.successText} />
                  <Text style={styles.statText}>{products.filter(p => p.stock > 0).length}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('CategoryProductsScreen', { categoryName: 'Out of Stock', products: products.filter(p => p.stock === 0) })}
              >
                <Text style={styles.statLabel}>Out</Text>
                <View style={styles.statValueRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.errorText} />
                  <Text style={styles.statText}>{products.filter(p => p.stock === 0).length}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('SellerOrders')}
              >
                <Text style={styles.statLabel}>Orders</Text>
                <View style={styles.statValueRow}>
                  <Ionicons name="bag-handle-outline" size={14} color={colors.infoAction} />
                  <Text style={styles.statText}>{newOrdersCount}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Sales Chart */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Sales Overview</Text>
              <View style={styles.chartBars}>
                <View style={styles.barItem}>
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, { height: Math.min((salesCount / Math.max(products.length, salesCount, 1)) * 80, 80), backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={styles.barLabel}>Sales</Text>
                  <Text style={styles.barValue}>{salesCount}</Text>
                </View>
                <View style={styles.barItem}>
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, { height: Math.min((products.length / Math.max(products.length, salesCount, 1)) * 80, 80), backgroundColor: colors.infoAction }]} />
                  </View>
                  <Text style={styles.barLabel}>Products</Text>
                  <Text style={styles.barValue}>{products.length}</Text>
                </View>
              </View>
            </View>
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
                            shopLatitude={shop.latitude}
                            shopLongitude={shop.longitude}
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
                            shopLatitude={shop.latitude}
                            shopLongitude={shop.longitude}
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
    paddingBottom: 12,
  },
  container: {
    flex: 1,
    paddingHorizontal: 10,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginHorizontal: 5,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonInfo: { backgroundColor: colors.infoAction },
  buttonDanger: { backgroundColor: colors.dangerAction },

  shopHeader: {
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'capitalize',
    flex: 1,
  },
  shopDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  ownerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 6,
    alignSelf: 'center',
  },
  ownerTagText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
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
    padding: 4,
    marginLeft: 4,
  },
  // --- NEW STYLES FOR HEADER LAYOUT ---
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 6,
    marginTop: 4,
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
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '700',
    marginLeft: 3,
  },
  productListingSection: {
    width: '100%',
    marginTop: 6,
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
    marginBottom: 10,
  },
  categoryTitleTouchable: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  productCountText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  carouselWrapper: {
    // Add any specific styling for your carousel wrapper if needed
  },
  productCarousel: {
    paddingRight: 10, // Add some padding so the last item isn't cut off
  },
  chartContainer: {
    width: '100%',
    paddingVertical: 10,
    marginTop: 6,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  bar: {
    width: 40,
    borderRadius: 4,
    minHeight: 10,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  barValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  statusCard: {
    marginRight: 10,
    alignItems: 'center',
  },
  statusPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  statusContent: {
    color: colors.white,
    fontSize: 10,
    textAlign: 'center',
  },
  statusTime: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

export default MyShopScreen;