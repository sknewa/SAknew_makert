// saknew_frontend/screens/ShopOwner/CreateShopScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ShopService from '../../services/shopService';
import { CreateShopData } from '../../services/shop.types';
import { useAuth } from '../../context/AuthContext';
import { MainNavigationProp } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Centralized colors
const colors = {
  primary: '#4CAF50', // Green
  accent: '#FFC107', // Amber
  backgroundLight: '#F0F2F5',
  backgroundDark: '#E0E2E5',
  card: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  error: '#EF5350',
  border: '#E0E0E0',
  iconColor: '#7F8C8D',
  focusedBorder: '#4CAF50',
};

const CreateShopScreen: React.FC = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const { user, refreshUserProfile } = useAuth(); // Get user and refreshUserProfile

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  // Address states
  const [country, setCountry] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [town, setTown] = useState<string>('');
  // Contact Info states
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [emailContact, setEmailContact] = useState<string>('');
  // Social Links states
  const [facebookUrl, setFacebookUrl] = useState<string>('');
  const [instagramUrl, setInstagramUrl] = useState<string>('');
  const [twitterUrl, setTwitterUrl] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');

  // Combined social links object for backend
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // Internal states for latitude/longitude, derived from address or live location
  const [derivedLatitude, setDerivedLatitude] = useState<string>('');
  const [derivedLongitude, setDerivedLongitude] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingShop, setCheckingShop] = useState<boolean>(true);

  // Input focus states
  const [isNameFocused, setIsNameFocused] = useState<boolean>(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState<boolean>(false);
  const [isCountryFocused, setIsCountryFocused] = useState<boolean>(false);
  const [isProvinceFocused, setIsProvinceFocused] = useState<boolean>(false);
  const [isTownFocused, setIsTownFocused] = useState<boolean>(false);
  const [isPhoneNumberFocused, setIsPhoneNumberFocused] = useState<boolean>(false);
  const [isEmailContactFocused, setIsEmailContactFocused] = useState<boolean>(false);
  // Social Links focus states
  const [isFacebookUrlFocused, setIsFacebookUrlFocused] = useState<boolean>(false);
  const [isInstagramUrlFocused, setIsInstagramUrlFocused] = useState<boolean>(false);
  const [isTwitterUrlFocused, setIsTwitterUrlFocused] = useState<boolean>(false);
  const [isLinkedinUrlFocused, setIsLinkedinUrlFocused] = useState<boolean>(false);


  // Check if user already has a shop when component mounts
  React.useEffect(() => {
    const checkExistingShop = async () => {
      setCheckingShop(true);
      try {
        if (user?.profile?.shop_slug) {
          // User already has a shop, redirect to MyShopScreen
          Alert.alert(
            'Shop Already Exists',
            'You already have a shop. You cannot create multiple shops.',
            [{
              text: 'OK',
              onPress: () => navigation.navigate('ShopTab' as never)
            }]
          );
        }
      } catch (err) {
        console.error('Error checking existing shop:', err);
      } finally {
        setCheckingShop(false);
      }
    };
    
    checkExistingShop();
  }, [user, navigation]);

  // Effect to update socialLinks object whenever individual social URL states change
  React.useEffect(() => {
    const newSocialLinks: Record<string, string> = {};
    if (facebookUrl.trim()) newSocialLinks.facebook = facebookUrl.trim();
    if (instagramUrl.trim()) newSocialLinks.instagram = instagramUrl.trim();
    if (twitterUrl.trim()) newSocialLinks.twitter = twitterUrl.trim();
    if (linkedinUrl.trim()) newSocialLinks.linkedin = linkedinUrl.trim();
    setSocialLinks(newSocialLinks);
  }, [facebookUrl, instagramUrl, twitterUrl, linkedinUrl]);


  const handleUseLiveLocation = useCallback(async () => {
    setError(null);
    setLocationLoading(true);
    Keyboard.dismiss();

    try {
      // First check if location services are available
      const isAvailable = await Location.hasServicesEnabledAsync().catch(() => false);
      if (!isAvailable) {
        setError('Location services are not available on this device.');
        Alert.alert(
          'Location Services Unavailable',
          'Location services are not available on this device. Please enter your address manually.'
        );
        setLocationLoading(false);
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied. Please enable it in your device settings.');
        Alert.alert(
          'Location Permission Denied',
          'Please enable location services for this app in your device settings to use this feature, or enter address manually.'
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000
      }).catch(error => {
        throw new Error('Could not get current position: ' + error.message);
      });
      
      // Round coordinates to 6 decimal places
      setDerivedLatitude(location.coords.latitude.toFixed(6));
      setDerivedLongitude(location.coords.longitude.toFixed(6));

      try {
        // Reverse geocode to get address details
        const geocodedAddress = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocodedAddress && geocodedAddress.length > 0) {
          const address = geocodedAddress[0];
          setCountry(address.country || '');
          setProvince(address.region || ''); // region usually maps to province/state
          setTown(address.city || address.subregion || ''); // city or subregion for town
          Alert.alert('Location Fetched', 'Your current location address has been set.');
        } else {
          Alert.alert('Location Fetched', 'Could not determine address from live location. Coordinates set.');
        }
      } catch (geocodeErr) {
        console.warn('Geocoding failed but coordinates were obtained:', geocodeErr);
        Alert.alert('Location Partially Fetched', 'Got your coordinates but could not determine address. You can enter address details manually.');
      }
    } catch (err: any) {
      console.error('Error fetching live location:', err);
      setError('Failed to get live location. Please enter your address manually.');
      Alert.alert('Location Error', 'Could not fetch your current location. Please enter your address manually.');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const handleClearLocation = useCallback(() => {
    setCountry('');
    setProvince('');
    setTown('');
    setDerivedLatitude('');
    setDerivedLongitude('');
    setError(null);
  }, []);

  const handleCreateShop = useCallback(async () => {
    setError(null);
    Keyboard.dismiss();

    // Double-check user doesn't already have a shop
    if (user?.profile?.shop_slug) {
      setError('You already have a shop. You cannot create multiple shops.');
      Alert.alert(
        'Shop Already Exists',
        'You already have a shop. You cannot create multiple shops.',
        [{
          text: 'OK',
          onPress: () => navigation.navigate('ShopTab' as never)
        }]
      );
      return;
    }

    if (!name.trim()) {
      setError('Shop Name is required.');
      return;
    }

    // Attempt to geocode address if provided and no live location was set
    let finalLatitude = derivedLatitude;
    let finalLongitude = derivedLongitude;

    if (!finalLatitude || !finalLongitude) { // If no live location was set, try geocoding the entered address
      if (!country.trim() && !province.trim() && !town.trim()) {
        setError('Please provide either live location or fill in at least one address field (Country, Province, or Town).');
        return;
      }

      setGeocodingLoading(true);
      try {
        const fullAddress = `${town}, ${province}, ${country}`;
        const geocodedResults = await Location.geocodeAsync(fullAddress);

        if (geocodedResults && geocodedResults.length > 0) {
          // Round geocoded coordinates to 6 decimal places
          finalLatitude = geocodedResults[0].latitude.toFixed(6);
          finalLongitude = geocodedResults[0].longitude.toFixed(6);
        } else {
          setError('Could not determine coordinates from the provided address. Please try a different address or use live location.');
          setGeocodingLoading(false);
          return;
        }
      } catch (err: any) {
        console.error('Error geocoding address:', err);
        setError('Failed to convert address to coordinates. Please check the address or use live location.');
        setGeocodingLoading(false);
        return;
      } finally {
        setGeocodingLoading(false);
      }
    }

    setLoading(true);
    try {
      const shopData: CreateShopData = {
        name: name.trim(),
        description: description.trim() || undefined,
        country: country.trim() || undefined,
        province: province.trim() || undefined,
        town: town.trim() || undefined,
        latitude: finalLatitude || undefined, // Send derived and rounded latitude
        longitude: finalLongitude || undefined, // Send derived and rounded longitude
        // Contact info fields
        phone_number: phoneNumber.trim() || undefined,
        email_contact: emailContact.trim() || undefined,
        // Social links field
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : undefined, // Send only if not empty
      };

      const newShop = await ShopService.createShop(shopData);
      Alert.alert('Success!', `Your shop "${newShop.name}" has been created!`, [
        {
          text: 'OK',
          onPress: async () => {
            // No need for null check here, as refreshUserProfile is guaranteed by AuthContextType
            await refreshUserProfile();
            navigation.navigate('ShopTab' as never);
          },
        },
      ]);
    } catch (err: any) {
      console.error('Shop creation error:', err.response?.data || err.message);
      let errorMessage = 'Failed to create shop. Please try again.';
      if (err.response && err.response.data) {
        if (err.response.data.name) {
          errorMessage = `Shop Name: ${err.response.data.name.join(', ')}`;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.latitude) { // Specific error for latitude
            errorMessage = `Latitude: ${err.response.data.latitude.join(', ')}`;
        } else if (err.response.data.longitude) { // Specific error for longitude
            errorMessage = `Longitude: ${err.response.data.longitude.join(', ')}`;
        }
        else if (typeof err.response.data === 'object') {
          errorMessage = Object.values(err.response.data)
            .flat()
            .map(msg => String(msg))
            .join('\n');
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setGeocodingLoading(false);
    }
  }, [
    name, description, country, province, town,
    phoneNumber, emailContact, socialLinks,
    derivedLatitude, derivedLongitude,
    navigation, refreshUserProfile, user
  ]);

  const overallLoading = loading || locationLoading || geocodingLoading || checkingShop;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.container}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={overallLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back-outline" size={28} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Header Section */}
            <View style={styles.header}>
              <Ionicons name="storefront-outline" size={60} color={colors.primary} style={styles.headerIcon} />
              <Text style={styles.title}>Create Your Shop</Text>
              <Text style={styles.subtitle}>
                Start selling by setting up your online shop details.
              </Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Shop Name <Text style={styles.requiredIndicator}>*</Text></Text>
              <View style={[styles.inputContainer, isNameFocused && styles.inputFocused]}>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., My Awesome Store"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!overallLoading}
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => setIsNameFocused(false)}
                />
              </View>

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer, isDescriptionFocused && styles.inputFocused]}>
                <TextInput
                  style={[styles.inputField, styles.textAreaField]}
                  placeholder="Tell customers about your shop..."
                  placeholderTextColor="#999"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  editable={!overallLoading}
                  onFocus={() => setIsDescriptionFocused(true)}
                  onBlur={() => setIsDescriptionFocused(false)}
                />
              </View>

              <Text style={styles.inputLabel}>Shop Location</Text>
              <Text style={styles.locationInfoText}>
                Provide your shop's address or use your current location.
                (This helps customers find you!)
              </Text>

              <View style={styles.locationButtonsContainer}>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={handleUseLiveLocation}
                  disabled={overallLoading}
                  activeOpacity={0.7}
                >
                  {locationLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="locate-outline" size={20} color="#fff" style={styles.buttonIcon} />
                      <Text style={styles.locationButtonText}>Use Live Location</Text>
                    </>
                  )}
                </TouchableOpacity>
                { (country || province || town) ? (
                  <TouchableOpacity
                    style={[styles.locationButton, styles.clearLocationButton]}
                    onPress={handleClearLocation}
                    disabled={overallLoading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={20} color={colors.textPrimary} style={styles.buttonIcon} />
                    <Text style={[styles.locationButtonText, { color: colors.textPrimary }]}>Clear Address</Text>
                  </TouchableOpacity>
                ) : null }
              </View>

              <Text style={styles.inputLabel}>Country</Text>
              <View style={[styles.inputContainer, isCountryFocused && styles.inputFocused]}>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., South Africa"
                  placeholderTextColor="#999"
                  value={country}
                  onChangeText={setCountry}
                  autoCapitalize="words"
                  editable={!overallLoading}
                  onFocus={() => setIsCountryFocused(true)}
                  onBlur={() => setIsCountryFocused(false)}
                />
              </View>

              <Text style={styles.inputLabel}>Province/State</Text>
              <View style={[styles.inputContainer, isProvinceFocused && styles.inputFocused]}>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., Gauteng"
                  placeholderTextColor="#999"
                  value={province}
                  onChangeText={setProvince}
                  autoCapitalize="words"
                  editable={!overallLoading}
                  onFocus={() => setIsProvinceFocused(true)}
                  onBlur={() => setIsProvinceFocused(false)}
                />
              </View>

              <Text style={styles.inputLabel}>Town/City</Text>
              <View style={[styles.inputContainer, isTownFocused && styles.inputFocused]}>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., Pretoria"
                  placeholderTextColor="#999"
                  value={town}
                  onChangeText={setTown}
                  autoCapitalize="words"
                  editable={!overallLoading}
                  onFocus={() => setIsTownFocused(true)}
                  onBlur={() => setIsTownFocused(false)}
                />
              </View>

              {/* Contact Information Section */}
              <Text style={[styles.inputLabel, styles.sectionHeader]}>Contact Information (Optional)</Text>
              <Text style={styles.locationInfoText}>
                How can customers reach your shop?
              </Text>

              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={[styles.inputContainer, isPhoneNumberFocused && styles.inputFocused]}>
                <Ionicons name="call-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., +27 12 345 6789"
                  placeholderTextColor="#999"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  editable={!overallLoading}
                  onFocus={() => setIsPhoneNumberFocused(true)}
                  onBlur={() => setIsPhoneNumberFocused(false)}
                />
              </View>

              <Text style={styles.inputLabel}>Contact Email</Text>
              <View style={[styles.inputContainer, isEmailContactFocused && styles.inputFocused]}>
                <Ionicons name="mail-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., info@myshop.com"
                  placeholderTextColor="#999"
                  value={emailContact}
                  onChangeText={setEmailContact}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  editable={!overallLoading}
                  onFocus={() => setIsEmailContactFocused(true)}
                  onBlur={() => setIsEmailContactFocused(false)}
                />
              </View>

              {/* Social Media Links Section */}
              <Text style={[styles.inputLabel, styles.sectionHeader]}>Social Media Links (Optional)</Text>
              <Text style={styles.locationInfoText}>
                Provide links to your shop's social media pages.
              </Text>

              <Text style={styles.inputLabel}>Facebook URL</Text>
              <View style={[styles.inputContainer, isFacebookUrlFocused && styles.inputFocused]}>
                <Ionicons name="logo-facebook" size={20} color={colors.iconColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., https://facebook.com/myshop"
                  placeholderTextColor="#999"
                  value={facebookUrl}
                  onChangeText={setFacebookUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!overallLoading}
                  onFocus={() => setIsFacebookUrlFocused(true)}
                  onBlur={() => setIsFacebookUrlFocused(false)}
                />
              </View>

              <Text style={styles.inputLabel}>Instagram URL</Text>
              <View style={[styles.inputContainer, isInstagramUrlFocused && styles.inputFocused]}>
                <Ionicons name="logo-instagram" size={20} color={colors.iconColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., https://instagram.com/myshop"
                  placeholderTextColor="#999"
                  value={instagramUrl}
                  onChangeText={setInstagramUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!overallLoading}
                  onFocus={() => setIsInstagramUrlFocused(true)}
                  onBlur={() => setIsInstagramUrlFocused(false)}
                />
              </View>

              <Text style={styles.inputLabel}>Twitter (X) URL</Text>
              <View style={[styles.inputContainer, isTwitterUrlFocused && styles.inputFocused]}>
                <Ionicons name="logo-twitter" size={20} color={colors.iconColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., https://twitter.com/myshop"
                  placeholderTextColor="#999"
                  value={twitterUrl}
                  onChangeText={setTwitterUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!overallLoading}
                  onFocus={() => setIsTwitterUrlFocused(true)}
                  onBlur={() => setIsTwitterUrlFocused(false)}
                />
              </View>

              <Text style={styles.inputLabel}>LinkedIn URL</Text>
              <View style={[styles.inputContainer, isLinkedinUrlFocused && styles.inputFocused]}>
                <Ionicons name="logo-linkedin" size={20} color={colors.iconColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., https://linkedin.com/company/myshop"
                  placeholderTextColor="#999"
                  value={linkedinUrl}
                  onChangeText={setLinkedinUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!overallLoading}
                  onFocus={() => setIsLinkedinUrlFocused(true)}
                  onBlur={() => setIsLinkedinUrlFocused(false)}
                />
              </View>


              {error && <Text style={styles.errorMessage}>{error}</Text>}

              <TouchableOpacity
                style={styles.createShopButton}
                onPress={handleCreateShop}
                disabled={overallLoading}
                activeOpacity={0.8}
              >
                {overallLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createShopButtonText}>Create Shop</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  container: {
    width: '90%',
    maxWidth: 500,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    zIndex: 10,
    padding: 5,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 25,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  inputLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
    fontWeight: '600',
  },
  requiredIndicator: {
    color: colors.error,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    height: 55,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.focusedBorder,
    backgroundColor: colors.backgroundDark,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textAreaContainer: {
    height: 100,
    alignItems: 'flex-start',
    paddingTop: 15,
    paddingBottom: 15,
  },
  textAreaField: {
    height: '100%',
    textAlignVertical: 'top',
  },
  locationInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
  },
  locationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    width: '100%',
    flexWrap: 'wrap',
  },
  locationButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    flexShrink: 1,
    minWidth: 150,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  clearLocationButton: {
    backgroundColor: colors.backgroundDark,
    borderColor: colors.border,
    borderWidth: 1,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  buttonIcon: {
    marginRight: 5,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    width: '100%',
  },
  errorMessage: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 15,
  },
  createShopButton: {
    backgroundColor: colors.primary,
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  createShopButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateShopScreen;
