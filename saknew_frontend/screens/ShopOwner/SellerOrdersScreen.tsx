import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';
import { Ionicons } from '@expo/vector-icons';
import { MainNavigationProp } from '../../navigation/types';
import apiClient from '../../services/apiClient';
import { updateOrderStatus } from '../../services/salesService';
import { formatApiError } from '../../utils/errorHandler';
import { SecurityUtils } from '../../utils/securityUtils';

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
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveryCode, setDeliveryCode] = useState('');
  const [modalType, setModalType] = useState<'generate' | 'confirm'>('generate');
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const fetchOrders = useCallback(async () => {
    SecurityUtils.safeLog('log', '🔍 DEBUG: fetchOrders called');
    SecurityUtils.safeLog('log', '🔍 DEBUG: isAuthenticated:', isAuthenticated);
    SecurityUtils.safeLog('log', '🔍 DEBUG: user:', user);
    SecurityUtils.safeLog('log', '🔍 DEBUG: user.profile:', user?.profile);
    SecurityUtils.safeLog('log', '🔍 DEBUG: is_seller:', user?.profile?.is_seller);
    SecurityUtils.safeLog('log', '🔍 DEBUG: shop_id:', user?.profile?.shop_id);
    
    if (!isAuthenticated || !user?.profile?.is_seller) {
      SecurityUtils.safeLog('log', '🔍 DEBUG: Early return - not authenticated or not seller');
      return;
    }
    
    try {
      SecurityUtils.safeLog('log', '🔍 DEBUG: Making API call to /api/orders/');
      const response = await apiClient.get('/api/orders/');
      SecurityUtils.safeLog('log', '🔍 DEBUG: API response:', response.data);
      
      const allOrders = response.data.results || [];
      SecurityUtils.safeLog('log', '🔍 DEBUG: Total orders from API:', allOrders.length);
      
      // Filter orders for this seller - show ALL order history
      const sellerOrders = allOrders.filter(order => {
        SecurityUtils.safeLog('log', '🔍 DEBUG: Checking order:', order.id);
        SecurityUtils.safeLog('log', '🔍 DEBUG: Order items:', order.items);
        SecurityUtils.safeLog('log', '🔍 DEBUG: Order user ID:', `${order.user.id} vs seller ID: ${user.id}`);
        
        const hasSellerItems = order.items.some(item => {
          SecurityUtils.safeLog('log', '🔍 DEBUG: Item product shop:', `${item.product.shop} vs seller shop_id: ${user.profile.shop_id}`);
          return item.product.shop === user.profile.shop_id;
        });
        
        const isNotOwnOrder = order.user.id !== user.id;
        SecurityUtils.safeLog('log', '🔍 DEBUG: Has seller items:', `${hasSellerItems}, Is not own order: ${isNotOwnOrder}`);
        
        return hasSellerItems && isNotOwnOrder;
      }).sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
      
      SecurityUtils.safeLog('log', '🔍 DEBUG: Filtered seller orders:', sellerOrders.length);
      SecurityUtils.safeLog('log', '🔍 DEBUG: Seller orders:', sellerOrders);
      
      setOrders(sellerOrders);
    } catch (error) {
      SecurityUtils.safeLog('error', '🔍 DEBUG: Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  useFocusEffect(useCallback(() => {
    fetchOrders();
  }, [fetchOrders]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleGenerateCode = (order: any) => {
    setSelectedOrder(order);
    setModalType('generate');
    setModalVisible(true);
  };

  const handleConfirmDelivery = (order: any) => {
    setSelectedOrder(order);
    setModalType('confirm');
    setDeliveryCode('');
    setModalVisible(true);
  };

  const executeAction = async () => {
    if (!selectedOrder) return;

    try {
      if (modalType === 'generate') {
        const response = await updateOrderStatus(selectedOrder.id, 'generate_code');
        Alert.alert('Success', `Code sent to buyer: ${response.delivery_code}`);
      } else {
        if (!deliveryCode.trim()) {
          Alert.alert('Error', 'Please enter the delivery code');
          return;
        }
        await updateOrderStatus(selectedOrder.id, 'confirm_delivery', deliveryCode);
        Alert.alert('Success', 'Delivery confirmed! Payment added to your wallet.');
      }
      
      setModalVisible(false);
      fetchOrders();
    } catch (error) {
      Alert.alert('Error', formatApiError(error));
    }
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
    const filtered = orders.filter(order => {
      if (activeTab === 'active') {
        return ['pending', 'processing', 'ready_for_delivery'].includes(order.order_status);
      } else {
        return ['completed', 'cancelled'].includes(order.order_status);
      }
    });
    SecurityUtils.safeLog('log', '🔍 DEBUG: Active tab:', activeTab);
    SecurityUtils.safeLog('log', '🔍 DEBUG: Total orders:', orders.length);
    SecurityUtils.safeLog('log', '🔍 DEBUG: Filtered orders:', filtered.length);
    return filtered;
  };

  const renderOrderCard = (order: any) => {
    const orderTotal = order.items
      .filter(item => item.product.shop === user?.profile?.shop_id)
      .reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

    const itemCount = order.items
      .filter(item => item.product.shop === user?.profile?.shop_id)
      .reduce((sum, item) => sum + item.quantity, 0);

    return (
      <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
            <Text style={styles.customerName}>{order.user.username || order.user.email}</Text>
            <Text style={styles.orderDate}>{new Date(order.order_date).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.order_status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.order_status) }]}>
              {getStatusText(order.order_status)}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.itemCount}>{itemCount} items</Text>
          <Text style={styles.orderTotal}>{formatCurrency(orderTotal)}</Text>
        </View>

        <View style={styles.itemsPreview}>
          {order.items
            .filter(item => item.product.shop === user?.profile?.shop_id)
            .slice(0, 2)
            .map((item, index) => (
              <View key={index} style={styles.itemPreview}>
                <Image 
                  source={{ uri: item.product.image || 'https://via.placeholder.com/40' }}
                  style={styles.itemImage}
                />
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemQty}>×{item.quantity}</Text>
              </View>
            ))}
        </View>

        <View style={styles.actionButtons}>
          {order.order_status === 'processing' && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.generateBtn]}
              onPress={() => handleGenerateCode(order)}
            >
              <Ionicons name="key" size={16} color={colors.card} />
              <Text style={styles.actionBtnText}>Send Code to Buyer</Text>
            </TouchableOpacity>
          )}
          
          {order.order_status === 'ready_for_delivery' && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={() => handleConfirmDelivery(order)}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.card} />
              <Text style={styles.actionBtnText}>Confirm Delivery</Text>
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
        <Text style={styles.headerTitle}>Order History</Text>
        <TouchableOpacity onPress={onRefresh}>
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
          return filteredOrders.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="receipt-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyText}>
                {activeTab === 'active' ? 'No active orders' : 'No order history'}
              </Text>
              <Text style={styles.emptySubText}>
                {activeTab === 'active' 
                  ? 'New orders will appear here when customers buy your products'
                  : 'Completed and cancelled orders will appear here'
                }
              </Text>
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
              <Text style={styles.modalTitle}>
                {modalType === 'generate' ? 'Send Delivery Code' : 'Confirm Delivery'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              {modalType === 'generate' 
                ? 'This will send the delivery code to the buyer. They will show you this code when they receive the order.'
                : 'Enter the delivery code that the buyer showed you to confirm delivery and receive payment.'
              }
            </Text>

            {modalType === 'confirm' && (
              <TextInput
                style={styles.codeInput}
                placeholder="Enter delivery code"
                value={deliveryCode}
                onChangeText={setDeliveryCode}
                maxLength={8}
                autoCapitalize="characters"
              />
            )}

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
                <Text style={styles.confirmBtnText}>
                  {modalType === 'generate' ? 'Send Code' : 'Confirm & Get Paid'}
                </Text>
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  content: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  loadingText: { fontSize: 16, color: colors.textLight },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySubText: { fontSize: 14, color: colors.textLight, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  
  orderCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderId: { fontSize: 16, fontWeight: '700', color: colors.text },
  customerName: { fontSize: 14, color: colors.textLight, marginTop: 2 },
  orderDate: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: '600' },
  
  orderDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemCount: { fontSize: 14, color: colors.textLight },
  orderTotal: { fontSize: 18, fontWeight: '700', color: colors.text },
  
  itemsPreview: { marginBottom: 16 },
  itemPreview: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemImage: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  itemName: { flex: 1, fontSize: 14, color: colors.text },
  itemQty: { fontSize: 12, color: colors.textLight, fontWeight: '600' },
  
  actionButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  generateBtn: { backgroundColor: colors.primary },
  confirmBtn: { backgroundColor: colors.success },
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