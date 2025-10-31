import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  SafeAreaView,
  ScrollView,
  Modal,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyWallet } from '../../services/walletService';
import { processPayment, verifyPayment, getOrderById } from '../../services/salesService';
import { useBadges } from '../../context/BadgeContext';
import BackButton from '../../components/BackButton';
import { MainNavigationProp } from '../../navigation/types';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

const colors = {
  background: '#F5F5F5',
  textPrimary: '#222',
  textSecondary: '#999',
  card: '#FFFFFF',
  border: '#E0E0E0',
  primary: '#10B981',
  buttonText: '#FFFFFF',
  errorText: '#FF4444',
  warningBg: '#FFF5E6',
  warningBorder: '#FFD699',
  warningText: '#CC7A00',
  warningAction: '#FF9800',
  iconBg: '#E8F5E9',
  white: '#FFFFFF',
};

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${(num || 0).toFixed(2)}`;
};

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const route = useRoute();
  const { refreshBadges } = useBadges();
  const { orderId } = (route.params as { orderId: string }) || {};
  
  const [wallet, setWallet] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      safeLog('Fetching payment data for order:', orderId);
      try {
        const [walletData, orderData] = await Promise.all([
          getMyWallet(),
          getOrderById(orderId)
        ]);
        safeLog('Wallet data:', walletData);
        safeLog('Order data:', orderData);
        setWallet(walletData);
        setOrder(orderData);
      } catch (err: any) {
        safeLog('Payment data fetch error:', err);
        Alert.alert('Error', 'Could not fetch payment information.');
      } finally {
        setLoading(false);
      }
    };
    
    if (orderId) {
      fetchData();
    } else {
      safeLog('No orderId provided');
      setLoading(false);
    }
  }, [orderId]);

  const handleWalletPayment = async () => {
    safeLog('=== PAY WITH WALLET BUTTON PRESSED ===');
    safeLog('Wallet:', wallet);
    safeLog('Order:', order);
    
    if (!wallet || !order) {
      safeLog('Missing wallet or order data');
      return;
    }

    const walletBalance = parseFloat(wallet.balance);
    const orderTotal = parseFloat(order.total_price);
    safeLog('Wallet Balance:', walletBalance);
    safeLog('Order Total:', orderTotal);
    safeLog('Has Enough Funds:', walletBalance >= orderTotal);

    if (walletBalance < orderTotal) {
      safeLog('Insufficient funds - showing modal');
      setShowInsufficientFundsModal(true);
      return;
    }

    safeLog('Showing payment confirmation modal');
    setShowConfirmModal(true);
  };

  const processWalletPayment = async () => {
    safeLog('=== PROCESSING WALLET PAYMENT ===');
    safeLog('Order ID:', orderId);
    setShowConfirmModal(false);
    setPaying(true);
    try {
      safeLog('Calling processPayment API...');
      const result = await processPayment(orderId, 'wallet');
      safeLog('Payment result:', result);
      
      safeLog('Refreshing badges...');
      await refreshBadges();
      safeLog('Badges refreshed');
      
      safeLog('Payment successful - showing success modal');
      setShowSuccessModal(true);
    } catch (err: any) {
      safeLog('Payment error:', err);
      safeLog('Error response:', err?.response?.data);
      const errorMessage = err?.response?.data?.detail || 'Payment failed. Please try again.';
      Alert.alert('Payment Failed', errorMessage);
    } finally {
      setPaying(false);
      safeLog('Payment process completed');
    }
  };




  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.errorText} />
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const walletBalance = parseFloat(wallet?.balance || '0');
  const orderTotal = parseFloat(order.total_price);
  const hasEnoughFunds = walletBalance >= orderTotal;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="card" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Complete Payment</Text>
          <Text style={styles.subtitle}>Review and confirm your payment</Text>
        </View>

        {/* Order Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Order Summary</Text>
          </View>
          <View style={styles.divider} />
          {order.items?.map((item: any, index: number) => (
            <View key={index} style={styles.orderItem}>
              <Image 
                source={{ uri: item.product.main_image_url || 'https://placehold.co/60x60/F8F8F8/999?text=No+Image' }} 
                style={styles.orderItemImage}
              />
              <View style={styles.orderItemDetails}>
                <Text style={styles.orderItemName} numberOfLines={2}>{item.product.name}</Text>
                <View style={styles.orderItemMeta}>
                  <Text style={styles.orderItemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.orderItemPrice}>{formatCurrency(parseFloat(item.product.display_price || item.product.price) * item.quantity)}</Text>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>{formatCurrency(orderTotal)}</Text>
          </View>
        </View>

        {/* Wallet Balance Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Wallet Balance</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceRow}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="wallet" size={28} color={colors.primary} />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(walletBalance)}</Text>
            </View>
          </View>
          
          {!hasEnoughFunds && (
            <View style={styles.warningContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.warningText} />
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>Insufficient Funds</Text>
                <Text style={styles.warningText}>
                  You need {formatCurrency(orderTotal - walletBalance)} more to complete this payment.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Payment Actions */}
        <View style={styles.actionsContainer}>
          {hasEnoughFunds ? (
            <TouchableOpacity 
              style={[styles.payButton, paying && styles.buttonDisabled]} 
              onPress={handleWalletPayment}
              disabled={paying}
              activeOpacity={0.8}
            >
              {paying ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color={colors.buttonText} />
                  <Text style={styles.payButtonText}>Pay with Wallet</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.addFundsButton}
              onPress={() => {
                safeLog('💵 [PaymentScreen] Add Funds to Wallet button clicked');
                safeLog('💵 [PaymentScreen] Current wallet balance:', walletBalance);
                safeLog('💵 [PaymentScreen] Order total:', orderTotal);
                safeLog('💵 [PaymentScreen] Amount needed:', orderTotal - walletBalance);
                safeLog('💵 [PaymentScreen] Navigating to AddFundsScreen');
                navigation.navigate('AddFundsScreen');
                safeLog('💵 [PaymentScreen] Navigation command sent');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={22} color={colors.buttonText} />
              <Text style={styles.addFundsButtonText}>Add Funds to Wallet</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel Payment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="help-circle" size={48} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            <Text style={styles.modalMessage}>Pay {formatCurrency(orderTotal)} from your wallet?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={processWalletPayment}
              >
                <Text style={styles.modalConfirmText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Insufficient Funds Modal */}
      <Modal
        visible={showInsufficientFundsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInsufficientFundsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="alert-circle" size={48} color={colors.errorText} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Insufficient Funds</Text>
            <Text style={styles.modalMessage}>
              You need {formatCurrency(orderTotal)} but only have {formatCurrency(walletBalance)} in your wallet.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowInsufficientFundsModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={() => {
                  safeLog('💰 [PaymentScreen] Add Funds button clicked');
                  safeLog('💰 [PaymentScreen] Closing insufficient funds modal');
                  setShowInsufficientFundsModal(false);
                  safeLog('💰 [PaymentScreen] Navigating to AddFundsScreen');
                  navigation.navigate('AddFundsScreen');
                  safeLog('💰 [PaymentScreen] Navigation command sent');
                }}
              >
                <Text style={styles.modalConfirmText}>Add Funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.reset({ index: 0, routes: [{ name: 'BottomTabs' }] });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={64} color={colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Payment Successful!</Text>
            <Text style={styles.modalMessage}>
              Your order has been paid and is being processed. Seller will be paid upon delivery confirmation.
            </Text>
            <TouchableOpacity 
              style={[styles.modalConfirmButton, { width: '100%' }]}
              onPress={() => {
                safeLog('🎯 [PaymentScreen] View My Orders button clicked');
                setShowSuccessModal(false);
                navigation.navigate('MainTabs', { screen: 'OrdersTab' });
              }}
            >
              <Text style={styles.modalConfirmText}>View My Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 16, paddingBottom: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: 12, fontWeight: '500' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: colors.errorText, marginTop: 16, marginBottom: 20 },
  backButton: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4 },
  buttonText: { color: colors.buttonText, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  
  // Header
  header: { alignItems: 'center', marginBottom: 20 },
  headerIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.iconBg, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '400' },
  
  // Card
  card: { backgroundColor: colors.card, borderRadius: 4, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginLeft: 6 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 12 },
  
  // Order Summary
  orderItem: { flexDirection: 'row', marginBottom: 12 },
  orderItemImage: { width: 60, height: 60, borderRadius: 4, backgroundColor: '#F8F8F8', borderWidth: 1, borderColor: colors.border, marginRight: 10 },
  orderItemDetails: { flex: 1, justifyContent: 'space-between' },
  orderItemName: { fontSize: 12, color: colors.textPrimary, fontWeight: '600', marginBottom: 4 },
  orderItemMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderItemQuantity: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  orderItemPrice: { fontSize: 13, color: colors.textPrimary, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  totalAmount: { fontSize: 16, fontWeight: '700', color: colors.primary },
  
  // Wallet Balance
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  balanceIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.iconBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  balanceInfo: { flex: 1 },
  balanceLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  balanceAmount: { fontSize: 18, fontWeight: '700', color: colors.primary },
  
  // Warning
  warningContainer: { flexDirection: 'row', backgroundColor: colors.warningBg, padding: 10, borderRadius: 4, borderWidth: 1, borderColor: colors.warningBorder },
  warningTextContainer: { flex: 1, marginLeft: 8 },
  warningTitle: { fontSize: 12, fontWeight: '700', color: colors.warningText, marginBottom: 3 },
  warningText: { fontSize: 11, color: colors.warningText, lineHeight: 16, fontWeight: '500' },
  
  // Actions
  actionsContainer: { marginTop: 6 },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 4, marginBottom: 10 },
  payButtonText: { color: colors.buttonText, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  addFundsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningAction, paddingVertical: 12, borderRadius: 4, marginBottom: 10 },
  addFundsButtonText: { color: colors.buttonText, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  cancelButton: { backgroundColor: colors.card, paddingVertical: 10, borderRadius: 4, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: colors.card, borderRadius: 8, padding: 20, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  modalMessage: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalCancelButton: { flex: 1, backgroundColor: colors.border, paddingVertical: 10, borderRadius: 4, alignItems: 'center' },
  modalCancelText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  modalConfirmButton: { flex: 1, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 4, alignItems: 'center' },
  modalConfirmText: { color: colors.buttonText, fontSize: 13, fontWeight: '600' },
});

export default PaymentScreen;
