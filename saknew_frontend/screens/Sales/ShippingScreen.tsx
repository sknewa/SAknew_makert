import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../../styles/globalStyles';
import { createOrderFromCart } from '../../services/salesService';
import BackButton from '../../components/BackButton';
import { MainNavigationProp } from '../../navigation/types';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

const ShippingScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const route = useRoute();
  const [street, setStreet] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [town, setTown] = useState('');
  const [province, setProvince] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('South Africa');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    checkLocationPermission();
    loadSavedAddress();
  }, []);

  useEffect(() => {
    saveAddress();
  }, [street, contactName, contactPhone, town, province, zip, country]);

  const loadSavedAddress = async () => {
    try {
      const saved = await AsyncStorage.getItem('shippingAddress');
      if (saved) {
        const address = JSON.parse(saved);
        setStreet(address.street || '');
        setContactName(address.contactName || '');
        setContactPhone(address.contactPhone || '');
        setTown(address.town || '');
        setProvince(address.province || '');
        setZip(address.zip || '');
        setCountry(address.country || 'South Africa');
      }
    } catch (error) {
      safeLog('Error loading saved address:', error);
    }
  };

  const saveAddress = async () => {
    try {
      const address = { street, contactName, contactPhone, town, province, zip, country };
      await AsyncStorage.setItem('shippingAddress', JSON.stringify(address));
    } catch (error) {
      safeLog('Error saving address:', error);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
    } catch (error) {
      safeLog('Error checking location permission:', error);
      setHasLocationPermission(false);
    }
  };

  const handleClearForm = async () => {
    setStreet('');
    setContactName('');
    setContactPhone('');
    setTown('');
    setProvince('');
    setZip('');
    setCountry('South Africa');
    try {
      await AsyncStorage.removeItem('shippingAddress');
    } catch (error) {
      safeLog('Error clearing saved address:', error);
    }
  };

  const handleUseLocation = async () => {
    safeLog('🔵 Location button clicked');
    setLocationLoading(true);
    
    try {
      safeLog('🔵 Step 1: Requesting location permission...');
      // Request permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      safeLog('🔵 Permission status:', status);
      
      if (status !== 'granted') {
        safeLog('🔴 Permission denied');
        Alert.alert(
          'Permission Required',
          'Location permission is needed to automatically fill your address.',
          [{ text: 'OK' }]
        );
        setHasLocationPermission(false);
        setLocationLoading(false);
        return;
      }

      setHasLocationPermission(true);
      safeLog('🔵 Step 2: Getting current position...');

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      safeLog('🔵 Location obtained:', {
        lat: location.coords.latitude,
        lon: location.coords.longitude
      });
      
      // Reverse geocode using OpenStreetMap Nominatim (free alternative)
      safeLog('🔵 Step 3: Reverse geocoding with Nominatim...');
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.coords.latitude}&lon=${location.coords.longitude}&addressdetails=1`;
        
        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'SaknewMarketApp/1.0'
          }
        });
        
        const data = await response.json();
        safeLog('🔵 Nominatim result:', data);
        
        if (data && data.address) {
          const addr = data.address;
          
          // Build street address
          const streetParts = [];
          if (addr.house_number) streetParts.push(addr.house_number);
          if (addr.road) streetParts.push(addr.road);
          const streetAddress = streetParts.join(' ') || addr.display_name?.split(',')[0] || '';
          
          safeLog('🔵 Step 4: Filling form fields...');
          safeLog('Street:', streetAddress);
          safeLog('City:', addr.city || addr.town || addr.village);
          safeLog('Province:', addr.state);
          safeLog('Country:', addr.country);
          safeLog('Zip:', addr.postcode);
          
          // Fill form fields immediately so user can see them
          setStreet(streetAddress || '');
          setTown(addr.city || addr.town || addr.village || addr.suburb || '');
          setProvince(addr.state || addr.province || '');
          setCountry(addr.country || 'South Africa');
          setZip(addr.postcode || '');
          
          safeLog('✅ Form fields updated successfully');
          Alert.alert('Success', 'Address filled from your location!', [{ text: 'OK' }]);
        } else {
          safeLog('🔴 No address data in response');
          Alert.alert(
            'Address Not Found',
            'Could not determine address from your location. Please enter manually.',
            [{ text: 'OK' }]
          );
        }
      } catch (geocodeError) {
        safeLog('🔴 Geocoding failed:', geocodeError);
        Alert.alert(
          'Location Found',
          'Got your location but could not determine address. Please enter manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      safeLog('🔴 Location error:', error);
      safeLog('Error code:', error.code);
      safeLog('Error message:', error.message);
      
      let errorMessage = 'Could not get your location. Please enter address manually.';
      
      if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'Location is currently unavailable. Please try again later.';
      } else if (error.message) {
        errorMessage = `Location error: ${error.message}`;
      }
      
      Alert.alert('Location Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      safeLog('🔵 Location loading finished');
      setLocationLoading(false);
    }
  };

 const handleContinue = async () => {
  if (!street || !contactName || !contactPhone || !town) {
    Alert.alert('Missing info', 'Please fill in all required fields.');
    return;
  }
  
  const fullAddress = `${street}, ${town}${province ? ', ' + province : ''}${zip ? ', ' + zip : ''}, ${country}`;
  
  const shippingAddress = {
    full_name: contactName,
    full_address: fullAddress,
    address_line1: street,
    address_line2: '',
    city: town,
    state_province: province,
    postal_code: zip,
    country,
    phone_number: contactPhone,
  };
  
  safeLog('📦 Shipping address being sent:', shippingAddress);
  safeLog('📦 Contact Name:', contactName);
  safeLog('📦 Contact Phone:', contactPhone);
  safeLog('📦 Street:', street);
  
  try {
    setLoading(true);
    const order = await createOrderFromCart(shippingAddress);
    safeLog('Order created successfully:', order);
    setLoading(false);
    navigation.navigate('Payment', { orderId: order.id });
  } catch (err: any) {
    safeLog('Order creation error:', err?.response?.data || err.message);
    setLoading(false);
    Alert.alert('Order Error', err?.response?.data?.detail || 'Could not create order.');
  }
  };


  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <BackButton title="Shipping Address" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="location" size={40} color="#DE3831" />
          <Text style={styles.title}>Shipping Address</Text>
          <Text style={styles.subtitle}>Enter your delivery address or use your current location</Text>
        </View>
        
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={[styles.input, focusedField === 'contactName' && styles.inputFocused]}
                placeholder="John Doe"
                value={contactName}
                onChangeText={setContactName}
                placeholderTextColor="#7A8FA6"
                autoComplete="name"
                maxLength={100}
                onFocus={() => setFocusedField('contactName')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Phone *</Text>
              <TextInput
                style={[styles.input, focusedField === 'contactPhone' && styles.inputFocused]}
                placeholder="+27 12 345 6789"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#7A8FA6"
                autoComplete="tel"
                maxLength={15}
                onFocus={() => setFocusedField('contactPhone')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>
        
          <Text style={styles.sectionTitle}>Address Details</Text>
          <Text style={styles.inputLabel}>Street Address *</Text>
          <TextInput
            style={[styles.input, focusedField === 'street' && styles.inputFocused]}
            placeholder="123 Main Street"
            value={street}
            onChangeText={setStreet}
            placeholderTextColor="#7A8FA6"
            autoComplete="street-address"
            maxLength={255}
            onFocus={() => setFocusedField('street')}
            onBlur={() => setFocusedField(null)}
          />
          
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={[styles.input, focusedField === 'town' && styles.inputFocused]}
                placeholder="Pretoria"
                value={town}
                onChangeText={setTown}
                placeholderTextColor="#7A8FA6"
                autoComplete="address-level2"
                maxLength={100}
                onFocus={() => setFocusedField('town')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Province</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                placeholder="Gauteng"
                value={province}
                onChangeText={setProvince}
                placeholderTextColor="#7A8FA6"
                autoComplete="address-level1"
                maxLength={100}
              />
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Zip Code</Text>
              <TextInput
                style={[styles.input, focusedField === 'zip' && styles.inputFocused]}
                placeholder="0001"
                value={zip}
                onChangeText={setZip}
                keyboardType="number-pad"
                placeholderTextColor="#7A8FA6"
                autoComplete="postal-code"
                maxLength={10}
                onFocus={() => setFocusedField('zip')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Country</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                placeholder="South Africa"
                value={country}
                onChangeText={setCountry}
                placeholderTextColor="#7A8FA6"
                autoComplete="country"
                maxLength={100}
              />
            </View>
          </View>
        
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.locationButton, locationLoading && styles.locationButtonDisabled]} 
              onPress={handleUseLocation} 
              disabled={locationLoading || loading}
            >
              {locationLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="navigate" size={20} color="#fff" />
              )}
              <Text style={styles.locationButtonText}>
                {locationLoading ? 'Getting Location...' : 'Use My Location'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClearForm} 
              disabled={loading || locationLoading}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.continueButton, loading && styles.continueButtonDisabled]} 
          onPress={handleContinue} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#fff" />
              <Text style={styles.continueButtonText}>Continue to Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginTop: 12,
    marginBottom: 8, 
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfInputContainer: {
    flex: 1,
  },
  input: { 
    borderRadius: 8, 
    padding: 10, 
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: '#F8F9FA',
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  inputFocused: {
    borderColor: '#FFB81C',
    backgroundColor: '#FFFDF0',
  },
  inputReadOnly: {
    backgroundColor: '#F0F4F0',
    borderColor: '#FFB81C',
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
    gap: 10,
  },
  locationButton: { 
    backgroundColor: '#002395', 
    padding: 12, 
    borderRadius: 8, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  clearButton: {
    backgroundColor: '#DE3831',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  continueButton: { 
    backgroundColor: '#007A4D', 
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 15,
  },
});

export default ShippingScreen;
