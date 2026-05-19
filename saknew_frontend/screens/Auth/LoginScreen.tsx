// saknew_frontend/screens/Auth/LoginScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
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
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { AuthNavigationProp } from '../../navigation/types';
import { globalStyles, colors, spacing, radius } from '../../styles/globalStyles';
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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress: () => void; type?: 'primary' | 'secondary' | 'warning' | 'danger' }>;
  } | null>(null);

  // Debug: Log error states when they change
  useEffect(() => {
    console.log('Error states updated:', { error, emailError, passwordError });
  }, [error, emailError, passwordError]);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('Modal state updated:', { showAlertModal, alertModalConfig });
  }, [showAlertModal, alertModalConfig]);

  const handleLogin = async () => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    Keyboard.dismiss();

    // Field-level validation
    let hasError = false;
    if (!email.trim()) {
      setEmailError('Email address is required.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    }
    if (!password.trim()) {
      setPasswordError('Password is required.');
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      await login(email.trim(), password.trim());
    } catch (err: any) {
      const msg: string = err?.message || '';
      const errorType = err?.errorType || 'UNKNOWN_ERROR';
      
      console.log('Login error caught:', { msg, errorType, err }); // Debug log
      
      // Clear previous errors
      setError(null);
      setEmailError(null);
      setPasswordError(null);
      
      // Handle specific error types with targeted UI feedback
      if (errorType === 'ACCOUNT_NOT_FOUND') {
        setEmailError('No account found with this email address.');
        setError('No account found with this email address. Please register first or check your email.');
        console.log('Set ACCOUNT_NOT_FOUND errors:', { emailError: 'No account found...', error: 'No account found...' });
      } else if (errorType === 'WRONG_PASSWORD') {
        setPasswordError('Incorrect password.');
        setError('Incorrect password. Please try again or reset your password.');
        console.log('Set WRONG_PASSWORD errors:', { passwordError: 'Incorrect password.', error: 'Incorrect password...' });
      } else if (errorType === 'EMAIL_NOT_VERIFIED') {
        setError('Your email is not verified yet. Please check your inbox for the verification code.');
        setTimeout(() => navigation.navigate('ActivateAccount', { userEmail: email.trim() }), 2000);
      } else if (msg.includes('network') || msg.includes('connect')) {
        setError('Cannot connect to the server. Please check your internet connection and try again.');
      } else {
        // Fallback for unknown errors
        setError(msg || 'Login failed. Please try again.');
      }
      
      // Show alert for critical errors
      if (errorType === 'ACCOUNT_NOT_FOUND' || errorType === 'WRONG_PASSWORD') {
        console.log('🚨 ALERT: About to show modal for errorType:', errorType);
        
        const alertTitle = 'Login Failed';
        const alertMessage = errorType === 'ACCOUNT_NOT_FOUND' 
          ? 'No account found with this email. Would you like to register?'
          : 'Incorrect password. Please check your password and try again.';
        
        const alertButtons = [
          { text: 'Try Again', onPress: () => {
            console.log('Try Again pressed - retrying login');
            setShowAlertModal(false);
            // Retry the login with current credentials
            setTimeout(() => handleLogin(), 100); // Small delay to allow modal to close
          }, type: 'secondary' },
          errorType === 'ACCOUNT_NOT_FOUND' ? 
            { text: 'Register', onPress: () => {
              console.log('Register pressed, navigating...');
              setShowAlertModal(false);
              navigation.navigate('Register');
            }, type: 'warning' } : 
            { text: 'Reset Password', onPress: () => {
              console.log('Reset Password pressed, navigating...');
              setShowAlertModal(false);
              navigation.navigate('PasswordResetRequest');
            }, type: 'danger' }
        ];
        
        // Set modal state for in-app alert
        setAlertModalConfig({ title: alertTitle, message: alertMessage, buttons: alertButtons });
        setShowAlertModal(true);
        
        console.log('🚨 ALERT: Modal configured and shown, request setShowAlertModal(true)');
        
        // Also show a fallback alert on web
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
          window.alert(`${alertTitle}\n\n${alertMessage}`);
          console.log('🚨 ALERT: Fallback window.alert shown on web');
        } else {
          // Native fallback for mobile/desktop
          setTimeout(() => {
            Alert.alert(alertTitle, alertMessage, alertButtons);
            console.log('🚨 ALERT: Fallback Alert.alert shown');
          }, 100);
        }
      } else {
        console.log('🚨 ALERT: Not showing alert because errorType is:', errorType);
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6FB" />
      {/* SA flag colour bar */}
      <View style={s.flagBar}>
        {['#007A4D','#FFB81C','#DE3831','#002395','#000000','#FFFFFF'].map((c, i) => (
          <View key={i} style={[s.flagSegment, { backgroundColor: c }]} />
        ))}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View style={s.hero}>
            <View style={s.logoWrap}>
              <Image source={require('../../img/weblog.jpg')} style={s.logo} />
            </View>
            <Text style={s.brand}><Text style={s.brandSA}>SA</Text>Makert</Text>
            <Text style={s.tagline}>South Africa's marketplace</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back 👋</Text>
            <Text style={s.cardSub}>Sign in to continue shopping</Text>

            {error && (
              <View style={[s.errorBox, { borderWidth: 2, borderColor: '#DC2626', backgroundColor: '#FEF2F2', marginBottom: 16, padding: 12 }]}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={[s.errorText, { fontSize: 14, fontWeight: '600', color: '#DC2626', flex: 1 }]}>{error}</Text>
              </View>
            )}

            <Text style={s.label}>Email address</Text>
            <View style={[s.inputWrap, emailFocused && s.inputWrapFocused, emailError && s.inputWrapError]}>
              <Ionicons name="mail-outline" size={18} color={emailError ? '#EF4444' : emailFocused ? '#FFB81C' : '#94A3B8'} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(null); setError(null); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />
            </View>
            {emailError && (
              <View style={s.fieldErrorRow}>
                <Ionicons name="alert-circle" size={13} color="#EF4444" />
                <Text style={s.fieldErrorText}>{emailError}</Text>
              </View>
            )}

            <Text style={s.label}>Password</Text>
            <View style={[s.inputWrap, passwordFocused && s.inputWrapFocused, passwordError && s.inputWrapError]}>
              <Ionicons name="lock-closed-outline" size={18} color={passwordError ? '#EF4444' : passwordFocused ? '#FFB81C' : '#94A3B8'} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Your password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(t) => { setPassword(t); setPasswordError(null); setError(null); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {passwordError && (
              <View style={s.fieldErrorRow}>
                <Ionicons name="alert-circle" size={13} color="#EF4444" />
                <Text style={s.fieldErrorText}>{passwordError}</Text>
              </View>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('PasswordResetRequest')} style={s.forgotWrap}>
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
            <View style={{ height: 8 }} />

            <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Sign In</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.footerLink}> Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Alert Modal */}
      <Modal
        visible={showAlertModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View style={s.modalOverlay}>
        <View style={[s.modalContent, globalStyles.card]}>
          <Text style={[s.modalTitle, globalStyles.h4]}>{alertModalConfig?.title}</Text>
          <Text style={[s.modalMessage, globalStyles.body]}>{alertModalConfig?.message}</Text>
          <View style={s.modalButtons}>
            {alertModalConfig?.buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  s.modalButton,
                  button.type === 'primary' && globalStyles.btnPrimary,
                  button.type === 'warning' && s.modalButtonWarning,
                  button.type === 'danger' && s.modalButtonDanger,
                  button.type === 'secondary' && globalStyles.btnOutline,
                ]}
                onPress={button.onPress}
              >
                <Text style={[
                  s.modalButtonText,
                  button.type === 'primary' && globalStyles.btnText,
                  button.type === 'warning' && globalStyles.btnText,
                  button.type === 'danger' && globalStyles.btnText,
                  button.type === 'secondary' && globalStyles.btnOutlineText,
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F4F6FB' },
  flagBar: { flexDirection: 'row', height: 3, width: '100%' },
  flagSegment: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  hero:   { alignItems: 'center', marginBottom: 32 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF0FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#007A4D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  logo:    { width: 72, height: 72, borderRadius: 36 },
  brand:   { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: 1.5 },
  brandSA: { color: '#FFB81C' },
  tagline: { fontSize: 13, color: '#64748B', marginTop: 4 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardSub:   { fontSize: 13, color: '#64748B', marginBottom: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '500' },

  label:    { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 14, marginBottom: 4, height: 50,
  },
  inputWrapFocused: {
    borderColor: '#FFB81C', borderWidth: 1.5, backgroundColor: '#FFFDF5',
  },
  inputWrapError: {
    borderColor: '#EF4444', backgroundColor: '#FFF5F5',
  },
  fieldErrorRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 2,
  },
  fieldErrorText: {
    fontSize: 12, color: '#EF4444', marginLeft: 4, fontWeight: '500',
  },
  inputIcon: { marginRight: 10 },
  input:    { flex: 1, fontSize: 15, color: '#0F172A' },
  eyeBtn:   { padding: 4 },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 12, marginTop: 4 },
  forgotText: { fontSize: 13, color: '#002395', fontWeight: '600' },

  btn: {
    backgroundColor: '#007A4D', borderRadius: 14, height: 52,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#007A4D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#64748B' },
  footerLink: { fontSize: 14, color: '#002395', fontWeight: '700' },

  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    margin: 20,
    maxWidth: 420,
    width: '92%',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    marginLeft: 12,
  },
  modalButtonWarning: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
    marginLeft: 12,
  },
  modalButtonDanger: {
    backgroundColor: colors.error,
    borderColor: colors.error,
    marginLeft: 12,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtonTextPrimary: {
    color: colors.buttonText,
  }
});

export default LoginScreen;
