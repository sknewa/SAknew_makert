

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDateInputRef = useRef<any>(null);
  const endDateInputRef = useRef<any>(null);

  const handleAddPromotion = async () => {
    console.log('🎯 AddPromotion - Starting handleAddPromotion');
    console.log('🎯 AddPromotion - Product ID:', productId);
    console.log('🎯 AddPromotion - Discount:', discount);
    console.log('🎯 AddPromotion - Start Date:', startDate);
    console.log('🎯 AddPromotion - End Date:', endDate);
    
    if (!discount || isNaN(Number(discount)) || Number(discount) <= 0 || Number(discount) >= 100) {
      console.log('❌ AddPromotion - Invalid discount percentage');
      setError('Please enter a valid discount percentage (1-99).');
      return;
    }
    if (endDate <= startDate) {
      console.log('❌ AddPromotion - Invalid date range');
      setError('End date must be after start date.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log('📤 AddPromotion - Calling shopService.addProductPromotion');
      const result = await shopService.addProductPromotion(productId, {
        discount_percentage: Number(discount),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      console.log('✅ AddPromotion - Promotion added successfully:', result);
      console.log('🔄 AddPromotion - Navigating to ProductManagement with productId:', productId);
      
      // Navigate immediately
      (navigation as any).navigate('ProductManagement', { productId });
      
      // Show success message after navigation
      setTimeout(() => {
        Alert.alert('Success', 'Promotion added successfully!');
      }, 100);
    } catch (err: any) {
      console.log('❌ AddPromotion - Error adding promotion:', err);
      console.log('❌ AddPromotion - Error response:', err.response?.data);
      const errorMsg = err.response?.data?.detail || 'Failed to add promotion. Please try again.';
      if (errorMsg.includes('already has an active promotion')) {
        console.log('⚠️ AddPromotion - Product already has active promotion');
        Alert.alert(
          'Active Promotion Exists',
          'This product already has an active promotion. Please remove the existing promotion first or wait for it to expire.',
          [{ text: 'OK' }]
        );
      }
      setError(errorMsg);
    } finally {
      console.log('🏁 AddPromotion - handleAddPromotion completed');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.navigate('ProductManagement' as never);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="pricetag" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>Add Promotion</Text>
            <Text style={styles.subtitle}>Set a discount and duration for this product</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Discount Input */}
            <View style={styles.inputSection}>
              <View style={styles.inputWrapper}>
                <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="Discount Percentage (e.g., 20)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={discount}
                  onChangeText={setDiscount}
                  editable={!loading}
                  maxLength={2}
                />
              </View>
            </View>

            {/* Start Date */}
            <View style={styles.inputSection}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  if (Platform.OS === 'web' && startDateInputRef.current) {
                    startDateInputRef.current.showPicker();
                  } else {
                    setShowStartPicker(true);
                  }
                }}
                disabled={loading}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.dateText}>{startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              </TouchableOpacity>
              {Platform.OS === 'web' && (
                <input
                  ref={startDateInputRef}
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
              )}
            </View>

            {/* End Date */}
            <View style={styles.inputSection}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  if (Platform.OS === 'web' && endDateInputRef.current) {
                    endDateInputRef.current.showPicker();
                  } else {
                    setShowEndPicker(true);
                  }
                }}
                disabled={loading}
              >
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.dateText}>{endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              </TouchableOpacity>
              {Platform.OS === 'web' && (
                <input
                  ref={endDateInputRef}
                  type="date"
                  value={endDate.toISOString().split('T')[0]}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  min={startDate.toISOString().split('T')[0]}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
              )}
            </View>

            {/* Date Pickers */}
            {Platform.OS !== 'web' && showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onStartDateChange}
                minimumDate={new Date()}
              />
            )}
            {Platform.OS !== 'web' && showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onEndDateChange}
                minimumDate={startDate}
              />
            )}

            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color={colors.errorText} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleAddPromotion}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.submitButtonText}>Add Promotion</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: colors.errorText,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: typography.fontFamily,
  },
});

export default AddPromotionScreen;
