import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../theme/colors';
import BackButton from '../../components/BackButton';

const OrderSuccessScreen: React.FC = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <BackButton />
      <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
      <Text style={styles.title}>Order Placed!</Text>
      <Text style={styles.subtitle}>Your payment was successful and your order has been placed.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' as never }],
          })
        }
      >
        <Text style={styles.buttonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 32, textAlign: 'center' },
  button: { backgroundColor: colors.buttonBg, padding: 16, borderRadius: 8, alignItems: 'center', minWidth: 160 },
  buttonText: { color: colors.buttonText, fontWeight: 'bold', fontSize: 16 },
});

export default OrderSuccessScreen;
