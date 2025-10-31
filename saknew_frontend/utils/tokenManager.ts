import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

// Token structure
interface DecodedToken {
  exp: number;
  iat: number;
  jti: string;
  token_type: string;
  user_id: number;
}

// Token expiration buffer (refresh token 5 minutes before expiry)
const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

// Check if token is expired or will expire soon
export const isTokenExpiringSoon = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    
    if (!token) {
      return true;
    }
    
    const decoded = jwtDecode<DecodedToken>(token);
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    // Token is considered expiring if it will expire within the buffer time
    return expiryTime - currentTime < EXPIRATION_BUFFER_MS;
  } catch (error) {
    safeError('Error checking token expiration:', error);
    return true; // Assume token is expiring if we can't check
  }
};

// Refresh token if needed
export const refreshTokenIfNeeded = async (): Promise<boolean> => {
  try {
    const isExpiring = await isTokenExpiringSoon();
    
    if (isExpiring) {
      safeLog('Token is expiring soon, refreshing...');
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        safeLog('No refresh token available');
        return false;
      }
      
      const response = await axios.post(`${API_BASE_URL}/api/auth/jwt/refresh/`, {
        refresh: refreshToken
      });
      
      if (response.data && response.data.access) {
        await AsyncStorage.setItem('access_token', response.data.access);
        safeLog('Token refreshed successfully');
        return true;
      } else {
        safeError('No access token in refresh response');
        return false;
      }
    }
    
    return true; // Token is still valid
  } catch (error) {
    safeError('Error refreshing token:', error);
    return false;
  }
};

// Get remaining token lifetime in seconds
export const getTokenRemainingTime = async (): Promise<number> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    
    if (!token) {
      return 0;
    }
    
    const decoded = jwtDecode<DecodedToken>(token);
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    return Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
  } catch (error) {
    safeError('Error getting token remaining time:', error);
    return 0;
  }
};