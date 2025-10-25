// saknew_frontend/screens/Auth/RegisterScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthService from '../../services/authService';
import { AuthNavigationProp } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native'; 
import { useWindowDimensions } from 'react-native';


// Centralized colors - RECOMMENDED: Move this to a separate file (e.g., ../constants/colors.ts)
const colors = {
  primary: '#4CAF50', // Green
  accent: '#FFC107', // Amber
  backgroundLight: '#F0F2F5', // Light grey for input backgrounds
  backgroundDark: '#E0E2E5', // Slightly darker grey for input active state
  card: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  error: '#EF5350',
  border: '#E0E0E0',
    iconColor: '#5C6BC0',  
  focusedBorder: '#4CAF50', // Primary color for focused border
};

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rePassword, setRePassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showRePassword, setShowRePassword] = useState<boolean>(false);
  const [isEmailFocused, setIsEmailFocused] = useState<boolean>(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState<boolean>(false);
  const [isRePasswordFocused, setIsRePasswordFocused] = useState<boolean>(false);


  const handleRegister = useCallback(async () => {
    setError(null);
    Keyboard.dismiss();

    if (!email.trim() || !password || !rePassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== rePassword) {
      setError('Passwords do not match.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.register({ email: email.trim(), password, re_password: rePassword });
      
      console.log('Registration successful:', result);
      console.log('Current navigation state before redirect:', navigation.getState());
      console.log('Navigation object:', navigation);
      
      // Add window location tracking for web
      if (typeof window !== 'undefined') {
        console.log('Current window location:', window.location.href);
      }
      
      // Force navigation using replace to ensure it works
      console.log('Attempting navigation to ActivateAccount with email:', email.trim());
      navigation.replace('ActivateAccount', { userEmail: email.trim() });
      console.log('Navigation replace call completed');
      
      // Check navigation state after
      setTimeout(() => {
        console.log('Navigation state after redirect:', navigation.getState());
        if (typeof window !== 'undefined') {
          console.log('Window location after redirect:', window.location.href);
        }
      }, 500);
    } catch (err: any) {
      console.log('AuthService registration error details:', {
        errorType: typeof err,
        errorConstructor: err?.constructor?.name,
        message: err?.message,
        response: err?.response ? {
          status: err.response.status,
          data: err.response.data
        } : null,
        hasRequest: !!err?.request
      });
      console.error('Registration failed', { status: err?.response?.status, code: err?.code });
      console.error('Registration error:', err?.response?.data || err?.message || err);
      
      // Don't show success message on error
      console.log('Registration error: ' + (err?.message || 'Unknown error'));

      let errorMessage = 'An unexpected error occurred during registration.';
      if (err?.response?.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.email) {
          errorMessage = Array.isArray(err.response.data.email) 
            ? err.response.data.email.join(', ') 
            : err.response.data.email;
        } else if (err.response.data.password) {
          errorMessage = Array.isArray(err.response.data.password) 
            ? err.response.data.password.join(', ') 
            : err.response.data.password;
        } else if (typeof err.response.data === 'object') {
          const messages = Object.values(err.response.data).flat();
          errorMessage = messages.length > 0 ? messages.join(', ') : errorMessage;
        }
      } else if (err?.request) {
        errorMessage = 'Network Error: Could not connect to the server. Please check your internet connection.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, password, rePassword, navigation]);



// Inside your RegisterScreen component:
const { height } = useWindowDimensions();
const isSmallDevice = height < 700;

return (
  <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-outline" size={28} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* ✅ Header Section (fixed position & conditionally padded for small devices) */}
          <View style={[styles.header, isSmallDevice && { paddingTop: 40 }]}>
            <Image
              source={require('../../img/Logo3.jpg')}
              style={styles.logoImage}
              // resizeMode="contain"
            />
            <Text style={styles.logoText}>Saknew Market</Text>
            <Text style={styles.welcomeSubtitle}>Create your account to start exploring.</Text>
          </View>

          {/* ✅ Input Card */}
          <View style={styles.card}>
            {/* Email Input */}
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputContainer, isEmailFocused && styles.inputFocused]}>
              <Ionicons name="mail-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
              />
            </View>

            {/* Password Input */}
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputContainer, isPasswordFocused && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Create a strong password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="newPassword"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <TouchableOpacity
                style={styles.passwordVisibilityToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.iconColor}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={[styles.inputContainer, isRePasswordFocused && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Re-enter your password"
                placeholderTextColor="#999"
                value={rePassword}
                onChangeText={setRePassword}
                secureTextEntry={!showRePassword}
                autoCapitalize="none"
                textContentType="newPassword"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setIsRePasswordFocused(true)}
                onBlur={() => setIsRePasswordFocused(false)}
              />
              <TouchableOpacity
                style={styles.passwordVisibilityToggle}
                onPress={() => setShowRePassword(!showRePassword)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showRePassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.iconColor}
                />
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && <Text style={styles.errorMessage}>{error}</Text>}

            {/* Sign Up Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={styles.registerButton}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {/* Log In Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.loginButtonText}> Log In Here</Text>
              </TouchableOpacity>
            </View>
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
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop:40,
  },
   scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',   // centers content vertically if smaller screen
    paddingHorizontal: 20,
    paddingBottom: 40,           // space above nav bar / home indicator
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
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
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 6,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.iconColor,
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.iconColor,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 11,
    color: colors.iconColor,
    textAlign: 'center',
    lineHeight: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textPrimary,
    marginBottom: 6,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    height: 40,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.focusedBorder,
    backgroundColor: colors.backgroundDark,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  passwordVisibilityToggle: {
    padding: 4,
  },
  errorMessage: {
    color: colors.error,
    fontSize: 11,
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 10,
  },
  registerButton: {
    backgroundColor: colors.iconColor,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  loginButtonText: {
    fontSize: 13,
    color: colors.iconColor,
    fontWeight: '600',
    flexShrink: 1,
  },

});

export default RegisterScreen;
