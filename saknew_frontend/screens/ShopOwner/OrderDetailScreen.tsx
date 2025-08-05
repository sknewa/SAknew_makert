import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOrderById, updateOrderStatus } from '../../services/salesService';

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
  infoAction: '#17A2B8',
};

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${num.toFixed(2)}`;
};

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const handleMarkAsShipped = async () => {
    try {
      await updateOrderStatus(orderId, 'mark_shipped');
      Alert.alert('Success', 'Order marked as shipped');
      fetchOrderDetail();
    } catch (error) {
      Alert.alert('Error', 'Failed to update order status');
    }
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
        <Text style={styles.headerTitle}>Order #{order.id.slice(-8)}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <Text style={styles.infoText}>Status: <Text style={styles.statusText}>{order.order_status}</Text></Text>
          <Text style={styles.infoText}>Payment: <Text style={styles.statusText}>{order.payment_status}</Text></Text>
          <Text style={styles.infoText}>Date: {new Date(order.order_date).toLocaleDateString()}</Text>
          <Text style={styles.infoText}>Total: <Text style={styles.totalText}>{formatCurrency(order.total_price)}</Text></Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <Text style={styles.infoText}>Name: {order.user.username}</Text>
          <Text style={styles.infoText}>Email: {order.user.email}</Text>
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
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemDetails}>Qty: {item.quantity} × {formatCurrency(item.price)}</Text>
              <Text style={styles.itemTotal}>{formatCurrency(parseFloat(item.price) * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {order.order_status === 'processing' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleMarkAsShipped}>
            <Text style={styles.buttonText}>Mark as Shipped</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemName: { flex: 2, fontSize: 14, color: colors.textPrimary },
  itemDetails: { flex: 1, fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  itemTotal: { flex: 1, fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'right' },
  actionButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', margin: 16 },
  buttonText: { color: colors.buttonText, fontSize: 16, fontWeight: 'bold' },
  loadingText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: colors.textSecondary },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: colors.errorText },
});

export default OrderDetailScreen;