

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';

import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import shopService from '../../services/shopService';
import colors from '../../theme/colors';
import typography from '../../theme/typography';
import BackButton from '../../components/BackButton';

function getDefaultDates() {
  const now = new Date();
  const start = now.toISOString();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  return { start, end };
}

const AddPromotionScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { productId } = route.params as { productId: number };

  const [discount, setDiscount] = useState('');
  const [startDate, setStartDate] = useState(getDefaultDates().start);
  const [endDate, setEndDate] = useState(getDefaultDates().end);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPromotion = async () => {
    if (!discount || isNaN(Number(discount)) || Number(discount) <= 0 || Number(discount) >= 100) {
      setError('Please enter a valid discount percentage (1-99).');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please provide valid start and end dates.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await shopService.addProductPromotion(productId, {
        discount_percentage: Number(discount),
        start_date: startDate,
        end_date: endDate,
      });
      Alert.alert('Success', 'Promotion added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add promotion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackButton />
      <View style={styles.container}>
        <Text style={styles.title}>Add Promotion</Text>
        <Text style={styles.subtitle}>Enter a discount percentage and promotion dates for this product.</Text>
        <View style={styles.inputGroup}>
          <Ionicons name="pricetag" size={22} color={colors.primary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Discount %"
            keyboardType="numeric"
            value={discount}
            onChangeText={setDiscount}
            editable={!loading}
            maxLength={2}
          />
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.input}>Start: {new Date(startDate).toLocaleDateString()}</Text>
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="calendar" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.input}>End: {new Date(endDate).toLocaleDateString()}</Text>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAddPromotion}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.buttonText}>Add Promotion</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.fontSizeHeader,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSizeL,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: typography.fontSizeL,
    fontWeight: 'bold',
    fontFamily: typography.fontFamily,
  },
  errorText: {
    color: colors.errorText,
    fontSize: typography.fontSizeM,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
});

export default AddPromotionScreen;
