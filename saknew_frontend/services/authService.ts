// saknew_frontend/services/authService.ts
import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserProfile } from '../types';
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
      console.log('AuthService: Attempting login to custom endpoint...');
      const response = await apiClient.post<LoginResponse>('/api/accounts/login/', { email, password });
      
      // Log the full response structure for debugging
      console.log('AuthService: Login response structure:', JSON.stringify(response.data));
      
      // Check if tokens exist before storing them
      if (response.data && response.data.access) {
        await AsyncStorage.setItem('access_token', response.data.access);
      } else if (response.data && response.data.token && response.data.token.access) {
        // Alternative structure where tokens might be nested under 'token'
        await AsyncStorage.setItem('access_token', response.data.token.access);
      } else {
        console.error('AuthService: No access token in response');
        throw new Error('No access token received from server');
      }
      
      if (response.data && response.data.refresh) {
        await AsyncStorage.setItem('refresh_token', response.data.refresh);
      } else if (response.data && response.data.token && response.data.token.refresh) {
        // Alternative structure where tokens might be nested under 'token'
        await AsyncStorage.setItem('refresh_token', response.data.token.refresh);
      } else {
        console.error('AuthService: No refresh token in response');
        throw new Error('No refresh token received from server');
      }
      
      // Normalize the response to ensure it has the expected structure
      const normalizedResponse: LoginResponse = {
        ...response.data,
        // If tokens are nested under 'token', bring them to the top level
        access: response.data.access || (response.data.token?.access),
        refresh: response.data.refresh || (response.data.token?.refresh),
      };
      
      console.log('AuthService: Login successful, tokens stored.');
      return normalizedResponse;
    } catch (error: any) {
      // Handle 401 Unauthorized errors specifically
      if (error.response && error.response.status === 401) {
        console.error('AuthService: Login failed - Invalid credentials');
        console.log('Response data:', JSON.stringify(error.response.data));
        
        // Check the exact error format from the backend
        if (error.response.data && typeof error.response.data === 'string') {
          throw new Error(error.response.data);
        } else if (error.response.data && error.response.data.detail) {
          throw new Error(error.response.data.detail);
        } else {
          throw new Error('Invalid email or password. Please try again.');
        }
      }
      
      console.error('AuthService: Login failed:', error.response?.data || error.message);
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
      console.log('AuthService: Attempting registration to custom endpoint...');
      console.log('Registration URL:', '/api/accounts/register/');
      
      // Try with direct axios call to bypass any interceptors
      const response = await apiClient.post('/api/accounts/register/', data, {
        timeout: 15000, // Increase timeout for registration
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      console.log('AuthService: Registration successful. A verification code has been sent.');
      return response.data;
    } catch (error: any) {
      console.error('AuthService: Registration failed:', error.response?.data || error.message);
      
      // More detailed error logging
      if (error.code === 'ECONNABORTED') {
        console.error('Registration request timed out. Check server availability.');
      } else if (!error.response) {
        console.error('Network error. Check if the server is running and accessible.');
      }
      
      throw error;
    }
  },

  /**
   * Handles user logout by blacklisting the refresh token on the backend
   * and clearing tokens from local storage.
   * @returns Promise resolving when logout is complete.
   */
  async logout(): Promise<void> {
    console.log('AuthService: Attempting logout...');
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await apiClient.post('/api/accounts/logout/', { refresh_token: refreshToken });
        console.log('AuthService: Refresh token blacklisted on backend.');
      } else {
        console.warn('AuthService: No refresh token found to blacklist.');
      }
    } catch (error: any) {
      console.error('AuthService: Backend logout failed (token might be invalid/expired):', error.response?.data || error.message);
    } finally {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      console.log('AuthService: Tokens removed from local storage.');
    }
  },

  /**
   * Fetches the authenticated user's profile from the custom backend endpoint.
   * @returns Promise resolving with the user profile data.
   */
  async getUserProfile(): Promise<UserProfileResponse> {
    try {
      console.log('AuthService: Fetching user profile from custom endpoint...');
      const response = await apiClient.get<UserProfileResponse>('/api/accounts/me/');
      
      // Validate the response data
      if (!response.data || !response.data.id) {
        console.error('AuthService: Invalid user profile data received');
        throw new Error('Invalid user profile data');
      }
      
      // Check for token error response
      if (response.data && response.data.code === 'token_not_valid') {
        console.error('AuthService: Token not valid:', response.data.detail);
        throw new Error('Token not valid: ' + response.data.detail);
      }
      
      console.log('AuthService: User profile fetched successfully.');
      return response.data;
    } catch (error: any) {
      console.error('AuthService: Failed to fetch user profile:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Refreshes the access token using the refresh token.
   * @returns Promise resolving with the new access token, or null if refresh fails.
   */
  async refreshToken(): Promise<string | null> {
    try {
      console.log('AuthService: Attempting to refresh token...');
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.warn('AuthService: No refresh token found.');
        return null;
      }
      // Corrected: Use apiClient directly as it's configured with the base URL
      const response = await apiClient.post<LoginResponse>('/api/auth/jwt/refresh/', { refresh: refreshToken });
      
      // Check if access token exists before storing it
      if (response.data && response.data.access) {
        await AsyncStorage.setItem('access_token', response.data.access);
        console.log('AuthService: Token refreshed successfully.');
        return response.data.access;
      } else {
        console.error('AuthService: No access token in refresh response');
        await this.logout(); // Clear tokens on refresh failure
        return null;
      }
    } catch (error: any) {
      console.error('AuthService: Token refresh failed:', error.response?.data || error.message);
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
      console.log('AuthService: Activating account with custom endpoint...');
      // Assuming /api/accounts/activate/ is the correct endpoint based on previous context
      const response = await apiClient.post('/api/accounts/activate/', data);
      console.log('AuthService: Account activated successfully.');
      return response.data;
    } catch (error: any) {
      console.error('AuthService: Account activation failed:', error.response?.data || error.message);
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
      console.log('AuthService: Resending activation code to custom endpoint...');
      // Use the correct endpoint path that matches the backend URL configuration
      const response = await apiClient.post('/api/accounts/resend-verification-code/', { email, code: '' });
      console.log('AuthService: New activation code sent.');
      return response.data;
    } catch (error: any) {
      console.error('AuthService: Resend activation code failed:', error.response?.data || error.message);
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
      console.log('AuthService: Requesting password reset from custom endpoint...');
      const response = await apiClient.post('/api/accounts/password-reset-request/', { email });
      console.log('AuthService: Password reset request sent.');
      return response.data;
    } catch (error: any) {
      console.error('AuthService: Password reset request failed:', error.response?.data || error.message);
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
      console.log('AuthService: Confirming password reset with custom endpoint...');
      const response = await apiClient.post('/api/accounts/password-reset-confirm/', { uid, token, new_password, new_password2 });
      console.log('AuthService: Password reset confirmed successfully.');
      return response.data;
    } catch (error: any) {
      console.error('AuthService: Password reset confirmation failed:', error.response?.data || error.message);
      throw error;
    }
  },
};

export default AuthService;
