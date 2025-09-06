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

// Define common colors - Consistent with other screens
const colors = {
  background: '#F0F2F5', // Lighter, modern background
  textPrimary: '#2C3E50', // Darker, more professional text
  textSecondary: '#7F8C8D', // Softer secondary text
  card: '#FFFFFF', // Pure white cards
  border: '#E0E6EB', // Lighter, subtle border
  primary: '#27AE60', // A more vibrant green
  primaryLight: '#2ECC71', // Lighter primary for accents
  buttonBg: '#27AE60', // Matches primary
  buttonText: '#FFFFFF',
  errorText: '#E74C3C', // Clearer red for errors
  successText: '#27AE60', // Matches primary for success
  shadowColor: 'rgba(0, 0, 0, 0.1)', // Softer, more diffused shadow
  infoAction: '#3498DB', // Blue for info actions
  dangerAction: '#E74C3C', // Red for danger actions
  warningAction: '#F39C12', // Orange for warnings
  white: '#FFFFFF',
  accent: '#F1C40F', // Golden yellow for ratings/accents
};



// Helper function to format currency
const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${(num || 0).toFixed(2)}`;
};

// Helper to get transaction icon
const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'deposit': return 'arrow-down-circle';
    case 'withdrawal': return 'arrow-up-circle';
    case 'purchase': return 'bag-handle';
    case 'refund': return 'cash';
    case 'payout': return 'wallet';
    default: return 'help-circle';
  }
};

// Helper to get transaction color
const getTransactionColor = (type: string) => {
  switch (type) {
    case 'deposit': return colors.successText;
    case 'refund': return colors.successText;
    case 'withdrawal': return colors.dangerAction;
    case 'purchase': return colors.textPrimary;
    case 'payout': return colors.infoAction;
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
    if (!refreshing) setLoading(true);
    setError(null);
    try {
      if (!user?.id) {
        setError("User not authenticated. Cannot fetch wallet data.");
        setLoading(false);
        return;
      }
      console.log('Fetching wallet data for user:', user.id);
      
      // Refresh badges (including wallet balance) and get transactions
      await refreshBadges();
      const txns = await getMyTransactions();
      console.log('Transactions loaded:', txns.length);
      setTransactions(txns);
    } catch (err: any) {
      console.error('Error fetching wallet data:', err);
      setError("Failed to load wallet data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
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
        console.log('Screen focused, refreshing wallet data');
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
                console.log('Manual refresh triggered');
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
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length === 0 ? (
              <View style={styles.noTransactionsContainer}>
                <Ionicons name="swap-horizontal-outline" size={60} color={colors.textSecondary} />
                <Text style={styles.noTransactionsMessage}>No transactions yet.</Text>
                <Text style={styles.noTransactionsSubMessage}>Your transaction history will appear here.</Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {Array.isArray(transactions) ? transactions.map((txn) => {
                  const amt = parseFloat(txn.amount);
                  return (
                    <View key={txn.id} style={styles.transactionItem}>
                      <Ionicons
                        name={getTransactionIcon(txn.transaction_type)}
                        size={28}
                        color={getTransactionColor(txn.transaction_type)}
                        style={styles.transactionIcon}
                      />
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDescription}>{txn.description}</Text>
                        <Text style={styles.transactionDate}>
                          {new Date(txn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={[
                        styles.transactionAmount,
                        amt > 0 ? styles.amountPositive : styles.amountNegative
                      ]}>
                        {amt > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                      </Text>
                    </View>
                  );
                }) : null}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.card,
    borderRadius: 15,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    margin: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24,
  },
  messageText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 15,
    lineHeight: 24,
  },
  errorTextSmall: {
    fontSize: 14,
    color: colors.errorText,
    marginTop: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.buttonBg,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 7,
    marginTop: 15,
    marginHorizontal: 8,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  buttonPrimary: { backgroundColor: colors.primary },

  container: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Wallet Balance Card
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 25,
    marginBottom: 25,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 10,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    width: '45%', // Distribute space
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 5,
  },

  // Transactions Section
  transactionsSection: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noTransactionsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noTransactionsMessage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 15,
    marginBottom: 5,
  },
  noTransactionsSubMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  transactionsList: {
    // No specific styling needed for the list container itself, items will be styled
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-between',
  },
  transactionIcon: {
    marginRight: 15,
  },
  transactionDetails: {
    flex: 1,
    marginRight: 10,
  },
  transactionDescription: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  amountPositive: {
    color: colors.successText,
  },
  amountNegative: {
    color: colors.dangerAction,
  },
});

export default WalletDashboardScreen;
