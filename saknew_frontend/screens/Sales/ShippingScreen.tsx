import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import colors from '../../theme/colors';
import { createOrderFromCart } from '../../services/salesService';

const ShippingScreen: React.FC = () => {
  const navigation = useNavigation();
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
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
    } catch (error) {
      console.log('Error checking location permission:', error);
      setHasLocationPermission(false);
    }
  };

  const handleUseLocation = async () => {
    setLocationLoading(true);
    
    try {
      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to automatically fill your address. You can still enter it manually.',
          [{ text: 'OK' }]
        );
        setHasLocationPermission(false);
        return;
      }

      setHasLocationPermission(true);

      // Get current position with timeout and accuracy settings
      const locationOptions = {
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
        maximumAge: 10000,
      };

      const location = await Location.getCurrentPositionAsync(locationOptions);
      
      // Reverse geocode to get address components
      let geocode;
      try {
        geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (geocodeError) {
        console.log('Geocoding failed:', geocodeError);
        Alert.alert(
          'Location Found',
          'Got your location but could not determine address. Please enter manually.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        
        // Build street address from available components
        const streetParts = [];
        if (place.streetNumber) streetParts.push(place.streetNumber);
        if (place.street) streetParts.push(place.street);
        if (place.name && place.name !== place.street) streetParts.push(place.name);
        
        const streetAddress = streetParts.join(' ') || place.formattedAddress || '';
        
        // Fill form fields
        if (streetAddress) setStreet(streetAddress);
        if (place.city || place.subregion) setTown(place.city || place.subregion || '');
        if (place.region) setProvince(place.region);
        if (place.country) setCountry(place.country);
        if (place.postalCode) setZip(place.postalCode);
        
        // Removed alert for cleaner UX
      } else {
        Alert.alert(
          'Address Not Found',
          'Could not determine address from your location. Please enter manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.log('Location error:', error);
      
      let errorMessage = 'Could not get your location. ';
      
      if (error.message?.includes('Service not Available') || error.message?.includes('IOException')) {
        errorMessage += 'Location services are temporarily unavailable. Please enter address manually.';
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage += 'Location request timed out. Please try again or enter address manually.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage += 'Location is currently unavailable. Please try again later.';
      } else if (error.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
        errorMessage += 'Please check your location settings and try again.';
      } else {
        errorMessage += 'Please enter your address manually.';
      }
      
      Alert.alert('Location Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setLocationLoading(false);
    }
  };

 const handleContinue = async () => {
  if (!street || !contactName || !contactPhone || !town) {
    Alert.alert('Missing info', 'Please fill in all required fields.');
    return;
  }
  
  const shippingAddress = {
    full_name: contactName,
    address_line1: street,
    address_line2: '',
    city: town,
    state_province: province,
    postal_code: zip,
    country,
    phone_number: contactPhone,
  };
  
  console.log('Shipping address data:', shippingAddress);
  
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Shipping Address</Text>
        
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Contact Name"
            value={contactName}
            onChangeText={setContactName}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Phone"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
          />
        </View>
        
        <TextInput
          style={styles.input}
          placeholder="Street Address"
          value={street}
          onChangeText={setStreet}
        />
        
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="City"
            value={town}
            onChangeText={setTown}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Province"
            value={province}
            onChangeText={setProvince}
          />
        </View>
        
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Zip Code"
            value={zip}
            onChangeText={setZip}
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Country"
            value={country}
            onChangeText={setCountry}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.locationButton, locationLoading && styles.locationButtonDisabled]} 
          onPress={handleUseLocation} 
          disabled={locationLoading || loading}
        >
          {locationLoading ? (
            <ActivityIndicator color={colors.buttonText} size="small" />
          ) : (
            <Ionicons name="location" size={18} color={colors.buttonText} />
          )}
          <Text style={styles.locationButtonText}>
            {locationLoading ? 'Getting...' : 'Use Location'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} disabled={loading}>
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
    backgroundColor: colors.background || '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: colors.textPrimary || '#333',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: { 
    borderWidth: 1, 
    borderColor: colors.border || '#ddd', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: colors.card || '#fff',
  },
  halfInput: {
    width: '48%',
  },
  locationButton: { 
    backgroundColor: colors.infoAction || colors.primary, 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 16, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: { 
    color: colors.buttonText || '#fff', 
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  continueButton: { 
    backgroundColor: colors.primary || colors.buttonBg, 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: { 
    color: colors.buttonText || '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
  },
});

export default ShippingScreen;
