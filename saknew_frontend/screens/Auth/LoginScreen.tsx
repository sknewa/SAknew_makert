// saknew_frontend/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
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
import { useAuth } from '../../context/AuthContext.minimal';
import { Ionicons } from '@expo/vector-icons';
import { AuthNavigationProp } from '../../navigation/types';
import { globalStyles, colors, spacing } from '../../styles/globalStyles';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';


const LoginScreen: React.FC = () => {
  // Explicitly type useNavigation
  const navigation = useNavigation<AuthNavigationProp>();

  const { login } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleLogin = async () => {
    setError(null);
    Keyboard.dismiss();

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password.trim());
    } catch (err: any) {
      safeError('Login error:', err.message);
      let userFriendlyMessage = 'An unexpected error occurred during login.';
      
      // Handle authentication errors
      if (err.message.includes('Invalid') || 
          err.message.includes('credentials') || 
          err.message.includes('password')) {
        userFriendlyMessage = err.message;
      } else if (err.response && err.response.data) {
        const data = err.response.data;

        if (data.detail) {
          userFriendlyMessage = data.detail;

          // Navigate to ActivateAccountScreen when account is not active
          if (userFriendlyMessage === 'No active account found with the given credentials') {
            Alert.alert(
              'Account Not Verified',
              'Your account is not active. Please verify your email to log in. You may need to request a new activation email if yours has expired.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Request New Activation',
                  onPress: () => navigation.navigate('ActivateAccount', { userEmail: email.trim() }),
                },
              ]
            );
            setLoading(false);
            return;
          }
        } else if (typeof data === 'object') {
          userFriendlyMessage = Object.values(data)
            .flat()
            .map(msg => String(msg))
            .join('\n');
        }
      } else if (err.request) {
        userFriendlyMessage = `Network Error: Could not connect to the server. Please check your internet connection and ensure the backend is running.`;
      } else {
        userFriendlyMessage = `Error: ${err.message}`;
      }
      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={[globalStyles.container, styles.centerContent]}>
          {/* Header Section */}
          <View style={styles.header}>
            <Image
              source={require('../../img/Logo3.jpg')}
              style={styles.logoImage}
              // resizeMode="contain"
            />

            <Text style={styles.logoText}>Saknew Market</Text>
            {/* <Text style={styles.welcomeTitle}>Welcome Back!</Text> */}
            <Text style={styles.welcomeSubtitle}>Log in to continue your shopping experience.</Text>
          </View>

          {/* Input Card */}
          <View style={[globalStyles.card, styles.inputCard]}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter your email"
                placeholderTextColor="#B0B0B0"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter your password"
                placeholderTextColor="#B0B0B0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.passwordVisibilityToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.iconColor}
                />
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorMessage}>{error}</Text>}

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('PasswordResetRequest')} // Ensure this is correct
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={loading}>
              <Text style={styles.registerButtonText}> Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputCard: {
    width: '100%',
    maxWidth: 400,
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 6,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.iconColor,
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
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
    backgroundColor: colors.background,
    height: 40,
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
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
  loginButton: {
    backgroundColor: colors.iconColor,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    marginTop: 10,
    alignSelf: 'center',
  },
  forgotPasswordText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  registerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  registerButtonText: {
    fontSize: 13,
    color: colors.iconColor,
    fontWeight: '600',
  },
});

export default LoginScreen;
