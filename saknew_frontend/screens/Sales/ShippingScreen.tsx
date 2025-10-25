import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../../styles/globalStyles';
import { createOrderFromCart } from '../../services/salesService';
import BackButton from '../../components/BackButton';
import { MainNavigationProp } from '../../navigation/types';

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
      console.log('Error loading saved address:', error);
    }
  };

  const saveAddress = async () => {
    try {
      const address = { street, contactName, contactPhone, town, province, zip, country };
      await AsyncStorage.setItem('shippingAddress', JSON.stringify(address));
    } catch (error) {
      console.log('Error saving address:', error);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
    } catch (error) {
      console.log('Error checking location permission:', error);
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
      console.log('Error clearing saved address:', error);
    }
  };

  const handleUseLocation = async () => {
    console.log('🔵 Location button clicked');
    setLocationLoading(true);
    
    try {
      console.log('🔵 Step 1: Requesting location permission...');
      // Request permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🔵 Permission status:', status);
      
      if (status !== 'granted') {
        console.log('🔴 Permission denied');
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
      console.log('🔵 Step 2: Getting current position...');

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      console.log('🔵 Location obtained:', {
        lat: location.coords.latitude,
        lon: location.coords.longitude
      });
      
      // Reverse geocode using OpenStreetMap Nominatim (free alternative)
      console.log('🔵 Step 3: Reverse geocoding with Nominatim...');
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.coords.latitude}&lon=${location.coords.longitude}&addressdetails=1`;
        
        const response = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'SaknewMarketApp/1.0'
          }
        });
        
        const data = await response.json();
        console.log('🔵 Nominatim result:', data);
        
        if (data && data.address) {
          const addr = data.address;
          
          // Build street address
          const streetParts = [];
          if (addr.house_number) streetParts.push(addr.house_number);
          if (addr.road) streetParts.push(addr.road);
          const streetAddress = streetParts.join(' ') || addr.display_name?.split(',')[0] || '';
          
          console.log('🔵 Step 4: Filling form fields...');
          console.log('Street:', streetAddress);
          console.log('City:', addr.city || addr.town || addr.village);
          console.log('Province:', addr.state);
          console.log('Country:', addr.country);
          console.log('Zip:', addr.postcode);
          
          // Fill form fields immediately so user can see them
          setStreet(streetAddress || '');
          setTown(addr.city || addr.town || addr.village || addr.suburb || '');
          setProvince(addr.state || addr.province || '');
          setCountry(addr.country || 'South Africa');
          setZip(addr.postcode || '');
          
          console.log('✅ Form fields updated successfully');
          Alert.alert('Success', 'Address filled from your location!', [{ text: 'OK' }]);
        } else {
          console.log('🔴 No address data in response');
          Alert.alert(
            'Address Not Found',
            'Could not determine address from your location. Please enter manually.',
            [{ text: 'OK' }]
          );
        }
      } catch (geocodeError) {
        console.log('🔴 Geocoding failed:', geocodeError);
        Alert.alert(
          'Location Found',
          'Got your location but could not determine address. Please enter manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.log('🔴 Location error:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      
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
      console.log('🔵 Location loading finished');
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
  
  console.log('📦 Shipping address being sent:', shippingAddress);
  console.log('📦 Contact Name:', contactName);
  console.log('📦 Contact Phone:', contactPhone);
  console.log('📦 Street:', street);
  
  try {
    setLoading(true);
    const order = await createOrderFromCart(shippingAddress);
    console.log('Order created successfully:', order);
    setLoading(false);
    navigation.navigate('Payment', { orderId: order.id });
  } catch (err: any) {
    console.log('Order creation error:', err?.response?.data || err.message);
    setLoading(false);
    Alert.alert('Order Error', err?.response?.data?.detail || 'Could not create order.');
  }
  };


  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="location-outline" size={40} color={colors.primary} />
          <Text style={styles.title}>Shipping Address</Text>
          <Text style={styles.subtitle}>Enter your delivery address or use your current location</Text>
        </View>
        
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={contactName}
                onChangeText={setContactName}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="+27 12 345 6789"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        
          <Text style={styles.sectionTitle}>Address Details</Text>
          <Text style={styles.inputLabel}>Street Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Main Street"
            value={street}
            onChangeText={setStreet}
            placeholderTextColor={colors.textSecondary}
          />
          
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="Pretoria"
                value={town}
                onChangeText={setTown}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Province</Text>
              <TextInput
                style={styles.input}
                placeholder="Gauteng"
                value={province}
                onChangeText={setProvince}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Zip Code</Text>
              <TextInput
                style={styles.input}
                placeholder="0001"
                value={zip}
                onChangeText={setZip}
                keyboardType="number-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.halfInputContainer}>
              <Text style={styles.inputLabel}>Country</Text>
              <TextInput
                style={styles.input}
                placeholder="South Africa"
                value={country}
                onChangeText={setCountry}
                placeholderTextColor={colors.textSecondary}
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
                <ActivityIndicator color={colors.buttonText} size="small" />
              ) : (
                <Ionicons name="navigate" size={20} color={colors.buttonText} />
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
              <Ionicons name="refresh" size={20} color={colors.textPrimary} />
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
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={styles.continueButtonText}>Continue to Payment</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
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
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
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
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 4, 
    padding: 10, 
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: colors.card,
    color: colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 10,
  },
  locationButton: { 
    backgroundColor: colors.primary, 
    padding: 10, 
    borderRadius: 4, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  clearButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  clearButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: { 
    color: colors.white, 
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  continueButton: { 
    backgroundColor: colors.primary, 
    padding: 12, 
    borderRadius: 4, 
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: { 
    color: colors.white, 
    fontWeight: '600', 
    fontSize: 14,
  },
});

export default ShippingScreen;
