// saknew_frontend/screens/Auth/PasswordResetRequestScreen.tsx
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthService from '../../services/authService';
import { AuthNavigationProp } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';

// Centralized colors - RECOMMENDED: Move this to a separate file (e.g., ../constants/colors.ts)
const colors = {
  primary: '#4CAF50', // Green
  accent: '#FFC107', // Amber
  backgroundLight: '#F0F2F5', // Light grey for general background and input backgrounds
  backgroundDark: '#E0E2E5', // Slightly darker grey for input active state
  card: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  error: '#EF5350',
  border: '#E0E0E0',
  iconColor: '#7F8C8D',
  focusedBorder: '#4CAF50', // Primary color for focused border
};

const PasswordResetRequestScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();

  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailFocused, setIsEmailFocused] = useState<boolean>(false); // For input focus styling

  const handlePasswordResetRequest = useCallback(async () => {
    setError(null);
    Keyboard.dismiss();

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await AuthService.requestPasswordReset(email.trim());
      Alert.alert(
        'Password Reset Email Sent',
        'If an account with that email exists, you will receive a password reset link shortly. Please check your inbox (and spam folder).',
        [
          { text: 'OK', onPress: () => navigation.navigate('Login') }, // Navigate back to login
        ]
      );
    } catch (err: any) {
      console.error('Password reset request error:', err?.response?.data || err?.message || err);
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (err?.response?.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.email) {
          errorMessage = Array.isArray(err.response.data.email) 
            ? err.response.data.email.join(', ') 
            : err.response.data.email;
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
  }, [email, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
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

          {/* Header Section */}
          <View style={styles.header}>
            <Ionicons name="key-outline" size={60} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.logoText}>Saknew Market</Text>
            <Text style={styles.welcomeTitle}>Forgot Your Password?</Text>
            <Text style={styles.welcomeSubtitle}>
              Enter your email address below and we'll send you a link to reset your password.
            </Text>
          </View>

          {/* Input Card */}
          <View style={styles.card}>
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

            {error && <Text style={styles.errorMessage}>{error}</Text>}

            <TouchableOpacity
              style={styles.requestButton}
              onPress={handlePasswordResetRequest}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.requestButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remembered your password?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.loginButtonText}> Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  logoText: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
    fontWeight: '600',
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
  errorMessage: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 15,
  },
  requestButton: {
    backgroundColor: colors.primary,
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  loginButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default PasswordResetRequestScreen;
