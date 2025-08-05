import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  SafeAreaView,
  ScrollView 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyWallet } from '../../services/walletService';
import { processPayment, getOrderById } from '../../services/salesService';
import { useBadges } from '../../context/BadgeContext';

const colors = {
  background: '#F0F2F5',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  card: '#FFFFFF',
  border: '#E0E6EB',
  primary: '#27AE60',
  buttonBg: '#27AE60',
  buttonText: '#FFFFFF',
  errorText: '#E74C3C',
  successText: '#27AE60',
  shadowColor: 'rgba(0, 0, 0, 0.1)',
  warningAction: '#F39C12',
};

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${num.toFixed(2)}`;
};

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { refreshBadges } = useBadges();
  const { orderId } = (route.params as { orderId: string }) || {};
  
  const [wallet, setWallet] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

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
    if (!wallet || !order) return;

    const walletBalance = parseFloat(wallet.balance);
    const orderTotal = parseFloat(order.total_price);

    if (walletBalance < orderTotal) {
      Alert.alert(
        'Insufficient Funds',
        `You need ${formatCurrency(orderTotal)} but only have ${formatCurrency(walletBalance)} in your wallet.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Funds', 
            onPress: () => navigation.navigate('MainTabs', { screen: 'WalletTab' })
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay ${formatCurrency(orderTotal)} from your wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: processWalletPayment }
      ]
    );
  };

  const processWalletPayment = async () => {
  setPaying(true);
  try {
    const result = await processPayment(orderId, 'wallet');
    
    // Refresh badges after successful payment
    await refreshBadges();
    
    Alert.alert(
      'Payment Successful!',
      'Your order has been paid and is being processed.',
      [
        { 
          text: 'View Orders', 
          onPress: () => navigation.navigate('MainTabs', { screen: 'OrdersTab' })
        }
      ]
    );
  } catch (err: any) {
    const errorMessage = err?.response?.data?.detail || 'Payment failed. Please try again.';
    Alert.alert('Payment Failed', errorMessage);
  } finally {
    setPaying(false);
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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Complete Payment</Text>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order #</Text>
            <Text style={styles.summaryValue}>{order.id.slice(-8)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>{formatCurrency(orderTotal)}</Text>
          </View>
        </View>

        {/* Wallet Information */}
        <View style={styles.walletSection}>
          <Text style={styles.sectionTitle}>Wallet Balance</Text>
          <View style={styles.balanceContainer}>
            <Ionicons name="wallet-outline" size={24} color={colors.primary} />
            <Text style={styles.balanceAmount}>{formatCurrency(walletBalance)}</Text>
          </View>
          
          {!hasEnoughFunds && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={20} color={colors.warningAction} />
              <Text style={styles.warningText}>
                Insufficient funds. Need {formatCurrency(orderTotal - walletBalance)} more.
              </Text>
            </View>
          )}
        </View>

        {/* Payment Actions */}
        <View style={styles.actionsContainer}>
          {hasEnoughFunds ? (
            <TouchableOpacity 
              style={[styles.payButton, paying && styles.payButtonDisabled]} 
              onPress={handleWalletPayment}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color={colors.buttonText} />
                  <Text style={styles.payButtonText}>Pay with Wallet</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.addFundsButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'WalletTab' })}
            >
              <>
                <Ionicons name="add-circle-outline" size={20} color={colors.buttonText} />
                <Text style={styles.buttonText}>Add Funds to Wallet</Text>
              </>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 10 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: colors.errorText, marginTop: 16, marginBottom: 20 },
  
  title: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 30, textAlign: 'center' },
  
  orderSummary: { backgroundColor: colors.card, borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 16, color: colors.textSecondary },
  summaryValue: { fontSize: 16, color: colors.textPrimary },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  
  walletSection: { backgroundColor: colors.card, borderRadius: 12, padding: 20, marginBottom: 30, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  balanceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  balanceAmount: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginLeft: 10 },
  warningContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warningAction + '10', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.warningAction + '30' },
  warningText: { fontSize: 14, color: colors.warningAction, marginLeft: 8, flex: 1 },
  
  actionsContainer: { flex: 1, justifyContent: 'flex-end' },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, marginBottom: 12 },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: colors.buttonText, fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  addFundsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningAction, paddingVertical: 16, borderRadius: 12, marginBottom: 12 },
  cancelButton: { backgroundColor: colors.border, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  backButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: colors.buttonText, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});

export default PaymentScreen;
