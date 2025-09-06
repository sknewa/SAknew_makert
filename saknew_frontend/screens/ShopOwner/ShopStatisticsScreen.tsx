// saknew_frontend/screens/ShopOwner/ShopStatisticsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';
import { Ionicons } from '@expo/vector-icons';
import { MainNavigationProp } from '../../navigation/types';
import shopService from '../../services/shopService';
import apiClient from '../../services/apiClient';

// Define colors
const colors = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  primary: '#28A745',
  accent: '#FFC107',
  info: '#17A2B8',
  danger: '#DC3545',
  warning: '#FFC107',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  border: '#DEE2E6',
  buttonText: '#FFFFFF',
  shadowColor: '#000',
};

// Define screen props
type ShopStatisticsScreenProps = {
  route?: { params?: { shopSlug?: string } };
};

const ShopStatisticsScreen: React.FC<ShopStatisticsScreenProps> = ({ route }) => {
  const navigation = useNavigation<MainNavigationProp>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Get shop slug from route params or user profile
  const shopSlug = route?.params?.shopSlug || user?.profile?.shop_slug;

  // Fetch shop data
  const fetchShopData = useCallback(async () => {
    if (!authLoading && !refreshing) setLoading(true);
    setError(null);

    try {
      if (!isAuthenticated || !user?.profile?.is_seller || !shopSlug) {
        setShop(null);
        setProducts([]);
        setOrders([]);
        setError(!isAuthenticated ? 'You must be logged in to view this page.' : 
                !user?.profile?.is_seller ? 'You must be a seller to view this page.' : 
                'No shop found associated with your account.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get shop details
      const shopData = await shopService.getShopBySlug(shopSlug);
      setShop(shopData);

      // Get shop products
      const productsData = await shopService.getShopProducts(shopSlug);
      setProducts(productsData);

      // Get shop orders
      try {
        const ordersResponse = await apiClient.get(`/api/orders/?shop=${shopData.id}&limit=5`);
        setOrders(ordersResponse.data?.results || []);
      } catch (orderError) {
        console.error('Error fetching orders:', orderError);
      }

    } catch (err: any) {
      console.error('Error fetching shop data:', err.response?.data || err.message);
      setError('Failed to load shop statistics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authLoading, isAuthenticated, refreshing, shopSlug, user?.profile?.is_seller]);

  // Fetch data when component mounts or gains focus
  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        fetchShopData();
      }
    }, [authLoading, fetchShopData])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShopData();
  }, [fetchShopData]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!shop || !products) return null;

    const outOfStockCount = products.filter((p: any) => p.stock === 0).length;
    const lowStockCount = products.filter((p: any) => p.stock > 0 && p.stock <= 5).length;
    const inStockCount = products.length - outOfStockCount;
    
    const pendingOrders = orders.filter((order: any) => 
      ['pending', 'processing', 'approved'].includes(order.order_status)).length;
    
    const completedOrders = orders.filter((order: any) => 
      ['shipped', 'delivered', 'completed'].includes(order.order_status)).length;
    
    const totalSales = orders.reduce((sum: number, order: any) => {
      return sum + parseFloat(order.total_price || '0');
    }, 0);

    const uniqueCategories = new Set(products.map((p: any) => p.category));

    return {
      totalProducts: products.length,
      totalCategories: uniqueCategories.size,
      inStockCount,
      outOfStockCount,
      lowStockCount,
      totalOrders: orders.length,
      pendingOrders,
      completedOrders,
      totalSales: totalSales.toFixed(2),
    };
  }, [shop, products, orders]);

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading shop statistics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color={colors.danger} />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchShopData}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No shop or stats
  if (!shop || !stats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="storefront-outline" size={60} color={colors.primary} />
          <Text style={styles.errorTitle}>No Shop Found</Text>
          <Text style={styles.errorMessage}>You need to create a shop before viewing statistics.</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.navigate('CreateShop')}
          >
            <Text style={styles.buttonText}>Create Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Shop Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.subtitle}>Shop Statistics</Text>
        </View>

        {/* Revenue Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Revenue</Text>
            <Ionicons name="cash-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.revenueAmount}>R{stats.totalSales}</Text>
          <Text style={styles.revenueSubtext}>From {stats.totalOrders} orders</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Products */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="cube-outline" size={22} color={colors.primary} />
              <Text style={styles.statTitle}>Products</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statSubtext}>{stats.totalCategories} categories</Text>
          </View>

          {/* Orders */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="receipt-outline" size={22} color={colors.info} />
              <Text style={styles.statTitle}>Orders</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statSubtext}>{stats.completedOrders} completed</Text>
          </View>

          {/* Pending */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="hourglass-outline" size={22} color={colors.warning} />
              <Text style={styles.statTitle}>Pending</Text>
            </View>
            <Text style={styles.statValue}>{stats.pendingOrders}</Text>
            <Text style={styles.statSubtext}>orders to fulfill</Text>
          </View>

          {/* Stock */}
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
              <Text style={styles.statTitle}>Out of Stock</Text>
            </View>
            <Text style={styles.statValue}>{stats.outOfStockCount}</Text>
            <Text style={styles.statSubtext}>{stats.lowStockCount} low stock</Text>
          </View>
        </View>

        {/* Inventory Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Inventory Status</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'ShopTab' })}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inventoryStats}>
            <View style={styles.inventoryStat}>
              <View style={[styles.inventoryIcon, { backgroundColor: 'rgba(40, 167, 69, 0.1)' }]}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              </View>
              <Text style={styles.inventoryValue}>{stats.inStockCount}</Text>
              <Text style={styles.inventoryLabel}>In Stock</Text>
            </View>

            <View style={styles.inventoryStat}>
              <View style={[styles.inventoryIcon, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
                <Ionicons name="alert-circle" size={24} color={colors.warning} />
              </View>
              <Text style={styles.inventoryValue}>{stats.lowStockCount}</Text>
              <Text style={styles.inventoryLabel}>Low Stock</Text>
            </View>

            <View style={styles.inventoryStat}>
              <View style={[styles.inventoryIcon, { backgroundColor: 'rgba(220, 53, 69, 0.1)' }]}>
                <Ionicons name="close-circle" size={24} color={colors.danger} />
              </View>
              <Text style={styles.inventoryValue}>{stats.outOfStockCount}</Text>
              <Text style={styles.inventoryLabel}>Out of Stock</Text>
            </View>
          </View>
        </View>

        {/* Low Stock Products */}
        {stats.lowStockCount > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Products Needing Attention</Text>
            </View>
            
            {products
              .filter((p: any) => p.stock > 0 && p.stock <= 5)
              .slice(0, 3)
              .map((product: any) => (
                <View key={product.id} style={styles.lowStockItem}>
                  <View style={styles.lowStockInfo}>
                    <Text style={styles.lowStockName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.lowStockCount}>
                      <Text style={{ color: product.stock === 0 ? colors.danger : colors.warning }}>
                        {product.stock}
                      </Text> in stock
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.restockButton}
                    onPress={() => navigation.navigate('EditProduct', { productId: product.id })}
                  >
                    <Text style={styles.restockText}>Restock</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
            {stats.lowStockCount > 3 && (
              <TouchableOpacity style={styles.viewMoreButton}>
                <Text style={styles.viewMoreText}>
                  View {stats.lowStockCount - 3} more items
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Recent Orders */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Orders</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'OrdersTab' })}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {orders.length > 0 ? (
            orders.slice(0, 3).map((order: any) => (
              <View key={order.id} style={styles.orderItem}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNumber}>Order #{order.id.substring(0, 8)}</Text>
                  <Text style={styles.orderCustomer}>{order.user?.email || 'Customer'}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.order_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.orderDetails}>
                  <Text style={styles.orderPrice}>R{parseFloat(order.total_price).toFixed(2)}</Text>
                  <View style={[
                    styles.orderStatus,
                    order.order_status === 'pending' ? styles.statusPending :
                    order.order_status === 'delivered' ? styles.statusDelivered :
                    styles.statusProcessing
                  ]}>
                    <Text style={styles.orderStatusText}>
                      {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No recent orders for your shop.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');
const cardWidth = (width - 40) / 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Title Container
  titleContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  shopName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  
  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(222, 226, 230, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 226, 230, 0.3)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  
  // Revenue Card
  revenueAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  revenueSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    width: cardWidth,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(222, 226, 230, 0.3)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 226, 230, 0.3)',
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  statSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  
  // Inventory Stats
  inventoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 5,
  },
  inventoryStat: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  inventoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inventoryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  inventoryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  
  // Low Stock Items
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 226, 230, 0.3)',
  },
  lowStockInfo: {
    flex: 1,
    marginRight: 15,
  },
  lowStockName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  lowStockCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  restockButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  restockText: {
    color: colors.buttonText,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // View All/More Buttons
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  viewAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 2,
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: 'rgba(40, 167, 69, 0.05)',
    borderRadius: 10,
  },
  viewMoreText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // Orders
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 226, 230, 0.3)',
    marginBottom: 5,
  },
  orderInfo: {
    flex: 1,
    marginRight: 10,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  orderCustomer: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  orderPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  orderStatus: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  statusPending: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  statusProcessing: {
    backgroundColor: 'rgba(23, 162, 184, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(23, 162, 184, 0.3)',
  },
  statusDelivered: {
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(40, 167, 69, 0.3)',
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noDataText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 15,
    fontStyle: 'italic',
    backgroundColor: 'rgba(222, 226, 230, 0.2)',
    borderRadius: 10,
    marginTop: 5,
  },
});

export default ShopStatisticsScreen;