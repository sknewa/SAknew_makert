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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import AuthService from '../../services/authService';
import { AuthNavigationProp, AuthStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';

// Define the route prop type for this screen using the correct name from types.ts
type PasswordResetConfirmScreenRouteProp = RouteProp<AuthStackParamList, 'PasswordResetConfirm'>;

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

const PasswordResetConfirmScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<PasswordResetConfirmScreenRouteProp>(); // Type useRoute correctly
  const { uid: routeUid, token: routeToken } = route.params || {}; // Extract uid and token from route params

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


  // Populate UID and Token from deep link if available
  useEffect(() => {
    if (routeUid && uid === '') {
      setUid(routeUid);
    }
    if (routeToken && token === '') {
      setToken(routeToken);
    }
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
      await AuthService.confirmPasswordReset(
        uid.trim(),
        token.trim(),
        newPassword,
        reNewPassword
      );
      Alert.alert('Success!', 'Your password has been reset. You can now log in with your new password.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      console.error('Password reset confirmation error:', err.response?.data || err.message);
      let errorMessage = 'An unexpected error occurred during password reset.';

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
  }, [uid, token, newPassword, reNewPassword, navigation]);

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
            <Ionicons name="lock-open-outline" size={60} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.logoText}>Saknew Market</Text>
            <Text style={styles.welcomeTitle}>Reset Your Password</Text>
            <Text style={styles.welcomeSubtitle}>
              Please enter your new password below.
              {!(routeUid && routeToken) && ( // Only show if UID/Token not from deep link
                <Text style={styles.warningText}>
                  You may need to manually enter the User ID (UID) and Token from your reset email.
                </Text>
              )}
            </Text>
          </View>

          {/* Input Card */}
          <View style={styles.card}>
            {/* UID Input - Read-only if from deep link, otherwise editable */}
            <Text style={styles.inputLabel}>User ID (UID)</Text>
            <View style={[styles.inputContainer, isUidFocused && styles.inputFocused]}>
              <TextInput
                style={styles.inputField}
                placeholder="Enter User ID from email"
                placeholderTextColor="#999"
                value={uid}
                onChangeText={setUid}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && !routeUid} // Editable only if not from route params
                onFocus={() => setIsUidFocused(true)}
                onBlur={() => setIsUidFocused(false)}
              />
            </View>

            {/* Token Input - Read-only if from deep link, otherwise editable */}
            <Text style={styles.inputLabel}>Reset Token</Text>
            <View style={[styles.inputContainer, isTokenFocused && styles.inputFocused]}>
              <TextInput
                style={styles.inputField}
                placeholder="Enter Reset Token from email"
                placeholderTextColor="#999"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && !routeToken} // Editable only if not from route params
                multiline={true} // Allow multiple lines for long token
                numberOfLines={2} // Suggests 2 lines initially
                onFocus={() => setIsTokenFocused(true)}
                onBlur={() => setIsTokenFocused(false)}
              />
            </View>

            <Text style={styles.inputLabel}>New Password</Text>
            <View style={[styles.inputContainer, isNewPasswordFocused && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
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
              <TouchableOpacity
                style={styles.passwordVisibilityToggle}
                onPress={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.iconColor}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={[styles.inputContainer, isReNewPasswordFocused && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.iconColor} style={styles.inputIcon} />
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
              <TouchableOpacity
                style={styles.passwordVisibilityToggle}
                onPress={() => setShowReNewPassword(!showReNewPassword)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showReNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.iconColor}
                />
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.errorMessage}>{error}</Text>}

            <TouchableOpacity
              style={styles.resetButton}
              onPress={handlePasswordResetConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
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
  warningText: {
    fontSize: 13,
    color: colors.error,
    marginTop: 10,
    fontStyle: 'italic',
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
    backgroundColor: colors.backgroundLight, // Use light background for input field
    height: 55,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.focusedBorder, // Highlight color on focus
    backgroundColor: colors.backgroundDark, // Slightly darker background on focus
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
  resetButton: {
    backgroundColor: colors.primary,
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
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

export default PasswordResetConfirmScreen;
