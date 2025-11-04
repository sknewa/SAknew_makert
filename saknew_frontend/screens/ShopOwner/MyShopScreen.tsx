// saknew_frontend/screens/ShopOwner/MyShopScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ShopOwnerStackParamList } from '../../navigation/ShopOwnerNavigator';
import ProductCard from '../../components/ProductCard';
import statusService from '../../services/statusService'; // Keeping for potential future use or if other services rely on it
// Removed: import StatusSection from '../../components/StatusSection'; 
// Removed: import { UserStatus } from '../../services/status.types'; 

// Import types from shop.types.ts instead of types.ts
import { Shop, Product } from '../../services/shop.types';
import { Order, OrderItem } from '../../types';

// Import shopService directly
import shopService from '../../services/shopService';
import apiClient from '../../services/apiClient';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

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

// Removed StatusCards component and related formatStatusTime function

const MyShopScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ShopOwnerStackParamList>>();
  const { user, isAuthenticated, loading: authLoading, refreshUserProfile } = useAuth();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    safeLog('🔄 [MyShopScreen] fetchShopData called');
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
    if (!user?.profile?.is_seller) {
      return;
    }
    
    try {
      const response = await apiClient.get('/api/orders/');
      const allOrders = response.data.results || response.data || [];
      
      const sellerOrders = allOrders.filter((order: Order) => {
        if (order.payment_status !== 'paid') return false;
        if (order.user.email === user.email) return false;
        
        // Find the shopId for the current order item (this logic is slightly complex and relies on item.product?.shop)
        // I will simplify the shopId determination for this filter logic to use the logged-in user's shop_id
        const hasSellerItems = order.items?.some((item: OrderItem) => {
          const itemShopId = typeof item.product?.shop === 'number' ? item.product.shop : item.product?.shop?.id;
          return itemShopId === user.profile?.shop_id;
        });
        
        return hasSellerItems;
      });
      
      const activeOrders = sellerOrders.filter((order: Order) => 
        ['pending', 'processing', 'approved', 'ready_for_delivery'].includes(order.order_status)
      );
      
      const completedOrders = sellerOrders.filter((order: Order) => 
        ['completed', 'cancelled'].includes(order.order_status)
      );
      
      setNewOrdersCount(activeOrders.length);
      setCompletedOrdersCount(completedOrders.length);
    } catch (error) {
      safeError('Error fetching orders:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        fetchShopData();
        // Check for seller status and shop slug before fetching orders
        if (user?.profile?.is_seller && user?.profile?.shop_slug) {
          fetchNewOrdersCount();
        }
      }
    }, [authLoading, fetchShopData, fetchNewOrdersCount, user])
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
    safeLog('🔍 Share button pressed');
    safeLog('Shop data:', { slug: shop?.slug, name: shop?.name });
    
    if (shop?.slug) {
      const webUrl = `https://saknew-makert.netlify.app/PublicShop/${shop.slug}`;
      const shareMessage = `🛍️ Check out my shop on Saknew Market!\n\n${shop.name}${shop.description ? `\n${shop.description}` : ''}\n\n${webUrl}`;
      
      safeLog('Share message:', shareMessage);
      
      try {
        await Share.share({
          message: shareMessage,
        });
        safeLog('✅ Share completed');
      } catch (shareError: any) {
        safeError('Share error:', shareError);
        Alert.alert('Error Sharing', `Could not share the shop link: ${shareError.message}`);
      }
    } else {
      safeWarn('⚠️ No shop slug available');
      Alert.alert('No Shop Link', 'Cannot share link as your shop details are not available.');
    }
  };

  const handleCategoryTitlePress = (categorySlug: string, categoryName: string) => {
    navigation.navigate('CategoryProductsScreen', {
      categorySlug,
      categoryName,
      products: []
    } as any);
  };

  // Removed: handleStatusPress
  // Removed: handleCreateStatus

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

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const { groupedArray: filteredGroupedProducts, ungrouped: filteredUngroupedProducts } = groupProductsByCategory(filteredProducts);

  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => ({ id: p.category, name: p.category_name })).filter(c => c.id && c.name)));
  const uniqueCategories = categories.filter((cat, index, self) => 
    index === self.findIndex(c => c.id === cat.id)
  );

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
                    activeOpacity={0.7}
                    onPress={() => {
                      safeLog('📤 [MyShopScreen] Share shop button pressed');
                      handleShareShopLink();
                    }}
                  >
                    <Ionicons name="share-social-outline" size={16} color={colors.shareAction} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    activeOpacity={0.7}
                    onPress={() => {
                      safeLog('✏️ [MyShopScreen] Edit shop button pressed');
                      navigation.navigate('EditShop', { shopSlug: shop.slug });
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.infoAction} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.iconButton}
                    activeOpacity={0.7}
                    onPress={() => {
                      safeLog('🗑️ [MyShopScreen] Delete shop button pressed');
                      setShowDeleteModal(true);
                    }}
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
                onPress={() => navigation.navigate('CategoryProductsScreen', { categorySlug: 'all', categoryName: 'All Products', products: [] } as any)}
              >
                <Text style={styles.statLabel}>Total</Text>
                <View style={styles.statValueRow}>
                  <Ionicons name="cube-outline" size={14} color={colors.primary} />
                  <Text style={styles.statText}>{products.length}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('CategoryProductsScreen', { categorySlug: 'in-stock', categoryName: 'In Stock', products: [] } as any)}
              >
                <Text style={styles.statLabel}>In Stock</Text>
                <View style={styles.statValueRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.successText} />
                  <Text style={styles.statText}>{products.filter(p => p.stock > 0).length}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('CategoryProductsScreen', { categorySlug: 'out-of-stock', categoryName: 'Out of Stock', products: [] } as any)}
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
              
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => navigation.navigate('SellerOrders')}
              >
                <Text style={styles.statLabel}>Completed</Text>
                <View style={styles.statValueRow}>
                  <Ionicons name="checkmark-done-outline" size={14} color={colors.successText} />
                  <Text style={styles.statText}>{completedOrdersCount}</Text>
                </View>
              </TouchableOpacity>
            </View>


          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Navigation */}
          {/* This section now follows directly after the Search Bar, eliminating the empty space */}
          {uniqueCategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryNav}
              contentContainerStyle={styles.categoryNavContent}
            >
              <TouchableOpacity
                style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.categoryChipText, selectedCategory === null && styles.categoryChipTextActive]}>All</Text>
              </TouchableOpacity>
              {uniqueCategories.map(category => {
                const catId = typeof category.id === 'number' ? category.id : (category.id as any)?.id;
                return (
                <TouchableOpacity
                  key={catId}
                  style={[styles.categoryChip, selectedCategory === catId && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(catId)}
                >
                  <Text style={[styles.categoryChipText, selectedCategory === catId && styles.categoryChipTextActive]}>{category.name}</Text>
                </TouchableOpacity>
              );
              })}
            </ScrollView>
          )}

          {/* Product Listing Section */}
          <View style={styles.productListingSection}>

              {filteredProducts.length === 0 && searchQuery.length === 0 ? (
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
            ) : filteredProducts.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="search-outline" size={70} color={colors.textSecondary} />
                <Text style={styles.title}>No Results Found</Text>
                <Text style={styles.messageText}>Try adjusting your search or filter to find what you're looking for.</Text>
              </View>
            ) : (
              <>
                {filteredGroupedProducts.map((group) => {
                  const outOfStockCount = group.products.filter(p => p.stock === 0).length;
                  return (
                  <View key={group.categoryId} style={styles.categorySection}>
                    <TouchableOpacity
                      style={styles.categoryTitleTouchable}
                      onPress={() => handleCategoryTitlePress(group.categorySlug, group.categoryName)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryTitle}>
                        {group.categoryName} <Text style={styles.productCountText}>({group.products.length})</Text>
                        {outOfStockCount > 0 && <Text style={styles.outOfStockText}> ({outOfStockCount})</Text>}
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
                            onProductDeleted={() => {
                              safeLog('🔄 [MyShopScreen] onProductDeleted callback triggered for product:', product.id);
                              fetchShopData();
                            }}
                            shopLatitude={shop.latitude}
                            shopLongitude={shop.longitude}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                  );
                })}

                {filteredUngroupedProducts.length > 0 && (() => {
                  const outOfStockCount = filteredUngroupedProducts.filter(p => p.stock === 0).length;
                  return (
                  <View style={styles.categorySection}>
                    <TouchableOpacity
                      style={styles.categoryTitleTouchable}
                      onPress={() => handleCategoryTitlePress('ungrouped', 'Other Products')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryTitle}>
                        Other Products <Text style={styles.productCountText}>({filteredUngroupedProducts.length})</Text>
                        {outOfStockCount > 0 && <Text style={styles.outOfStockText}> ({outOfStockCount})</Text>}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.carouselWrapper}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.productCarousel}
                        scrollEventThrottle={16}
                      >
                        {filteredUngroupedProducts.map(product => (
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
                            onProductDeleted={() => {
                              safeLog('🔄 [MyShopScreen] onProductDeleted callback triggered for ungrouped product:', product.id);
                              fetchShopData();
                            }}
                            shopLatitude={shop.latitude}
                            shopLongitude={shop.longitude}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                  );
                })()}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Shop</Text>
            <Text style={styles.modalMessage}>Are you sure you want to delete your shop? This action cannot be undone.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonDelete]} onPress={async () => {
                setShowDeleteModal(false);
                try {
                  if (shop?.slug) {
                    await shopService.deleteShop(shop.slug);
                    setShop(null);
                    setProducts([]);
                    // Ensure user profile is refreshed to remove shop_slug
                    await refreshUserProfile();
                  }
                } catch (err: any) {
                  safeError('Delete failed:', err);
                  Alert.alert('Delete Failed', 'Could not delete shop. Please try again.');
                }
              }}>
                <Text style={styles.modalButtonTextDelete}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 8,
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
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    marginTop: 10,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  shopHeader: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  shopNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    flexShrink: 1,
    marginRight: 10,
  },
  shopActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 5,
    marginLeft: 5,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shopDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 18,
  },
  ownerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningAction + '1A', // Light background
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 10,
  },
  ownerTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warningAction,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 4,
  },
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: colors.textPrimary,
  },
  // Category Nav Styles
  categoryNav: {
    maxHeight: 40,
    marginBottom: 10,
    marginTop: 5,
    marginHorizontal: 10,
  },
  categoryNavContent: {
    alignItems: 'center',
    paddingRight: 20,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  // Product Listing Styles
  productListingSection: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 5,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitleTouchable: {
    paddingVertical: 10,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  productCountText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  outOfStockText: {
    color: colors.errorText,
    fontSize: 12,
  },
  carouselWrapper: {
    marginHorizontal: -10, // Pull scrollview content to edges
  },
  productCarousel: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 40,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dangerAction,
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonDelete: {
    backgroundColor: colors.dangerAction,
  },
  modalButtonTextCancel: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  modalButtonTextDelete: {
    color: colors.white,
    fontWeight: '600',
  },
});

export default MyShopScreen;