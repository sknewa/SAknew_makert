import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import publicApiClient from '../../services/publicApiClient';
import { colors } from '../../styles/globalStyles';

interface OrderReceipt {
  order_id: string;
  total: string;
  delivery_code: string;
  guest_email: string;
  items: any[];
  address: string;
  guest_name: string;
}

const GuestCheckoutScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { cartItems, cartTotal } = (route.params as any) || {};

  // Guest info
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Shipping
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('South Africa');

  // Card
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'payment' | 'receipt'>('details');
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
  };

  const handleUseLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to auto-fill your address.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.coords.latitude}&lon=${location.coords.longitude}&addressdetails=1`,
        { headers: { 'User-Agent': 'SAknewMarketApp/1.0' } }
      );
      const data = await response.json();
      if (data?.address) {
        const addr = data.address;
        const streetParts = [addr.house_number, addr.road].filter(Boolean);
        setStreet(streetParts.join(' ') || addr.display_name?.split(',')[0] || '');
        setCity(addr.city || addr.town || addr.village || addr.suburb || '');
        setProvince(addr.state || '');
        setCountry(addr.country || 'South Africa');
        setPostalCode(addr.postcode || '');
        Alert.alert('✅ Location Found', 'Address filled from your location!');
      }
    } catch {
      Alert.alert('Error', 'Could not get location. Please enter manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const validateDetails = () => {
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      Alert.alert('Missing Info', 'Please fill in your name, email and phone.');
      return false;
    }
    if (!guestEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    if (!street.trim() || !city.trim()) {
      Alert.alert('Missing Address', 'Please fill in your street and city.');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    // Validate card details
    if (!cardName.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      Alert.alert('Missing Details', 'Please fill in all card details.');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Invalid Card', 'Please enter a valid card number.');
      return;
    }

    if (cardExpiry.length < 5) {
      Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY).');
      return;
    }

    if (cardCvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV.');
      return;
    }

    setLoading(true);
    try {
      const items = cartItems.map((item: any) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      // Process direct payment for guest checkout
      const response = await publicApiClient.post('/api/guest-checkout-simple/', {
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        shipping_address: {
          full_name: guestName,
          address_line1: street,
          city,
          state_province: province,
          postal_code: postalCode,
          country,
          phone_number: guestPhone,
        },
        items,
        total_amount: total,
        card_number: cardNumber.replace(/\s/g, ''),
        card_expiry: cardExpiry,
        card_cvv: cardCvv,
        card_holder: cardName,
      });

      const data = response.data;
      if (data.success) {
        setReceipt({
          order_id: data.order_id,
          total: data.total,
          delivery_code: data.delivery_code,
          guest_email: data.guest_email,
          items: cartItems,
          address: `${street}, ${city}${province ? ', ' + province : ''}, ${country}`,
          guest_name: guestName,
        });
        setStep('receipt');
      } else {
        Alert.alert('Payment Failed', data.message || 'Unable to process payment.');
      }
    } catch (err: any) {
      Alert.alert('Order Failed', err?.response?.data?.message || err?.message || 'Could not place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const total = cartTotal ? parseFloat(cartTotal).toFixed(2) : '0.00';

  // ── Receipt Screen ────────────────────────────────────────────────────────
  if (step === 'receipt' && receipt) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.receiptContent}>
          {/* Success Banner */}
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={styles.successTitle}>Order Placed!</Text>
            <Text style={styles.successSub}>A receipt has been sent to {receipt.guest_email}</Text>
          </View>

          {/* Order Reference */}
          <View style={styles.receiptCard}>
            <Text style={styles.receiptCardTitle}>Order Reference</Text>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Order ID</Text>
              <Text style={styles.receiptValue}>#{receipt.order_id}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Total Paid</Text>
              <Text style={[styles.receiptValue, { color: '#10B981', fontWeight: '800' }]}>R{receipt.total}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Customer</Text>
              <Text style={styles.receiptValue}>{receipt.guest_name}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Email</Text>
              <Text style={styles.receiptValue}>{receipt.guest_email}</Text>
            </View>
          </View>

          {/* Delivery Code */}
          <View style={[styles.receiptCard, { backgroundColor: '#FFF9E6', borderColor: '#F59E0B' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="key" size={18} color="#F59E0B" />
              <Text style={[styles.receiptCardTitle, { color: '#92400E', marginLeft: 6 }]}>Delivery Code</Text>
            </View>
            <Text style={styles.deliveryCode}>{receipt.delivery_code}</Text>
            <Text style={styles.deliveryCodeNote}>
              Keep this code safe. Give it to the seller when they deliver your order to confirm receipt and release payment.
            </Text>
          </View>

          {/* Items */}
          <View style={styles.receiptCard}>
            <Text style={styles.receiptCardTitle}>Items Ordered</Text>
            {receipt.items.map((item: any, i: number) => (
              <View key={i} style={styles.receiptRow}>
                <Text style={styles.receiptLabel} numberOfLines={1}>{item.product.name} × {item.quantity}</Text>
                <Text style={styles.receiptValue}>R{(parseFloat(item.product.display_price || item.product.price) * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Delivery Address */}
          <View style={styles.receiptCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={[styles.receiptCardTitle, { marginLeft: 6 }]}>Delivery Address</Text>
            </View>
            <Text style={styles.addressText}>{receipt.address}</Text>
          </View>

          {/* Order Tracking Info */}
          <View style={[styles.receiptCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="information-circle" size={18} color="#3B82F6" />
              <Text style={[styles.receiptCardTitle, { color: '#1E40AF', marginLeft: 6 }]}>How to Track Your Order</Text>
            </View>
            {[
              { icon: 'mail', text: `Check your email at ${receipt.guest_email} for updates from the seller` },
              { icon: 'call', text: 'The seller will contact you on the phone number you provided' },
              { icon: 'key', text: `When your order arrives, give the seller your delivery code: ${receipt.delivery_code}` },
              { icon: 'checkmark-circle', text: 'Once the code is confirmed, payment is released to the seller' },
            ].map((step, i) => (
              <View key={i} style={styles.trackingStep}>
                <View style={styles.trackingIcon}>
                  <Ionicons name={step.icon as any} size={14} color="#3B82F6" />
                </View>
                <Text style={styles.trackingText}>{step.text}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => (navigation as any).navigate('MainTabs')}
          >
            <Ionicons name="home" size={18} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Continue Shopping</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#6366F1', marginTop: 10 }]}
            onPress={() => (navigation as any).navigate('Login')}
          >
            <Ionicons name="person-add" size={18} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Create Account to Track Orders</Text>
          </TouchableOpacity>

          <Text style={styles.receiptFooter}>
            Order #{receipt.order_id} • SAknew Market
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Checkout Form ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Guest Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <TouchableOpacity style={[styles.stepBtn, step === 'details' && styles.stepBtnActive]} onPress={() => setStep('details')}>
            <Text style={[styles.stepText, step === 'details' && styles.stepTextActive]}>1. Your Details</Text>
          </TouchableOpacity>
          <View style={styles.stepDivider} />
          <TouchableOpacity style={[styles.stepBtn, step === 'payment' && styles.stepBtnActive]} onPress={() => validateDetails() && setStep('payment')}>
            <Text style={[styles.stepText, step === 'payment' && styles.stepTextActive]}>2. Bank Payment</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'details' ? (
            <>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <TextInput style={styles.input} placeholder="Full Name *" value={guestName} onChangeText={setGuestName} placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="Email Address *" value={guestEmail} onChangeText={setGuestEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} placeholder="Phone Number *" value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" placeholderTextColor={colors.textSecondary} />

              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Delivery Address</Text>
                <TouchableOpacity style={styles.locationBtn} onPress={handleUseLocation} disabled={locationLoading}>
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="navigate" size={14} color="white" />
                  )}
                  <Text style={styles.locationBtnText}>{locationLoading ? 'Getting...' : 'Use My Location'}</Text>
                </TouchableOpacity>
              </View>

              <TextInput style={styles.input} placeholder="Street Address *" value={street} onChangeText={setStreet} placeholderTextColor={colors.textSecondary} />
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="City *" value={city} onChangeText={setCity} placeholderTextColor={colors.textSecondary} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Province" value={province} onChangeText={setProvince} placeholderTextColor={colors.textSecondary} />
              </View>
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Postal Code" value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Country" value={country} onChangeText={setCountry} placeholderTextColor={colors.textSecondary} />
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Order Total</Text>
                <Text style={styles.totalAmount}>R{total}</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={() => validateDetails() && setStep('payment')}>
                <Text style={styles.primaryBtnText}>Continue to Payment →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.paymentPreview}>
                <Ionicons name="card" size={32} color="#6366F1" />
                <Text style={styles.paymentPreviewText}>Secure Card Payment</Text>
                <Text style={styles.paymentPreviewSub}>Enter your card details to complete payment</Text>
              </View>

              <Text style={styles.sectionTitle}>Card Details</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Cardholder Name *"
                value={cardName}
                onChangeText={setCardName}
                placeholderTextColor={colors.textSecondary}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Card Number *"
                keyboardType="numeric"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                maxLength={19}
                placeholderTextColor={colors.textSecondary}
              />
              
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="MM/YY *"
                  keyboardType="numeric"
                  value={cardExpiry}
                  onChangeText={(text) => setCardExpiry(formatExpiry(text))}
                  maxLength={5}
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="CVV *"
                  keyboardType="numeric"
                  value={cardCvv}
                  onChangeText={(text) => setCardCvv(text.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  secureTextEntry
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Amount to Pay</Text>
                <Text style={styles.totalAmount}>R{total}</Text>
              </View>

              <View style={styles.secureNote}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.secureText}>Powered by PayFast • PCI-DSS Compliant • Bank-level Security</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#6366F1' }, loading && { opacity: 0.6 }]}
                onPress={handlePlaceOrder}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={18} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Pay R{total} Securely</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.backStepBtn} onPress={() => setStep('details')}>
                <Text style={styles.backStepText}>← Back to Details</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stepBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  stepBtnActive: { backgroundColor: colors.primary + '15' },
  stepText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  stepTextActive: { color: colors.primary, fontWeight: '700' },
  stepDivider: { width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 8 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, marginTop: 6 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 6 },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  locationBtnText: { color: 'white', fontSize: 11, fontWeight: '600' },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 14, color: colors.textPrimary, marginBottom: 10,
  },
  row: { flexDirection: 'row' },
  totalBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 8, padding: 14,
    marginVertical: 12, borderWidth: 1, borderColor: colors.border,
  },
  totalLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  totalAmount: { fontSize: 20, fontWeight: '800', color: '#111' },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 4, flexDirection: 'row', justifyContent: 'center',
  },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  paymentPreview: {
    alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 12,
    padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#C7D2FE',
  },
  paymentPreviewText: { fontSize: 16, fontWeight: '700', color: '#4338CA', marginTop: 8 },
  paymentPreviewSub: { fontSize: 12, color: '#6366F1', marginTop: 4, textAlign: 'center' },
  secureNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginVertical: 10, gap: 6,
  },
  secureText: { fontSize: 12, color: '#10B981', fontWeight: '500' },
  backStepBtn: { alignItems: 'center', marginTop: 12, padding: 8 },
  backStepText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

  // Receipt styles
  receiptContent: { padding: 16, paddingBottom: 40 },
  successBanner: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#10B981', marginTop: 8 },
  successSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  receiptCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  receiptCardTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  receiptLabel: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  receiptValue: { fontSize: 12, color: colors.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1 },
  deliveryCode: {
    fontSize: 28, fontWeight: '900', color: '#92400E',
    textAlign: 'center', letterSpacing: 4, marginVertical: 8,
    backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8,
  },
  deliveryCodeNote: { fontSize: 11, color: '#92400E', textAlign: 'center', lineHeight: 16, marginTop: 4 },
  addressText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
  trackingStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  trackingIcon: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center',
    marginRight: 10, marginTop: 1,
  },
  trackingText: { fontSize: 12, color: '#1E40AF', flex: 1, lineHeight: 18 },
  receiptFooter: {
    textAlign: 'center', fontSize: 11, color: colors.textSecondary,
    marginTop: 20, marginBottom: 10,
  },
});

export default GuestCheckoutScreen;