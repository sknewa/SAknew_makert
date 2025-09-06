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
import { verifyProductDelivery } from '../../services/deliveryService';

const DeliveryVerificationScreen: React.FC = () => {
  const [deliveryCode, setDeliveryCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerifyDelivery = async () => {
    if (!deliveryCode.trim()) {
      Alert.alert('Error', 'Please enter a delivery code');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyProductDelivery(deliveryCode.trim());
      Alert.alert(
        'Delivery Verified!',
        `${response.detail}\n\nProduct: ${response.product_name}\nAmount Credited: R${response.amount_credited.toFixed(2)}${response.order_completed ? '\n\nOrder completed!' : ''}`,
        [{ text: 'OK', onPress: () => setDeliveryCode('') }]
      );
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.response?.data?.detail || 'Failed to verify delivery code'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Product Delivery</Text>
      <Text style={styles.subtitle}>
        Enter the delivery code provided by the customer to confirm delivery and receive payment.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter delivery code"
        value={deliveryCode}
        onChangeText={setDeliveryCode}
        autoCapitalize="characters"
        maxLength={8}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyDelivery}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify Delivery</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeliveryVerificationScreen;