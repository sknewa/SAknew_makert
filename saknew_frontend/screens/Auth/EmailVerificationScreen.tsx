// saknew_frontend/screens/Auth/EmailVerificationScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import AuthService from '../../services/authService'; // Ensure AuthService is imported
import { AuthNavigationProp, AuthStackParamList } from '../../navigation/types'; // Ensure AuthNavigationProp is imported
import { Ionicons } from '@expo/vector-icons';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

// Define the route prop type for this screen using the correct name from types.ts
type EmailVerificationScreenRouteProp = RouteProp<AuthStackParamList, 'EmailVerification'>;

// Centralized colors (consider moving this to a separate file, e.g., ../constants/colors.ts)
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

const EmailVerificationScreen: React.FC = () => {
  // Explicitly type useNavigation
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<EmailVerificationScreenRouteProp>(); // Type useRoute correctly
  const { userEmail } = route.params || {}; // Safely access userEmail from route params

  const [email, setEmail] = useState<string>(userEmail || '');
  const [code, setCode] = useState<string>(''); // For the 6-digit code
  const [loading, setLoading] = useState<boolean>(false);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const RESEND_COOLDOWN_SECONDS = 60; // 60 seconds cooldown

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

  const handleVerifyEmail = useCallback(async () => {
    setError(null);
    Keyboard.dismiss();

    // Validation for email and 6-digit code
    if (!email.trim() || !code.trim()) {
      setError('Email and verification code are required.');
      return;
    }

    if (code.trim().length !== 6 || !/^\d{6}$/.test(code.trim())) {
      setError('Verification code must be a 6-digit number.');
      return;
    }

    setLoading(true);
    try {
      // CHANGED: Call AuthService.activateAccount instead of AuthService.verifyEmail
      await AuthService.activateAccount({ email: email.trim(), code: code.trim() });
      Alert.alert('Success!', 'Your email has been verified. You can now log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      safeError('Email verification error:', err.response?.data || err.message);
      let errorMessage = 'An unexpected error occurred during verification.';
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
      setLoading(false);
    }
  }, [email, code, navigation]);

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
      // CHANGED: Call AuthService.resendActivationCode instead of AuthService.resendVerificationCode
      await AuthService.resendActivationCode(email.trim());
      Alert.alert('Success!', 'A new verification code has been sent to your email.', [{ text: 'OK' }]);
      setResendTimer(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      safeError('Resend code error:', err.response?.data || err.message);
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
            <Text style={styles.welcomeTitle}>Verify Your Email</Text>
            <Text style={styles.welcomeSubtitle}>
              Please enter the 6-digit code sent to{' '}
              <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>{email || 'your email'}</Text>{' '}
              to activate your account.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Email Address (for resending)</Text>
            <View style={styles.inputContainer}>
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
                editable={!loading && !resendLoading}
              />
            </View>

            <Text style={styles.inputLabel}>Verification Code</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.inputField}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#999"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && !resendLoading}
              />
            </View>

            {error && <Text style={styles.errorMessage}>{error}</Text>}

            <TouchableOpacity
              style={styles.verifyButton}
              onPress={handleVerifyEmail}
              disabled={loading || resendLoading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resendLoading || resendTimer > 0}
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
            <Text style={styles.loginText}>Remembered your password?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
    height: 55,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
  verifyButton: {
    backgroundColor: colors.primary,
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  resendButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 5,
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

export default EmailVerificationScreen;
