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

const colors = {
  background: '#F5F5F5',
  textPrimary: '#222',
  textSecondary: '#999',
  card: '#FFFFFF',
  border: '#E0E0E0',
  primary: '#10B981',
  buttonText: '#FFFFFF',
  errorText: '#FF4444',
  dangerAction: '#FF4444',
  white: '#FFFFFF',
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
    return `R${(amount || 0).toFixed(2)}`;
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
  const handleRemoveItem = async (productId: number) => {
    console.log('🗑️ [CartScreen.handleRemoveItem] START - Product ID:', productId);
    console.log('🗑️ [CartScreen.handleRemoveItem] Current cart state:', JSON.stringify(cart, null, 2));
    
    // Use window.confirm for web, Alert for mobile
    const isWeb = typeof window !== 'undefined' && window.confirm;
    
    if (isWeb) {
      console.log('🌐 [CartScreen.handleRemoveItem] Using window.confirm for web');
      const confirmed = window.confirm('Are you sure you want to remove this item from your cart?');
      console.log('🌐 [CartScreen.handleRemoveItem] User response:', confirmed);
      
      if (!confirmed) {
        console.log('❌ [CartScreen.handleRemoveItem] User cancelled deletion');
        return;
      }
      
      console.log('✅ [CartScreen.handleRemoveItem] User confirmed deletion');
      await performRemoval(productId);
    } else {
      console.log('📱 [CartScreen.handleRemoveItem] Using Alert for mobile');
      Alert.alert(
        "Remove Item",
        "Are you sure you want to remove this item from your cart?",
        [
          { 
            text: "Cancel", 
            style: "cancel",
            onPress: () => console.log('❌ [CartScreen.handleRemoveItem] User cancelled deletion')
          },
          {
            text: "Remove",
            onPress: () => {
              console.log('✅ [CartScreen.handleRemoveItem] User confirmed deletion');
              performRemoval(productId);
            },
            style: "destructive",
          },
        ],
        { cancelable: true }
      );
    }
  };

  const performRemoval = async (productId: number) => {
    console.log('📤 [CartScreen.performRemoval] START - productId:', productId);
    try {
      console.log('🔧 [CartScreen.performRemoval] Calling salesService.removeCartItem...');
      const result = await salesService.removeCartItem(productId);
      console.log('✅ [CartScreen.performRemoval] salesService.removeCartItem returned successfully');
      console.log('✅ [CartScreen.performRemoval] Result:', JSON.stringify(result, null, 2));
      
      console.log('🔄 [CartScreen.performRemoval] About to refresh cart and badges');
      await fetchCart();
      console.log('✅ [CartScreen.performRemoval] fetchCart completed');
      console.log('✅ [CartScreen.performRemoval] END - Item removed successfully');
    } catch (err: any) {
      console.log('❌ [CartScreen.performRemoval] ERROR occurred');
      console.log('❌ [CartScreen.performRemoval] Error object:', err);
      console.log('❌ [CartScreen.performRemoval] Error message:', err?.message);
      console.log('❌ [CartScreen.performRemoval] Error response:', err?.response);
      console.log('❌ [CartScreen.performRemoval] Error response data:', err?.response?.data);
      console.log('❌ [CartScreen.performRemoval] Error response status:', err?.response?.status);
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to remove item.');
    }
  };

  // Handle clearing entire cart
  const handleClearCart = async () => {
    console.log('🗑️ [CartScreen.handleClearCart] START - Clearing entire cart');
    
    const isWeb = typeof window !== 'undefined' && window.confirm;
    
    if (isWeb) {
      const confirmed = window.confirm('Are you sure you want to remove all items from your cart?');
      if (!confirmed) {
        console.log('❌ [CartScreen.handleClearCart] User cancelled');
        return;
      }
      console.log('✅ [CartScreen.handleClearCart] User confirmed');
      await performClearCart();
    } else {
      Alert.alert(
        "Clear Cart",
        "Are you sure you want to remove all items from your cart?",
        [
          { 
            text: "Cancel", 
            style: "cancel",
            onPress: () => console.log('❌ [CartScreen.handleClearCart] User cancelled')
          },
          {
            text: "Clear All",
            onPress: () => {
              console.log('✅ [CartScreen.handleClearCart] User confirmed');
              performClearCart();
            },
            style: "destructive",
          },
        ]
      );
    }
  };

  const performClearCart = async () => {
    try {
      console.log('📤 [CartScreen.performClearCart] Calling salesService.clearCart');
      await salesService.clearCart();
      console.log('✅ [CartScreen.performClearCart] clearCart successful');
      
      console.log('🔄 [CartScreen.performClearCart] Refreshing cart');
      await fetchCart();
      console.log('✅ [CartScreen.performClearCart] END - Cart cleared successfully');
    } catch (err: any) {
      console.log('❌ [CartScreen.performClearCart] ERROR:', err?.response?.data);
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

  const handleContinueShopping = () => {
    (navigation as any).navigate('BottomTabs'); // Navigate to Home tab
  };

  // Fetch cart from backend
  const fetchCart = async () => {
    console.log('🔄 [CartScreen.fetchCart] START - Fetching cart from backend');
    setLoading(true);
    setError(null);
    try {
      console.log('📤 [CartScreen.fetchCart] Calling salesService.getMyCart');
      const backendCart = await salesService.getMyCart();
      console.log('✅ [CartScreen.fetchCart] Cart received:', JSON.stringify(backendCart, null, 2));
      console.log('✅ [CartScreen.fetchCart] Cart items count:', backendCart?.items?.length || 0);
      
      setCart(backendCart);
      console.log('✅ [CartScreen.fetchCart] Cart state updated');
      
      // Refresh badges when cart is updated
      console.log('🔄 [CartScreen.fetchCart] Refreshing badges');
      await refreshBadges();
      console.log('✅ [CartScreen.fetchCart] END - Badges refreshed');
    } catch (err: any) {
      console.log('❌ [CartScreen.fetchCart] ERROR:', err?.response?.data || err?.message);
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
            <View style={styles.headerRow}>
              <Text style={styles.pageTitle}>Your Cart</Text>
              {cart && cart.items.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearCart}
                  style={styles.clearCartBtn}
                  accessibilityLabel="Clear all items from cart"
                >
                  <Ionicons name="trash-outline" size={20} color={colors.dangerAction} />
                  <Text style={styles.clearCartText}>Clear Cart</Text>
                </TouchableOpacity>
              )}
            </View>
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
        renderItem={({ item }) => {
          console.log('💰 [CartScreen.renderItem] Rendering product:', item.product.name);
          console.log('💰 [CartScreen.renderItem] Original price:', item.product.price);
          console.log('💰 [CartScreen.renderItem] Display price:', item.product.display_price);
          console.log('💰 [CartScreen.renderItem] Has promotion:', !!item.product.promotion);
          console.log('💰 [CartScreen.renderItem] Discount %:', item.product.discount_percentage_value);
          console.log('💰 [CartScreen.renderItem] Quantity:', item.quantity);
          const unitPrice = parseFloat(item.product.display_price || item.product.price || '0');
          const lineTotal = unitPrice * item.quantity;
          console.log('💰 [CartScreen.renderItem] Calculated unit price:', unitPrice);
          console.log('💰 [CartScreen.renderItem] Calculated line total:', lineTotal);
          
          return (
          <View key={item.product.id} style={styles.cartItem}>
            <View style={styles.quantityBorder}>
              <View style={styles.scrollData}>
                <View style={styles.itemHeader}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('🖱️ [CartScreen.renderItem] Trash icon PRESSED');
                      console.log('🖱️ [CartScreen.renderItem] Product name:', item.product.name);
                      console.log('🖱️ [CartScreen.renderItem] Product ID:', item.product.id);
                      console.log('🖱️ [CartScreen.renderItem] Calling handleRemoveItem...');
                      handleRemoveItem(item.product.id);
                    }}
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
                {/* Show promotion badge if product has active promotion */}
                {item.product.promotion && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
                    <Ionicons name="pricetag" size={16} color={colors.errorText} />
                    <Text style={{ color: colors.errorText, fontWeight: 'bold', marginLeft: 4, fontSize: 13 }}>
                      {item.product.discount_percentage_value}% OFF
                    </Text>
                  </View>
                )}
                <Text style={styles.unitPriceDisplay}>
                  <Text style={styles.detailLabel}>Unit Price:</Text>{' '}
                  {item.product.promotion && (
                    <Text style={{ textDecorationLine: 'line-through', color: colors.textSecondary, marginRight: 8 }}>
                      {formatCurrency(parseFloat(item.product.price || '0'))}
                    </Text>
                  )}
                  <Text style={styles.unitPrice}>
                    {formatCurrency(parseFloat(item.product.display_price || item.product.price || '0'))}
                  </Text>
                </Text>
                <Text style={styles.lineTotalDisplay}>
                  <Text style={styles.detailLabel}>Line Total:</Text>{' '}
                  <Text style={styles.lineTotal}>
                    {formatCurrency((parseFloat(item.product.display_price || item.product.price || '0')) * item.quantity)}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        );
        }}
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
    marginBottom: 25,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
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
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
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
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 4,
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
    borderRadius: 4,
    padding: 12,
    marginTop: 12,
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
    fontWeight: '500',
  },
  cartSummaryValue: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  checkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    width: '100%',
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CartScreen;
