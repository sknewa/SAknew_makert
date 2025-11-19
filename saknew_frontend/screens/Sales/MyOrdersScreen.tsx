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
import { messagingService } from '../../services/messagingService';

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
    itemId?: number;
    itemName?: string;
  }>({ visible: false, orderId: '', code: '', itemId: undefined, itemName: undefined });
  
  const [reviewModal, setReviewModal] = useState<{
    visible: boolean;
    product: any;
    orderId: string;
    rating: number;
    comment: string;
  }>({ visible: false, product: null, orderId: '', rating: 5, comment: '' });
  
  const [reviewedProducts, setReviewedProducts] = useState<Set<number>>(new Set());
  
  const [cancelModal, setCancelModal] = useState<{
    visible: boolean;
    orderId: string;
    orderDate: string;
    itemId?: number;
    itemName?: string;
  }>({ visible: false, orderId: '', orderDate: '', itemId: undefined, itemName: undefined });
  
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
      const action = verificationModal.itemId ? 'verify_item_delivery' : 'verify_delivery_code';
      const payload = verificationModal.itemId 
        ? { code: verificationModal.code, item_id: verificationModal.itemId }
        : verificationModal.code;
      
      await updateOrderStatus(verificationModal.orderId, action, payload);
      
      const message = verificationModal.itemId
        ? 'Item delivery verified successfully!'
        : 'Delivery verified successfully! Your order is now complete.';
      Alert.alert('Success', message);
      setVerificationModal({ visible: false, orderId: '', code: '', itemId: undefined, itemName: undefined });
      fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to verify delivery.');
    }
  };

  const handleRequestCode = async (orderId: string) => {
    safeLog('🔍 DEBUG: === REQUEST CODE START ===');
    safeLog('🔍 DEBUG: Order ID:', orderId);
    
    try {
      safeLog('🔍 DEBUG: Calling updateOrderStatus with action: request_code');
      const response = await updateOrderStatus(orderId, 'request_code');
      safeLog('🔍 DEBUG: Full response:', JSON.stringify(response, null, 2));
      safeLog('🔍 DEBUG: Response keys:', Object.keys(response));
      safeLog('🔍 DEBUG: Delivery code from response:', response.delivery_verification_code);
      safeLog('🔍 DEBUG: Delivery code from order:', response.order?.delivery_verification_code);
      
      const deliveryCode = response.delivery_verification_code || response.order?.delivery_verification_code || response.delivery_code;
      
      if (!deliveryCode) {
        safeError('🔍 DEBUG: No delivery code found in response!');
        Alert.alert('Error', 'Failed to retrieve delivery code. Please try again.');
        return;
      }
      
      Alert.alert(
        'Delivery Code',
        `Your delivery code is: ${deliveryCode}\n\nShow this code to the seller when they deliver your order.`,
        [{ text: 'OK', onPress: () => {
          safeLog('🔍 DEBUG: Refreshing orders after code request');
          fetchOrders();
        }}]
      );
      safeLog('🔍 DEBUG: === REQUEST CODE SUCCESS ===');
    } catch (err: any) {
      safeError('🔍 DEBUG: === REQUEST CODE ERROR ===');
      safeError('🔍 DEBUG: Error:', err);
      safeError('🔍 DEBUG: Error response:', err?.response);
      safeError('🔍 DEBUG: Error data:', err?.response?.data);
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to get delivery code.');
    }
  };

  const handleCancelOrder = (orderId: string, orderDate: string, itemId?: number, itemName?: string) => {
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
    
    setCancelModal({ visible: true, orderId, orderDate, itemId, itemName });
    setCancelReason('');
  };
  
  const confirmCancelOrder = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for cancelling.');
      return;
    }
    
    setCancelling(true);
    try {
      const action = cancelModal.itemId ? 'cancel_item' : 'cancel_order';
      const payload = cancelModal.itemId 
        ? { item_id: cancelModal.itemId, cancellation_reason: cancelReason }
        : cancelReason;
      
      await updateOrderStatus(cancelModal.orderId, action, payload);
      setCancelModal({ visible: false, orderId: '', orderDate: '', itemId: undefined, itemName: undefined });
      setCancelReason('');
      
      const message = cancelModal.itemId 
        ? 'Item cancelled and refund processed to your wallet.'
        : 'Order cancelled and refund processed to your wallet.';
      Alert.alert('Cancelled', message);
      await fetchOrders();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to cancel.');
    } finally {
      setCancelling(false);
    }
  };

  const handleMarkAsReceived = (orderId: string, itemId?: number, itemName?: string) => {
    setVerificationModal({ visible: true, orderId, code: '', itemId, itemName });
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
      setReviewedProducts(prev => new Set(prev).add(reviewModal.product.id));
      Alert.alert('Success', 'Review submitted successfully!');
      setReviewModal({ visible: false, product: null, orderId: '', rating: 5, comment: '' });
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || 'Failed to submit review';
      if (errorMsg.includes('already reviewed')) {
        setReviewedProducts(prev => new Set(prev).add(reviewModal.product.id));
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

              {order.order_status === 'cancelled' && order.cancellation_reason && (
                <View style={styles.cancellationBox}>
                  <View style={styles.cancellationHeader}>
                    <Ionicons name="information-circle" size={14} color={colors.dangerAction} />
                    <Text style={styles.cancellationLabel}>Cancellation Reason</Text>
                  </View>
                  <Text style={styles.cancellationText}>{order.cancellation_reason}</Text>
                </View>
              )}

              <View style={styles.itemsContainer}>
                {order.items.map((item) => (
                  <View key={item.id}>
                    <View style={styles.itemRow}>
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
                      {(order.order_status === 'pending' || order.order_status === 'processing') && order.items.length > 1 && (
                        <TouchableOpacity
                          style={styles.itemCancelButton}
                          onPress={() => handleCancelOrder(order.id, order.order_date, item.id, item.product.name)}
                        >
                          <Ionicons name="close-circle" size={20} color={colors.dangerAction} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {order.order_status === 'ready_for_delivery' && order.delivery_verification_code && order.items.length > 1 && (
                      <TouchableOpacity
                        style={styles.itemMarkReceivedButton}
                        onPress={() => handleMarkAsReceived(order.id, item.id, item.product.name)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                        <Text style={styles.itemMarkReceivedText}>Mark as Received</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.actionButtons}>
                <View style={styles.quickActions}>
                  <View style={styles.detailsLink}>
                    <Ionicons name="eye-outline" size={14} color={colors.infoAction} />
                    <Text style={styles.linkText}>Order #{String(order.id).slice(-8)}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={async () => {
                      try {
                        const shopId = order.shop?.id || order.items?.[0]?.product?.shop;
                        if (!shopId) {
                          Alert.alert('Error', 'Shop information not available');
                          return;
                        }
                        const conversation = await messagingService.createConversation(shopId);
                        navigation.navigate('Chat' as never, { 
                          conversationId: conversation.id,
                          orderId: order.id
                        } as never);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to open chat');
                      }
                    }}
                  >
                      <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                      <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>



                  {(order.order_status === 'pending' || order.order_status === 'processing') && 
                   (new Date().getTime() - new Date(order.order_date).getTime()) / (1000 * 60 * 60) <= 12 && (
                    <TouchableOpacity
                      style={styles.cancelTextButton}
                      onPress={() => handleCancelOrder(order.id, order.order_date)}
                    >
                      <Text style={styles.cancelTextButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  {(order.order_status === 'completed' || order.delivery_verified) && !reviewedProducts.has(order.items[0].product.id) && (
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: colors.warningAction }]}
                      onPress={() => openReviewModal(order.items[0].product, order.id)}
                    >
                      <Ionicons name="star-outline" size={20} color={colors.warningAction} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.mainActions}>
                  {order.order_status === 'processing' && (
                    <TouchableOpacity
                      style={styles.compactButton}
                      onPress={() => handleRequestCode(order.id)}
                    >
                      <Ionicons name="code-outline" size={14} color={colors.white} />
                      <Text style={styles.compactButtonText}>Request Code</Text>
                    </TouchableOpacity>
                  )}

                  {order.delivery_verification_code && order.order_status === 'ready_for_delivery' && (
                    <View>
                      <View style={styles.codeDisplayContainer}>
                        <Text style={styles.codeLabel}>Your Delivery Code:</Text>
                        <Text style={styles.deliveryCode}>{order.delivery_verification_code}</Text>
                        <Text style={styles.codeInstruction}>Show this code to the seller</Text>
                      </View>
                      {order.items.length === 1 && (
                        <TouchableOpacity
                          style={styles.compactButton}
                          onPress={() => handleMarkAsReceived(order.id)}
                        >
                          <Ionicons name="checkmark-circle" size={14} color={colors.white} />
                          <Text style={styles.compactButtonText}>Mark Received</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {(order.order_status === 'completed' || order.delivery_verified) && !reviewedProducts.has(order.items[0].product.id) && (
                    <TouchableOpacity
                      style={[styles.compactButton, { backgroundColor: colors.warningAction }]}
                      onPress={() => openReviewModal(order.items[0].product, order.id)}
                    >
                      <Ionicons name="star-outline" size={14} color={colors.white} />
                      <Text style={styles.compactButtonText}>Review</Text>
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
        onRequestClose={() => setVerificationModal({ visible: false, orderId: '', code: '', itemId: undefined, itemName: undefined })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{verificationModal.itemId ? 'Verify Item Delivery' : 'Verify Delivery'}</Text>
            <Text style={styles.modalSubtitle}>
              {verificationModal.itemId 
                ? `Enter the delivery code for "${verificationModal.itemName}":`
                : 'Enter the delivery code shown by the seller:'}
            </Text>
            
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
                onPress={() => setVerificationModal({ visible: false, orderId: '', code: '', itemId: undefined, itemName: undefined })}
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
            <Text style={styles.modalTitle}>{cancelModal.itemId ? 'Cancel Item' : 'Cancel Order'}</Text>
            <Text style={styles.modalSubtitle}>
              {cancelModal.itemId 
                ? `Cancel "${cancelModal.itemName}"? Your refund will be processed to your wallet.`
                : 'Cancel entire order? Your refund will be processed to your wallet.'}
            </Text>
            
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
                  setCancelModal({ visible: false, orderId: '', orderDate: '', itemId: undefined, itemName: undefined });
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
                  <ActivityIndicator size="small" color={colors.white} />
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
  scrollContent: { flexGrow: 1, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },
  
  pageTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, textAlign: 'center', paddingHorizontal: 16 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20, backgroundColor: colors.card, borderRadius: 20, marginHorizontal: 16, marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginTop: 12, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  
  orderCard: { backgroundColor: colors.card, borderRadius: 0, padding: 12, marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  
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
  itemCancelButton: { padding: 4, marginLeft: 8 },

  productNameItem: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  itemQuantity: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  itemPrice: { fontSize: 12, fontWeight: '700', color: colors.primary },
  
  actionButtons: { marginTop: 12 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.infoAction + '10', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 12 },
  linkText: { color: colors.infoAction, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  iconButton: { padding: 4, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  messageButton: { alignItems: 'center', marginRight: 3 },
  messageButtonText: { fontSize: 10, color: colors.primary, fontWeight: '600', marginTop: 2 },
  iconGroup: { flexDirection: 'row' },
  cancelTextButton: { paddingVertical: 4, paddingHorizontal: 8 },
  cancelTextButtonText: { fontSize: 12, fontWeight: '600', color: colors.dangerAction },
  itemIconButton: { backgroundColor: colors.primary + '10', padding: 6, borderRadius: 16, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  
  mainActions: { marginTop: 8 },
  compactButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  compactButtonText: { color: colors.white, fontSize: 12, fontWeight: '600', marginLeft: 4 },
  
  verifiedContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '10', paddingVertical: 8, borderRadius: 6 },
  verifiedText: { fontSize: 12, color: colors.primary, fontWeight: '600', marginLeft: 4 },
  codeDisplayContainer: { backgroundColor: colors.primary + '10', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  codeLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  deliveryCode: { fontSize: 20, fontWeight: 'bold', color: colors.primary, letterSpacing: 2, marginBottom: 4 },
  codeInstruction: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  
  tabContainer: { flexDirection: 'row', marginBottom: 12, backgroundColor: colors.border, borderRadius: 4, padding: 3, marginHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 3 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  activeTabText: { color: colors.white },
  

  
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  productNameModal: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  starsContainer: { flexDirection: 'row', marginBottom: 16 },
  commentLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  commentInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, textAlignVertical: 'top', marginBottom: 20 },
  
  loginButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  shopButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 24, width: '90%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  codeInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  reasonInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, fontSize: 13, marginBottom: 16, minHeight: 70, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, backgroundColor: colors.border, paddingVertical: 12, borderRadius: 12, marginRight: 6, alignItems: 'center' },
  cancelButtonText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  confirmButton: { flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12, marginLeft: 6, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  
  cancellationBox: { marginBottom: 12, padding: 10, backgroundColor: '#FEE2E2', borderRadius: 4, borderWidth: 1, borderColor: '#FCA5A5' },
  cancellationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cancellationLabel: { fontSize: 12, fontWeight: '700', color: colors.dangerAction, marginLeft: 4 },
  cancellationText: { fontSize: 11, color: '#991B1B', lineHeight: 16, fontWeight: '500' },
});

export default MyOrdersScreen;
