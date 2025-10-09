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
import colors from '../../theme/colors';
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

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const orderData = await getMyOrders();
      // Filter to only show orders where user is the buyer (purchase history)
      const buyerOrders = orderData.filter(order => order.user.id === user?.id);
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
    try {
      const response = await updateOrderStatus(orderId, 'request_code');
      Alert.alert(
        'Delivery Code',
        `Your delivery code is: ${response.delivery_verification_code}\n\nShow this code to the seller when they deliver your order.`,
        [{ text: 'OK', onPress: () => fetchOrders() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to get delivery code.');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, 'cancel_order');
              Alert.alert('Success', 'Order cancelled successfully!');
              fetchOrders();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.detail || 'Failed to cancel order.');
            }
          }
        }
      ]
    );
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
                      onPress={() => handleCancelOrder(order.id)}
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
  
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 20, textAlign: 'center' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 24, textAlign: 'center' },
  
  orderCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  orderDate: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  orderNumber: { fontSize: 12, color: colors.textSecondary },
  orderStatus: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statusPending: { backgroundColor: colors.warningAction + '20', color: colors.warningAction },
  statusProcessing: { backgroundColor: colors.infoAction + '20', color: colors.infoAction },
  statusShipped: { backgroundColor: colors.primary + '20', color: colors.primary },
  statusDelivered: { backgroundColor: colors.primary + '20', color: colors.primary },
  statusCompleted: { backgroundColor: colors.primary + '20', color: colors.primary },
  statusCancelled: { backgroundColor: colors.dangerAction + '20', color: colors.dangerAction },
  orderTotal: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  
  itemsContainer: { marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: colors.border },
  itemDetails: { flex: 1 },
  productNameItem: { fontSize: 16, fontWeight: '500', color: colors.textPrimary, marginBottom: 4 },
  itemQuantity: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: colors.primary },
  
  actionButtons: { marginTop: 12 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.infoAction + '10', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  linkText: { color: colors.infoAction, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  quickActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  quickActionText: { color: colors.buttonText, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  reviewLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warningAction + '10', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  reviewLinkText: { color: colors.warningAction, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  
  mainActions: { marginTop: 12 },
  markReceivedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, marginBottom: 8 },
  addReviewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningAction, paddingVertical: 12, borderRadius: 8, marginBottom: 8 },
  mainActionText: { color: colors.buttonText, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  
  verifiedContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '10', paddingVertical: 8, borderRadius: 6 },
  verifiedText: { fontSize: 12, color: colors.primary, fontWeight: '600', marginLeft: 4 },
  codeDisplayContainer: { backgroundColor: colors.primary + '10', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  codeLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  deliveryCode: { fontSize: 20, fontWeight: 'bold', color: colors.primary, letterSpacing: 2, marginBottom: 4 },
  codeInstruction: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  
  tabContainer: { flexDirection: 'row', marginBottom: 16, backgroundColor: colors.border, borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  activeTabText: { color: colors.buttonText },
  
  cancelActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerAction, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4 },
  cancelActionText: { color: colors.buttonText, fontSize: 11, fontWeight: '600', marginLeft: 4 },
  
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  productNameModal: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  starsContainer: { flexDirection: 'row', marginBottom: 16 },
  commentLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  commentInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, textAlignVertical: 'top', marginBottom: 20 },
  
  loginButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  shopButton: { backgroundColor: colors.infoAction, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: colors.buttonText, fontSize: 16, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 12, padding: 24, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  codeInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, backgroundColor: colors.border, paddingVertical: 12, borderRadius: 8, marginRight: 8, alignItems: 'center' },
  cancelButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  confirmButton: { flex: 1, backgroundColor: colors.warningAction, paddingVertical: 12, borderRadius: 8, marginLeft: 8, alignItems: 'center' },
});

export default MyOrdersScreen;
