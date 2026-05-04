import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Image, Alert,
  RefreshControl, Platform, Animated,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { salesService } from '../../services/apiService';
import { Cart, CartItem } from '../../services/salesService';
import {
  getGuestCart, updateGuestCartItem, removeFromGuestCart,
  clearGuestCart, getGuestCartTotal, GuestCartItem,
} from '../../services/guestCartService';
import { MainNavigationProp } from '../../navigation/types';
import { useBadges } from '../../context/BadgeContext';
import { useAuth } from '../../context/AuthContext';

// ── palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:          '#F0F0EE',
  card:        '#FFFFFF',
  border:      '#EBEBEB',
  primary:     '#059669',
  primaryDark: '#047857',
  danger:      '#EF4444',
  text:        '#111827',
  sub:         '#6B7280',
  muted:       '#9CA3AF',
  accent:      '#F59E0B',
  purple:      '#6366F1',
  shadow:      '#000',
};

// ── haversine distance ────────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
}

// ── animated 3D card ──────────────────────────────────────────────────────────
const CartCard = ({
  item, onRemove, onQtyChange, userLocation,
}: {
  item: any;
  onRemove: () => void;
  onQtyChange: (n: number) => void;
  userLocation: { latitude: number; longitude: number } | null;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const price  = parseFloat(item.product.display_price || item.product.price || '0');
  const total  = price * item.quantity;
  const hasPromo = !!item.product.promotion;

  // distance
  let distLabel: string | null = null;
  const sLat = parseFloat(item.product.shop_latitude);
  const sLon = parseFloat(item.product.shop_longitude);
  if (userLocation && !isNaN(sLat) && !isNaN(sLon)) {
    distLabel = haversine(userLocation.latitude, userLocation.longitude, sLat, sLon);
  }

  return (
    <Animated.View style={[styles.cardOuter, { transform: [{ scale }] }]}>
      {/* 3D depth layer */}
      <View style={styles.cardShadowLayer} />
      <View style={styles.cardShadowLayer2} />

      <View style={styles.card}>
        {/* left — image */}
        <View style={styles.imgWrap}>
          <Image
            source={{ uri: item.product.main_image_url || 'https://placehold.co/90x90/E5E7EB/9CA3AF?text=?' }}
            style={styles.img}
          />
          {hasPromo && (
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>{item.product.promotion.discount_percentage}%</Text>
            </View>
          )}
        </View>

        {/* right — info */}
        <View style={styles.cardBody}>
          {/* name + delete */}
          <View style={styles.nameRow}>
            <Text style={styles.productName} numberOfLines={2}>{item.product.name}</Text>
            <TouchableOpacity onPress={onRemove} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={17} color={C.danger} />
            </TouchableOpacity>
          </View>

          {/* shop + distance */}
          <View style={styles.metaRow}>
            <Ionicons name="storefront-outline" size={11} color={C.muted} />
            <Text style={styles.metaText} numberOfLines={1}>{item.product.shop_name}</Text>
            {distLabel ? (
              <>
                <View style={styles.metaDot} />
                <Ionicons name="location-outline" size={11} color={C.primary} />
                <Text style={[styles.metaText, { color: C.primary, fontWeight: '700' }]}>{distLabel}</Text>
              </>
            ) : null}
          </View>

          {/* size */}
          {item.size ? (
            <View style={styles.sizeChip}>
              <Text style={styles.sizeChipText}>Size: {item.size}</Text>
            </View>
          ) : null}

          {/* price row */}
          <View style={styles.priceQtyRow}>
            <View>
              <Text style={styles.priceMain}>R{price.toFixed(2)}</Text>
              {hasPromo && item.product.price !== item.product.display_price && (
                <Text style={styles.priceOld}>R{parseFloat(item.product.price).toFixed(2)}</Text>
              )}
            </View>

            {/* qty stepper */}
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepBtn, item.quantity <= 1 && styles.stepBtnDisabled]}
                onPress={() => { press(); onQtyChange(item.quantity - 1); }}
                disabled={item.quantity <= 1}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepCount}>{item.quantity}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => { press(); onQtyChange(item.quantity + 1); }}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* line total */}
          <Text style={styles.lineTotal}>Subtotal: <Text style={styles.lineTotalVal}>R{total.toFixed(2)}</Text></Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ── main screen ───────────────────────────────────────────────────────────────
const CartScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const route = useRoute();
  const fromShopSlug = (route.params as any)?.fromShopSlug as string | undefined;
  const { refreshBadges } = useBadges();
  const { isAuthenticated } = useAuth();

  const [cart, setCart]           = useState<Cart | null>(null);
  const [guestCart, setGuestCart] = useState<GuestCartItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // get user location once
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (_) {}
    })();
  }, []);

  const fetchCart = useCallback(async () => {
    if (!cart && !guestCart.length) setLoading(true);
    try {
      if (isAuthenticated) {
        setCart(await salesService.getMyCart());
      } else {
        setGuestCart(await getGuestCart());
      }
      await refreshBadges();
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, [isAuthenticated]);

  useEffect(() => { fetchCart(); }, []);
  useFocusEffect(useCallback(() => { fetchCart(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchCart(); };

  const handleRemove = async (productId: number, size?: string) => {
    const confirm = typeof window !== 'undefined' && (window as any).confirm
      ? (window as any).confirm('Remove this item?')
      : await new Promise<boolean>(res =>
          Alert.alert('Remove Item', 'Remove this item from your cart?', [
            { text: 'Cancel', onPress: () => res(false), style: 'cancel' },
            { text: 'Remove', onPress: () => res(true), style: 'destructive' },
          ])
        );
    if (!confirm) return;
    if (isAuthenticated) await salesService.removeCartItem(productId);
    else await removeFromGuestCart(productId, size);
    fetchCart();
  };

  const handleQty = async (productId: number, qty: number, size?: string) => {
    if (qty <= 0) return handleRemove(productId, size);
    if (isAuthenticated) await salesService.updateCartItemQuantity(productId, qty);
    else await updateGuestCartItem(productId, qty, size);
    fetchCart();
  };

  const handleClear = async () => {
    const confirm = typeof window !== 'undefined' && (window as any).confirm
      ? (window as any).confirm('Clear entire cart?')
      : await new Promise<boolean>(res =>
          Alert.alert('Clear Cart', 'Remove all items?', [
            { text: 'Cancel', onPress: () => res(false), style: 'cancel' },
            { text: 'Clear All', onPress: () => res(true), style: 'destructive' },
          ])
        );
    if (!confirm) return;
    if (isAuthenticated) await salesService.clearCart();
    else await clearGuestCart();
    fetchCart();
  };

  const goBack = () => {
    if (fromShopSlug) navigation.navigate('PublicShop', { shopSlug: fromShopSlug });
    else navigation.goBack();
  };

  // normalise items
  const items: any[] = isAuthenticated
    ? (cart?.items ?? [])
    : guestCart.map((g, i) => ({ ...g, id: i, product_id: g.product.id }));

  const subtotal = isAuthenticated
    ? parseFloat(cart?.total ?? '0')
    : getGuestCartTotal(guestCart);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const hasItems = items.length > 0;

  // ── render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centred}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading cart…</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Cart</Text>
          {totalItems > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalItems}</Text>
            </View>
          )}
        </View>
        {hasItems ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={16} color={C.danger} />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item: any) => `${item.product?.id}-${item.size ?? ''}`}
        renderItem={({ item }) => (
          <CartCard
            item={item}
            userLocation={userLocation}
            onRemove={() => handleRemove(item.product.id, item.size)}
            onQtyChange={(n) => handleQty(item.product.id, n, item.size)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="cart-outline" size={72} color={C.muted} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Browse the market and add items you love</Text>
            <TouchableOpacity style={styles.shopNowBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}>
              <Text style={styles.shopNowText}>Browse Market</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={hasItems ? (
          <View style={styles.summaryCard}>
            {/* summary rows */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({totalItems})</Text>
              <Text style={styles.summaryValue}>R{subtotal.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>R{subtotal.toFixed(2)}</Text>
            </View>

            {/* checkout buttons */}
            {isAuthenticated ? (
              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={() => {
                  if (!cart?.items.length) return;
                  navigation.navigate('Shipping');
                }}
                disabled={checkoutLoading}
              >
                <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.checkoutGradient}>
                  {checkoutLoading
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="lock-closed" size={16} color="#fff" />
                        <Text style={styles.checkoutBtnText}>Checkout Securely</Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.checkoutBtn}
                  onPress={() => (navigation as any).navigate('GuestCheckout', { cartItems: guestCart, cartTotal: subtotal.toFixed(2) })}
                >
                  <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.checkoutGradient}>
                    <Ionicons name="card" size={16} color="#fff" />
                    <Text style={styles.checkoutBtnText}>Checkout as Guest</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.checkoutBtn, { marginTop: 10 }]}
                  onPress={() => navigation.navigate('Login' as any)}
                >
                  <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.checkoutGradient}>
                    <Ionicons name="log-in" size={16} color="#fff" />
                    <Text style={styles.checkoutBtnText}>Login to Checkout</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}
      />
    </SafeAreaView>
  );
};

// ── styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: C.bg },
  centred:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.sub, fontFamily: 'Inter-Regular' },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...Platform.select({
      ios:     { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  backBtn:       { padding: 4, width: 36 },
  headerCenter:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontFamily: 'Poppins-SemiBold', color: C.text },
  headerBadge:   { backgroundColor: C.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  headerBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter-Bold' },
  clearBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.danger, width: 60 },
  clearBtnText:  { color: C.danger, fontSize: 11, fontFamily: 'Inter-SemiBold' },

  // list
  listContent: { padding: 14, paddingBottom: 40 },

  // 3D card
  cardOuter: { marginBottom: 16 },
  cardShadowLayer: {
    position: 'absolute', bottom: -5, left: 4, right: 4,
    height: '100%', borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  cardShadowLayer2: {
    position: 'absolute', bottom: -9, left: 8, right: 8,
    height: '100%', borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios:     { shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },

  // image
  imgWrap: { position: 'relative', width: 90, height: 90 },
  img: {
    width: 90, height: 90, borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  promoBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: C.danger, borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  promoBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter-Bold' },

  // body
  cardBody:  { flex: 1, justifyContent: 'space-between' },
  nameRow:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  productName: { flex: 1, fontSize: 13, fontFamily: 'Poppins-SemiBold', color: C.text, lineHeight: 18 },
  deleteBtn: { padding: 2 },

  metaRow:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, flexWrap: 'wrap' },
  metaText:  { fontSize: 10, fontFamily: 'Inter-Regular', color: C.muted },
  metaDot:   { width: 3, height: 3, borderRadius: 2, backgroundColor: C.muted },

  sizeChip:  { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  sizeChipText: { fontSize: 10, fontFamily: 'Inter-Medium', color: C.sub },

  priceQtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  priceMain:   { fontSize: 16, fontFamily: 'Poppins-Bold', color: C.text },
  priceOld:    { fontSize: 10, fontFamily: 'Inter-Regular', color: C.danger, textDecorationLine: 'line-through' },

  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  stepBtn:         { paddingHorizontal: 10, paddingVertical: 6 },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText:     { fontSize: 16, fontFamily: 'Inter-Bold', color: C.text },
  stepCount:       { fontSize: 13, fontFamily: 'Inter-Bold', color: C.text, paddingHorizontal: 8 },

  lineTotal:    { fontSize: 11, fontFamily: 'Inter-Regular', color: C.sub, marginTop: 4 },
  lineTotalVal: { fontFamily: 'Inter-Bold', color: C.primary },

  // empty
  emptyBox:   { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontFamily: 'Poppins-SemiBold', color: C.text, marginTop: 16, marginBottom: 6 },
  emptySub:   { fontSize: 13, fontFamily: 'Inter-Regular', color: C.sub, textAlign: 'center', lineHeight: 20 },
  shopNowBtn: { marginTop: 20, backgroundColor: C.primary, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 24 },
  shopNowText:{ color: '#fff', fontSize: 14, fontFamily: 'Poppins-SemiBold' },

  // summary
  summaryCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 20,
    marginTop: 8,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios:     { shadowColor: C.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 5 },
    }),
  },
  summaryRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel:     { fontSize: 13, fontFamily: 'Inter-Regular', color: C.sub },
  summaryValue:     { fontSize: 14, fontFamily: 'Inter-SemiBold', color: C.text },
  summaryTotalRow:  { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 4 },
  summaryTotalLabel:{ fontSize: 15, fontFamily: 'Poppins-SemiBold', color: C.text },
  summaryTotalValue:{ fontSize: 20, fontFamily: 'Poppins-Bold', color: C.primary },

  checkoutBtn:      { borderRadius: 14, overflow: 'hidden', marginTop: 14 },
  checkoutGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  checkoutBtnText:  { color: '#fff', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
});

export default CartScreen;
