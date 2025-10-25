// saknew_frontend/screens/Auth/ActivateAccountScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert, // Import Alert for user feedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AuthService from '../../services/authService'; // Import AuthService
import { AuthStackParamList, AuthNavigationProp } from '../../navigation/types';

// Define the route prop type for ActivateAccountScreen
type ActivateAccountScreenRouteProp = RouteProp<AuthStackParamList, 'ActivateAccount'>;

const colors = {
  primary: '#4CAF50', // Green
  backgroundLight: '#F0F2F5',
  backgroundDark: '#E0E2E5', // Slightly darker grey for input active state
  card: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  error: '#EF5350',
  success: '#2ECC71',
  info: '#3498DB',
  border: '#E0E0E0',
  iconColor: '#7F8C8D',
  focusedBorder: '#4CAF50', // Primary color for focused border
  buttonBg: '#4CAF50',
  buttonText: '#FFFFFF',
};

const ActivateAccountScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<ActivateAccountScreenRouteProp>();
  const { userEmail } = route.params || {}; // Get userEmail from route params

  const [email, setEmail] = useState<string>(userEmail || ''); // State for email, pre-filled if passed
  const [activationCode, setActivationCode] = useState<string>(''); // State for the activation code
  const [loading, setLoading] = useState<boolean>(false);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const RESEND_COOLDOWN_SECONDS = 60; // 60 seconds cooldown

  const [isCodeFocused, setIsCodeFocused] = useState<boolean>(false);

  // Set initial email if passed from registration screen
  useEffect(() => {
    if (userEmail && email === '') {
      setEmail(userEmail);
    }
  }, [userEmail, email]);

  // Resend timer logic
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;
    if (resendTimer > 0) {
      timerInterval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0 && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [resendTimer]);

  const handleActivateAccount = useCallback(async () => {
    setError(null);
    Keyboard.dismiss();

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!activationCode.trim()) {
      setError('Activation code is required.');
      return;
    }
    if (activationCode.trim().length !== 6 || !/^\d{6}$/.test(activationCode.trim())) {
      setError('Activation code must be a 6-digit number.');
      return;
    }

    setLoading(true);
    try {
      // Call the actual AuthService method to activate the account
      await AuthService.activateAccount({ email: email.trim(), code: activationCode.trim() });

      navigation.replace('Login');
    } catch (err: any) {
      console.error('Account activation error:', err.response?.data || err.message);
      let errorMessage = 'An unexpected error occurred during activation. Please try again.';

      if (err.response && err.response.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (typeof err.response.data === 'object') {
          errorMessage = Object.values(err.response.data)
            .flat()
            .map(msg => String(msg))
            .join('\n');
        }
      } else if (err.request) {
        errorMessage = `Network Error: Could not connect to the server. Please check your internet connection.`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, activationCode, navigation]);

  const handleResendCode = useCallback(async () => {
    setError(null);
    Keyboard.dismiss();

    if (!email.trim()) {
      setError('Email is required to resend the code.');
      return;
    }

    if (resendTimer > 0) {
      Alert.alert('Please Wait', `You can resend the code in ${resendTimer} seconds.`);
      return;
    }

    setResendLoading(true);
    try {
      await AuthService.resendActivationCode(email.trim()); // Corrected method call
      Alert.alert('Success!', 'A new verification code has been sent to your email.', [{ text: 'OK' }]);
      setResendTimer(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      console.error('Resend code error:', err.response?.data || err.message);
      let errorMessage = 'Failed to resend verification code.';
      if (err.response && err.response.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (typeof err.response.data === 'object') {
          errorMessage = Object.values(err.response.data)
            .flat()
            .map(msg => String(msg))
            .join('\n');
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setResendLoading(false);
    }
  }, [email, resendTimer]);


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading || resendLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back-outline" size={28} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Ionicons name="mail-open-outline" size={60} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.logoText}>Saknew Market</Text>
            <Text style={styles.welcomeTitle}>Activate Your Account</Text>
            <Text style={styles.welcomeSubtitle}>
              Please enter the 6-digit code sent to{' '}
              <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>{email || 'your email'}</Text>{' '}
              to activate your account.
            </Text>
          </View>

          <View style={styles.card}>
            {/* Email Address (for resending) - can be read-only if pre-filled */}
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputContainer, { marginBottom: 20 }]}>
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
                editable={!loading && !resendLoading && !userEmail} // Editable only if not pre-filled
              />
            </View>

            {/* Activation Code Input */}
            <Text style={styles.inputLabel}>Activation Code</Text>
            <View style={[styles.inputContainer, isCodeFocused && styles.inputFocused]}>
              <Ionicons name="key-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#999"
                value={activationCode}
                onChangeText={setActivationCode}
                keyboardType="number-pad"
                maxLength={6}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && !resendLoading}
                onFocus={() => setIsCodeFocused(true)}
                onBlur={() => setIsCodeFocused(false)}
              />
            </View>

            {error && <Text style={styles.errorMessage}>{error}</Text>}

            <TouchableOpacity
              style={styles.activateButton}
              onPress={handleActivateAccount}
              disabled={loading || resendLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.activateButtonText}>Activate Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resendLoading || resendTimer > 0}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resendButtonText,
                    (resendLoading || resendTimer > 0) && { color: colors.textSecondary },
                  ]}
                >
                  {resendLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : resendTimer > 0 ? (
                    `Resend in ${resendTimer}s`
                  ) : (
                    'Resend Code'
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading || resendLoading} activeOpacity={0.7}>
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
    marginBottom: 6,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 6,
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
  errorMessage: {
    color: colors.error,
    fontSize: 11,
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 10,
  },
  activateButton: {
    backgroundColor: colors.primary,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  activateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  resendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  resendButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 5,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  loginButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default ActivateAccountScreen;
