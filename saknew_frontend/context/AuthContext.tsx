import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { safeLog, safeError } from '../utils/securityUtils';
import { Alert } from 'react-native'; // Import Alert for user feedback
import AuthService from '../services/authService'; // Import AuthService
import { getGuestCart, clearGuestCart } from '../services/guestCartService';
import apiClient from '../services/apiClient';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  profile: {
    email_verified: boolean;
    is_seller: boolean;
    shop_slug: string | null;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  handleUnauthorized: () => Promise<boolean>;
  tokenExpiryTime: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (accessToken: string): Promise<User> =>
    apiFetch('api/accounts/me/', {
      headers: { Authorization: `Bearer ${accessToken}` }, // This apiFetch is still needed for profile fetching
    });

  useEffect(() => {
    const checkAuthState = async () => { // This checkAuthState uses the local apiFetch
      try {
        const accessToken = await AsyncStorage.getItem('access_token');
        if (accessToken) {
          try {
            const profile = await fetchProfile(accessToken);
            setUser(profile);
            setIsAuthenticated(true);
            safeLog('Restored authentication from stored token');
          } catch {
            safeLog('Token validation failed, clearing auth state');
            await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
          }
        } else {
          safeLog('No stored token found');
        }
      } catch (error) {
        safeError('Error checking auth state:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Use AuthService.login which leverages apiClient and its error handling
      const loginResponse = await AuthService.login(email, password);
      
      const access = loginResponse.access;
      // Refresh token is already stored by AuthService.login
      const profile = await fetchProfile(access);
      setUser(profile);
      setIsAuthenticated(true);
      // Merge guest cart into backend cart
      try {
        const guestItems = await getGuestCart();
        if (guestItems.length > 0) {
          await Promise.all(
            guestItems.map(item =>
              apiClient.post('/api/carts/add/', {
                product_id: item.product.id,
                quantity: item.quantity,
                ...(item.size ? { size: item.size } : {}),
              })
            )
          );
          await clearGuestCart();
        }
      } catch {
        // Silent fail — cart merge is best-effort
      }
    } catch (error: any) {
      safeError('Login failed in AuthContext:', error);
      Alert.alert('Login Failed', error.message || 'An unexpected error occurred.');
      // Re-throw the error so the calling component can also handle it if needed
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // This apiFetch is still needed for profile fetching, but it should also use apiClient
  const apiFetch = async (path: string, options: RequestInit = {}) => {
    try {
      const response = await apiClient.get(path, { headers: options.headers });
      return response.data;
    } catch (error: any) {
      safeError(`apiFetch failed for ${path}:`, error);
      throw new Error(error.response?.data?.detail || error.message || `Request failed for ${path}`);
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout(); // Use AuthService.logout
    } catch (error) {
      safeError('Logout failed in AuthContext:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const handleUnauthorized = async (): Promise<boolean> => {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (!refreshToken) { await logout(); return false; }
    try {
      // Use apiClient directly for refresh token, as AuthService.refreshToken also uses it
      const refreshResponse = await apiClient.post('api/auth/jwt/refresh/', {
        refresh: refreshToken,
      });
      const access = refreshResponse.data?.access;
      if (access) {
        await AsyncStorage.setItem('access_token', access);
        return true;
      }
      throw new Error('No new access token from refresh');
    } catch (error) {
      safeError('Token refresh failed in AuthContext:', error);
      await logout();
      return false;
    }
  };

  const refreshUserProfile = async () => {
    const accessToken = await AsyncStorage.getItem('access_token');
    if (!accessToken) return;
    try {
      const profile = await fetchProfile(accessToken); // This fetchProfile uses the local apiFetch
      setUser(profile);
    } catch (error) {
      safeError('Failed to refresh user profile:', error);
      await handleUnauthorized();
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, loading, login, logout,
      handleUnauthorized, refreshUserProfile, tokenExpiryTime: 0,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
