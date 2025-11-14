import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../styles/globalStyles';

const WithdrawScreen: React.FC = () => {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    if (!amount || !bankName || !accountNumber || !accountHolder) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 100) {
      Alert.alert('Error', 'Minimum withdrawal is R100');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch('https://saknew-makert-e7ac1361decc.herokuapp.com/api/wallet/withdraw/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          bank_name: bankName,
          bank_account: accountNumber,
          account_holder: accountHolder,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', data.detail || 'Withdrawal request submitted successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', data.detail || 'Withdrawal failed');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to process withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Withdraw Funds</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Amount (R)</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum R100"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. FNB, Standard Bank"
            value={bankName}
            onChangeText={setBankName}
          />

          <Text style={styles.label}>Account Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter account number"
            keyboardType="numeric"
            value={accountNumber}
            onChangeText={setAccountNumber}
          />

          <Text style={styles.label}>Account Holder Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name as per bank"
            value={accountHolder}
            onChangeText={setAccountHolder}
          />

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.infoAction} />
            <Text style={styles.infoText}>
              Withdrawals are processed within 2-3 business days
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleWithdraw}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Submit Withdrawal</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  form: { backgroundColor: colors.card, padding: 16, borderRadius: 4 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});

export default WithdrawScreen;
