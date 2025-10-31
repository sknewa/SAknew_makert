safeLog('🚀 WalletDashboardScreen v2.0 - Enhanced transactions loaded');
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert, // For mock actions
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainNavigationProp } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext.minimal';
import { useBadges } from '../../context/BadgeContext';
import { getMyWallet, getMyTransactions, Wallet, Transaction } from '../../services/walletService';

import { colors } from '../../styles/globalStyles';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';



// Helper function to format currency
const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${(num || 0).toFixed(2)}`;
};

// Helper to format transaction description
const formatTransactionDescription = (txn: Transaction): { title: string; subtitle: string } => {
  const desc = txn.description || '';
  
  // Handle earnings from orders
  if (txn.transaction_type.toUpperCase() === 'ESCROW_RELEASE') {
    const orderMatch = desc.match(/Order #(\d+)/);
    const orderId = orderMatch ? orderMatch[1] : '';
    return {
      title: '💰 Sale Earnings',
      subtitle: orderId ? `Order #${orderId} completed` : 'Product sale completed'
    };
  }
  
  // Handle payments
  if (txn.transaction_type.toUpperCase() === 'PAYMENT') {
    const orderMatch = desc.match(/Order #(\d+)/);
    const orderId = orderMatch ? orderMatch[1] : '';
    return {
      title: '🛍️ Purchase',
      subtitle: orderId ? `Order #${orderId}` : 'Product purchase'
    };
  }
  
  // Handle refunds
  if (txn.transaction_type.toUpperCase() === 'REFUND') {
    const orderMatch = desc.match(/Order #(\d+)/);
    const orderId = orderMatch ? orderMatch[1] : '';
    return {
      title: '↩️ Refund',
      subtitle: orderId ? `Order #${orderId} cancelled` : 'Order refund'
    };
  }
  
  // Handle deposits
  if (txn.transaction_type.toUpperCase() === 'DEPOSIT') {
    return {
      title: '💵 Funds Added',
      subtitle: 'Wallet deposit'
    };
  }
  
  // Handle withdrawals
  if (txn.transaction_type.toUpperCase() === 'WITHDRAWAL') {
    return {
      title: '🏦 Withdrawal',
      subtitle: 'Funds withdrawn'
    };
  }
  
  // Default fallback
  return {
    title: desc.substring(0, 40) + (desc.length > 40 ? '...' : ''),
    subtitle: txn.transaction_type
  };
};

// Helper to get transaction icon
const getTransactionIcon = (type: string) => {
  const upperType = type.toUpperCase();
  switch (upperType) {
    case 'DEPOSIT': return 'arrow-down-circle';
    case 'WITHDRAWAL': return 'arrow-up-circle';
    case 'PAYMENT': return 'cart';
    case 'REFUND': return 'refresh-circle';
    case 'ESCROW_RELEASE': return 'trophy';
    default: return 'swap-horizontal';
  }
};

// Helper to get transaction color
const getTransactionColor = (type: string) => {
  const upperType = type.toUpperCase();
  switch (upperType) {
    case 'DEPOSIT': return colors.successText;
    case 'REFUND': return colors.infoAction;
    case 'WITHDRAWAL': return colors.dangerAction;
    case 'PAYMENT': return colors.dangerAction;
    case 'ESCROW_RELEASE': return colors.accent;
    default: return colors.textSecondary;
  }
};

const WalletDashboardScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { walletBalance, refreshBadges } = useBadges();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchWalletData = useCallback(async () => {
    safeLog('🔍 DEBUG: === FETCH WALLET DATA START ===');
    safeLog('🔍 DEBUG: refreshing:', refreshing);
    safeLog('🔍 DEBUG: user:', user);
    safeLog('🔍 DEBUG: user.id:', user?.id);
    
    if (!refreshing) setLoading(true);
    setError(null);
    try {
      if (!user?.id) {
        safeLog('🔍 DEBUG: No user ID, setting error');
        setError("User not authenticated. Cannot fetch wallet data.");
        setLoading(false);
        return;
      }
      safeLog('🔍 DEBUG: Fetching wallet data for user:', user.id);
      
      // Refresh badges (including wallet balance) and get transactions
      safeLog('🔍 DEBUG: Calling refreshBadges()');
      await refreshBadges();
      safeLog('🔍 DEBUG: refreshBadges() completed');
      
      safeLog('🔍 DEBUG: Calling getMyTransactions()');
      const txnsResponse = await getMyTransactions();
      safeLog('🔍 DEBUG: Transactions response:', txnsResponse);
      
      // Sort transactions by date (newest first)
      safeLog('🔍 DEBUG: Sorting transactions');
      const sortedTxns = txnsResponse.sort((a: Transaction, b: Transaction) => {
        const dateA = new Date(b.created_at).getTime();
        const dateB = new Date(a.created_at).getTime();
        safeLog('🔍 DEBUG: Comparing dates:', { dateA, dateB, diff: dateA - dateB });
        return dateA - dateB;
      });
      safeLog('🔍 DEBUG: Sorted transactions count:', sortedTxns.length);
      setTransactions(sortedTxns);
      safeLog('🔍 DEBUG: === FETCH WALLET DATA SUCCESS ===');
    } catch (err: any) {
      safeError('🔍 DEBUG: === FETCH WALLET DATA ERROR ===');
      safeError('🔍 DEBUG: Error:', err);
      safeError('🔍 DEBUG: Error message:', err?.message);
      safeError('🔍 DEBUG: Error response:', err?.response);
      safeError('🔍 DEBUG: Error response data:', err?.response?.data);
      setError("Failed to load wallet data. Please try again.");
    } finally {
      safeLog('🔍 DEBUG: Setting loading and refreshing to false');
      setLoading(false);
      setRefreshing(false);
      safeLog('🔍 DEBUG: === FETCH WALLET DATA END ===');
    }
  }, [user, refreshBadges, refreshing]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && isAuthenticated) {
        fetchWalletData();
      } else if (!authLoading && !isAuthenticated) {
        setLoading(false);
        setError("Please log in to view your wallet.");
      }
    }, [authLoading, isAuthenticated, fetchWalletData])
  );

  // Also refresh when screen gains focus (e.g., returning from AddFundsScreen)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && !authLoading) {
        safeLog('Screen focused, refreshing wallet data');
        fetchWalletData();
      }
    }, [isAuthenticated, authLoading, fetchWalletData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWalletData();
  }, [fetchWalletData]);

  const handleAddFunds = () => {
    // @ts-ignore
    navigation.navigate('AddFundsScreen');
  };

  const handleWithdrawFunds = () => {
    // In a real app, this would navigate to a "Withdraw Funds" screen
    Alert.alert("Withdraw Funds", "This would open a screen to withdraw funds from your wallet.");
    // Example: navigation.navigate('WithdrawFundsScreen');
  };

  // Render logic for different states
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>Loading your wallet...</Text>
          {error && <Text style={styles.errorTextSmall}>{error}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.infoContainer}>
          <Ionicons name="warning-outline" size={60} color={colors.errorText} />
          <Text style={styles.title}>Error Loading Wallet</Text>
          <Text style={styles.messageText}>{error}</Text>
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={fetchWalletData}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.infoContainer}>
            <Ionicons name="lock-closed-outline" size={60} color={colors.textSecondary} />
            <Text style={styles.title}>Access Denied</Text>
            <Text style={styles.messageText}>
              You must be logged in to view your wallet.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => navigation.navigate('AuthStack', { screen: 'Login' })}
            >
              <Ionicons name="log-in-outline" size={20} color={colors.buttonText} />
              <Text style={styles.buttonText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.pageTitle}>My Wallet</Text>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={() => {
                safeLog('Manual refresh triggered');
                fetchWalletData();
              }}
              disabled={loading}
            >
              <Ionicons 
                name="refresh" 
                size={24} 
                color={loading ? colors.textSecondary : colors.primary} 
              />
            </TouchableOpacity>
          </View>

          {/* Wallet Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceValue}>{formatCurrency(walletBalance)}</Text>
            <View style={styles.balanceActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleAddFunds}>
                <Ionicons name="add-circle-outline" size={24} color={colors.infoAction} />
                <Text style={styles.actionButtonText}>Add Funds</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleWithdrawFunds}>
                <Ionicons name="wallet-outline" size={24} color={colors.dangerAction} />
                <Text style={styles.actionButtonText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transaction History */}
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            {transactions.length === 0 ? (
              <View style={styles.noTransactionsContainer}>
                <Ionicons name="swap-horizontal-outline" size={60} color={colors.textSecondary} />
                <Text style={styles.noTransactionsMessage}>No transactions yet.</Text>
                <Text style={styles.noTransactionsSubMessage}>Your transaction history will appear here.</Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {Array.isArray(transactions) ? transactions.map((txn) => {
                  safeLog('🔍 DEBUG: Rendering transaction:', txn.id);
                  const amt = parseFloat(txn.amount);
                  const { title, subtitle } = formatTransactionDescription(txn);
                  const isEarning = txn.transaction_type.toUpperCase() === 'ESCROW_RELEASE';
                  const isPurchase = txn.transaction_type.toUpperCase() === 'PAYMENT';
                  
                  return (
                    <View key={txn.id} style={[
                      styles.transactionItem,
                      isEarning && styles.transactionItemEarning
                    ]}>
                      <View style={[
                        styles.transactionIconContainer,
                        isEarning && styles.transactionIconContainerEarning
                      ]}>
                        <Ionicons
                          name={getTransactionIcon(txn.transaction_type)}
                          size={24}
                          color={getTransactionColor(txn.transaction_type)}
                        />
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={[
                          styles.transactionTitle,
                          isEarning && styles.transactionTitleEarning
                        ]}>{title}</Text>
                        <Text style={styles.transactionSubtitle}>{subtitle}</Text>
                        <Text style={styles.transactionDate}>
                          {new Date(txn.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      <View style={styles.transactionAmountContainer}>
                        <Text style={[
                          styles.transactionAmount,
                          isPurchase ? styles.amountNegative : (amt > 0 ? styles.amountPositive : styles.amountNegative),
                          isEarning && styles.amountEarning
                        ]}>
                          {amt > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                        </Text>
                        {isEarning && (
                          <View style={styles.earningBadge}>
                            <Text style={styles.earningBadgeText}>Earned</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                }) : (
                  <Text style={styles.errorTextSmall}>Transactions data is not in the correct format</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollViewContent: { flexGrow: 1, padding: 16, paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  messageText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  errorTextSmall: { fontSize: 13, color: colors.error, marginTop: 10, textAlign: 'center' },
  button: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 4 },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  buttonPrimary: { backgroundColor: colors.primary },

  container: { flex: 1 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'center' },
  refreshButton: { padding: 8 },

  // Wallet Balance Card
  balanceCard: { backgroundColor: colors.card, borderRadius: 4, padding: 16, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  balanceLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' },
  balanceValue: { fontSize: 32, fontWeight: '700', color: colors.primary, marginBottom: 16 },
  balanceActions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 8 },
  actionButton: { flexDirection: 'column', alignItems: 'center', padding: 10, borderRadius: 4, backgroundColor: colors.background, width: '45%', borderWidth: 1, borderColor: colors.border },
  actionButtonText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, marginTop: 4 },

  // Transactions Section
  transactionsSection: { backgroundColor: colors.card, borderRadius: 4, padding: 12, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  noTransactionsContainer: { alignItems: 'center', paddingVertical: 20 },
  noTransactionsMessage: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 4 },
  noTransactionsSubMessage: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  transactionsList: {},
  transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 },
  transactionItemEarning: { backgroundColor: '#FFF9E6', borderLeftWidth: 3, borderLeftColor: colors.accent },
  transactionIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  transactionIconContainerEarning: { backgroundColor: '#FFF3CD' },
  transactionDetails: { flex: 1, marginRight: 8 },
  transactionTitle: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', marginBottom: 2 },
  transactionTitleEarning: { fontSize: 14, fontWeight: '700' },
  transactionSubtitle: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  transactionDate: { fontSize: 10, color: colors.textSecondary },
  transactionAmountContainer: { alignItems: 'flex-end' },
  transactionAmount: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  amountPositive: { color: colors.successText },
  amountNegative: { color: colors.dangerAction },
  amountEarning: { fontSize: 16, color: colors.accent },
  earningBadge: { backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  earningBadgeText: { fontSize: 9, color: colors.white, fontWeight: '700', textTransform: 'uppercase' },
});

export default WalletDashboardScreen;
