import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';
import { Ionicons } from '@expo/vector-icons';
import { MainNavigationProp } from '../../navigation/types';
import apiClient from '../../services/apiClient';
import { updateOrderStatus } from '../../services/salesService';
import { formatApiError } from '../../utils/errorHandler';
import { SecurityUtils } from '../../utils/securityUtils';

interface Order {
  id: string;
  user: { username?: string; email: string; phone?: string };
  order_date: string;
  order_status: string;
  delivery_verification_code?: string;
  shipping_address?: {
    city: string;
    country: string;
    street_name?: string;
    street_number?: string;
    suburb?: string;
  };
  items: Array<{
    product: {
      shop?: { slug: string };
      shop_name?: string;
      name: string;
      main_image_url?: string;
    };
    price: string;
    quantity: number;
  }>;
}

const colors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  text: '#1F2937',
  textLight: '#6B7280',
  border: '#E5E7EB',
  accent: '#F3F4F6',
};

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${(num || 0).toFixed(2)}`;
};

const SellerOrdersScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryCode, setDeliveryCode] = useState('');
  const [modalType, setModalType] = useState<'generate' | 'confirm'>('generate');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const fetchOrders = useCallback(async () => {
    console.log('🔍 DEBUG: === FETCH ORDERS START ===');
    console.log('🔍 DEBUG: isAuthenticated:', isAuthenticated);
    console.log('🔍 DEBUG: user:', user);
    console.log('🔍 DEBUG: user.profile:', user?.profile);
    console.log('🔍 DEBUG: is_seller:', user?.profile?.is_seller);
    console.log('🔍 DEBUG: shop_slug:', user?.profile?.shop_slug);
    
    if (!isAuthenticated || !user?.profile?.is_seller || !user?.profile?.shop_slug) {
      console.log('🔍 DEBUG: EARLY RETURN - Missing requirements');
      setOrders([]);
      return;
    }
    
    try {
      console.log('🔍 DEBUG: Making API call to /api/orders/');
      const response = await apiClient.get('/api/orders/');
      console.log('🔍 DEBUG: API Response status:', response.status);
      console.log('🔍 DEBUG: API Response data structure:', {
        hasResults: !!response.data.results,
        resultsLength: response.data.results?.length,
        dataLength: response.data?.length,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data)
      });
      
      const allOrders = response.data.results || response.data || [];
      console.log('🔍 DEBUG: Total orders from API:', allOrders.length);
      console.log('🔍 DEBUG: First 3 orders sample:', allOrders.slice(0, 3));
      
      // Show ALL purchases that contain items from this shop
      const sellerOrders = allOrders.filter((order: Order, index: number) => {
        console.log(`🔍 DEBUG: Checking order ${index + 1}/${allOrders.length}:`, {
          orderId: order.id,
          orderStatus: order.order_status,
          itemsCount: order.items?.length || 0,
          hasItems: !!order.items
        });
        
        if (!order.items || !Array.isArray(order.items)) {
          console.log('🔍 DEBUG: Order has no items or items is not array');
          return false;
        }
        
        // Check each item in the order
        const matchingItems = order.items.filter((item, itemIndex) => {
          console.log(`🔍 DEBUG: Item ${itemIndex + 1} FULL STRUCTURE:`, {
            fullItem: item,
            product: item.product,
            productShop: item.product?.shop,
            productShopSlug: item.product?.shop?.slug,
            sellerShopSlug: user.profile.shop_slug
          });
          
          // Convert shop name to slug format for comparison
          const shopNameToSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
          const productShopSlug = item.product?.shop_name ? shopNameToSlug(item.product.shop_name) : null;
          
          const shopSlugMatch = item.product?.shop?.slug === user.profile.shop_slug;
          const shopNameMatch = productShopSlug === user.profile.shop_slug;
          
          console.log(`🔍 DEBUG: Shop matching attempts:`, {
            productShopName: item.product?.shop_name,
            productShopSlug,
            sellerShopSlug: user.profile.shop_slug,
            shopSlugMatch,
            shopNameMatch,
            finalMatch: shopSlugMatch || shopNameMatch
          });
          
          return shopSlugMatch || shopNameMatch;
        });
        
        const hasSellerItems = matchingItems.length > 0;
        console.log(`🔍 DEBUG: Order ${order.id} has ${matchingItems.length} matching items, belongs to shop: ${hasSellerItems}`);
        
        return hasSellerItems;
      }).sort((a: Order, b: Order) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
      
      console.log('🔍 DEBUG: Filtered seller orders:', sellerOrders.length);
      console.log('🔍 DEBUG: Seller orders details:', sellerOrders.map((o: Order) => ({
        id: o.id,
        status: o.order_status,
        itemsCount: o.items?.length,
        shopItems: o.items?.filter((item: any) => item.product?.shop?.slug === user.profile.shop_slug).length
      })));
      
      // Count new orders (processing status)
      const newOrders = sellerOrders.filter((order: Order) => order.order_status === 'processing');
      setNewOrdersCount(newOrders.length);
      console.log('🔍 DEBUG: New orders count:', newOrders.length);
      
      setOrders(sellerOrders);
      console.log('🔍 DEBUG: === FETCH ORDERS END ===');
    } catch (error: any) {
      console.error('🔍 DEBUG: Error fetching orders:', error);
      console.error('🔍 DEBUG: Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  useFocusEffect(useCallback(() => {
    fetchOrders();
    
    // Set up auto-refresh every 30 seconds when screen is focused
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchOrders]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleGenerateCode = (order: Order) => {
    setSelectedOrder(order);
    setModalType('generate');
    setModalVisible(true);
  };

  const handleConfirmDelivery = (order: Order) => {
    console.log('🔍 DEBUG: === HANDLE CONFIRM DELIVERY START ===');
    console.log('🔍 DEBUG: Order ID:', order.id);
    console.log('🔍 DEBUG: Order status:', order.order_status);
    console.log('🔍 DEBUG: Order verification code:', order.delivery_verification_code);
    
    setSelectedOrder(order);
    setModalType('confirm');
    setDeliveryCode('');
    setModalVisible(true);
    
    console.log('🔍 DEBUG: Modal should now be visible');
    console.log('🔍 DEBUG: === HANDLE CONFIRM DELIVERY END ===');
  };

  const executeAction = async () => {
    console.log('🔍 DEBUG: === EXECUTE ACTION START ===');
    console.log('🔍 DEBUG: selectedOrder:', selectedOrder?.id);
    console.log('🔍 DEBUG: deliveryCode entered:', deliveryCode);
    console.log('🔍 DEBUG: deliveryCode length:', deliveryCode.length);
    console.log('🔍 DEBUG: deliveryCode trimmed:', deliveryCode.trim());
    
    if (!selectedOrder) {
      console.log('🔍 DEBUG: No selected order, returning');
      return;
    }

    try {
      if (!deliveryCode.trim()) {
        console.log('🔍 DEBUG: Empty delivery code, showing error');
        Alert.alert('Error', 'Please enter the delivery code');
        return;
      }
      
      console.log('🔍 DEBUG: Making API call to updateOrderStatus');
      console.log('🔍 DEBUG: - orderId:', selectedOrder.id);
      console.log('🔍 DEBUG: - action: confirm_delivery');
      console.log('🔍 DEBUG: - code:', deliveryCode);
      
      const response = await updateOrderStatus(selectedOrder.id, 'confirm_delivery', deliveryCode);
      
      console.log('🔍 DEBUG: API Response received:', response);
      console.log('🔍 DEBUG: Response type:', typeof response);
      console.log('🔍 DEBUG: Response keys:', Object.keys(response || {}));
      
      // Check if response is valid
      if (!response || response === undefined) {
        console.log('🔍 DEBUG: Invalid response - likely wrong delivery code');
        Alert.alert('Error', 'Invalid delivery code. Please check the code and try again.');
        return;
      }
      
      // Calculate seller's earnings from this order
      const shopNameToSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
      const shopItems = selectedOrder.items.filter((item: any) => {
        const productShopSlug = item.product?.shop_name ? shopNameToSlug(item.product.shop_name) : null;
        return item.product?.shop?.slug === user?.profile?.shop_slug || productShopSlug === user?.profile?.shop_slug;
      });
      const earnings = shopItems.reduce((sum, item: any) => sum + (parseFloat(item.price) * item.quantity), 0);
      
      console.log('🔍 DEBUG: Calculated earnings:', earnings);
      console.log('🔍 DEBUG: Shop items count:', shopItems.length);
      
      Alert.alert(
        'Delivery Confirmed!', 
        `Order completed successfully.\n\nEarnings: ${formatCurrency(earnings)}\nPayment added to your wallet.`,
        [{ text: 'OK', onPress: () => {
          console.log('🔍 DEBUG: Success dialog confirmed, closing modal and refreshing');
          setModalVisible(false);
          fetchOrders();
          // Switch to history tab to show completed order
          setActiveTab('completed');
        }}]
      );
    } catch (error: any) {
      console.error('🔍 DEBUG: Error in executeAction:', error);
      console.error('🔍 DEBUG: Error message:', error.message);
      console.error('🔍 DEBUG: Error response:', error.response);
      console.error('🔍 DEBUG: Error response status:', error.response?.status);
      console.error('🔍 DEBUG: Error response data:', error.response?.data);
      
      // Check if it's a validation error (wrong code)
      if (error.response?.status === 400 || error.response?.data?.detail?.includes('code')) {
        Alert.alert('Invalid Code', 'The delivery code you entered is incorrect. Please ask the buyer to show you their code again.');
      } else {
        Alert.alert('Error', formatApiError(error));
      }
    }
    
    console.log('🔍 DEBUG: === EXECUTE ACTION END ===');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'processing': return colors.warning;
      case 'ready_for_delivery': return colors.primary;
      case 'completed': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Payment';
      case 'processing': return 'New Order';
      case 'ready_for_delivery': return 'Ready for Delivery';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getFilteredOrders = () => {
    console.log('🔍 DEBUG: === FILTER ORDERS START ===');
    console.log('🔍 DEBUG: Active tab:', activeTab);
    console.log('🔍 DEBUG: Total orders before filter:', orders.length);
    console.log('🔍 DEBUG: Orders statuses:', orders.map((o: Order) => ({ id: o.id, status: o.order_status })));
    
    const filtered = orders.filter((order: Order) => {
      const isActive = ['pending', 'processing', 'ready_for_delivery'].includes(order.order_status);
      const isCompleted = ['completed', 'cancelled'].includes(order.order_status);
      
      if (activeTab === 'active') {
        console.log(`🔍 DEBUG: Order ${order.id} status ${order.order_status} - isActive: ${isActive}`);
        return isActive;
      } else {
        console.log(`🔍 DEBUG: Order ${order.id} status ${order.order_status} - isCompleted: ${isCompleted}`);
        return isCompleted;
      }
    });
    
    console.log('🔍 DEBUG: Filtered orders count:', filtered.length);
    console.log('🔍 DEBUG: Filtered orders:', filtered.map((o: Order) => ({ id: o.id, status: o.order_status })));
    console.log('🔍 DEBUG: === FILTER ORDERS END ===');
    return filtered;
  };

  const renderOrderCard = (order: Order) => {
    // Filter items from this shop and convert shop name to slug
    const shopNameToSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');
    const shopItems = order.items.filter((item: any) => {
      const productShopSlug = item.product?.shop_name ? shopNameToSlug(item.product.shop_name) : null;
      return item.product?.shop?.slug === user?.profile?.shop_slug || productShopSlug === user?.profile?.shop_slug;
    });
    
    const orderTotal = shopItems.reduce((sum, item: any) => sum + (parseFloat(item.price) * item.quantity), 0);
    const itemCount = shopItems.reduce((sum, item: any) => sum + item.quantity, 0);
    
    const deliveryAddress = order.shipping_address ? 
      `${order.shipping_address.street_number || ''} ${order.shipping_address.street_name || ''} ${order.shipping_address.suburb || ''} ${order.shipping_address.city}, ${order.shipping_address.country}`.trim() : 
      'No address provided';

    return (
      <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
            <Text style={styles.customerName}>{order.user.username || order.user.email}</Text>
            {order.user.phone && (
              <TouchableOpacity onPress={() => Alert.alert('Call Customer', order.user.phone)}>
                <Text style={styles.customerPhone}>📞 {order.user.phone}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.orderDate}>{new Date(order.order_date).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.order_status) }]}>
              {getStatusText(order.order_status)}
            </Text>
          </View>
        </View>

        <View style={styles.deliveryInfo}>
          <Ionicons name="location" size={14} color={colors.textLight} />
          <Text style={styles.deliveryAddress}>{deliveryAddress}</Text>
        </View>

        <View style={styles.orderSummary}>
          <Text style={styles.itemCount}>{itemCount} items</Text>
          <Text style={styles.orderTotal}>{formatCurrency(orderTotal)}</Text>
        </View>

        <View style={styles.itemsList}>
          {shopItems.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Image 
                source={{ uri: item.product.main_image_url || 'https://via.placeholder.com/50' }}
                style={styles.productImage}
              />
              <View style={styles.itemDetails}>
                <Text style={styles.productName}>{item.product.name}</Text>
                <Text style={styles.itemPrice}>{formatCurrency(item.price)} × {item.quantity}</Text>
                <Text style={styles.itemSubtotal}>{formatCurrency(parseFloat(item.price) * item.quantity)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actionButtons}>
          {(order.order_status === 'processing' || order.order_status === 'ready_for_delivery') && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deliveredBtn]}
              onPress={() => handleConfirmDelivery(order)}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.card} />
              <Text style={styles.actionBtnText}>Mark as Delivered</Text>
            </TouchableOpacity>
          )}
          
          {order.order_status === 'completed' && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.completedText}>Paid</Text>
            </View>
          )}
          
          {order.order_status === 'cancelled' && (
            <View style={styles.completedBadge}>
              <Ionicons name="close-circle" size={16} color={colors.error} />
              <Text style={[styles.completedText, { color: colors.error }]}>Cancelled</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Orders</Text>
          {newOrdersCount > 0 && (
            <View style={styles.newOrdersBadge}>
              <Text style={styles.newOrdersText}>{newOrdersCount} New</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {(() => {
          const filteredOrders = getFilteredOrders();
          console.log('🔍 RENDER DEBUG: Total orders:', orders.length);
          console.log('🔍 RENDER DEBUG: Filtered orders:', filteredOrders.length);
          console.log('🔍 RENDER DEBUG: Active tab:', activeTab);
          return filteredOrders.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>
                {activeTab === 'active' ? '🔔 No Active Orders' : 'No Order History'}
              </Text>
              <Text style={styles.emptySubText}>
                {activeTab === 'active' 
                  ? 'All orders containing your shop products will appear here. This includes orders from any customer who purchased from your shop.'
                  : 'All completed and cancelled orders from your shop will appear here'
                }
              </Text>
              <Text style={styles.debugText}>
                Debug: {orders.length} total orders | {filteredOrders.length} {activeTab} | Shop: {user?.profile?.shop_slug || 'None'}
              </Text>
              {activeTab === 'active' && (
                <Text style={styles.autoRefreshText}>
                  🔄 Auto-checking for new orders...
                </Text>
              )}
            </View>
          ) : (
            filteredOrders.map(renderOrderCard)
          );
        })()}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Delivery</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Ask the buyer to show you their delivery code, then enter it below to confirm delivery and receive payment.
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="Enter delivery code"
              value={deliveryCode}
              onChangeText={setDeliveryCode}
              maxLength={8}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.confirmModalBtn]}
                onPress={executeAction}
              >
                <Text style={styles.confirmBtnText}>Confirm & Get Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.card, elevation: 2 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  newOrdersBadge: { backgroundColor: colors.error, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 12 },
  newOrdersText: { color: colors.card, fontSize: 12, fontWeight: '600' },
  refreshButton: { padding: 8 },
  content: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  loadingText: { fontSize: 16, color: colors.textLight },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySubText: { fontSize: 14, color: colors.textLight, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  autoRefreshText: { fontSize: 12, color: colors.primary, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  debugText: { fontSize: 10, color: colors.textLight, textAlign: 'center', marginTop: 8, fontFamily: 'monospace' },
  
  orderCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderId: { fontSize: 16, fontWeight: '700', color: colors.text },
  customerName: { fontSize: 14, color: colors.textLight, marginTop: 2 },
  customerPhone: { fontSize: 12, color: colors.primary, marginTop: 1, fontWeight: '500' },
  orderDate: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: '600' },
  
  deliveryInfo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.accent, borderRadius: 8 },
  deliveryAddress: { fontSize: 13, color: colors.text, marginLeft: 8, flex: 1, lineHeight: 18 },
  orderSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  itemsList: { marginBottom: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  productImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  itemDetails: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  itemPrice: { fontSize: 13, color: colors.textLight, marginBottom: 2 },
  itemSubtotal: { fontSize: 14, fontWeight: '600', color: colors.primary },
  itemCount: { fontSize: 14, color: colors.textLight },
  orderTotal: { fontSize: 18, fontWeight: '700', color: colors.text },
  
  itemsPreview: { marginBottom: 16 },
  itemPreview: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemImage: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  itemName: { flex: 1, fontSize: 14, color: colors.text },
  itemQty: { fontSize: 12, color: colors.textLight, fontWeight: '600' },
  moreItemsText: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginTop: 4 },
  
  actionButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  generateBtn: { backgroundColor: colors.primary },
  deliveredBtn: { backgroundColor: colors.success },
  actionBtnText: { color: colors.card, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  completedBadge: { flexDirection: 'row', alignItems: 'center' },
  completedText: { color: colors.success, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalText: { fontSize: 14, color: colors.textLight, lineHeight: 20, marginBottom: 20 },
  codeInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.accent },
  cancelBtnText: { color: colors.text, fontWeight: '600' },
  confirmModalBtn: { backgroundColor: colors.primary },
  confirmBtnText: { color: colors.card, fontWeight: '600' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, marginHorizontal: 4 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  activeTabText: { color: colors.card },
});

export default SellerOrdersScreen;