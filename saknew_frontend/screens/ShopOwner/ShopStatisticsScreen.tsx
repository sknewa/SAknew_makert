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
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

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

  const shopSlug = route?.params?.shopSlug || user?.profile?.shop_slug;

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

      const shopData = await shopService.getShopBySlug(shopSlug);
      setShop(shopData);

      const productsResponse: any = await shopService.getShopProducts(shopSlug);
      const productsData = Array.isArray(productsResponse?.results) ? productsResponse.results : 
                          Array.isArray(productsResponse) ? productsResponse : [];
      setProducts(productsData);

      const ordersResponse = await apiClient.get('/api/orders/');
      const allOrders = ordersResponse.data?.results || ordersResponse.data || [];
      
      safeLog('📊 [ShopStatistics] Total orders fetched:', allOrders.length);
      safeLog('📊 [ShopStatistics] Shop slug:', shopSlug);
      
      allOrders.forEach((order: any) => {
        safeLog('🔍 Order:', order.id, 'payment_status:', order.payment_status, 'order_status:', order.order_status);
        safeLog('🔍 Order user:', order.user?.email);
        safeLog('🔍 Order items:', order.items?.map((item: any) => ({
          product_name: item.product?.name,
          shop_name: item.product?.shop_name
        })));
      });
      
      const shopNameToSlug = (name: string) => name.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-');
      const shopOrders = allOrders.filter((order: any) => {
        safeLog('🔍 Checking order:', order.id);
        if (order.payment_status !== 'paid' && order.payment_status !== 'Completed') {
          safeLog('❌ Filtered by payment_status:', order.payment_status);
          return false;
        }
        if (order.user?.email === user.email) {
          safeLog('❌ Filtered - own order');
          return false;
        }
        const hasShopItems = order.items?.some((item: any) => {
          const productShopSlug = item.product?.shop_name ? shopNameToSlug(item.product.shop_name) : null;
          safeLog('🔍 Comparing:', productShopSlug, '===', shopSlug);
          const matches = productShopSlug === shopSlug;
          if (matches) {
            safeLog('✅ [ShopStatistics] Matched order:', order.id, 'shop:', item.product?.shop_name, 'status:', order.order_status);
          }
          return matches;
        });
        if (!hasShopItems) {
          safeLog('❌ No matching shop items');
        }
        return hasShopItems;
      });
      
      safeLog('📊 [ShopStatistics] Filtered shop orders:', shopOrders.length);
      safeLog('📊 [ShopStatistics] Active orders:', shopOrders.filter((o: any) => 
        ['pending', 'processing', 'approved', 'ready_for_delivery'].includes(o.order_status)
      ).length);
      
      setOrders(shopOrders);

    } catch (err: any) {
      safeError('Error fetching shop data:', err.response?.data || err.message);
      setError('Failed to load shop statistics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authLoading, isAuthenticated, refreshing, shopSlug, user?.profile?.is_seller, user?.email]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        fetchShopData();
      }
    }, [authLoading, fetchShopData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShopData();
  }, [fetchShopData]);

  const stats = React.useMemo(() => {
    if (!shop || !products) return null;

    const outOfStockCount = products.filter((p: any) => p.stock === 0).length;
    const lowStockCount = products.filter((p: any) => p.stock > 0 && p.stock <= 5).length;
    const inStockCount = products.length - outOfStockCount;
    
    const paidOrders = orders.filter((order: any) => 
      order.payment_status === 'paid' || order.payment_status === 'Completed'
    );
    const nonCanceledOrders = paidOrders.filter((order: any) => order.order_status !== 'canceled');
    
    const pendingOrders = orders.filter((order: any) => 
      ['pending', 'processing', 'approved', 'ready_for_delivery'].includes(order.order_status)
    );
    
    const completedOrders = nonCanceledOrders.filter((order: any) => 
      ['shipped', 'delivered', 'completed'].includes(order.order_status));
    
    const shopNameToSlug = (name: string) => name.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-');
    
    const calculateShopRevenue = (ordersList: any[]) => {
      return ordersList.reduce((sum: number, order: any) => {
        const shopItems = order.items?.filter((item: any) => {
          const productShopSlug = item.product?.shop_name ? shopNameToSlug(item.product.shop_name) : null;
          return productShopSlug === shopSlug;
        }) || [];
        const shopTotal = shopItems.reduce((itemSum: number, item: any) => 
          itemSum + (parseFloat(item.price || '0') * (item.quantity || 0)), 0
        );
        return sum + shopTotal;
      }, 0);
    };

    const pendingRevenue = calculateShopRevenue(pendingOrders);
    const completedRevenue = calculateShopRevenue(completedOrders);
    const totalRevenue = pendingRevenue + completedRevenue;

    const totalInventoryValue = products.reduce((sum: number, product: any) => {
      return sum + (parseFloat(product.price || '0') * (product.stock || 0));
    }, 0);

    const uniqueCategories = new Set(products.map((p: any) => p.category));

    return {
      totalProducts: products.length,
      totalCategories: uniqueCategories.size,
      inStockCount,
      outOfStockCount,
      lowStockCount,
      totalOrders: nonCanceledOrders.length,
      pendingOrders: pendingOrders.length,
      completedOrders: completedOrders.length,
      totalRevenue: totalRevenue.toFixed(2),
      pendingRevenue: pendingRevenue.toFixed(2),
      completedRevenue: completedRevenue.toFixed(2),
      totalInventoryValue: totalInventoryValue.toFixed(2),
      averageOrderValue: nonCanceledOrders.length > 0 ? (totalRevenue / nonCanceledOrders.length).toFixed(2) : '0.00',
    };
  }, [shop, products, orders]);

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

  if (!shop || !stats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="storefront-outline" size={60} color={colors.primary} />
          <Text style={styles.errorTitle}>No Shop Found</Text>
          <Text style={styles.errorMessage}>You need to create a shop before viewing statistics.</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
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
        <View style={styles.titleContainer}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.subtitle}>Shop Statistics</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Total Revenue</Text>
            <Ionicons name="cash-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.revenueAmount}>R{stats.totalRevenue}</Text>
          <View style={styles.revenueBreakdown}>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Completed</Text>
              <Text style={styles.revenueValue}>R{stats.completedRevenue}</Text>
            </View>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueLabel}>Pending</Text>
              <Text style={styles.revenueValue}>R{stats.pendingRevenue}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="receipt-outline" size={22} color={colors.info} />
              <Text style={styles.statTitle}>Total Orders</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statSubtext}>All paid orders</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
              <Text style={styles.statTitle}>Avg Order</Text>
            </View>
            <Text style={styles.statValue}>R{stats.averageOrderValue}</Text>
            <Text style={styles.statSubtext}>Per order</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="hourglass-outline" size={22} color={colors.warning} />
              <Text style={styles.statTitle}>Pending</Text>
            </View>
            <Text style={styles.statValue}>{stats.pendingOrders}</Text>
            <Text style={styles.statSubtext}>To fulfill</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
              <Text style={styles.statTitle}>Completed</Text>
            </View>
            <Text style={styles.statValue}>{stats.completedOrders}</Text>
            <Text style={styles.statSubtext}>Delivered</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Inventory Overview</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.goBack()}
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

          <View style={styles.inventoryValueContainer}>
            <Text style={styles.inventoryValueLabel}>Total Inventory Value</Text>
            <Text style={styles.inventoryValueAmount}>R{stats.totalInventoryValue}</Text>
          </View>
        </View>

        {stats.lowStockCount > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Low Stock Alert</Text>
              <Ionicons name="warning-outline" size={20} color={colors.warning} />
            </View>
            
            {products
              .filter((p: any) => p.stock > 0 && p.stock <= 5)
              .slice(0, 5)
              .map((product: any) => (
                <View key={product.id} style={styles.lowStockItem}>
                  <View style={styles.lowStockInfo}>
                    <Text style={styles.lowStockName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.lowStockCount}>
                      <Text style={{ color: colors.warning }}>{product.stock}</Text> units left
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.restockButton}
                    onPress={() => navigation.navigate('ProductManagement', { productId: product.id })}
                  >
                    <Text style={styles.restockText}>Restock</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
            {stats.lowStockCount > 5 && (
              <TouchableOpacity style={styles.viewMoreButton} onPress={() => navigation.goBack()}>
                <Text style={styles.viewMoreText}>
                  View {stats.lowStockCount - 5} more items
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Orders</Text>
          </View>

          {orders.filter((order: any) => 
            ['pending', 'processing', 'approved', 'ready_for_delivery'].includes(order.order_status)
          ).length > 0 ? (
            orders.filter((order: any) => 
              ['pending', 'processing', 'approved', 'ready_for_delivery'].includes(order.order_status)
            ).slice(0, 5).map((order: any) => (
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
                    order.order_status === 'processing' ? styles.statusProcessing :
                    order.order_status === 'approved' ? styles.statusApproved :
                    styles.statusReady
                  ]}>
                    <Text style={styles.orderStatusText}>
                      {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1).replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No pending orders at the moment.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');
const cardWidth = (width - 30) / 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 12,
    fontWeight: '600',
  },
  
  titleContainer: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 10,
    marginBottom: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(222, 226, 230, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 226, 230, 0.3)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  
  revenueAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  revenueBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(222, 226, 230, 0.3)',
  },
  revenueItem: {
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  revenueValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    marginBottom: 10,
  },
  statCard: {
    width: cardWidth,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(222, 226, 230, 0.3)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 226, 230, 0.3)',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  
  inventoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 4,
    marginBottom: 12,
  },
  inventoryStat: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  inventoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  inventoryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  inventoryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  inventoryValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(222, 226, 230, 0.3)',
  },
  inventoryValueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inventoryValueAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 226, 230, 0.3)',
  },
  lowStockInfo: {
    flex: 1,
    marginRight: 8,
  },
  lowStockName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  lowStockCount: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  restockButton: {
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  restockText: {
    color: colors.buttonText,
    fontSize: 10,
    fontWeight: '600',
  },
  
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.08)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  viewAllText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 2,
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 6,
    backgroundColor: 'rgba(40, 167, 69, 0.05)',
    borderRadius: 6,
  },
  viewMoreText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(222, 226, 230, 0.3)',
    marginBottom: 3,
  },
  orderInfo: {
    flex: 1,
    marginRight: 6,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  orderCustomer: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  orderDetails: {
    alignItems: 'flex-end',
  },
  orderPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 3,
  },
  orderStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
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
  statusApproved: {
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(40, 167, 69, 0.3)',
  },
  statusReady: {
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  orderStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noDataText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
    backgroundColor: 'rgba(222, 226, 230, 0.2)',
    borderRadius: 6,
    marginTop: 3,
  },
});

export default ShopStatisticsScreen;
