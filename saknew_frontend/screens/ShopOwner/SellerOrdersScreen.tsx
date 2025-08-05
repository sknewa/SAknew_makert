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
  TextInput,
  Modal,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { MainNavigationProp } from '../../navigation/types';
import apiClient from '../../services/apiClient';
import { updateOrderStatus } from '../../services/salesService';
import LoadingIndicator from '../../components/LoadingIndicator';
import { formatApiError } from '../../utils/errorHandler';

// Define common colors
const colors = {
  background: '#F8F9FA',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  card: '#FFFFFF',
  border: '#DEE2E6',
  primary: '#28A745',
  primaryLight: '#2ECC71',
  buttonText: '#FFFFFF',
  errorText: '#DC3545',
  successText: '#28A745',
  shadowColor: '#000',
  infoAction: '#17A2B8',
  dangerAction: '#DC3545',
  warningAction: '#FFC107',
  white: '#FFFFFF',
};

// Helper function for order status display
const getOrderStatusDisplay = (status: string): string => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'processing': return 'Processing';
    case 'shipped': return 'Shipped';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

// Helper function for payment status display
const getPaymentStatusDisplay = (status: string): string => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'paid': return 'Paid';
    case 'failed': return 'Failed';
    case 'refunded': return 'Refunded';
    default: return status;
  }
};

// Format currency helper
const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${num.toFixed(2)}`;
};

const SellerOrdersScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [shop, setShop] = useState<any>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<{ [key: string]: { orders: any[] } }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // State for delivery verification modal
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [currentOrderToVerify, setCurrentOrderToVerify] = useState<any | null>(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState<string>('');
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  const [verificationMessageType, setVerificationMessageType] = useState<'success' | 'error' | ''>('');

  // Fetch shop orders from the database
  const fetchShopOrders = useCallback(async () => {
    if (!authLoading && !refreshing) setLoading(true);
    setError(null);

    try {
      if (!isAuthenticated || !user?.profile?.is_seller || !user.profile?.shop_slug) {
        setShop(null);
        setOrdersByStatus({});
        setError(!isAuthenticated ? 'You must be logged in to view this page.' : 
                !user?.profile?.is_seller ? 'You must be a seller to view this page.' : 
                'No shop found associated with your account.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const shopSlug = user.profile.shop_slug;

      // Get shop details
      const shopResponse = await apiClient.get(`/api/shops/${shopSlug}/`);
      setShop(shopResponse.data);

      // Get orders for this shop (orders from customers buying from this seller)
      const ordersResponse = await apiClient.get(`/api/orders/`);
      const allOrders = ordersResponse.data.results || [];
      
      // Filter orders where this seller's products are being bought by others
      const orders = allOrders.filter(order => 
        order.items.some(item => item.product.shop === shopResponse.data.id) &&
        order.user.id !== user.id // Exclude seller's own purchases
      );

      // Group orders by status
      const groupedOrders: { [key: string]: { orders: any[] } } = {
        'Pending': { orders: [] },
        'Processing': { orders: [] },
        'Shipped': { orders: [] },
        'Delivered': { orders: [] },
        'Cancelled': { orders: [] },
      };

      orders.forEach((order: any) => {
        // Only include orders with items from this shop
        const shopItems = order.items.filter((item: any) => item.product.shop === shopResponse.data.id);
        if (shopItems.length > 0) {
          const statusDisplay = getOrderStatusDisplay(order.order_status);
          if (groupedOrders[statusDisplay]) {
            groupedOrders[statusDisplay].orders.push(order);
          } else {
            if (!groupedOrders['Other']) {
              groupedOrders['Other'] = { orders: [] };
            }
            groupedOrders['Other'].orders.push(order);
          }
        }
      });

      // Sort orders by date (newest first)
      for (const statusKey in groupedOrders) {
        groupedOrders[statusKey].orders.sort((a, b) => 
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        );
      }

      setOrdersByStatus(groupedOrders);
    } catch (err: any) {
      console.error("Error fetching shop orders:", err);
      setError(formatApiError(err));
      setShop(null);
      setOrdersByStatus({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authLoading, isAuthenticated, refreshing, user]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        fetchShopOrders();
      }
    }, [authLoading, fetchShopOrders])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchShopOrders();
  }, [fetchShopOrders]);

  // Handle marking an order as shipped
  const handleMarkAsShipped = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'mark_shipped');
      Alert.alert('Success', 'Order has been marked as shipped.');
      fetchShopOrders(); // Refresh orders
    } catch (err) {
      Alert.alert('Error', formatApiError(err));
    }
  };

  // Handle delivery verification
  const openVerificationModal = (order: any) => {
    setCurrentOrderToVerify(order);
    setDeliveryCodeInput('');
    setVerificationMessage('');
    setVerificationMessageType('');
    setIsVerificationModalVisible(true);
  };

  const handleVerifyDeliveryCode = async () => {
    if (!currentOrderToVerify) {
      setVerificationMessage("System error. Please try again.");
      setVerificationMessageType('error');
      return;
    }

    if (deliveryCodeInput.trim() === '') {
      setVerificationMessage("Please enter the delivery code.");
      setVerificationMessageType('error');
      return;
    }

    try {
      await updateOrderStatus(
        currentOrderToVerify.id, 
        'verify_delivery', 
        deliveryCodeInput
      );
      
      setVerificationMessage("Delivery successfully verified!");
      setVerificationMessageType('success');
      
      setTimeout(() => {
        setIsVerificationModalVisible(false);
        setCurrentOrderToVerify(null);
        fetchShopOrders(); // Refresh orders
      }, 1500);
    } catch (err) {
      setVerificationMessage(formatApiError(err));
      setVerificationMessageType('error');
    }
  };

  // Loading state
  if (authLoading || (loading && !refreshing)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingIndicator message="Loading orders data..." fullScreen />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.infoContainer}>
          <Ionicons name="warning-outline" size={60} color={colors.errorText} />
          <Text style={styles.title}>Error Loading Orders</Text>
          <Text style={styles.messageText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={fetchShopOrders}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Not authenticated or not a seller
  if (!isAuthenticated || !user?.profile?.is_seller) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.infoContainer}>
            <Ionicons name="lock-closed-outline" size={60} color={colors.textSecondary} />
            <Text style={styles.title}>Access Denied</Text>
            <Text style={styles.messageText}>
              You must be an authenticated seller to view your shop orders. Please log in or register.
            </Text>
            <TouchableOpacity
              style={styles.button}
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

  // No shop found
  if (!shop) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.infoContainer}>
            <Ionicons name="storefront-outline" size={60} color={colors.primaryLight} />
            <Text style={styles.title}>No Shop Found</Text>
            <Text style={styles.messageText}>It looks like you haven't created your shop yet. Create one to manage orders!</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('CreateShop')}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.buttonText} />
              <Text style={styles.buttonText}>Create Your Shop Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const hasOrders = Object.values(ordersByStatus).some(group => group.orders.length > 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.ordersMainContainer}>
          <Text style={styles.pageTitle}>Orders for {shop.name}</Text>

          {!hasOrders ? (
            <View style={styles.noOrdersContainer}>
              <Ionicons name="receipt-outline" size={80} color={colors.textSecondary} />
              <Text style={styles.noOrdersMessage}>No orders have been placed for your products yet.</Text>
              <Text style={styles.noOrdersSubMessage}>Start selling to see your orders here!</Text>
            </View>
          ) : (
            <>
              {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => {
                const orderData = ordersByStatus[status];
                if (!orderData || orderData.orders.length === 0) {
                  return null;
                }

                return (
                  <View key={status} style={styles.statusGroupSection}>
                    <Text style={[styles.statusHeading, styles[`statusHeading${status.replace(/\s/g, '')}`]]}>
                      {status} Orders ({orderData.orders.length})
                    </Text>

                    <View style={styles.ordersGrid}>
                      {orderData.orders.map((order) => {
                        // Calculate totals for this shop's items
                        let totalQuantity = 0;
                        let totalAmount = 0;
                        order.items.forEach((item: any) => {
                          if (item.product.shop === shop.id) {
                            totalQuantity += item.quantity;
                            totalAmount += parseFloat(item.price) * item.quantity;
                          }
                        });

                        return (
                          <TouchableOpacity 
                            key={order.id} 
                            style={styles.orderCard}
                            onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
                          >
                            <View style={styles.orderHeader}>
                              <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
                              <Text style={[styles.orderStatusBadge, styles[`status${status}`]]}>
                                {status}
                              </Text>
                            </View>

                            <View style={styles.orderInfo}>
                              <Text style={styles.customerText}>{order.user.username}</Text>
                              <Text style={styles.dateText}>{new Date(order.order_date).toLocaleDateString()}</Text>
                              <Text style={styles.amountText}>{formatCurrency(totalAmount)}</Text>
                            </View>

                            <View style={styles.itemsPreview}>
                              <Text style={styles.itemsText}>
                                {totalQuantity} item{totalQuantity > 1 ? 's' : ''}
                              </Text>
                              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* Delivery Verification Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isVerificationModalVisible}
        onRequestClose={() => setIsVerificationModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setIsVerificationModalVisible(false)}
            >
              <Ionicons name="close-circle" size={30} color={colors.textSecondary} />
            </Pressable>
            <Text style={styles.modalTitle}>Verify Delivery for Order #{currentOrderToVerify?.id}</Text>
            <Text style={styles.modalMessage}>Please enter the 6-digit delivery code provided by the buyer.</Text>

            <TextInput
              style={styles.codeInput}
              placeholder="Enter 6-digit Code"
              keyboardType="number-pad"
              maxLength={6}
              value={deliveryCodeInput}
              onChangeText={setDeliveryCodeInput}
              placeholderTextColor={colors.textSecondary}
            />

            {verificationMessage ? (
              <Text style={[styles.verificationMessage, verificationMessageType === 'success' ? styles.successText : styles.errorText]}>
                {verificationMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, styles.verifyModalButton]}
              onPress={handleVerifyDeliveryCode}
            >
              <Text style={styles.buttonText}>Confirm Delivery</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 20,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 15,
    margin: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  ordersMainContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  noOrdersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: colors.card,
    borderRadius: 10,
    marginVertical: 20,
  },
  noOrdersMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 15,
    textAlign: 'center',
  },
  noOrdersSubMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  
  statusGroupSection: {
    marginBottom: 20,
  },
  statusHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusHeadingPending: { borderBottomColor: colors.warningAction },
  statusHeadingProcessing: { borderBottomColor: colors.infoAction },
  statusHeadingShipped: { borderBottomColor: colors.primary },
  statusHeadingDelivered: { borderBottomColor: colors.successText },
  statusHeadingCancelled: { borderBottomColor: colors.dangerAction },
  
  ordersGrid: {
    flexDirection: 'column',
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerText: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  amountText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
    textAlign: 'right',
  },
  itemsPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  orderStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
    overflow: 'hidden',
  },
  statusPending: { backgroundColor: colors.warningAction + '20', color: colors.warningAction },
  statusProcessing: { backgroundColor: colors.infoAction + '20', color: colors.infoAction },
  statusShipped: { backgroundColor: colors.primary + '20', color: colors.primary },
  statusDelivered: { backgroundColor: colors.successText + '20', color: colors.successText },
  statusCancelled: { backgroundColor: colors.dangerAction + '20', color: colors.dangerAction },
  

  
  // Modal Styles
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    width: '80%',
    marginBottom: 20,
    color: colors.textPrimary,
  },
  verificationMessage: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  verifyModalButton: {
    marginTop: 10,
    width: '100%',
  },
  successText: {
    color: colors.successText,
  },
  errorText: {
    color: colors.errorText,
  },
});

export default SellerOrdersScreen;