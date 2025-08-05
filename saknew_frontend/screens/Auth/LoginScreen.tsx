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
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { AuthNavigationProp } from '../../navigation/types'; // Ensure AuthNavigationProp is imported


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
      console.error('Login error:', err.message);
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.container}>
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
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
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
              />
            </View>

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter your password"
                placeholderTextColor="#999"
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

const colors = {
  primary: '#2ECC71',       // Vivid green (replaces dull #4CAF50)
  accent: '#FFB300',        // Deep amber with good contrast
  background: '#F9FAFB',    // Very soft light gray
  card: '#FFFFFF',          // Clean white for card surfaces
  textPrimary: '#1A1A1A',   // Near-black for good readability
  textSecondary: '#4F4F4F', // Softer but clear secondary text
  error: '#E53935',         // Rich red for errors
  border: '#DADDE1',        // Subtle gray for dividers/borders
  iconColor: '#5C6BC0',     // Blue-purple for modern feel
  backendBaseUrl: 'http://192.168.8.102:8000', // This should ideally be in a config file
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
  logoImage: {
  width: 100,
  height: 100,
  borderRadius: 100,
  marginBottom: 10,

},
  header: {
    marginBottom: 40,
    alignItems: 'center',  
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.iconColor,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.iconColor,
    textAlign: 'center',
    lineHeight: 22,
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
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  passwordVisibilityToggle: {
    padding: 5,
  },
  errorMessage: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: colors.iconColor,
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    marginTop: 15,
    alignSelf: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  registerButtonText: {
    fontSize: 16,
    color: colors.iconColor,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
