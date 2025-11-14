import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../styles/globalStyles';
import { addFunds } from '../../services/walletService';
import { useBadges } from '../../context/BadgeContext';
import BackButton from '../../components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { safeLog, safeError } from '../../utils/securityUtils';

const AddFundsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { refreshBadges } = useBadges();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleCardPayment = () => {
    navigation.navigate('CardPayment' as never);
  };

  const handleVoucherRedeem = () => {
    navigation.navigate('RedeemVoucher' as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackButton />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="wallet" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Add Funds</Text>
          <Text style={styles.subtitle}>Pay securely with card or EFT</Text>
        </View>
        
        <View style={styles.card}>
          <TouchableOpacity style={styles.button} onPress={handleCardPayment}>
            <Ionicons name="card" size={18} color={colors.white} />
            <Text style={styles.buttonText}>Pay with Card</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.success, marginTop: 12 }]} onPress={handleVoucherRedeem}>
            <Ionicons name="ticket" size={18} color={colors.white} />
            <Text style={styles.buttonText}>Redeem Voucher</Text>
          </TouchableOpacity>
          
          <View style={[styles.infoBox, { marginTop: 16 }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={styles.infoText}>Secure payments powered by Yoco. Your card details are never stored.</Text>
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
  iconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 4, padding: 16, borderWidth: 1, borderColor: colors.border },
  inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, marginBottom: 16, fontSize: 14, backgroundColor: colors.card, color: colors.textPrimary },
  button: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 4, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  buttonDisabled: { opacity: 0.6 },
  infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#E8F5E9', padding: 12, borderRadius: 4, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 11, color: colors.textPrimary },
});

export default AddFundsScreen;
