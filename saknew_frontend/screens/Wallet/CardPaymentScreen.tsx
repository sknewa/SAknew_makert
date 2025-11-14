import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../styles/globalStyles';
import BackButton from '../../components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/apiClient';

const CardPaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) {
      Alert.alert('Invalid Amount', 'Minimum deposit is R10');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/api/wallet/card-deposit/', { amount: amt });
      
      if (Platform.OS === 'web' && response.data.checkout_url) {
        window.open(response.data.checkout_url, '_blank');
        Alert.alert('Payment', 'Payment window opened. Complete payment to add funds.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Payment', 'Opening payment gateway...');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackButton />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="card" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Card Payment</Text>
          <Text style={styles.subtitle}>Pay securely with your debit or credit card</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Amount (R)</Text>
          <TextInput
            style={styles.input}
            placeholder="100.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor={colors.textSecondary}
          />
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>Minimum: R10 • Maximum: R10,000</Text>
          </View>
          
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handlePayment} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : (
              <>
                <Ionicons name="lock-closed" size={18} color={colors.white} />
                <Text style={styles.buttonText}>Pay Securely</Text>
              </>
            )}
          </TouchableOpacity>
          
          <View style={[styles.infoBox, { backgroundColor: '#E8F5E9', marginTop: 16 }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={styles.infoText}>Powered by Yoco. PCI-DSS compliant. Your card details are encrypted.</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 4, padding: 16, borderWidth: 1, borderColor: colors.border },
  inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: 16, fontSize: 14, backgroundColor: colors.card, color: colors.textPrimary },
  button: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 4, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  buttonDisabled: { opacity: 0.6 },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#E3F2FD', padding: 12, borderRadius: 4 },
  infoText: { flex: 1, fontSize: 11, color: colors.textPrimary },
});

export default CardPaymentScreen;
