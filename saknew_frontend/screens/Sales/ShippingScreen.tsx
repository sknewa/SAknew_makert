import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
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

  const handleUseLocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use live location.');
        setLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      // Reverse geocode to get address components
      let geocode = await Location.reverseGeocodeAsync(location.coords);
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        setStreet((place.street || '') + (place.name ? ' ' + place.name : ''));
        setTown(place.city || place.subregion || '');
        setProvince(place.region || '');
        setCountry(place.country || 'South Africa');
        setZip(place.postalCode || '');
        Alert.alert('Location set', 'Address fields have been filled from your location.');
      } else {
        Alert.alert('Error', 'Could not get address from location.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not get location.');
    } finally {
      setLoading(false);
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
    <View style={styles.container}>
      <Text style={styles.title}>Shipping Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Street Address"
        value={street}
        onChangeText={setStreet}
      />
      <TextInput
        style={styles.input}
        placeholder="Contact Name"
        value={contactName}
        onChangeText={setContactName}
      />
      <TextInput
        style={styles.input}
        placeholder="Contact Phone"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Town/City"
        value={town}
        onChangeText={setTown}
      />
      <TextInput
        style={styles.input}
        placeholder="Province"
        value={province}
        onChangeText={setProvince}
      />
      <TextInput
        style={styles.input}
        placeholder="Zip Code"
        value={zip}
        onChangeText={setZip}
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Country"
        value={country}
        onChangeText={setCountry}
      />
      <TouchableOpacity style={styles.locationButton} onPress={handleUseLocation} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.locationButtonText}>Use Live Location</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  locationButton: { backgroundColor: colors.primary, padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  locationButtonText: { color: colors.white, fontWeight: 'bold' },
  continueButton: { backgroundColor: colors.buttonBg, padding: 16, borderRadius: 8, alignItems: 'center' },
  continueButtonText: { color: colors.buttonText, fontWeight: 'bold', fontSize: 16 },
});

export default ShippingScreen;
