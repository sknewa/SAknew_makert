import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, Keyboard, Image, ScrollView, useWindowDimensions, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthService from '../../services/authService';
import { AuthNavigationProp } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';


// Centralized colors - RECOMMENDED: Move this to a separate file (e.g., ../constants/colors.ts)
const colors = {
  primary: '#007A4D',
  accent: '#FFB81C',
  blue: '#002395',
  backgroundLight: '#F0F2F5',
  card: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  error: '#EF5350',
  border: '#E2E8F0',
  iconColor: '#64748B',
  focusedBorder: '#FFB81C',
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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [rePasswordError, setRePasswordError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rePasswordFocused, setRePasswordFocused] = useState(false);

  const handleRegister = useCallback(async () => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setRePasswordError(null);
    Keyboard.dismiss();

    let hasError = false;
    if (!email.trim()) {
      setEmailError('Email address is required.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      hasError = true;
    }
    if (!rePassword) {
      setRePasswordError('Please confirm your password.');
      hasError = true;
    } else if (password !== rePassword) {
      setRePasswordError('Passwords do not match.');
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      await AuthService.register({ email: email.trim(), password, re_password: rePassword });
      navigation.replace('ActivateAccount', { userEmail: email.trim() });
    } catch (err: any) {
      let errorMessage = 'Registration failed. Please try again.';
      if (err?.response?.data) {
        const data = err.response.data;
        if (data.email) {
          const msg = Array.isArray(data.email) ? data.email[0] : data.email;
          setEmailError(msg);
          return;
        } else if (data.password) {
          const msg = Array.isArray(data.password) ? data.password[0] : data.password;
          setPasswordError(msg);
          return;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else {
          const msgs = Object.values(data).flat();
          errorMessage = msgs.length > 0 ? (msgs[0] as string) : errorMessage;
        }
      } else if (err?.request) {
        errorMessage = 'Cannot connect to the server. Please check your internet connection.';
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
    <StatusBar barStyle="dark-content" backgroundColor="#F0F2F5" />
    {/* SA flag colour bar */}
    <View style={styles.flagBar}>
      {['#007A4D','#FFB81C','#DE3831','#002395','#000000','#FFFFFF'].map((c, i) => (
        <View key={i} style={[styles.flagSegment, { backgroundColor: c }]} />
      ))}
    </View>
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
              source={require('../../img/weblog.jpg')}
              style={styles.logoImage}
              // resizeMode="contain"
            />
            <Text style={styles.logoText}><Text style={styles.logoSA}>SA</Text>Makert</Text>
            <Text style={styles.welcomeSubtitle}>Create your account to start exploring.</Text>
          </View>

          {/* ✅ Input Card */}
          <View style={styles.card}>
            {/* Email Input */}
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputContainer, emailFocused && styles.inputFocused, emailError && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={emailError ? colors.error : emailFocused ? colors.accent : colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter your email"
                placeholderTextColor="#B0B0B0"
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(null); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {emailError && <Text style={styles.fieldError}>{emailError}</Text>}

            {/* Password Input */}
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputContainer, passwordFocused && styles.inputFocused, passwordError && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={passwordError ? colors.error : passwordFocused ? colors.accent : colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="At least 8 characters"
                placeholderTextColor="#B0B0B0"
                value={password}
                onChangeText={(t) => { setPassword(t); setPasswordError(null); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="newPassword"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity style={styles.passwordVisibilityToggle} onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.iconColor} />
              </TouchableOpacity>
            </View>
            {passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}

            {/* Confirm Password Input */}
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={[styles.inputContainer, rePasswordFocused && styles.inputFocused, rePasswordError && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={rePasswordError ? colors.error : rePasswordFocused ? colors.accent : colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Re-enter your password"
                placeholderTextColor="#B0B0B0"
                value={rePassword}
                onChangeText={(t) => { setRePassword(t); setRePasswordError(null); }}
                onFocus={() => setRePasswordFocused(true)}
                onBlur={() => setRePasswordFocused(false)}
                secureTextEntry={!showRePassword}
                autoCapitalize="none"
                textContentType="newPassword"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity style={styles.passwordVisibilityToggle} onPress={() => setShowRePassword(!showRePassword)} disabled={loading}>
                <Ionicons name={showRePassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.iconColor} />
              </TouchableOpacity>
            </View>
            {rePasswordError && <Text style={styles.fieldError}>{rePasswordError}</Text>}

            {/* Error Message */}
            {error && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#FECACA' }}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.errorMessage, { flex: 1, marginBottom: 0, backgroundColor: 'transparent', padding: 0, marginLeft: 8, textAlign: 'left' }]}>{error}</Text>
              </View>
            )}

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
  safeArea: { flex: 1, backgroundColor: colors.backgroundLight },
  flagBar: { flexDirection: 'row', height: 3, width: '100%' },
  flagSegment: { flex: 1 },
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
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  logoSA: {
    color: '#FFB81C',
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
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
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
    backgroundColor: '#F8FAFF',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputFocused: {
    borderColor: '#FFB81C',
    borderWidth: 1.5,
    backgroundColor: '#FFFDF5',
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
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
  },
  fieldError: {
    color: colors.error,
    fontSize: 11,
    marginTop: -6,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FFF5F5',
  },
  registerButton: {
    backgroundColor: '#007A4D',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#007A4D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
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
    color: '#002395',
    fontWeight: '600',
    flexShrink: 1,
  },

});

export default RegisterScreen;
