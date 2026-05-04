import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../styles/globalStyles';
import BackButton from '../../components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/apiClient';

const QUICK_AMOUNTS = [50, 100, 200, 500];

const CardPaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

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

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) {
      Alert.alert('Invalid Amount', 'Minimum deposit is R10.');
      return;
    }
    if (amt > 10000) {
      Alert.alert('Invalid Amount', 'Maximum deposit is R10,000.');
      return;
    }

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
      console.log('💳 Processing direct payment...');
      
      const response = await apiClient.post('/api/wallet/deposit/', {
        amount: amt,
        card_number: cardNumber.replace(/\s/g, ''),
        card_expiry: cardExpiry,
        card_cvv: cardCvv,
        card_holder: cardName
      });
      
      console.log('💳 Payment response:', response.data);
      
      if (response.data.success) {
        Alert.alert(
          'Payment Successful!',
          `R${amt} has been added to your wallet. New balance: R${response.data.new_balance}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Payment Failed', response.data.message || 'Unable to process payment.');
      }
    } catch (err: any) {
      console.error('💳 Payment error:', err);
      Alert.alert('Payment Error', err?.response?.data?.message || err?.message || 'Failed to process payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <BackButton title="Add Funds via PayFast" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="card" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Deposit Funds</Text>
            <Text style={styles.subtitle}>Secure payment via PayFast — card, EFT & more</Text>
            <View style={styles.testBadge}>
              <Ionicons name="flask" size={16} color="#FF6B35" />
              <Text style={styles.testBadgeText}>TEST MODE - Use test cards</Text>
            </View>
          </View>

        <View style={styles.card}>
          <Text style={styles.label}>Amount (R)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor={colors.textSecondary}
          />

          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map(q => (
              <TouchableOpacity
                key={q}
                style={[styles.quickBtn, amount === String(q) && styles.quickBtnActive]}
                onPress={() => setAmount(String(q))}
              >
                <Text style={[styles.quickBtnText, amount === String(q) && styles.quickBtnTextActive]}>
                  R{q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Card Details</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Cardholder Name"
            value={cardName}
            onChangeText={setCardName}
            placeholderTextColor={colors.textSecondary}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Card Number"
            keyboardType="numeric"
            value={cardNumber}
            onChangeText={(text) => setCardNumber(formatCardNumber(text))}
            maxLength={19}
            placeholderTextColor={colors.textSecondary}
          />
          
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="MM/YY"
              keyboardType="numeric"
              value={cardExpiry}
              onChangeText={(text) => setCardExpiry(formatExpiry(text))}
              maxLength={5}
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="CVV"
              keyboardType="numeric"
              value={cardCvv}
              onChangeText={(text) => setCardCvv(text.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              secureTextEntry
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text style={styles.infoText}>Min: R10 · Max: R10,000</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleDeposit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="lock-closed" size={18} color="#fff" />
                <Text style={styles.buttonText}>Process Payment</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secureBox}>
            <Ionicons name="shield-checkmark" size={18} color={colors.success} />
            <Text style={styles.secureText}>
              Powered by PayFast. Your card details are processed securely. PCI-DSS compliant.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  testBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FF6B35' },
  testBadgeText: { fontSize: 11, fontWeight: '600', color: '#FF6B35' },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    padding: 14, fontSize: 18, fontWeight: '700', color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt, marginBottom: 12,
  },
  row: { flexDirection: 'row' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border,
  },
  quickBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  quickBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  quickBtnTextActive: { color: colors.primary, fontWeight: '700' },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.infoLight, padding: 10, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  infoText: { fontSize: 12, color: colors.info, flex: 1 },
  button: {
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secureBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.successLight, padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  secureText: { flex: 1, fontSize: 11, color: colors.success },
  testInfoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8, alignItems: 'flex-start' },
  testInfoText: { flex: 1, fontSize: 11, color: '#FF6B35', lineHeight: 16 },
  bold: { fontWeight: '700' },
});

export default CardPaymentScreen;
