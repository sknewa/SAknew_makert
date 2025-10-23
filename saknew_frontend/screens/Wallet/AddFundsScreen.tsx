import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../styles/globalStyles';
import { addFunds } from '../../services/walletService';
import { useBadges } from '../../context/BadgeContext';
import BackButton from '../../components/BackButton';
import { Ionicons } from '@expo/vector-icons';

const AddFundsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { refreshBadges } = useBadges();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddFunds = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    setLoading(true);
    try {
      console.log('Adding funds:', amt);
      const result = await addFunds(amt);
      console.log('Funds added successfully:', result);
      
      // Refresh wallet balance in context
      await refreshBadges();
      console.log('Badges refreshed after adding funds');
      
      setAmount('');
      setLoading(false);
      
      if (typeof window !== 'undefined' && window.confirm) {
        window.alert(`Success: R${amt.toFixed(2)} added successfully!`);
      } else {
        Alert.alert('Success', `R${amt.toFixed(2)} added successfully!`);
      }
      
      setTimeout(() => {
        (navigation as any).navigate('WalletDashboard');
      }, 100);
    } catch (err: any) {
      console.error('Error adding funds:', err);
      
      // Handle different error types
      let errorMessage = 'Could not add funds. Please try again.';
      
      if (!err.response && err.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.amount?.[0]) {
        errorMessage = err.response.data.amount[0];
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Safely show alert
      try {
        Alert.alert('Error Adding Funds', errorMessage, [{ text: 'OK' }]);
      } catch (alertError) {
        console.error('Failed to show alert:', alertError);
      }
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
            <Ionicons name="wallet" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Add Funds</Text>
          <Text style={styles.subtitle}>Enter amount to add to your wallet</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Amount (R)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAddFunds} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : (
              <>
                <Ionicons name="add-circle" size={18} color={colors.white} />
                <Text style={styles.buttonText}>Add Funds</Text>
              </>
            )}
          </TouchableOpacity>
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
});

export default AddFundsScreen;
