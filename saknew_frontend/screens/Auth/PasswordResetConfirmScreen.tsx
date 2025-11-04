// saknew_frontend/screens/Auth/PasswordResetConfirmScreen.tsx
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
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import AuthService from '../../services/authService';
import { AuthNavigationProp, AuthStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

type PasswordResetConfirmScreenRouteProp = RouteProp<AuthStackParamList, 'PasswordResetConfirm'>;

const colors = {
  primary: '#4CAF50',
  background: '#F0F2F5',
  card: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  error: '#EF5350',
  border: '#E0E0E0',
  iconColor: '#7F8C8D',
  focusedBorder: '#4CAF50',
};

const PasswordResetConfirmScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<PasswordResetConfirmScreenRouteProp>();
  const { uid: routeUid, token: routeToken } = route.params || {};

  const [uid, setUid] = useState<string>(routeUid || '');
  const [token, setToken] = useState<string>(routeToken || '');
  const [newPassword, setNewPassword] = useState<string>('');
  const [reNewPassword, setReNewPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showReNewPassword, setShowReNewPassword] = useState<boolean>(false);
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState<boolean>(false);
  const [isReNewPasswordFocused, setIsReNewPasswordFocused] = useState<boolean>(false);
  const [isUidFocused, setIsUidFocused] = useState<boolean>(false);
  const [isTokenFocused, setIsTokenFocused] = useState<boolean>(false);

  useEffect(() => {
    if (routeUid && uid === '') setUid(routeUid);
    if (routeToken && token === '') setToken(routeToken);
  }, [routeUid, routeToken, uid, token]);

  const handlePasswordResetConfirm = useCallback(async () => {
    setError(null);
    Keyboard.dismiss();

    if (!uid.trim() || !token.trim() || !newPassword || !reNewPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword !== reNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await AuthService.confirmPasswordReset(uid.trim(), token.trim(), newPassword, reNewPassword);
      navigation.navigate('Login');
      Alert.alert('Success!', 'Your password has been reset. You can now log in with your new password.');
    } catch (err: any) {
      safeError('Password reset confirmation error:', err.response?.data || err.message);
      let errorMessage = 'An unexpected error occurred during password reset.';

      if (err.response && err.response.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (typeof err.response.data === 'object') {
          errorMessage = Object.values(err.response.data).flat().map(msg => String(msg)).join('\n');
        }
      } else if (err.request) {
        errorMessage = `Network Error: Could not connect to the server. Please check your internet connection.`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setLoading(false);
    }
  }, [uid, token, newPassword, reNewPassword, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={loading} activeOpacity={0.7}>
            <Ionicons name="arrow-back-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Ionicons name="lock-open-outline" size={48} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.logoText}>Saknew Market</Text>
            <Text style={styles.welcomeTitle}>Reset Your Password</Text>
            <Text style={styles.welcomeSubtitle}>Please enter your new password below.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={[styles.inputContainer, isNewPasswordFocused && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                textContentType="newPassword"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setIsNewPasswordFocused(true)}
                onBlur={() => setIsNewPasswordFocused(false)}
              />
              <TouchableOpacity style={styles.passwordVisibilityToggle} onPress={() => setShowNewPassword(!showNewPassword)} disabled={loading} activeOpacity={0.7}>
                <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.iconColor} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={[styles.inputContainer, isReNewPasswordFocused && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.iconColor} style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Re-enter new password"
                placeholderTextColor="#999"
                value={reNewPassword}
                onChangeText={setReNewPassword}
                secureTextEntry={!showReNewPassword}
                autoCapitalize="none"
                textContentType="newPassword"
                autoCorrect={false}
                editable={!loading}
                onFocus={() => setIsReNewPasswordFocused(true)}
                onBlur={() => setIsReNewPasswordFocused(false)}
              />
              <TouchableOpacity style={styles.passwordVisibilityToggle} onPress={() => setShowReNewPassword(!showReNewPassword)} disabled={loading} activeOpacity={0.7}>
                <Ionicons name={showReNewPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.iconColor} />
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorMessage}>{error}</Text>}

            <TouchableOpacity style={styles.resetButton} onPress={handlePasswordResetConfirm} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.resetButtonText}>Reset Password</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remembered your password?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginButtonText}> Go to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardAvoidingContainer: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 20, zIndex: 10, padding: 5 },
  header: { marginBottom: 16, alignItems: 'center' },
  headerIcon: { marginBottom: 6 },
  logoText: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 4, letterSpacing: 0.5 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4, textAlign: 'center' },
  welcomeSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 6 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 16 },
  inputLabel: { fontSize: 13, color: colors.textPrimary, marginBottom: 6, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, height: 44, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  inputFocused: { borderColor: colors.focusedBorder, borderWidth: 2 },
  inputIcon: { marginRight: 8 },
  inputField: { flex: 1, fontSize: 14, color: colors.textPrimary },
  passwordVisibilityToggle: { padding: 4 },
  errorMessage: { color: colors.error, fontSize: 12, textAlign: 'center', marginTop: -6, marginBottom: 10 },
  resetButton: { backgroundColor: colors.primary, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 6, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  resetButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, justifyContent: 'center' },
  loginText: { fontSize: 14, color: colors.textSecondary },
  loginButtonText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});

export default PasswordResetConfirmScreen;
