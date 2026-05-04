import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import publicApiClient from '../../services/publicApiClient';
import { colors } from '../../styles/globalStyles';

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

const GuestWalletDepositScreen: React.FC = () => {
  const navigation = useNavigation();

  // Guest info
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [amount, setAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'success'>('details');

  const validateDetails = () => {
    if (!guestName.trim() || !guestEmail.trim()) {
      Alert.alert('Missing Info', 'Please fill in your name and email.');
      return false;
    }
    if (!guestEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) {
      Alert.alert('Invalid Amount', 'Minimum deposit is R10.');
      return false;
    }
    if (amt > 10000) {
      Alert.alert('Invalid Amount', 'Maximum deposit is R10,000.');
      return false;
    }
    return true;
  };

  const handleDeposit = async () => {
    if (!validateDetails()) return;

    setLoading(true);
    try {
      const response = await publicApiClient.post('/api/wallet/guest-deposit/', {
        guest_name: guestName,
        guest_email: guestEmail,
        amount: parseFloat(amount),
      });

      const { payfast_url, payment_data } = response.data;

      if (Platform.OS === 'web') {
        // Build and auto-submit a PayFast form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = payfast_url;
        Object.entries(payment_data).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      } else {
        Alert.alert(
          'Redirect to PayFast',
          'You will be redirected to PayFast to complete your payment.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to initiate payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name=\"arrow-back\" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Funds to Wallet</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name=\"information-circle\" size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              Add funds to your wallet without creating an account. After payment, we'll create your account and you can login to use your funds.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Your Details</Text>
          <TextInput 
            style={styles.input} 
            placeholder=\"Full Name *\" 
            value={guestName} 
            onChangeText={setGuestName} 
            placeholderTextColor={colors.textSecondary} 
          />
          <TextInput 
            style={styles.input} 
            placeholder=\"Email Address *\" 
            value={guestEmail} 
            onChangeText={setGuestEmail} 
            keyboardType=\"email-address\" 
            autoCapitalize=\"none\" 
            placeholderTextColor={colors.textSecondary} 
          />

          <Text style={styles.sectionTitle}>Amount to Add</Text>
          <TextInput
            style={styles.input}
            placeholder=\"Enter amount (R)\"
            value={amount}
            onChangeText={setAmount}
            keyboardType=\"numeric\"
            placeholderTextColor={colors.textSecondary}
          />

          <View style={styles.quickAmountsContainer}>
            <Text style={styles.quickAmountsLabel}>Quick amounts:</Text>
            <View style={styles.quickAmountsRow}>
              {QUICK_AMOUNTS.map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.quickAmountBtn, amount === String(amt) && styles.quickAmountBtnActive]}
                  onPress={() => setAmount(String(amt))}
                >
                  <Text style={[styles.quickAmountText, amount === String(amt) && styles.quickAmountTextActive]}>
                    R{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.testCard}>
            <View style={styles.testHeader}>
              <Ionicons name=\"flask\" size={18} color=\"#FF6B35\" />
              <Text style={styles.testTitle}>Test Mode - Use Test Cards</Text>
            </View>
            <Text style={styles.testCardInfo}>
              • Visa: 4000 0000 0000 0002{\"\\n\"}
              • Mastercard: 5200 0000 0000 0007{\"\\n\"}
              • CVV: Any 3 digits • Expiry: Any future date
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleDeposit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color=\"white\" />
            ) : (
              <>
                <Ionicons name=\"card\" size={18} color=\"white\" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Pay with PayFast</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secureNote}>
            <Ionicons name=\"shield-checkmark\" size={16} color={colors.success} />
            <Text style={styles.secureText}>
              Secure payment via PayFast. Your card details are never stored.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.loginPrompt}
            onPress={() => (navigation as any).navigate('Login')}
          >
            <Text style={styles.loginPromptText}>
              Already have an account? <Text style={styles.loginLink}>Login here</Text>
            </Text>
          </TouchableOpacity>
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
  content: { padding: 16, paddingBottom: 40 },
  
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.primaryLight, padding: 14, borderRadius: 8,
    marginBottom: 20, borderWidth: 1, borderColor: colors.primary + '30',
  },
  infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18 },
  
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, marginTop: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 14, color: colors.textPrimary, marginBottom: 10,
  },
  
  quickAmountsContainer: { marginVertical: 12 },
  quickAmountsLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' },
  quickAmountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAmountBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  quickAmountBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickAmountText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  quickAmountTextActive: { color: 'white' },
  
  testCard: {
    backgroundColor: '#FFF3E0', borderRadius: 8, padding: 12,
    marginVertical: 16, borderWidth: 1, borderColor: '#FF6B35',
  },
  testHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  testTitle: { fontSize: 13, fontWeight: '700', color: '#FF6B35' },
  testCardInfo: { fontSize: 11, color: '#FF6B35', lineHeight: 16 },
  
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 4, flexDirection: 'row', justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  
  secureNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginVertical: 12, gap: 6,
  },
  secureText: { fontSize: 12, color: colors.success, fontWeight: '500' },
  
  loginPrompt: { alignItems: 'center', marginTop: 16, padding: 8 },
  loginPromptText: { fontSize: 13, color: colors.textSecondary },
  loginLink: { color: colors.primary, fontWeight: '600' },
});

export default GuestWalletDepositScreen;