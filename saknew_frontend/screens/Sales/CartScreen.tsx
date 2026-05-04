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
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../../types'; // Assuming Product type is defined in types.ts
import { salesService } from '../../services/apiService';
import { Cart, CartItem } from '../../services/salesService';
import {
  getGuestCart,
  updateGuestCartItem,
  removeFromGuestCart,
  clearGuestCart,
  getGuestCartTotal,
  GuestCartItem,
} from '../../services/guestCartService';
import { MainNavigationProp } from '../../navigation/types';
import { useBadges } from '../../context/BadgeContext';
import { useAuth } from '../../context/AuthContext';

const colors = {
  background: '#F9FAFB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  card: '#FFFFFF',
  border: '#F3F4F6',
  primary: '#059669',
  buttonText: '#FFFFFF',
  errorText: '#EF4444',
  successText: '#059669',
  dangerAction: '#EF4444',
  white: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.05)',
  shadowColor: 'rgba(0, 0, 0, 0.05)',
  accent: '#F59E0B',
};


const CartScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const route = useRoute();
  const fromShopSlug = (route.params as any)?.fromShopSlug as string | undefined;
  const { refreshBadges } = useBadges();
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [guestCart, setGuestCart] = useState<GuestCartItem[]>([]);

  // Function to format currency
  const formatCurrency = (amount: number): string => {
    return `R${(amount || 0).toFixed(2)}`;
  };

  // Calculate cart totals
  const subtotal = isAuthenticated
    ? (cart ? parseFloat(cart.total) : 0)
    : getGuestCartTotal(guestCart);
  const total = subtotal;
  const totalItems = isAuthenticated
    ? (cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0)
    : guestCart.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = isAuthenticated ? (cart?.items?.length ?? 0) > 0 : guestCart.length > 0;

  useFocusEffect(
  useCallback(() => {
  
    fetchCart();
  }, [])
);


// Update handleQuantityChange to refresh immediately
const handleQuantityChange = async (productId: number, newQuantity: number, size?: string) => {
  try {
    if (newQuantity <= 0) return handleRemoveItem(productId, size);
    if (isAuthenticated) {
      await salesService.updateCartItemQuantity(productId, newQuantity);
    } else {
      await updateGuestCartItem(productId, newQuantity, size);
    }
    fetchCart();
  } catch (err: any) {
    setError(err?.response?.data?.detail || 'Failed to update cart item.');
  }
};


  // Handle item removal
  const handleRemoveItem = async (productId: number, size?: string) => {
    const isWeb = typeof window !== 'undefined' && window.confirm;
    if (isWeb) {
      const confirmed = window.confirm('Are you sure you want to remove this item from your cart?');
      if (!confirmed) return;
      await performRemoval(productId, size);
    } else {
      Alert.alert(
        "Remove Item",
        "Are you sure you want to remove this item from your cart?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", onPress: () => performRemoval(productId, size), style: "destructive" },
        ],
        { cancelable: true }
      );
    }
  };

  const performRemoval = async (productId: number, size?: string) => {
    try {
      if (isAuthenticated) {
        await salesService.removeCartItem(productId);
      } else {
        await removeFromGuestCart(productId, size);
      }
      await fetchCart();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to remove item.');
    }
  };

  // Handle clearing entire cart
  const handleClearCart = async () => {
    const isWeb = typeof window !== 'undefined' && window.confirm;
    if (isWeb) {
      const confirmed = window.confirm('Are you sure you want to remove all items from your cart?');
      if (!confirmed) return;
      await performClearCart();
    } else {
      Alert.alert(
        "Clear Cart",
        "Are you sure you want to remove all items from your cart?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Clear All", onPress: () => performClearCart(), style: "destructive" },
        ]
      );
    }
  };

  const performClearCart = async () => {
    try {
      if (isAuthenticated) {
        await salesService.clearCart();
      } else {
        await clearGuestCart();
      }
      await fetchCart();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to clear cart.');
    }
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

  const handleGuestCheckout = () => {
    if (guestCart.length === 0) {
      Alert.alert("Cart Empty", "Your cart is empty.");
      return;
    }
    (navigation as any).navigate('GuestCheckout', { cartItems: guestCart, cartTotal: getGuestCartTotal(guestCart).toFixed(2) });
  };

  const handleContinueShopping = () => {
    (navigation as any).navigate('BottomTabs'); // Navigate to Home tab
  };

  // Fetch cart from backend or guest cart
  const fetchCart = async () => {
    if (!cart) setLoading(true);
    setError(null);
    try {
      if (isAuthenticated) {
        const backendCart = await salesService.getMyCart();
        setCart(backendCart);
      } else {
        const items = await getGuestCart();
        setGuestCart(items);
      }
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
        keyExtractor={item => item.product.id.toString()}
        ListHeaderComponent={
          <View style={styles.cartContent}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => {
                  if (fromShopSlug) {
                    navigation.navigate('PublicShop', { shopSlug: fromShopSlug });
                  } else {
                    navigation.goBack();
                  }
                }}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>Cart {totalItems > 0 ? `(${totalItems})` : ''}</Text>
              {hasItems ? (
                <TouchableOpacity
                  onPress={handleClearCart}
                  style={styles.clearCartBtn}
                  accessibilityLabel="Clear all items from cart"
                >
                  <Ionicons name="trash-outline" size={18} color={colors.dangerAction} />
                  <Text style={styles.clearCartText}>Clear</Text>
                </TouchableOpacity>
              ) : <View style={{ width: 60 }} />}
            </View>
            {!hasItems && (
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
        data={isAuthenticated
          ? (cart?.items ?? [])
          : guestCart.map((g, i) => ({ ...g, id: i, product_id: g.product.id, line_total: String(parseFloat(g.product.display_price || g.product.price || '0') * g.quantity) }))
        }
        keyExtractor={(item: any) => `${item.product?.id}-${item.size ?? ''}`}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.cartItem}>
            <View style={styles.quantityBorder}>
              <View style={styles.scrollData}>
                <View style={styles.itemHeader}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(item.product.id, item.size)}
                    style={styles.deleteBtn}
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
                      onPress={() => handleQuantityChange(item.product.id, item.quantity - 1, item.size)}
                      style={styles.decreaseBtn}
                      disabled={item.quantity <= 1}
                    >
                      <Text style={styles.quantityBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityInput}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => handleQuantityChange(item.product.id, item.quantity + 1, item.size)}
                      style={styles.increaseBtn}
                    >
                      <Text style={styles.quantityBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {item.size && (
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Size: {item.size}</Text>
                )}
                {item.product.promotion && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
                    <Ionicons name="pricetag" size={16} color={colors.errorText} />
                    <Text style={{ color: colors.errorText, fontWeight: 'bold', marginLeft: 4, fontSize: 13 }}>
                      {item.product.discount_percentage_value}% OFF
                    </Text>
                  </View>
                )}
                <Text style={styles.unitPriceDisplay}>
                  <Text style={styles.detailLabel}>Unit Price: </Text>
                  <Text style={styles.unitPrice}>
                    R{parseFloat(item.product.display_price || item.product.price || '0').toFixed(2)}
                  </Text>
                </Text>
                <Text style={styles.lineTotalDisplay}>
                  <Text style={styles.detailLabel}>Line Total: </Text>
                  <Text style={styles.lineTotal}>
                    R{(parseFloat(item.product.display_price || item.product.price || '0') * item.quantity).toFixed(2)}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          hasItems ? (
            <View style={styles.cartSummaryBox}>
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartSummaryLabel}>Subtotal</Text>
                <Text style={styles.cartSummaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartSummaryLabel}>Total</Text>
                <Text style={styles.cartSummaryValue}>{formatCurrency(total)}</Text>
              </View>
              {isAuthenticated ? (
                <TouchableOpacity
                  onPress={handleCheckout}
                  style={styles.checkoutButton}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.checkoutButtonText}>Checkout</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => (navigation as any).navigate('GuestCheckout', {
                      cartItems: guestCart,
                      cartTotal: total.toFixed(2),
                    })}
                    style={[styles.checkoutButton, { backgroundColor: '#6366F1' }]}
                  >
                    <Text style={styles.checkoutButtonText}>Checkout as Guest (Card)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Login' as any)}
                    style={[styles.checkoutButton, { backgroundColor: colors.primary, marginTop: 8 }]}
                  >
                    <Text style={styles.checkoutButtonText}>Login to Checkout</Text>
                  </TouchableOpacity>
                </>
              )}
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
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  cartContent: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
    width: 36,
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.card,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.dangerAction,
  },
  clearCartText: {
    color: colors.dangerAction,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
  },
  detailLabel: {
    fontWeight: '600',
    color: colors.textSecondary,
    fontSize: 12,
  },

  // Empty Cart Styles
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCartMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  startShoppingLink: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
    marginRight: 10,
  },
  deleteBtn: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 4,
    marginRight: 12,
    resizeMode: 'cover',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
    width: 90,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quantityInput: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: 4,
  },

  unitPriceDisplay: {
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  unitPrice: {
    fontWeight: '600',
    color: colors.primary,
  },
  lineTotalDisplay: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  lineTotal: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Cart Summary Styles
  cartSummaryBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cartSummaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cartSummaryValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CartScreen;
