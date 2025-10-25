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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ShopService from '../../services/shopService';
import { CreateShopData } from '../../services/shop.types';
import { useAuth } from '../../context/AuthContext.minimal';
import { MainNavigationProp } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const colors = {
  primary: '#4CAF50',
  accent: '#FFC107',
  background: '#F0F2F5',
  card: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  error: '#EF5350',
  border: '#E0E0E0',
  iconColor: '#7F8C8D',
};

const spacing = {
  xs: 6,
  sm: 10,
  md: 12,
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

  // Collapsible sections
  const [showContactInfo, setShowContactInfo] = useState<boolean>(false);
  const [showSocialLinks, setShowSocialLinks] = useState<boolean>(false);

  // Input focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCallback, setAlertCallback] = useState<(() => void) | null>(null);

  const showAlert = (title: string, message: string, callback?: () => void): void => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertCallback(callback ? () => callback : null);
    setAlertVisible(true);
  };

  const hideAlert = () => {
    setAlertVisible(false);
    if (alertCallback) {
      alertCallback();
      setAlertCallback(null);
    }
  };


  // Check if user already has a shop when component mounts
  React.useEffect(() => {
    const checkExistingShop = async () => {
      setCheckingShop(true);
      try {
        if (user?.profile?.shop_slug) {
          showAlert(
            'Shop Already Exists',
            'You already have a shop. You can only own one shop.',
            () => navigation.replace('ShopTab' as never)
          );
          return;
        }
      } catch (err) {
        // Error checking existing shop
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
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          '📍 Location Permission Required',
          'Please enable location access to automatically fill your shop address.'
        );
        setLocationLoading(false);
        return;
      }

      // Get current position with highest accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });
      
      const { latitude, longitude } = location.coords;
      setDerivedLatitude(latitude.toFixed(6));
      setDerivedLongitude(longitude.toFixed(6));
      
      // Use Nominatim (OpenStreetMap) for reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'SaknewApp/1.0'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const addr = data.address || {};
          
          // Extract detailed address components
          const detectedCountry = addr.country || 'South Africa';
          const detectedProvince = addr.state || addr.province || addr.region || '';
          
          // Build detailed address with street-level info
          const addressParts = [
            addr.house_number,
            addr.road || addr.street,
            addr.suburb || addr.neighbourhood || addr.quarter,
            addr.city || addr.town || addr.village || addr.municipality,
          ].filter(Boolean);
          
          const detectedTown = addressParts.join(', ');
          
          setCountry(detectedCountry);
          setProvince(detectedProvince);
          setTown(detectedTown);
          
          showAlert(
            '✅ Location Detected',
            `${detectedTown}\n${detectedProvince}, ${detectedCountry}\n\nCoordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          );
        } else {
          throw new Error('Geocoding service unavailable');
        }
      } catch (geoError) {
        // Fallback: just save coordinates
        setCountry('South Africa');
        setProvince('');
        setTown('');
        showAlert(
          '⚠️ Location Saved',
          `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\nPlease enter address details manually.`
        );
      }
      
    } catch (error: any) {
      console.error('Location error:', error);
      showAlert(
        '❌ Location Error',
        error.message || 'Unable to retrieve your location. Please enter your shop address manually.'
      );
      setError('Location failed. Please enter address manually.');
    } finally {
      setLocationLoading(false);
    }
  }, []);



  const handleCreateShop = useCallback(async () => {
    
    setError(null);
    Keyboard.dismiss();

    // Double-check user doesn't already have a shop
    if (user?.profile?.shop_slug) {
      setError('You already have a shop. You can only own one shop.');
      showAlert(
        'Shop Already Exists',
        'You can only own one shop.',
        () => navigation.replace('ShopTab' as never)
      );
      return;
    }
    
    // Allow any user to create a shop - they will become a seller automatically

    if (!name.trim()) {
      setError('Shop Name is required.');
      return;
    }

    // Attempt to geocode address if provided and no live location was set
    let finalLatitude = derivedLatitude;
    let finalLongitude = derivedLongitude;

    if (!finalLatitude || !finalLongitude) {
      if (!country.trim() && !province.trim() && !town.trim()) {
        setError('Shop location is required. Please use live location or enter address details.');
        return;
      }

      setGeocodingLoading(true);
      try {
        const fullAddress = `${town}, ${province}, ${country}`;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
          {
            headers: {
              'User-Agent': 'SaknewApp/1.0'
            }
          }
        );

        if (response.ok) {
          const results = await response.json();
          if (results && results.length > 0) {
            finalLatitude = parseFloat(results[0].lat).toFixed(6);
            finalLongitude = parseFloat(results[0].lon).toFixed(6);
          } else {
            setError('Could not find coordinates for this address. Please use live location or try a different address.');
            setGeocodingLoading(false);
            return;
          }
        } else {
          setError('Geocoding service unavailable. Please use live location.');
          setGeocodingLoading(false);
          return;
        }
      } catch (err: any) {
        setError('Failed to convert address to coordinates. Please use live location.');
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
        latitude: finalLatitude || undefined,
        longitude: finalLongitude || undefined,
        phone_number: phoneNumber.trim() || undefined,
        email_contact: emailContact.trim() || undefined,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
      };
      
      const newShop = await ShopService.createShop(shopData);
      
      // Update user profile with new shop slug
      if (user) {
        const updatedUser = {
          ...user,
          profile: {
            ...user.profile,
            is_seller: true,
            shop_slug: newShop.slug
          }
        };
        // Update the user state directly since we know the shop was created
        // In a real app, you'd call refreshUserProfile() to fetch from API
      }
      
      // Refresh user profile to update seller status
      await refreshUserProfile();
      
      showAlert(
        'Success!',
        `Your shop "${newShop.name}" has been created!`,
        () => navigation.replace('ShopTab' as never)
      );
    } catch (err: any) {
      
      let errorMessage = 'Failed to create shop. Please try again.';
      if (err.response && err.response.data) {
        if (err.response.data.name) {
          errorMessage = `Shop Name: ${err.response.data.name.join(', ')}`;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.latitude) {
            errorMessage = `Latitude: ${err.response.data.latitude.join(', ')}`;
        } else if (err.response.data.longitude) {
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
              <View style={styles.iconCircle}>
                <Ionicons name="storefront" size={40} color="#fff" />
              </View>
              <Text style={styles.title}>Create Your Shop</Text>
              <Text style={styles.subtitle}>Quick setup • Start selling in minutes</Text>
            </View>

            <View style={styles.formCard}>
              {/* Shop Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shop Name <Text style={styles.required}>*</Text></Text>
                <View style={[styles.inputWrapper, focusedField === 'name' && styles.inputFocused]}>
                  <Ionicons name="storefront-outline" size={20} color={colors.iconColor} />
                  <TextInput
                    style={styles.input}
                    placeholder="My Awesome Store"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!overallLoading}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <View style={[styles.inputWrapper, styles.textArea, focusedField === 'desc' && styles.inputFocused]}>
                  <TextInput
                    style={[styles.input, styles.textAreaInput]}
                    placeholder="What makes your shop special?"
                    placeholderTextColor="#999"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    editable={!overallLoading}
                    onFocus={() => setFocusedField('desc')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Location Section */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="location" size={24} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Shop Location <Text style={styles.required}>*</Text></Text>
                </View>
                
                <TouchableOpacity
                  style={styles.locationBtn}
                  onPress={handleUseLiveLocation}
                  disabled={overallLoading}
                  activeOpacity={0.8}
                >
                  {locationLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="navigate" size={20} color="#fff" />
                  )}
                  <Text style={styles.locationBtnText}>
                    {locationLoading ? 'Detecting...' : 'Use My Location'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.locationFields}>
                  <View style={[styles.inputWrapper, styles.halfWidth, focusedField === 'country' && styles.inputFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Country"
                      placeholderTextColor="#999"
                      value={country}
                      onChangeText={setCountry}
                      editable={!overallLoading}
                      onFocus={() => setFocusedField('country')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <View style={[styles.inputWrapper, styles.halfWidth, focusedField === 'province' && styles.inputFocused]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Province"
                      placeholderTextColor="#999"
                      value={province}
                      onChangeText={setProvince}
                      editable={!overallLoading}
                      onFocus={() => setFocusedField('province')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
                <View style={[styles.inputWrapper, focusedField === 'town' && styles.inputFocused]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Town/City & Street Address"
                    placeholderTextColor="#999"
                    value={town}
                    onChangeText={setTown}
                    editable={!overallLoading}
                    onFocus={() => setFocusedField('town')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Contact Info - Collapsible */}
              <TouchableOpacity
                style={styles.expandSection}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowContactInfo(!showContactInfo);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.expandHeader}>
                  <Ionicons name="call" size={22} color={colors.textSecondary} />
                  <Text style={styles.expandTitle}>Contact Info (Optional)</Text>
                </View>
                <Ionicons 
                  name={showContactInfo ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>

              {showContactInfo && (
                <View style={styles.expandContent}>
                  <View style={[styles.inputWrapper, focusedField === 'phone' && styles.inputFocused]}>
                    <Ionicons name="call-outline" size={20} color={colors.iconColor} />
                    <TextInput
                      style={styles.input}
                      placeholder="Phone Number"
                      placeholderTextColor="#999"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      editable={!overallLoading}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputFocused]}>
                    <Ionicons name="mail-outline" size={20} color={colors.iconColor} />
                    <TextInput
                      style={styles.input}
                      placeholder="Contact Email"
                      placeholderTextColor="#999"
                      value={emailContact}
                      onChangeText={setEmailContact}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!overallLoading}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
              )}

              {/* Social Links - Collapsible */}
              <TouchableOpacity
                style={styles.expandSection}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowSocialLinks(!showSocialLinks);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.expandHeader}>
                  <Ionicons name="share-social" size={22} color={colors.textSecondary} />
                  <Text style={styles.expandTitle}>Social Media (Optional)</Text>
                </View>
                <Ionicons 
                  name={showSocialLinks ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>

              {showSocialLinks && (
                <View style={styles.expandContent}>
                  <View style={[styles.inputWrapper, focusedField === 'fb' && styles.inputFocused]}>
                    <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                    <TextInput
                      style={styles.input}
                      placeholder="Facebook URL"
                      placeholderTextColor="#999"
                      value={facebookUrl}
                      onChangeText={setFacebookUrl}
                      keyboardType="url"
                      autoCapitalize="none"
                      editable={!overallLoading}
                      onFocus={() => setFocusedField('fb')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <View style={[styles.inputWrapper, focusedField === 'ig' && styles.inputFocused]}>
                    <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                    <TextInput
                      style={styles.input}
                      placeholder="Instagram URL"
                      placeholderTextColor="#999"
                      value={instagramUrl}
                      onChangeText={setInstagramUrl}
                      keyboardType="url"
                      autoCapitalize="none"
                      editable={!overallLoading}
                      onFocus={() => setFocusedField('ig')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <View style={[styles.inputWrapper, focusedField === 'tw' && styles.inputFocused]}>
                    <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
                    <TextInput
                      style={styles.input}
                      placeholder="Twitter URL"
                      placeholderTextColor="#999"
                      value={twitterUrl}
                      onChangeText={setTwitterUrl}
                      keyboardType="url"
                      autoCapitalize="none"
                      editable={!overallLoading}
                      onFocus={() => setFocusedField('tw')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <View style={[styles.inputWrapper, focusedField === 'li' && styles.inputFocused]}>
                    <Ionicons name="logo-linkedin" size={20} color="#0A66C2" />
                    <TextInput
                      style={styles.input}
                      placeholder="LinkedIn URL"
                      placeholderTextColor="#999"
                      value={linkedinUrl}
                      onChangeText={setLinkedinUrl}
                      keyboardType="url"
                      autoCapitalize="none"
                      editable={!overallLoading}
                      onFocus={() => setFocusedField('li')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>
              )}


              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.createBtn, overallLoading && styles.createBtnDisabled]}
                onPress={handleCreateShop}
                disabled={overallLoading}
                activeOpacity={0.8}
              >
                {overallLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.createBtnText}>Create My Shop</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Alert Modal */}
      <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity style={styles.alertButton} onPress={hideAlert}>
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    zIndex: 10,
    padding: spacing.xs,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  required: {
    color: colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    paddingHorizontal: spacing.sm,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  textArea: {
    height: 60,
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  textAreaInput: {
    textAlignVertical: 'top',
    height: '100%',
  },
  sectionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: spacing.xs,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  locationBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  locationBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationFields: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  halfWidth: {
    flex: 1,
  },
  expandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  expandTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  expandContent: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: spacing.sm,
    borderRadius: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  errorText: {
    flex: 1,
    color: colors.error,
    fontSize: 11,
    fontWeight: '500',
  },
  createBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.xs,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createBtnDisabled: {
    opacity: 0.7,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: spacing.sm,
    padding: spacing.md,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  alertMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  alertButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: spacing.xs,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CreateShopScreen;
