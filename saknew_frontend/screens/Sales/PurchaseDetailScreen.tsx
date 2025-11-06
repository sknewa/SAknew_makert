import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Modal, TextInput, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOrderById, updateOrderStatus, createReview } from '../../services/salesService';

const colors = {
  background: '#F5F7FA',
  textPrimary: '#1A202C',
  textSecondary: '#718096',
  card: '#FFFFFF',
  border: '#E2E8F0',
  primary: '#3182CE',
  success: '#38A169',
  warning: '#D69E2E',
  error: '#E53E3E',
  accent: '#F7FAFC',
};

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${(num || 0).toFixed(2)}`;
};

const PurchaseDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showDeliveryCode, setShowDeliveryCode] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      const orderData = await getOrderById(orderId);
      setOrder(orderData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (product: any) => {
    setSelectedProduct(product);
    setRating(5);
    setComment('');
    setReviewModal(true);
  };



  const handleRequestCode = async () => {
    try {
      const response = await updateOrderStatus(orderId, 'request_code');
      setShowDeliveryCode(true);
      Alert.alert('Delivery Code', `Your code is: ${response.delivery_code || order?.delivery_verification_code}`);
      fetchOrderDetail();
    } catch (error) {
      Alert.alert('Error', 'Failed to get delivery code');
    }
  };

  const submitReview = async () => {
    if (!selectedProduct) return;

    try {
      await createReview({
        order_id: orderId,
        product_id: selectedProduct.id,
        rating,
        comment
      });
      Alert.alert('Success', 'Review submitted successfully!');
      setReviewModal(false);
      fetchOrderDetail();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
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
              color={colors.warning}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading order details...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Order not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase Details</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ConversationsList' as any)}>
          <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
              <Text style={styles.orderDate}>{new Date(order.order_date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{order.order_status}</Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(order.total_price)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressCard}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <View style={styles.addressText}>
              <Text style={styles.addressLine}>{order.shipping_address.full_address}</Text>
              <Text style={styles.addressDetails}>{order.shipping_address.city}, {order.shipping_address.country}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((item: any) => (
            <View key={item.id} style={styles.productCard}>
              <Image 
                source={{ uri: item.product.image || 'https://via.placeholder.com/60' }} 
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.product.name}</Text>
                <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
                <Text style={styles.productQty}>Qty: {item.quantity}</Text>
              </View>
              <View style={styles.productActions}>
                <Text style={styles.itemTotal}>{formatCurrency(parseFloat(item.price) * item.quantity)}</Text>
                {order.order_status === 'completed' && (
                  <TouchableOpacity style={styles.reviewBtn} onPress={() => openReviewModal(item.product)}>
                    <Ionicons name="star" size={14} color={colors.warning} />
                    <Text style={styles.reviewBtnText}>Review</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {order.order_status === 'processing' && (
          <TouchableOpacity 
            style={styles.requestCodeBtn}
            onPress={() => handleRequestCode()}
          >
            <Ionicons name="key" size={18} color={colors.card} />
            <Text style={styles.requestCodeText}>Request Delivery Code</Text>
          </TouchableOpacity>
        )}

        {(order.order_status === 'ready_for_delivery' || showDeliveryCode) && order.delivery_verification_code && (
          <View style={styles.codeCard}>
            <View style={styles.codeHeader}>
              <Ionicons name="key" size={20} color={colors.primary} />
              <Text style={styles.codeTitle}>Your Delivery Code</Text>
            </View>
            <Text style={styles.deliveryCode}>{order.delivery_verification_code}</Text>
            <Text style={styles.codeNote}>Show this code to the seller when you receive your order</Text>
          </View>
        )}

        {order.order_status === 'completed' && (
          <View style={styles.completedCard}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.completedText}>Order Completed</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={reviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Product</Text>
              <TouchableOpacity onPress={() => setReviewModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.productName}>{selectedProduct?.name}</Text>

            <Text style={styles.ratingLabel}>Rating:</Text>
            {renderStars(rating, setRating)}

            <Text style={styles.commentLabel}>Comment (optional):</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience with this product..."
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setReviewModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
                <Text style={styles.submitButtonText}>Submit Review</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.card, elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  headerTitle: { fontSize: 16, fontWeight: '600', marginLeft: 16, color: colors.textPrimary },
  content: { flex: 1, padding: 12 },
  
  orderCard: { backgroundColor: colors.card, padding: 16, marginBottom: 12, borderRadius: 12, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  orderDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: '500', color: colors.primary, textTransform: 'capitalize' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: 14, color: colors.textSecondary },
  totalAmount: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  
  section: { backgroundColor: colors.card, padding: 16, marginBottom: 12, borderRadius: 12, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: colors.textPrimary },
  
  addressCard: { flexDirection: 'row', alignItems: 'flex-start' },
  addressText: { marginLeft: 8, flex: 1 },
  addressLine: { fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  addressDetails: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  
  productCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  productImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: colors.accent },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
  productPrice: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  productQty: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  productActions: { alignItems: 'flex-end' },
  itemTotal: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.accent, borderRadius: 12 },
  reviewBtnText: { fontSize: 10, color: colors.warning, marginLeft: 2 },
  
  codeCard: { backgroundColor: colors.primary + '08', padding: 20, marginBottom: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '20' },
  codeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  codeTitle: { fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: 6 },
  deliveryCode: { fontSize: 28, fontWeight: '700', color: colors.primary, letterSpacing: 4, marginBottom: 6 },
  codeNote: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  
  requestCodeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: 16, marginBottom: 12, borderRadius: 12 },
  requestCodeText: { color: colors.card, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  completedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success + '08', padding: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.success + '20' },
  completedText: { fontSize: 14, fontWeight: '600', color: colors.success, marginLeft: 8 },
  
  loadingText: { textAlign: 'center', marginTop: 50, fontSize: 14, color: colors.textSecondary },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 14, color: colors.error },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 16, padding: 20, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  productName: { fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 16 },
  ratingLabel: { fontSize: 13, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 },
  starsContainer: { flexDirection: 'row', marginBottom: 16 },
  commentLabel: { fontSize: 13, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 },
  commentInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 13, textAlignVertical: 'top', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.accent, marginRight: 8 },
  cancelButtonText: { textAlign: 'center', color: colors.textPrimary, fontSize: 13 },
  submitButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.primary, marginLeft: 8 },
  submitButtonText: { textAlign: 'center', color: colors.card, fontWeight: '600', fontSize: 13 }
});

export default PurchaseDetailScreen;