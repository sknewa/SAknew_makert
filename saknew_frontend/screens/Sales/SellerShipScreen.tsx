import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { updateOrderStatus } from '../../services/salesService';
import colors from '../../theme/colors';

const SellerShipScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = route.params as { orderId: string };
  
  const [deliveryCode, setDeliveryCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMarkShipped = async () => {
    if (!deliveryCode.trim()) {
      Alert.alert('Error', 'Please enter the delivery code provided by the buyer');
      return;
    }

    setLoading(true);
    try {
      await updateOrderStatus(orderId, 'mark_shipped', deliveryCode.trim());
      Alert.alert(
        'Order Shipped!',
        'Order marked as shipped successfully! You will receive payment when buyer confirms delivery.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to mark order as shipped'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mark Order as Shipped</Text>
      <Text style={styles.subtitle}>
        Enter the buyer's delivery code to confirm shipment
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter buyer's delivery code"
        value={deliveryCode}
        onChangeText={setDeliveryCode}
        autoCapitalize="characters"
        maxLength={8}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleMarkShipped}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Mark as Shipped</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SellerShipScreen;