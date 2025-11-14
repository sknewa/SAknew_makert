import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../styles/globalStyles';
import BackButton from '../../components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/apiClient';

const RedeemVoucherScreen: React.FC = () => {
  const navigation = useNavigation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      Alert.alert('Invalid Code', 'Please enter a voucher code.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiClient.post('/api/wallet/redeem-voucher/', { code: code.trim().toUpperCase() });
      Alert.alert('Success', `R${response.data.amount} added to your wallet!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Invalid voucher code');
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
            <Ionicons name="ticket" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Redeem Voucher</Text>
          <Text style={styles.subtitle}>Enter your voucher code below</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Voucher Code</Text>
          <TextInput
            style={styles.input}
            placeholder="XXXX-XXXX-XXXX"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            placeholderTextColor={colors.textSecondary}
          />
          
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRedeem} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} /> : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                <Text style={styles.buttonText}>Redeem</Text>
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

export default RedeemVoucherScreen;
