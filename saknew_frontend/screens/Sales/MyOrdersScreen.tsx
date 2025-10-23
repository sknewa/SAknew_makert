import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainNavigationProp } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext.minimal';
import { getMyOrders, updateOrderStatus, Order, createReview } from '../../services/salesService';
import { colors } from '../../styles/globalStyles';
import { SecurityUtils } from '../../utils/securityUtils';

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${(num || 0).toFixed(2)}`;
};

const getOrderStatusDisplay = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'pending': 'Pending Payment',
    'processing': 'Processing',
    'ready_for_delivery': 'Ready for Delivery',
    'delivered': 'Delivered',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
  };
  return statusMap[status] || status;
};

const MyOrdersScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'received'>('pending');
  const [verificationModal, setVerificationModal] = useState<{
    visible: boolean;
    orderId: string;
    code: string;
  }>({ visible: false, orderId: '', code: '' });
  
  const [reviewModal, setReviewModal] = useState<{
    visible: boolean;
    product: any;
    orderId: string;
    rating: number;
    comment: string;
  }>({ visible: false, product: null, orderId: '', rating: 5, comment: '' });
  
  const [cancelModal, setCancelModal] = useState<{
    visible: boolean;
    orderId: string;
    orderDate: string;
  }>({ visible: false, orderId: '', orderDate: '' });
  
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const orderData = await getMyOrders();
      // Filter to only show orders where user is the buyer AND payment is completed
      const buyerOrders = orderData.filter(order => 
        order.user.id === user?.id && order.payment_status === 'Completed'
      );
      setOrders(buyerOrders);
    } catch (err: any) {
      SecurityUtils.safeLog('error', 'Failed to load orders:', err);
      Alert.alert('Error', 'Failed to load your orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && isAuthenticated) {
        fetchOrders();
      }
    }, [authLoading, isAuthenticated, fetchOrders])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleVerifyDelivery = async () => {
    if (!verificationModal.code.trim()) {
      Alert.alert('Error', 'Please enter the verification code.');
      return;
    }

    try {
      await updateOrderStatus(verificationModal.orderId, 'verify_delivery_code', verificationModal.code);
      Alert.alert('Success', 'Delivery verified successfully! Your order is now complete.');
      setVerificationModal({ visible: false, orderId: '', code: '' });
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to verify delivery.');
    }
  };

  const handleRequestCode = async (orderId: string) => {
    console.log('🔍 DEBUG: === REQUEST CODE START ===');
    console.log('🔍 DEBUG: Order ID:', orderId);
    
    try {
      console.log('🔍 DEBUG: Calling updateOrderStatus with action: request_code');
      const response = await updateOrderStatus(orderId, 'request_code');
      console.log('🔍 DEBUG: Full response:', JSON.stringify(response, null, 2));
      console.log('🔍 DEBUG: Response keys:', Object.keys(response));
      console.log('🔍 DEBUG: Delivery code from response:', response.delivery_verification_code);
      console.log('🔍 DEBUG: Delivery code from order:', response.order?.delivery_verification_code);
      
      const deliveryCode = response.delivery_verification_code || response.order?.delivery_verification_code || response.delivery_code;
      
      if (!deliveryCode) {
        console.error('🔍 DEBUG: No delivery code found in response!');
        Alert.alert('Error', 'Failed to retrieve delivery code. Please try again.');
        return;
      }
      
      Alert.alert(
        'Delivery Code',
        `Your delivery code is: ${deliveryCode}\n\nShow this code to the seller when they deliver your order.`,
        [{ text: 'OK', onPress: () => {
          console.log('🔍 DEBUG: Refreshing orders after code request');
          fetchOrders();
        }}]
      );
      console.log('🔍 DEBUG: === REQUEST CODE SUCCESS ===');
    } catch (err: any) {
      console.error('🔍 DEBUG: === REQUEST CODE ERROR ===');
      console.error('🔍 DEBUG: Error:', err);
      console.error('🔍 DEBUG: Error response:', err?.response);
      console.error('🔍 DEBUG: Error data:', err?.response?.data);
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to get delivery code.');
    }
  };

  const handleCancelOrder = (orderId: string, orderDate: string) => {
    const orderTime = new Date(orderDate).getTime();
    const currentTime = new Date().getTime();
    const hoursSincePurchase = (currentTime - orderTime) / (1000 * 60 * 60);
    
    if (hoursSincePurchase > 12) {
      Alert.alert(
        'Cannot Cancel',
        'Orders can only be cancelled within 12 hours of purchase. This order was placed more than 12 hours ago.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setCancelModal({ visible: true, orderId, orderDate });
    setCancelReason('');
  };
  
  const confirmCancelOrder = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for cancelling this order.');
      return;
    }
    
    setCancelling(true);
    try {
      await updateOrderStatus(cancelModal.orderId, 'cancel_order', cancelReason);
      setCancelModal({ visible: false, orderId: '', orderDate: '' });
      setCancelReason('');
      Alert.alert('Order Cancelled', 'Your order has been cancelled and the refund has been processed to your wallet.');
      await fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  const handleMarkAsReceived = (orderId: string) => {
    setVerificationModal({ visible: true, orderId, code: '' });
  };

  const openReviewModal = (product: any, orderId: string) => {
    setReviewModal({
      visible: true,
      product,
      orderId,
      rating: 5,
      comment: ''
    });
  };

  const submitReview = async () => {
    try {
      await createReview({
        order_id: reviewModal.orderId,
        product_id: reviewModal.product.id,
        rating: reviewModal.rating,
        comment: reviewModal.comment
      });
      Alert.alert('Success', 'Review submitted successfully!');
      setReviewModal({ visible: false, product: null, orderId: '', rating: 5, comment: '' });
      fetchOrders(); // Refresh to prevent duplicate reviews
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || 'Failed to submit review';
      if (errorMsg.includes('already reviewed')) {
        Alert.alert('Already Reviewed', 'You have already reviewed this product.');
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const renderStars = (currentRating: number, onPress?: (rating: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={24}
              color={colors.warningAction}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={60} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Please Log In</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login' as any)}
          >
            <Text style={styles.buttonText}>Log In</Text>
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
        <Text style={styles.pageTitle}>My Purchase History</Text>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'received' && styles.activeTab]}
            onPress={() => setActiveTab('received')}
          >
            <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>Received</Text>
          </TouchableOpacity>
        </View>

        {(() => {
          const filteredOrders = orders.filter(order => {
            if (activeTab === 'pending') {
              return !order.delivery_verified && order.order_status !== 'cancelled' && order.order_status !== 'completed';
            } else {
              return order.delivery_verified || order.order_status === 'completed' || order.order_status === 'cancelled';
            }
          });
          
          return filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-outline" size={80} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? 'No pending orders' : 'No completed orders'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'pending' 
                ? 'Your pending purchases will appear here' 
                : 'Your completed purchases will appear here'
              }
            </Text>
            {activeTab === 'pending' && (
              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => navigation.navigate('BottomTabs')}
              >
                <Text style={styles.buttonText}>Start Shopping</Text>
              </TouchableOpacity>
            )}
          </View>
          ) : (
            filteredOrders.map((order) => (
            <View 
              key={order.id} 
              style={styles.orderCard}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderDate}>
                    {new Date(order.order_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </Text>
                  <Text style={styles.orderNumber}>Order #{String(order.id).slice(-8)}</Text>
                </View>
                <View style={styles.orderStatus}>
                  <Text style={[
                    styles.statusBadge,
                    order.order_status === 'pending' && styles.statusPending,
                    order.order_status === 'processing' && styles.statusProcessing,
                    order.order_status === 'ready_for_delivery' && styles.statusShipped,
                    order.order_status === 'delivered' && styles.statusDelivered,
                    order.order_status === 'completed' && styles.statusCompleted,
                    order.order_status === 'cancelled' && styles.statusCancelled,
                  ]}>
                    {getOrderStatusDisplay(order.order_status)}
                  </Text>
                  <Text style={styles.orderTotal}>{formatCurrency(order.total_price)}</Text>
                </View>
              </View>

              <View style={styles.itemsContainer}>
                {order.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Image
                      source={{ 
                        uri: item.product.main_image_url || 'https://via.placeholder.com/60x60?text=No+Image' 
                      }}
                      style={styles.productImage}
                    />
                    <View style={styles.itemDetails}>
                      <Text style={styles.productNameItem} numberOfLines={2}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                      <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.actionButtons}>
                <View style={styles.quickActions}>
                  <View style={styles.detailsLink}>
                    <Ionicons name="eye-outline" size={14} color={colors.infoAction} />
                    <Text style={styles.linkText}>Order #{String(order.id).slice(-8)}</Text>
                  </View>

                  {order.order_status === 'processing' && (
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={() => handleRequestCode(order.id)}
                    >
                      <Ionicons name="code-outline" size={14} color={colors.buttonText} />
                      <Text style={styles.quickActionText}>Request Code</Text>
                    </TouchableOpacity>
                  )}

                  {(order.order_status === 'pending' || order.order_status === 'processing') && (
                    <TouchableOpacity
                      style={styles.cancelActionButton}
                      onPress={() => handleCancelOrder(order.id, order.order_date)}
                    >
                      <Ionicons name="close-circle-outline" size={14} color={colors.buttonText} />
                      <Text style={styles.cancelActionText}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  {(order.order_status === 'completed' || order.delivery_verified) && (
                    <TouchableOpacity
                      style={styles.reviewLink}
                      onPress={() => openReviewModal(order.items[0].product, order.id)}
                    >
                      <Ionicons name="star-outline" size={14} color={colors.warningAction} />
                      <Text style={styles.reviewLinkText}>Add Review</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.mainActions}>
                  {order.order_status === 'processing' && (
                    <TouchableOpacity
                      style={styles.markReceivedButton}
                      onPress={() => handleRequestCode(order.id)}
                    >
                      <Ionicons name="code-outline" size={16} color={colors.buttonText} />
                      <Text style={styles.mainActionText}>Request Delivery Code</Text>
                    </TouchableOpacity>
                  )}

                  {order.delivery_verification_code && order.order_status === 'ready_for_delivery' && (
                    <View>
                      <View style={styles.codeDisplayContainer}>
                        <Text style={styles.codeLabel}>Your Delivery Code:</Text>
                        <Text style={styles.deliveryCode}>{order.delivery_verification_code}</Text>
                        <Text style={styles.codeInstruction}>Show this code to the seller</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.markReceivedButton}
                        onPress={() => handleMarkAsReceived(order.id)}
                      >
                        <Ionicons name="checkmark-circle" size={16} color={colors.buttonText} />
                        <Text style={styles.mainActionText}>Mark as Received</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {(order.order_status === 'completed' || order.delivery_verified) && (
                    <TouchableOpacity
                      style={styles.addReviewButton}
                      onPress={() => openReviewModal(order.items[0].product, order.id)}
                    >
                      <Ionicons name="star-outline" size={16} color={colors.buttonText} />
                      <Text style={styles.mainActionText}>Add Review</Text>
                    </TouchableOpacity>
                  )}

                  {order.delivery_verified && (
                    <View style={styles.verifiedContainer}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text style={styles.verifiedText}>Delivered & Verified</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))
        );
        })()}
      </ScrollView>

      <Modal
        visible={verificationModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerificationModal({ visible: false, orderId: '', code: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Delivery</Text>
            <Text style={styles.modalSubtitle}>Enter the delivery code shown by the seller:</Text>
            
            <TextInput
              style={styles.codeInput}
              placeholder="Enter delivery code"
              value={verificationModal.code}
              onChangeText={(text) => setVerificationModal(prev => ({ ...prev, code: text.toUpperCase() }))}
              autoCapitalize="characters"
              maxLength={8}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setVerificationModal({ visible: false, orderId: '', code: '' })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleVerifyDelivery}
              >
                <Text style={styles.buttonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cancelModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCancelModal({ visible: false, orderId: '', orderDate: '' });
          setCancelReason('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={48} color={colors.dangerAction} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for cancelling this order. Your refund will be processed to your wallet.</Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setCancelModal({ visible: false, orderId: '', orderDate: '' });
                  setCancelReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.dangerAction }]}
                onPress={confirmCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <Text style={styles.buttonText}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reviewModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Product</Text>
              <TouchableOpacity onPress={() => setReviewModal({ visible: false, product: null, orderId: '', rating: 5, comment: '' })}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.productNameModal}>{reviewModal.product?.name}</Text>

            <Text style={styles.ratingLabel}>Rating:</Text>
            {renderStars(reviewModal.rating, (rating) => setReviewModal(prev => ({ ...prev, rating })))}

            <Text style={styles.commentLabel}>Comment (optional):</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              value={reviewModal.comment}
              onChangeText={(text) => setReviewModal(prev => ({ ...prev, comment: text }))}
              placeholder="Share your experience..."
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setReviewModal({ visible: false, product: null, orderId: '', rating: 5, comment: '' })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={submitReview}>
                <Text style={styles.buttonText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 16, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 10 },
  
  pageTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, textAlign: 'center' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  
  orderCard: { backgroundColor: colors.card, borderRadius: 4, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  orderDate: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  orderNumber: { fontSize: 11, color: colors.textSecondary },
  orderStatus: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, fontSize: 11, fontWeight: '600', marginBottom: 3 },
  statusPending: { backgroundColor: colors.warningAction + '20', color: colors.warningAction },
  statusProcessing: { backgroundColor: colors.infoAction + '20', color: colors.infoAction },
  statusShipped: { backgroundColor: colors.primary + '20', color: colors.primary },
  statusDelivered: { backgroundColor: colors.primary + '20', color: colors.primary },
  statusCompleted: { backgroundColor: colors.primary + '20', color: colors.primary },
  statusCancelled: { backgroundColor: colors.dangerAction + '20', color: colors.dangerAction },
  orderTotal: { fontSize: 14, fontWeight: '700', color: colors.primary },
  
  itemsContainer: { marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  productImage: { width: 60, height: 60, borderRadius: 4, marginRight: 10, backgroundColor: '#F8F8F8', borderWidth: 1, borderColor: colors.border },
  itemDetails: { flex: 1 },
  productNameItem: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  itemQuantity: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  itemPrice: { fontSize: 12, fontWeight: '700', color: colors.primary },
  
  actionButtons: { marginTop: 12 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.infoAction + '10', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  linkText: { color: colors.infoAction, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  quickActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  quickActionText: { color: colors.buttonText, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  reviewLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warningAction + '10', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  reviewLinkText: { color: colors.warningAction, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  
  mainActions: { marginTop: 12 },
  markReceivedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 4, marginBottom: 8 },
  addReviewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF9800', paddingVertical: 10, borderRadius: 4, marginBottom: 8 },
  mainActionText: { color: colors.white, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  
  verifiedContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '10', paddingVertical: 8, borderRadius: 6 },
  verifiedText: { fontSize: 12, color: colors.primary, fontWeight: '600', marginLeft: 4 },
  codeDisplayContainer: { backgroundColor: colors.primary + '10', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  codeLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  deliveryCode: { fontSize: 20, fontWeight: 'bold', color: colors.primary, letterSpacing: 2, marginBottom: 4 },
  codeInstruction: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  
  tabContainer: { flexDirection: 'row', marginBottom: 12, backgroundColor: colors.border, borderRadius: 4, padding: 3 },
  tab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 3 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  activeTabText: { color: colors.white },
  
  cancelActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerAction, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  cancelActionText: { color: colors.buttonText, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  productNameModal: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  starsContainer: { flexDirection: 'row', marginBottom: 16 },
  commentLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  commentInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, textAlignVertical: 'top', marginBottom: 20 },
  
  loginButton: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4 },
  shopButton: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4 },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 8, padding: 20, width: '90%', maxWidth: 400, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  codeInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  reasonInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, fontSize: 13, marginBottom: 16, minHeight: 70, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, backgroundColor: colors.border, paddingVertical: 10, borderRadius: 4, marginRight: 6, alignItems: 'center' },
  cancelButtonText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  confirmButton: { flex: 1, backgroundColor: '#FF9800', paddingVertical: 10, borderRadius: 4, marginLeft: 6, alignItems: 'center' },
});

export default MyOrdersScreen;
