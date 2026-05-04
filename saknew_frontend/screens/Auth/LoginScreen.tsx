// saknew_frontend/screens/Auth/LoginScreen.tsx
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
      if (msg === 'INVALID_CREDENTIALS') {
        setPasswordError('Incorrect email or password. Please try again.');
        setError('Incorrect email or password. Please check your details and try again.');
      } else if (msg === 'EMAIL_NOT_VERIFIED') {
        setError('Your email is not verified yet. Please check your inbox for the verification code.');
        setTimeout(() => navigation.navigate('ActivateAccount', { userEmail: email.trim() }), 2000);
      } else if (msg === 'NETWORK_ERROR') {
        setError('Cannot connect to the server. Please check your internet connection and try again.');
      } else {
        setError(msg || 'Login failed. Please try again.');
      }
    } finally {
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
              <View style={s.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={s.errorText}>{error}</Text>
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
});

export default LoginScreen;
