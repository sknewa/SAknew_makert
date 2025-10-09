// saknew_frontend/services/authService.ts
import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserProfile } from '../types';
import secureLogger from '../utils/secureLogger';
import { InputValidator } from '../utils/inputValidator';
// Removed: import { DJOSER_FRONTEND_DOMAIN } from '../config'; // This import is not used here

// Define interfaces for API responses and request data
interface LoginResponse {
  access?: string;
  refresh?: string;
  user?: User;
  // Alternative structure where tokens might be nested
  token?: {
    access: string;
    refresh: string;
  };
}

interface RegisterData {
  email: string;
  password: string;
  re_password?: string; // Django's re_password for Djoser serializer
  first_name?: string;
  last_name?: string;
}

// Corrected: Interface for 6-digit email verification/activation
interface ActivationData { // Renamed from EmailVerificationData for consistency
  email: string;
  code: string; // Your custom 6-digit code
}

interface UserProfileResponse extends User {
  profile: UserProfile;
}

const AuthService = {
  /**
   * Handles user login by sending credentials to the custom backend login endpoint.
   * Stores access and refresh tokens upon successful login.
   * @param email User's email.
   * @param password User's password.
   * @returns Promise resolving with login response data (including tokens and user info).
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      secureLogger.log('Attempting login');
      const response = await apiClient.post<LoginResponse>('/api/accounts/login/', { email, password });
      
      secureLogger.log('Login response received');
      
      // Check if tokens exist before storing them
      if (response.data && response.data.access) {
        await AsyncStorage.setItem('access_token', response.data.access);
      } else if (response.data && response.data.token && response.data.token.access) {
        // Alternative structure where tokens might be nested under 'token'
        await AsyncStorage.setItem('access_token', response.data.token.access);
      } else {
        secureLogger.error('No access token in response');
        throw new Error('No access token received from server');
      }
      
      if (response.data && response.data.refresh) {
        await AsyncStorage.setItem('refresh_token', response.data.refresh);
      } else if (response.data && response.data.token && response.data.token.refresh) {
        // Alternative structure where tokens might be nested under 'token'
        await AsyncStorage.setItem('refresh_token', response.data.token.refresh);
      } else {
        secureLogger.error('No refresh token in response');
        throw new Error('No refresh token received from server');
      }
      
      // Normalize the response to ensure it has the expected structure
      const normalizedResponse: LoginResponse = {
        ...response.data,
        // If tokens are nested under 'token', bring them to the top level
        access: response.data.access || (response.data.token?.access),
        refresh: response.data.refresh || (response.data.token?.refresh),
      };
      
      secureLogger.log('Login successful, tokens stored');
      return normalizedResponse;
    } catch (error: any) {
      // Handle 401 Unauthorized errors specifically
      if (error.response && error.response.status === 401) {
        secureLogger.error('Login failed - Invalid credentials');
        
        // Check the exact error format from the backend
        if (error.response.data && typeof error.response.data === 'string') {
          throw new Error(error.response.data);
        } else if (error.response.data && error.response.data.detail) {
          throw new Error(error.response.data.detail);
        } else {
          throw new Error('Invalid email or password. Please try again.');
        }
      }
      
      secureLogger.error('Login failed', { status: error.response?.status });
      throw error;
    }
  },

  /**
   * Handles user registration by sending data to the custom backend registration endpoint.
   * @param data Registration data including email, password, etc.
   * @returns Promise resolving with registration response data.
   */
  async register(data: RegisterData): Promise<any> {
    try {
      // Validate and sanitize input
      if (!InputValidator.validateEmail(data.email)) {
        throw new Error('Invalid email format');
      }
      
      const sanitizedData = {
        ...data,
        email: InputValidator.sanitizeString(data.email),
        password: InputValidator.sanitizeString(data.password),
        first_name: data.first_name ? InputValidator.sanitizeString(data.first_name) : undefined,
        last_name: data.last_name ? InputValidator.sanitizeString(data.last_name) : undefined,
      };
      
      secureLogger.log('Attempting registration');
      
      const response = await apiClient.post('/api/accounts/register/', sanitizedData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      // Only log success if we get here without throwing
      if (response.status >= 200 && response.status < 300) {
        secureLogger.log('Registration successful');
        return response.data;
      } else {
        throw new Error(`Registration failed with status ${response.status}`);
      }
    } catch (error: any) {
      console.log('AuthService registration error details:', {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        message: error?.message,
        response: error?.response ? {
          status: error.response.status,
          data: error.response.data
        } : null,
        hasRequest: !!error?.request
      });
      
      secureLogger.error('Registration failed', { status: error?.response?.status, code: error?.code });
      
      // Create a properly structured error that matches what RegisterScreen expects
      const errorToThrow = new Error(error?.message || 'Registration failed');
      
      // Add response data if it exists
      if (error?.response) {
        (errorToThrow as any).response = {
          status: error.response.status,
          data: error.response.data || {}
        };
      }
      
      // Add request flag if it exists
      if (error?.request) {
        (errorToThrow as any).request = true;
      }
      
      throw errorToThrow;
    }
  },

  /**
   * Handles user logout by blacklisting the refresh token on the backend
   * and clearing tokens from local storage.
   * @returns Promise resolving when logout is complete.
   */
  async logout(): Promise<void> {
    secureLogger.log('Attempting logout');
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await apiClient.post('/api/accounts/logout/', { refresh_token: refreshToken });
        secureLogger.log('Refresh token blacklisted');
      } else {
        secureLogger.warn('No refresh token found to blacklist');
      }
    } catch (error: any) {
      secureLogger.error('Backend logout failed', { status: error.response?.status });
    } finally {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      secureLogger.log('Tokens removed from local storage');
    }
  },

  /**
   * Fetches the authenticated user's profile from the custom backend endpoint.
   * @returns Promise resolving with the user profile data.
   */
  async getUserProfile(): Promise<UserProfileResponse> {
    try {
      secureLogger.log('Fetching user profile');
      const response = await apiClient.get<UserProfileResponse>('/api/accounts/me/');
      
      // Validate the response data
      if (!response.data || !response.data.id) {
        secureLogger.error('Invalid user profile data received');
        throw new Error('Invalid user profile data');
      }
      
      // Check for token error response
      if (response.data && response.data.code === 'token_not_valid') {
        secureLogger.error('Token not valid');
        throw new Error('Token not valid: ' + response.data.detail);
      }
      
      secureLogger.log('User profile fetched successfully');
      return response.data;
    } catch (error: any) {
      secureLogger.error('Failed to fetch user profile', { status: error.response?.status });
      throw error;
    }
  },

  /**
   * Refreshes the access token using the refresh token.
   * @returns Promise resolving with the new access token, or null if refresh fails.
   */
  async refreshToken(): Promise<string | null> {
    try {
      secureLogger.log('Attempting to refresh token');
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        secureLogger.warn('No refresh token found');
        return null;
      }
      const response = await apiClient.post<LoginResponse>('/api/auth/jwt/refresh/', { refresh: refreshToken });
      
      // Check if access token exists before storing it
      if (response.data && response.data.access) {
        await AsyncStorage.setItem('access_token', response.data.access);
        secureLogger.log('Token refreshed successfully');
        return response.data.access;
      } else {
        secureLogger.error('No access token in refresh response');
        await this.logout(); // Clear tokens on refresh failure
        return null;
      }
    } catch (error: any) {
      secureLogger.error('Token refresh failed', { status: error.response?.status });
      await this.logout(); // Clear tokens on refresh failure
      throw error;
    }
  },

  /**
   * Activates a user account using the 6-digit verification code.
   * @param data Object containing email and the 6-digit code.
   * @returns Promise resolving with activation response.
   */
  async activateAccount(data: ActivationData): Promise<any> {
    try {
      secureLogger.log('Activating account');
      // Assuming /api/accounts/activate/ is the correct endpoint based on previous context
      const response = await apiClient.post('/api/accounts/activate/', data);
      secureLogger.log('Account activated successfully');
      return response.data;
    } catch (error: any) {
      secureLogger.error('Account activation failed', { status: error.response?.status });
      throw error;
    }
  },

  /**
   * Resends a 6-digit activation code for an email.
   * @param email User's email.
   * @returns Promise resolving with resend response.
   */
  async resendActivationCode(email: string): Promise<any> {
    try {
      secureLogger.log('Resending activation code');
      // Use the correct endpoint path that matches the backend URL configuration
      const response = await apiClient.post('/api/accounts/resend-verification-code/', { email });
      secureLogger.log('New activation code sent');
      return response.data;
    } catch (error: any) {
      secureLogger.error('Resend activation code failed', { status: error.response?.status });
      throw error;
    }
  },

  /**
   * Initiates the password reset process by sending a request to the custom backend endpoint.
   * @param email User's email for password reset.
   * @returns Promise resolving with reset request response.
   */
  async requestPasswordReset(email: string): Promise<any> {
    try {
      // Validate email before making request
      if (!InputValidator.validateEmail(email)) {
        throw new Error('Invalid email format');
      }
      
      secureLogger.log('Requesting password reset');
      const response = await apiClient.post('/api/auth/users/reset_password/', { email });
      secureLogger.log('Password reset request sent');
      return response.data;
    } catch (error: any) {
      secureLogger.error('Password reset request failed', { status: error.response?.status });
      throw error;
    }
  },

  /**
   * Confirms the password reset with UID, token, and new passwords to the custom backend endpoint.
   * @param uid User ID (base64 encoded).
   * @param token Password reset token.
   * @param new_password New password.
   * @param new_password2 Confirmation of the new password.
   * @returns Promise resolving with password reset confirmation response.
   */
  async confirmPasswordReset(uid: string, token: string, new_password: string, new_password2: string): Promise<any> {
    try {
      // Validate passwords match
      if (new_password !== new_password2) {
        throw new Error('Passwords do not match');
      }
      
      // Validate password strength
      if (!InputValidator.validatePassword(new_password)) {
        throw new Error('Password does not meet security requirements');
      }
      
      secureLogger.log('Confirming password reset');
      const response = await apiClient.post('/api/auth/users/reset_password_confirm/', { uid, token, new_password, new_password2 });
      secureLogger.log('Password reset confirmed successfully');
      return response.data;
    } catch (error: any) {
      secureLogger.error('Password reset confirmation failed', { status: error.response?.status });
      throw error;
    }
  },
};

export default AuthService;
