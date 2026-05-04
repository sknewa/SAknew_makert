import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainNavigationProp } from '../../navigation/types';
import BackButton from '../../components/BackButton';
import apiClient from '../../services/apiClient';
import { useBadges } from '../../context/BadgeContext';

const SA = {
  green: '#007A4D',
  blue:  '#002395',
  red:   '#DE3831',
  gold:  '#FFB81C',
  black: '#111111',
  white: '#FFFFFF',
};

const QUICK_AMOUNTS = [50, 100, 200, 500];

const AddFundsScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const { refreshBadges } = useBadges();

  const [amount, setAmount]       = useState('');
  const [cardName, setCardName]   = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv]     = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    return cleaned.length >= 2 ? cleaned.slice(0, 2) + '/' + cleaned.slice(2) : cleaned;
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10)  { Alert.alert('Invalid Amount', 'Minimum deposit is R10.'); return; }
    if (amt > 10000)              { Alert.alert('Invalid Amount', 'Maximum deposit is R10,000.'); return; }
    if (!cardName.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      Alert.alert('Missing Details', 'Please fill in all card details.'); return;
    }
    if (cardNumber.replace(/\s/g, '').length < 13) { Alert.alert('Invalid Card', 'Please enter a valid card number.'); return; }
    if (cardExpiry.length < 5)   { Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY).'); return; }
    if (cardCvv.length < 3)      { Alert.alert('Invalid CVV', 'Please enter a valid CVV.'); return; }

    setLoading(true);
    try {
      const response = await apiClient.post('/api/wallet/card-deposit/', {
        amount: amt,
        card_number: cardNumber.replace(/\s/g, ''),
        card_expiry: cardExpiry,
        card_cvv: cardCvv,
        card_holder: cardName,
      });

      if (response.data.success) {
        await refreshBadges();
        Alert.alert(
          'Payment Successful! 🎉',
          `R${amt.toFixed(2)} has been added to your wallet.\nNew balance: R${response.data.new_balance}`,
          [{ text: 'OK', onPress: () => navigation.navigate('MainTabs' as any, { screen: 'WalletTab' } as any) }]
        );
      } else {
        Alert.alert('Payment Failed', response.data.message || 'Unable to process payment.');
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err?.response?.data?.message || err?.message || 'Failed to process payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <BackButton title="Add Funds" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="card" size={32} color={SA.blue} />
            </View>
            <Text style={styles.title}>Add Funds</Text>
            <Text style={styles.subtitle}>Secure payment via PayFast — card, EFT & more</Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>

            {/* Amount Section */}
            <Text style={styles.sectionLabel}>Amount (R)</Text>
            <TextInput
              style={inputStyle('amount')}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor="#999"
              onFocus={() => setFocusedField('amount')}
              onBlur={() => setFocusedField(null)}
            />
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map(q => {
                const active = amount === String(q);
                return (
                  <TouchableOpacity
                    key={q}
                    style={[styles.quickBtn, active && styles.quickBtnActive]}
                    onPress={() => setAmount(String(q))}
                  >
                    <Text style={[styles.quickBtnText, active && styles.quickBtnTextActive]}>R{q}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Card Details Section */}
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Card Details</Text>

            <TextInput
              style={inputStyle('cardName')}
              placeholder="Cardholder Name"
              value={cardName}
              onChangeText={setCardName}
              placeholderTextColor="#999"
              onFocus={() => setFocusedField('cardName')}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={inputStyle('cardNumber')}
              placeholder="Card Number"
              keyboardType="numeric"
              value={cardNumber}
              onChangeText={t => setCardNumber(formatCardNumber(t))}
              maxLength={19}
              placeholderTextColor="#999"
              onFocus={() => setFocusedField('cardNumber')}
              onBlur={() => setFocusedField(null)}
            />
            <View style={styles.row}>
              <TextInput
                style={[inputStyle('expiry'), { flex: 1, marginRight: 8 }]}
                placeholder="MM/YY"
                keyboardType="numeric"
                value={cardExpiry}
                onChangeText={t => setCardExpiry(formatExpiry(t))}
                maxLength={5}
                placeholderTextColor="#999"
                onFocus={() => setFocusedField('expiry')}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[inputStyle('cvv'), { flex: 1 }]}
                placeholder="CVV"
                keyboardType="numeric"
                value={cardCvv}
                onChangeText={t => setCardCvv(t.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                secureTextEntry
                placeholderTextColor="#999"
                onFocus={() => setFocusedField('cvv')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color={SA.gold} />
              <Text style={styles.infoText}>Min: R10 · Max: R10,000</Text>
            </View>

            {/* Primary CTA */}
            <TouchableOpacity
              style={[styles.payButton, loading && styles.buttonDisabled]}
              onPress={handleDeposit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="lock-closed" size={18} color="#fff" />
                  <Text style={styles.payButtonText}>Process Payment</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Voucher option */}
            <TouchableOpacity
              style={styles.voucherButton}
              onPress={() => navigation.navigate('RedeemVoucher' as never)}
            >
              <Ionicons name="ticket-outline" size={16} color={SA.blue} />
              <Text style={styles.voucherButtonText}>Redeem a Voucher Instead</Text>
            </TouchableOpacity>

            {/* Trust footer */}
            <View style={styles.secureBox}>
              <Ionicons name="shield-checkmark" size={16} color={SA.green} />
              <Text style={styles.secureText}>
                Powered by PayFast · PCI-DSS Compliant · Visa · Mastercard
              </Text>
            </View>

            {/* SA flag ribbon */}
            <View style={styles.flagRibbon}>
              {[SA.green, SA.black, SA.red, SA.gold, SA.blue, SA.white].map((c, i) => (
                <View key={i} style={[styles.flagSegment, { backgroundColor: c }]} />
              ))}
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { padding: 16, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 20 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#E8EEFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  title: { fontSize: 22, fontWeight: '800', color: SA.black, marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#E0E0E0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 8 },

  input: {
    borderWidth: 1, borderColor: '#D0D0D0', borderRadius: 10,
    padding: 13, fontSize: 15, fontWeight: '600', color: SA.black,
    backgroundColor: '#FAFAFA', marginBottom: 10,
  },
  inputFocused: { borderColor: SA.blue, borderWidth: 1.5, backgroundColor: '#F0F4FF' },

  row: { flexDirection: 'row' },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#D0D0D0',
  },
  quickBtnActive: { backgroundColor: '#FFF8E1', borderColor: SA.gold },
  quickBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  quickBtnTextActive: { color: '#B8860B', fontWeight: '800' },

  infoBox: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FFFDF0',
    padding: 10, borderRadius: 8, marginBottom: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#FFE082',
  },
  infoText: { fontSize: 12, color: '#7A6000', flex: 1, fontWeight: '500' },

  payButton: {
    backgroundColor: SA.green, paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
    gap: 8, marginBottom: 12,
    shadowColor: SA.green, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  payButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  buttonDisabled: { opacity: 0.6 },

  voucherButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: SA.blue, marginBottom: 16,
    backgroundColor: '#F0F4FF',
  },
  voucherButtonText: { color: SA.blue, fontWeight: '700', fontSize: 13 },

  secureBox: {
    flexDirection: 'row', gap: 8, backgroundColor: '#F0FBF5',
    padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12,
  },
  secureText: { flex: 1, fontSize: 11, color: '#2D6A4F', fontWeight: '500' },

  flagRibbon: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  flagSegment: { flex: 1 },
});

export default AddFundsScreen;
