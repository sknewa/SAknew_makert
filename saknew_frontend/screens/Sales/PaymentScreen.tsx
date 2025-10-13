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
  TextInput
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyWallet } from '../../services/walletService';
import { processPayment, verifyPayment, getOrderById } from '../../services/salesService';
import { useBadges } from '../../context/BadgeContext';
import BackButton from '../../components/BackButton';
import { MainNavigationProp } from '../../navigation/types';

const colors = {
  background: '#F5F7FA',
  textPrimary: '#1A202C',
  textSecondary: '#718096',
  card: '#FFFFFF',
  border: '#E2E8F0',
  primary: '#27AE60',
  buttonBg: '#27AE60',
  buttonText: '#FFFFFF',
  errorText: '#E53E3E',
  successText: '#27AE60',
  shadowColor: '#000',
  warningBg: '#FFF5E6',
  warningBorder: '#FFD699',
  warningText: '#CC7A00',
  warningAction: '#F39C12',
  iconBg: '#E8F5E9',
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
      console.log('Fetching payment data for order:', orderId);
      try {
        const [walletData, orderData] = await Promise.all([
          getMyWallet(),
          getOrderById(orderId)
        ]);
        console.log('Wallet data:', walletData);
        console.log('Order data:', orderData);
        setWallet(walletData);
        setOrder(orderData);
      } catch (err: any) {
        console.log('Payment data fetch error:', err);
        Alert.alert('Error', 'Could not fetch payment information.');
      } finally {
        setLoading(false);
      }
    };
    
    if (orderId) {
      fetchData();
    } else {
      console.log('No orderId provided');
      setLoading(false);
    }
  }, [orderId]);

  const handleWalletPayment = async () => {
    console.log('=== PAY WITH WALLET BUTTON PRESSED ===');
    console.log('Wallet:', wallet);
    console.log('Order:', order);
    
    if (!wallet || !order) {
      console.log('Missing wallet or order data');
      return;
    }

    const walletBalance = parseFloat(wallet.balance);
    const orderTotal = parseFloat(order.total_price);
    console.log('Wallet Balance:', walletBalance);
    console.log('Order Total:', orderTotal);
    console.log('Has Enough Funds:', walletBalance >= orderTotal);

    if (walletBalance < orderTotal) {
      console.log('Insufficient funds - showing modal');
      setShowInsufficientFundsModal(true);
      return;
    }

    console.log('Showing payment confirmation modal');
    setShowConfirmModal(true);
  };

  const processWalletPayment = async () => {
    console.log('=== PROCESSING WALLET PAYMENT ===');
    console.log('Order ID:', orderId);
    setShowConfirmModal(false);
    setPaying(true);
    try {
      console.log('Calling processPayment API...');
      const result = await processPayment(orderId, 'wallet');
      console.log('Payment result:', result);
      
      console.log('Refreshing badges...');
      await refreshBadges();
      console.log('Badges refreshed');
      
      console.log('Payment successful - showing success modal');
      setShowSuccessModal(true);
    } catch (err: any) {
      console.log('Payment error:', err);
      console.log('Error response:', err?.response?.data);
      const errorMessage = err?.response?.data?.detail || 'Payment failed. Please try again.';
      Alert.alert('Payment Failed', errorMessage);
    } finally {
      setPaying(false);
      console.log('Payment process completed');
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
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order ID</Text>
            <Text style={styles.summaryValue}>#{order.id.slice(-8).toUpperCase()}</Text>
          </View>
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
              onPress={() => navigation.goBack()}
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
                  setShowInsufficientFundsModal(false);
                  navigation.goBack();
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
                setShowSuccessModal(false);
                navigation.reset({ index: 0, routes: [{ name: 'BottomTabs' }] });
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
  container: { flexGrow: 1, padding: 20, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 12, fontWeight: '500' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: colors.errorText, marginTop: 16, marginBottom: 20 },
  backButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: colors.buttonText, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  
  // Header
  header: { alignItems: 'center', marginBottom: 24 },
  headerIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.iconBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.textSecondary, fontWeight: '400' },
  
  // Card
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginLeft: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
  
  // Order Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryLabel: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  totalAmount: { fontSize: 20, fontWeight: '700', color: colors.primary },
  
  // Wallet Balance
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  balanceIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.iconBg, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  balanceInfo: { flex: 1 },
  balanceLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  balanceAmount: { fontSize: 24, fontWeight: '700', color: colors.primary },
  
  // Warning
  warningContainer: { flexDirection: 'row', backgroundColor: colors.warningBg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.warningBorder },
  warningTextContainer: { flex: 1, marginLeft: 10 },
  warningTitle: { fontSize: 15, fontWeight: '700', color: colors.warningText, marginBottom: 4 },
  warningText: { fontSize: 13, color: colors.warningText, lineHeight: 18, fontWeight: '500' },
  
  // Actions
  actionsContainer: { marginTop: 8 },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 14, marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  payButtonText: { color: colors.buttonText, fontSize: 18, fontWeight: '700', marginLeft: 10 },
  addFundsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningAction, paddingVertical: 18, borderRadius: 14, marginBottom: 12, shadowColor: colors.warningAction, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  addFundsButtonText: { color: colors.buttonText, fontSize: 18, fontWeight: '700', marginLeft: 10 },
  cancelButton: { backgroundColor: colors.card, paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  cancelButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  modalMessage: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelButton: { flex: 1, backgroundColor: colors.border, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  modalConfirmButton: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { color: colors.buttonText, fontSize: 16, fontWeight: '700' },
});

export default PaymentScreen;
