import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOrderById, updateOrderStatus, createReview } from '../../services/salesService';

const colors = {
  background: '#F8F9FA',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  card: '#FFFFFF',
  border: '#DEE2E6',
  primary: '#28A745',
  buttonText: '#FFFFFF',
  errorText: '#DC3545',
  successText: '#28A745',
  warning: '#FFC107',
};

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${num.toFixed(2)}`;
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

  const handleMarkAsReceived = async () => {
    try {
      await updateOrderStatus(orderId, 'verify_delivery', '');
      Alert.alert('Success', 'Order marked as received!');
      fetchOrderDetail();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as received');
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
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <Text style={styles.infoText}>Order ID: #{order.id.slice(-8)}</Text>
          <Text style={styles.infoText}>Status: <Text style={styles.statusText}>{order.order_status}</Text></Text>
          <Text style={styles.infoText}>Payment: <Text style={styles.statusText}>{order.payment_status}</Text></Text>
          <Text style={styles.infoText}>Date: {new Date(order.order_date).toLocaleDateString()}</Text>
          <Text style={styles.infoText}>Total: <Text style={styles.totalText}>{formatCurrency(order.total_price)}</Text></Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <Text style={styles.infoText}>{order.shipping_address.full_name}</Text>
          <Text style={styles.infoText}>{order.shipping_address.address_line1}</Text>
          {order.shipping_address.address_line2 && (
            <Text style={styles.infoText}>{order.shipping_address.address_line2}</Text>
          )}
          <Text style={styles.infoText}>{order.shipping_address.city}, {order.shipping_address.state_province}</Text>
          <Text style={styles.infoText}>{order.shipping_address.postal_code}, {order.shipping_address.country}</Text>
          <Text style={styles.infoText}>Phone: {order.shipping_address.phone_number}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purchased Items</Text>
          {order.items.map((item: any) => (
            <View key={item.id} style={styles.itemContainer}>
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemDetails}>Qty: {item.quantity} × {formatCurrency(item.price)}</Text>
                <Text style={styles.itemTotal}>{formatCurrency(parseFloat(item.price) * item.quantity)}</Text>
              </View>
              {order.order_status === 'completed' && (
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={() => openReviewModal(item.product)}
                >
                  <Ionicons name="star-outline" size={16} color={colors.buttonText} />
                  <Text style={styles.reviewButtonText}>Write Review</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.actionSection}>
          {order.order_status === 'shipped' && !order.delivery_verified && (
            <TouchableOpacity style={styles.receivedButton} onPress={handleMarkAsReceived}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.buttonText} />
              <Text style={styles.actionButtonText}>Mark as Received</Text>
            </TouchableOpacity>
          )}

          {order.delivery_verified && (
            <View style={styles.receivedStatus}>
              <Ionicons name="checkmark-circle" size={20} color={colors.successText} />
              <Text style={styles.receivedText}>Order Received</Text>
            </View>
          )}
        </View>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, color: colors.textPrimary },
  content: { flex: 1, padding: 16 },
  section: { backgroundColor: colors.card, padding: 16, marginBottom: 16, borderRadius: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: colors.textPrimary },
  infoText: { fontSize: 14, marginBottom: 4, color: colors.textPrimary },
  statusText: { fontWeight: 'bold', color: colors.primary },
  totalText: { fontWeight: 'bold', color: colors.primary, fontSize: 16 },
  itemContainer: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemName: { flex: 2, fontSize: 14, color: colors.textPrimary },
  itemDetails: { flex: 1, fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  itemTotal: { flex: 1, fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'right' },
  reviewButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, padding: 8, borderRadius: 6, alignSelf: 'flex-start' },
  reviewButtonText: { color: colors.buttonText, fontSize: 12, marginLeft: 4 },
  loadingText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: colors.textSecondary },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: colors.errorText },
  
  actionSection: { backgroundColor: colors.card, padding: 16, marginBottom: 16, borderRadius: 8 },
  receivedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8 },
  actionButtonText: { color: colors.buttonText, fontSize: 16, fontWeight: '600', marginLeft: 8 },
  receivedStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successText + '10', paddingVertical: 12, borderRadius: 8 },
  receivedText: { color: colors.successText, fontSize: 16, fontWeight: '600', marginLeft: 8 },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, borderRadius: 12, padding: 20, width: '90%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  productName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  starsContainer: { flexDirection: 'row', marginBottom: 16 },
  commentLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  commentInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, textAlignVertical: 'top', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.border, marginRight: 8 },
  cancelButtonText: { textAlign: 'center', color: colors.textPrimary },
  submitButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: colors.primary, marginLeft: 8 },
  submitButtonText: { textAlign: 'center', color: colors.buttonText, fontWeight: 'bold' }
});

export default PurchaseDetailScreen;