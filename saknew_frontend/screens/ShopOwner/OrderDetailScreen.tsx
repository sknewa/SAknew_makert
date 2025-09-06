import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert, TextInput, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOrderById, updateOrderStatus, verifyDeliveryCode } from '../../services/salesService';

const colors = {
  background: '#F5F7FA',
  textPrimary: '#1A202C',
  textSecondary: '#718096',
  card: '#FFFFFF',
  border: '#E2E8F0',
  primary: '#3182CE',
  success: '#38A169',
  accent: '#F7FAFC',
};

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${(num || 0).toFixed(2)}`;
};

const OrderDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryCode, setDeliveryCode] = useState('');

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
    if (!deliveryCode.trim()) {
      Alert.alert('Error', 'Please enter the delivery code from the customer');
      return;
    }

    try {
      await updateOrderStatus(orderId, 'mark_shipped', deliveryCode);
      Alert.alert('Success', 'Order shipped! Payment has been added to your wallet.');
      fetchOrderDetail();
      setDeliveryCode('');
    } catch (error) {
      Alert.alert('Error', 'Invalid delivery code or failed to ship order');
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>#{order.id.slice(-8)}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{new Date(order.order_date).toLocaleDateString()}</Text>
            </View>
            <View style={{ backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary, textTransform: 'capitalize' }}>{order.order_status}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Total Amount</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{formatCurrency(order.total_price)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="person" size={16} color={colors.primary} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textPrimary }}>{order.user.username || order.user.email}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{order.user.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 18 }}>{order.shipping_address.full_address}</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{order.shipping_address.city}, {order.shipping_address.country}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((item: any) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Image 
                source={{ uri: item.product.image || 'https://via.placeholder.com/50' }} 
                style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: colors.accent }}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textPrimary }}>{item.product.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{formatCurrency(item.price)}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>Qty: {item.quantity}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{formatCurrency(parseFloat(item.price) * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {order.order_status === 'processing' && (
          <View style={styles.verificationSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="key" size={20} color={colors.primary} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: 6 }}>Ship Order</Text>
            </View>
            <Text style={styles.verificationSubtitle}>Enter the delivery code from customer to ship and get paid</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter delivery code"
              value={deliveryCode}
              onChangeText={setDeliveryCode}
              maxLength={8}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.actionButton} onPress={handleMarkAsShipped}>
              <Ionicons name="airplane" size={18} color={colors.card} />
              <Text style={styles.buttonText}>Ship & Get Paid</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {order.order_status === 'shipped' && (
          <View style={styles.completedSection}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.completedText}>Order Shipped - Payment Released</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.card, elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  headerTitle: { fontSize: 16, fontWeight: '600', marginLeft: 16, color: colors.textPrimary },
  content: { flex: 1, padding: 12 },
  section: { backgroundColor: colors.card, padding: 16, marginBottom: 12, borderRadius: 12, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: colors.textPrimary },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: 16, marginBottom: 12, borderRadius: 12 },
  buttonText: { color: colors.card, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  verificationSection: { backgroundColor: colors.card, padding: 20, borderRadius: 12, marginBottom: 12, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  verificationTitle: { fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 },
  verificationSubtitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 16 },
  codeInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, textAlign: 'center', marginBottom: 16, backgroundColor: colors.accent },
  verifyButton: { backgroundColor: colors.success },
  completedSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success + '08', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.success + '20' },
  completedText: { color: colors.success, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  loadingText: { textAlign: 'center', marginTop: 50, fontSize: 14, color: colors.textSecondary },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 14, color: colors.textSecondary },
});

export default OrderDetailScreen;