import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Image, Linking } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';
import { Ionicons } from '@expo/vector-icons';
import { MainNavigationProp } from '../../navigation/types';
import apiClient from '../../services/apiClient';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

interface ShippingAddress {
  contact_name?: string;
  contact_phone?: string;
  full_address?: string;
  street_number?: string;
  street_name?: string;
  suburb?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface OrderItem {
  id: number;
  product: {
    id: number;
    name: string;
    main_image_url?: string;
    shop?: { id: number; name: string; slug: string };
  };
  price: string;
  quantity: number;
  subtotal: string;
  size?: string;
}

interface Order {
  id: string;
  user: { username?: string; email: string; phone?: string };
  order_date: string;
  order_status: string;
  payment_status: string;
  total_price: string;
  delivery_verification_code?: string;
  cancellation_reason?: string;
  shipping_address?: ShippingAddress;
  items: OrderItem[];
}

const colors = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  primary: '#28A745',
  info: '#17A2B8',
  warning: '#FFC107',
  error: '#DC3545',
  text: '#212529',
  textLight: '#6C757D',
  border: '#DEE2E6',
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
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated || !user?.profile?.is_seller) {
      setOrders([]);
      setLoading(false);
      return;
    }
    
    try {
      const response = await apiClient.get('/api/orders/');
      const allOrders: Order[] = response.data.results || response.data || [];
      
        safeLog('=== FETCH ORDERS DEBUG ===');
        safeLog('User shop_slug:', user.profile?.shop_slug);
        safeLog('Total orders:', allOrders.length);
        
        const sellerOrders = allOrders.filter((order: Order) => {
        if (order.payment_status !== 'paid' && order.payment_status !== 'Completed') return false;
        if (order.user.email === user.email) return false;
        
        const hasSellerItems = order.items?.some((item: OrderItem) => {
          const itemShopName = (item.product as any)?.shop_name?.toLowerCase().replace(/[''\s]/g, '-').replace(/-+/g, '-');
          const userShopSlug = user.profile?.shop_slug?.toLowerCase().replace(/['']/g, '');
          return itemShopName === userShopSlug;
        });
        
        return hasSellerItems;
      }).sort((a: Order, b: Order) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
      
      sellerOrders.forEach(order => {
        safeLog(`Order ${order.id.slice(-8)}: status=${order.order_status}, payment=${order.payment_status}`);
      });
      
      safeLog('Filtered seller orders:', sellerOrders.length);
      safeLog('=== END FETCH ORDERS DEBUG ===');
      
      setOrders(sellerOrders);
    } catch (error: any) {
      safeError('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  useFocusEffect(useCallback(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirmDelivery = (order: Order) => {
    safeLog('=== MARK AS DELIVERED BUTTON CLICKED ===');
    safeLog('Order:', order);
    safeLog('Order ID:', order.id);
    safeLog('Order Status:', order.order_status);
    safeLog('Order Items:', order.items);
    setSelectedOrder(order);
    setDeliveryCode('');
    setModalVisible(true);
    safeLog('Modal opened');
  };

  const handleCancelOrder = (order: Order) => {
    setSelectedOrder(order);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const executeCancelOrder = async () => {
    if (!selectedOrder) return;

    try {
      if (!cancelReason.trim()) {
        Alert.alert('Error', 'Please provide a reason for cancellation');
        return;
      }
      
      await apiClient.patch(`/api/orders/${selectedOrder.id}/`, {
        action_type: 'cancel_order',
        cancellation_reason: cancelReason.trim()
      });
      
      setCancelModalVisible(false);
      Alert.alert('Order Cancelled', 'The order has been cancelled successfully.');
      fetchOrders();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel order');
    }
  };

  const executeAction = async () => {
    safeLog('=== MARK AS DELIVERED DEBUG START ===');
    if (!selectedOrder) {
      safeLog('No selected order');
      return;
    }

    safeLog('Selected Order ID:', selectedOrder.id);
    safeLog('Delivery Code Entered:', deliveryCode);
    safeLog('Delivery Code (trimmed):', deliveryCode.trim());

    try {
      if (!deliveryCode.trim()) {
        safeLog('Delivery code is empty');
        Alert.alert('Error', 'Please enter the delivery code');
        return;
      }
      
      safeLog('Making API request to:', `/api/orders/${selectedOrder.id}/`);
      safeLog('Request payload:', {
        action_type: 'confirm_delivery',
        verification_code: deliveryCode.trim()
      });
      
      const response = await apiClient.patch(`/api/orders/${selectedOrder.id}/`, {
        action_type: 'confirm_delivery',
        verification_code: deliveryCode.trim()
      });
      
      safeLog('API Response:', response);
      safeLog('Response data:', response?.data);
      safeLog('Response order_status:', response?.data?.order_status);
      safeLog('Response delivery_verified:', response?.data?.delivery_verified);
      
      if (!response || !response.data) {
        safeLog('Invalid response received');
        Alert.alert('Error', 'Invalid delivery code. Please check the code and try again.');
        return;
      }
      
      const userShopSlug = user?.profile?.shop_slug?.toLowerCase().replace(/['']/g, '');
      const shopItems = selectedOrder.items.filter((item: OrderItem) => {
        const itemShopName = (item.product as any)?.shop_name?.toLowerCase().replace(/[''\s]/g, '-').replace(/-+/g, '-');
        return itemShopName === userShopSlug;
      });
      safeLog('Shop items count:', shopItems.length);
      
      const earnings = shopItems.reduce((sum, item: OrderItem) => 
        sum + (parseFloat(item.price) * item.quantity), 0
      );
      safeLog('Calculated earnings:', earnings);
      
      setModalVisible(false);
      Alert.alert(
        'Delivery Confirmed!', 
        `Order completed successfully.\n\nEarnings: ${formatCurrency(earnings)}\nPayment added to your wallet.`,
        [{ text: 'View Wallet', onPress: () => navigation.navigate('Wallet' as any) }]
      );
      safeLog('Fetching updated orders...');
      fetchOrders();
      safeLog('=== MARK AS DELIVERED DEBUG END ===');
    } catch (error: any) {
      safeError('=== MARK AS DELIVERED ERROR ===');
      safeError('Error object:', error);
      safeError('Error response:', error.response);
      safeError('Error response status:', error.response?.status);
      safeError('Error response data:', error.response?.data);
      safeError('Error message:', error.message);
      
      if (error.response?.status === 400 || error.response?.data?.detail?.includes('code')) {
        safeLog('Invalid code error');
        Alert.alert('Invalid Code', 'The delivery code you entered is incorrect. Please ask the buyer to show you their code again.');
      } else {
        safeLog('General error');
        Alert.alert('Error', error.response?.data?.detail || 'Failed to confirm delivery');
      }
      safeLog('=== MARK AS DELIVERED ERROR END ===');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'processing': return colors.warning;
      case 'ready_for_delivery': return colors.primary;
      case 'completed': return colors.primary;
      case 'cancelled': return colors.error;
      default: return colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'New Order';
      case 'ready_for_delivery': return 'Ready';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getFilteredOrders = () => {
    const filtered = orders.filter((order: Order) => {
      const isActive = ['pending', 'processing', 'approved', 'ready_for_delivery'].includes(order.order_status);
      const isCompleted = ['completed', 'cancelled'].includes(order.order_status);
      return activeTab === 'active' ? isActive : isCompleted;
    });
    
    if (activeTab === 'completed') {
      safeLog('=== HISTORY TAB ORDERS ===');
      safeLog('Total history orders:', filtered.length);
      const cancelledOrders = filtered.filter(o => o.order_status === 'cancelled');
      safeLog('Cancelled orders count:', cancelledOrders.length);
      if (cancelledOrders.length > 0) {
        safeLog('First cancelled order:', JSON.stringify(cancelledOrders[0], null, 2));
      }
    }
    
    return filtered;
  };

  const renderOrderCard = (order: Order) => {
    const userShopSlug = user?.profile?.shop_slug?.toLowerCase().replace(/['']/g, '');
    const shopItems = order.items.filter((item: OrderItem) => {
      const itemShopName = (item.product as any)?.shop_name?.toLowerCase().replace(/[''\s]/g, '-').replace(/-+/g, '-');
      return itemShopName === userShopSlug;
    });
    
    safeLog('=== ORDER ITEMS DEBUG ===');
    safeLog('Order ID:', order.id);
    safeLog('Order Status:', order.order_status);
    safeLog('Shop Items Count:', shopItems.length);
    shopItems.forEach((item, index) => {
      safeLog(`Item ${index + 1}:`, {
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        hasSize: !!item.size
      });
    });
    safeLog('=== END ORDER ITEMS DEBUG ===');
    
    const orderTotal = shopItems.reduce((sum, item: OrderItem) => 
      sum + (parseFloat(item.price) * item.quantity), 0
    );
    const itemCount = shopItems.reduce((sum, item: OrderItem) => sum + item.quantity, 0);
    
    const buyerName = order.shipping_address?.contact_name || order.user.username || 'Customer';
    const buyerPhone = order.shipping_address?.contact_phone || order.user.phone || 'Not provided';
    const buyerEmail = order.user.email || 'Not provided';
    
    let deliveryAddress = 'No address provided';
    if (order.shipping_address?.full_address) {
      deliveryAddress = order.shipping_address.full_address;
    } else if (order.shipping_address) {
      const parts = [
        order.shipping_address.street_number,
        order.shipping_address.street_name,
        order.shipping_address.suburb,
        order.shipping_address.city,
        order.shipping_address.state,
        order.shipping_address.zip_code,
        order.shipping_address.country
      ].filter(Boolean);
      deliveryAddress = parts.join(', ');
    }
    
    const hasCoordinates = order.shipping_address?.latitude && order.shipping_address?.longitude;
    const isHistory = ['completed', 'cancelled'].includes(order.order_status);
    const isExpanded = expandedOrders.has(order.id);

    return (
      <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
            <Text style={styles.orderDate}>{new Date(order.order_date).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.order_status) }]}>
              {getStatusText(order.order_status)}
            </Text>
          </View>
        </View>

        {order.order_status === 'cancelled' && (
          <>
            {safeLog('Rendering cancelled order:', order.id, 'Reason:', order.cancellation_reason)}
            {order.cancellation_reason ? (
              <View style={styles.cancellationBox}>
                <View style={styles.cancellationHeader}>
                  <Ionicons name="information-circle" size={14} color={colors.error} />
                  <Text style={styles.cancellationLabel}>Cancellation Reason</Text>
                </View>
                <Text style={styles.cancellationText}>{order.cancellation_reason}</Text>
              </View>
            ) : (
              <View style={styles.cancellationBox}>
                <View style={styles.cancellationHeader}>
                  <Ionicons name="information-circle" size={14} color={colors.error} />
                  <Text style={styles.cancellationLabel}>Cancelled</Text>
                </View>
                <Text style={styles.cancellationText}>No reason provided</Text>
              </View>
            )}
          </>
        )}

        {isHistory && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => {
              const newExpanded = new Set(expandedOrders);
              if (isExpanded) {
                newExpanded.delete(order.id);
              } else {
                newExpanded.add(order.id);
              }
              setExpandedOrders(newExpanded);
            }}
          >
            <Ionicons name="person-circle" size={14} color={colors.primary} />
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Hide' : 'Show'} Customer Details
            </Text>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
          </TouchableOpacity>
        )}

        {(!isHistory || isExpanded) && (
          <View style={styles.buyerInfoCard}>
          <View style={styles.buyerInfoHeader}>
            <Ionicons name="person-circle" size={16} color={colors.primary} />
            <Text style={styles.buyerInfoTitle}>Customer Details</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="person" size={14} color={colors.textLight} />
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoText}>{buyerName}</Text>
          </View>
          
          {buyerPhone && (
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={() => {
                Alert.alert(
                  'Call Customer',
                  `Call ${buyerPhone}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Call', onPress: () => Linking.openURL(`tel:${buyerPhone}`) }
                  ]
                );
              }}
            >
              <Ionicons name="call" size={14} color={colors.primary} />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={[styles.infoText, { color: colors.primary, fontWeight: '600' }]}>{buyerPhone}</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={14} color={colors.textLight} />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoText} numberOfLines={1}>{buyerEmail}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.deliveryHeader}>
            <Ionicons name="location" size={16} color={colors.error} />
            <Text style={styles.deliveryTitle}>Delivery Location</Text>
          </View>
          
          <Text style={styles.deliveryAddress}>{deliveryAddress}</Text>
          
          {hasCoordinates && (
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => {
                const lat = order.shipping_address?.latitude;
                const lng = order.shipping_address?.longitude;
                const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                Linking.openURL(url).catch(err => 
                  Alert.alert('Error', 'Could not open maps')
                );
              }}
            >
              <Ionicons name="map" size={14} color={colors.card} />
              <Text style={styles.mapButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          )}
          </View>
        )}

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
                <Text style={styles.productName} numberOfLines={1}>{item.product.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.itemPrice}>{formatCurrency(item.price)} × {item.quantity}</Text>
                  {item.size && (
                    <View style={styles.sizeBadge}>
                      <Text style={styles.sizeText}>Size: {item.size}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrency(parseFloat(item.price) * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionButtons}>
          {['processing', 'ready_for_delivery', 'approved'].includes(order.order_status) && (
            <>
              <TouchableOpacity 
                style={styles.cancelOrderBtn}
                onPress={() => handleCancelOrder(order)}
              >
                <Ionicons name="close-circle" size={14} color={colors.error} />
                <Text style={styles.cancelOrderBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deliveredBtn}
                onPress={() => handleConfirmDelivery(order)}
              >
                <Ionicons name="checkmark-circle" size={14} color={colors.card} />
                <Text style={styles.actionBtnText}>Mark Delivered</Text>
              </TouchableOpacity>
            </>
          )}
          
          {order.order_status === 'completed' && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={styles.completedText}>Paid</Text>
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

  const filteredOrders = getFilteredOrders();
  const newOrdersCount = orders.filter((order: Order) => 
    ['pending', 'processing', 'approved', 'ready_for_delivery'].includes(order.order_status)
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Orders</Text>
          {newOrdersCount > 0 && (
            <View style={styles.newOrdersBadge}>
              <Text style={styles.newOrdersText}>{newOrdersCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
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
        {filteredOrders.length === 0 ? (
          <View style={styles.centerContent}>
            <Ionicons name="receipt-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'No Active Orders' : 'No Order History'}
            </Text>
            <Text style={styles.emptySubText}>
              {activeTab === 'active' 
                ? 'Orders from customers will appear here'
                : 'Completed orders will appear here'
              }
            </Text>
          </View>
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
      </ScrollView>

      <Modal visible={cancelModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Order</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Please provide a reason for cancelling this order. This will be visible to the customer.
            </Text>

            <TextInput
              style={[styles.codeInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Enter cancellation reason"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.error }]}
                onPress={executeCancelOrder}
              >
                <Text style={styles.confirmBtnText}>Cancel Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Delivery</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
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
                <Text style={styles.confirmBtnText}>Confirm</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.card, elevation: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  newOrdersBadge: { backgroundColor: colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  newOrdersText: { color: colors.card, fontSize: 10, fontWeight: '600' },
  refreshButton: { padding: 6 },
  content: { flex: 1, paddingHorizontal: 10, paddingTop: 8 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  loadingText: { fontSize: 13, color: colors.textLight },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptySubText: { fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 6, paddingHorizontal: 24 },
  
  orderCard: { backgroundColor: colors.card, borderRadius: 8, padding: 10, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: colors.border },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orderId: { fontSize: 13, fontWeight: '700', color: colors.text },
  orderDate: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600' },
  
  buyerInfoCard: { backgroundColor: '#EFF6FF', borderRadius: 6, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  buyerInfoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  buyerInfoTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, marginLeft: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingVertical: 2 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: colors.textLight, marginLeft: 6, width: 50 },
  infoText: { fontSize: 11, color: colors.text, marginLeft: 4, flex: 1, lineHeight: 16, flexShrink: 1 },
  divider: { height: 1, backgroundColor: '#BFDBFE', marginVertical: 8 },
  deliveryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  deliveryTitle: { fontSize: 12, fontWeight: '700', color: colors.error, marginLeft: 6 },
  deliveryAddress: { fontSize: 11, color: colors.text, lineHeight: 16, marginBottom: 8, paddingLeft: 20 },
  mapButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginTop: 4 },
  mapButtonText: { color: colors.card, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  
  orderSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 },
  itemsList: { marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  productImage: { width: 40, height: 40, borderRadius: 6, marginRight: 8 },
  itemDetails: { flex: 1 },
  productName: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 2 },
  itemPrice: { fontSize: 10, color: colors.textLight },
  itemSubtotal: { fontSize: 12, fontWeight: '600', color: colors.primary },
  itemCount: { fontSize: 11, color: colors.textLight },
  orderTotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  
  actionButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  deliveredBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionBtnText: { color: colors.card, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  completedBadge: { flexDirection: 'row', alignItems: 'center' },
  completedText: { color: colors.primary, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 12, padding: 16, width: '90%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  modalText: { fontSize: 11, color: colors.textLight, lineHeight: 16, marginBottom: 12 },
  codeInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 10, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 8 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.border },
  cancelBtnText: { color: colors.text, fontWeight: '600', fontSize: 12 },
  confirmModalBtn: { backgroundColor: colors.primary },
  confirmBtnText: { color: colors.card, fontWeight: '600', fontSize: 12 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 6 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, marginHorizontal: 2 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textLight },
  activeTabText: { color: colors.card },
  
  cancellationBox: { marginBottom: 8, padding: 8, backgroundColor: '#FEE2E2', borderRadius: 6, borderWidth: 1, borderColor: '#FCA5A5' },
  cancellationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cancellationLabel: { fontSize: 11, fontWeight: '700', color: colors.error, marginLeft: 4 },
  cancellationText: { fontSize: 10, color: '#991B1B', lineHeight: 14, fontWeight: '500' },
  
  expandButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, marginBottom: 8, backgroundColor: '#F0F9FF', borderRadius: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  expandButtonText: { fontSize: 11, fontWeight: '600', color: colors.primary, marginHorizontal: 6 },
  
  cancelOrderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.error, marginRight: 8 },
  cancelOrderBtnText: { color: colors.error, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  
  sizeBadge: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sizeText: { color: colors.card, fontSize: 9, fontWeight: '700' },
});

export default SellerOrdersScreen;
