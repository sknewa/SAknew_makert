import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../types'; // Assuming Product type is defined in types.ts
import { salesService } from '../../services/apiService';
import { Cart, CartItem } from '../../services/salesService';
import { MainNavigationProp } from '../../navigation/types';
import { useBadges } from '../../context/BadgeContext';

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


const CartScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const { refreshBadges } = useBadges();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Function to format currency
  const formatCurrency = (amount: number): string => {
    return `R${amount.toFixed(2)}`;
  };

  // Calculate cart totals from backend cart
  const subtotal = cart ? parseFloat(cart.total) : 0;
  // Removed shipping calculation
  const total = subtotal;
  const totalItems = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  useFocusEffect(
  useCallback(() => {
    fetchCart();
  }, [])
);


// Update handleQuantityChange to refresh immediately
const handleQuantityChange = async (productId: number, newQuantity: number) => {
  try {
    if (newQuantity <= 0) {
      await salesService.removeCartItem(productId);
    } else {
      await salesService.updateCartItemQuantity(productId, newQuantity);
    }
    // Immediately refresh cart and badges
    await fetchCart();
  } catch (err: any) {
    setError(err?.response?.data?.detail || 'Failed to update cart item.');
  }
};


  // Handle item removal (calls backend)
  const handleRemoveItem = (productId: number) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: async () => {
            setLoading(true);
            setError(null);
            try {
              const updatedCart = await salesService.removeCartItem(productId);
              setCart(updatedCart);
            } catch (err: any) {
              setError(err?.response?.data?.detail || 'Failed to remove item.');
            } finally {
              setLoading(false);
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  // Handle checkout (calls backend to create order)
  // Go to Shipping screen to collect address/contact info
  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert("Cart Empty", "Your cart is empty. Please add items before checking out.");
      return;
    }
    navigation.navigate('Shipping');
  };

  const handleContinueShopping = () => {
    navigation.navigate('MainTabs', { screen: 'HomeTab' }); // Navigate to Home tab
  };

  // Fetch cart from backend
  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendCart = await salesService.getMyCart();
      setCart(backendCart);
      // Refresh badges when cart is updated
      await refreshBadges();
    } catch (err: any) {
      setError('Failed to load cart.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCart();
  }, []);


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>Loading your cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.subtitle, { color: colors.errorText }]}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={cart && cart.items ? cart.items : []}
        keyExtractor={item => item.product.id.toString()}
        ListHeaderComponent={
          <View style={styles.cartContent}>
            <Text style={styles.pageTitle}>Your Cart</Text>
            {(!cart || cart.items.length === 0) && (
              <View style={styles.emptyCartContainer}>
                <Ionicons name="cart-outline" size={80} color={colors.textSecondary} />
                <Text style={styles.emptyCartMessage}>Your cart is empty.</Text>
                <TouchableOpacity
                  style={[styles.button, styles.startShoppingLink]}
                  onPress={handleContinueShopping}
                  accessibilityLabel="Start shopping now"
                >
                  <Text style={styles.buttonText}>Start shopping now!</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View key={item.product.id} style={styles.cartItem}>
            <View style={styles.quantityBorder}>
              <View style={styles.scrollData}>
                <View style={styles.itemHeader}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(item.product.id)}
                    style={styles.deleteBtn}
                    accessibilityLabel={`Remove ${item.product.name} from cart`}
                  >
                    <Ionicons name="trash" size={20} color={colors.dangerAction} />
                  </TouchableOpacity>
                </View>
                <View style={styles.itemDetails}>
                  <Image
                    source={{ uri: item.product.main_image_url || 'https://placehold.co/80x80/DEE2E6/6C757D?text=No+Image' }}
                    style={styles.productImage}
                  />
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      onPress={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                      style={styles.decreaseBtn}
                      disabled={item.quantity <= 1}
                      accessibilityLabel={`Decrease quantity of ${item.product.name}`}
                    >
                      <Text style={styles.quantityBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityInput} accessibilityLabel={`Quantity of ${item.product.name}`}>
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                      style={styles.increaseBtn}
                      accessibilityLabel={`Increase quantity of ${item.product.name}`}
                    >
                      <Text style={styles.quantityBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {item.product.stock === 0 && (
                  <Text style={{ color: colors.errorText, fontWeight: 'bold', marginTop: 4 }}>
                    Out of Stock
                  </Text>
                )}
                <Text style={styles.unitPriceDisplay}>
                  <Text style={styles.detailLabel}>Unit Price:</Text>{' '}
                  <Text style={styles.unitPrice}>{formatCurrency(parseFloat(item.product.price))}</Text>
                </Text>
                <Text style={styles.lineTotalDisplay}>
                  <Text style={styles.detailLabel}>Line Total:</Text>{' '}
                  <Text style={styles.lineTotal}>{formatCurrency(parseFloat(item.product.price) * item.quantity)}</Text>
                </Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          cart && cart.items && cart.items.length > 0 ? (
            <View style={styles.cartSummaryBox}>
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartSummaryLabel}>Subtotal</Text>
                <Text style={styles.cartSummaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartSummaryLabel}>Total</Text>
                <Text style={styles.cartSummaryValue}>{formatCurrency(total)}</Text>
              </View>
              <TouchableOpacity
                onPress={handleCheckout}
                style={styles.checkoutButton}
                accessibilityLabel="Proceed to Checkout"
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.checkoutButtonText}>Checkout</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollViewContent}
      />
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: colors.white, padding: 30, borderRadius: 16, alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={60} color={colors.successText} />
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 10 }}>Order Placed!</Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 20 }}>Your order has been placed successfully.</Text>
            <TouchableOpacity
              style={[styles.button, { minWidth: 120 }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.buttonText}>OK</Text>
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
    paddingHorizontal: 12, // Add horizontal padding for space on both sides
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  cartContent: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 25,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.buttonBg,
    paddingVertical: 14,
    paddingHorizontal: 25,
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
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 0, // Removed default 10, can be added per button if needed
  },
  detailLabel: {
    fontWeight: 'bold',
    color: colors.textSecondary,
  },

  // Empty Cart Styles
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: colors.card,
    borderRadius: 15,
    marginHorizontal: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCartMessage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  startShoppingLink: { // Renamed from continueShoppingButton to match Django template
    backgroundColor: colors.infoAction,
    width: '80%',
    alignSelf: 'center',
  },

  // Cart Items List Styles
  cartItemsList: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartItem: {
    marginBottom: 15, // Space between items
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Remove border from the last item
  // This requires a conditional style in JSX:
  // style={[styles.cartItem, index === cartItems.length - 1 && styles.lastCartItem]}
  lastCartItem: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },

  quantityBorder: {
    // This div in Django template seems to be a wrapper.
    // In RN, its styling might be merged with cartItem or be a subtle border.
    // For now, it's a conceptual wrapper.
  },
  scrollData: {
    // This div in Django template seems to be a wrapper for item data.
    // In RN, it's a conceptual wrapper.
  },

  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flexShrink: 1, // Allows text to wrap
    marginRight: 10,
  },
  deleteBtn: {
    padding: 5,
  },

  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
    resizeMode: 'cover',
    backgroundColor: '#E9ECEF',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
    width: 100, // Fixed width for quantity control
  },
  decreaseBtn: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  increaseBtn: {
    padding: 8,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  quantityBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  quantityInput: { // This is now a Text component, not TextInput
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    paddingHorizontal: 5,
  },

  unitPriceDisplay: {
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 5,
  },
  unitPrice: {
    fontWeight: '600',
    color: colors.primaryLight,
  },
  lineTotalDisplay: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 5, // Space before next item or summary
  },
  lineTotal: {
    color: colors.primary,
  },

  // Cart Summary Styles
  cartSummaryBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartSummaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  cartSummaryValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    width: '100%',
    elevation: 1,
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default CartScreen;
