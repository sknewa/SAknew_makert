import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import colors from '../../theme/colors';
import { addFunds } from '../../services/walletService';
import { useBadges } from '../../context/BadgeContext';

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
      
      Alert.alert('Success', `R${amt.toFixed(2)} added successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setAmount(''); // Clear the input
    } catch (err: any) {
      console.error('Error adding funds:', err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.amount?.[0] || 'Could not add funds. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Funds</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter amount (R)"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <TouchableOpacity style={styles.button} onPress={handleAddFunds} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Add Funds</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 24, width: '100%', maxWidth: 320 },
  button: { backgroundColor: colors.buttonBg, padding: 16, borderRadius: 8, alignItems: 'center', minWidth: 160 },
  buttonText: { color: colors.buttonText, fontWeight: 'bold', fontSize: 16 },
});

export default AddFundsScreen;
