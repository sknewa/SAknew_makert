import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

// Real API calls for authentication
const API_BASE_URL = 'https://saknew-makert-e7ac1361decc.herokuapp.com';

const refreshTokenApiCall = async (existingRefreshToken: string) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/jwt/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: existingRefreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }
  return response.json();
};

const getMyProfileApiCall = async (accessToken: string): Promise<User> => {
  safeLog('AuthContext: Fetching user profile from API...');
  const response = await fetch(`${API_BASE_URL}/api/accounts/me/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  
  return response.json();
};

const loginApiCall = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/api/accounts/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Login failed: ${response.status}`);
  }
  return response.json();
};
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
  handleUnauthorized: () => Promise<boolean>; // Returns true if refresh was successful
  tokenExpiryTime: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginInProgress, setLoginInProgress] = useState(false);

  // Check for existing tokens on app start
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const accessToken = await AsyncStorage.getItem('access_token');
        if (accessToken) {
          // Try to get user profile with existing token
          try {
            const userProfile = await getMyProfileApiCall(accessToken);
            setUser(userProfile);
            setIsAuthenticated(true);
            safeLog('Restored authentication from stored token');
          } catch (error) {
            safeLog('Token validation failed, clearing auth state');
            await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          safeLog('No stored token found');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        safeError('Error checking auth state:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    if (loginInProgress) {
      safeLog('Login already in progress, skipping...');
      return;
    }
    
    setLoginInProgress(true);
    setLoading(true);
    try {
      safeLog('Attempting login for:', email);
      const { access, refresh } = await loginApiCall(email, password);
      
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
      
      // Fetch user profile after login
      const userProfile = await getMyProfileApiCall(access);
      setUser(userProfile);
      setIsAuthenticated(true);
      safeLog('Login successful, real JWT tokens stored');
    } catch (error: any) {
      safeError('Login failed:', error.message || error);
      throw new Error(error.message || 'Login failed');
    } finally {
      setLoading(false);
      setLoginInProgress(false);
    }
  };

  const logout = async () => {
    safeLog('Logging out, clearing tokens and user state.');
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleUnauthorized = async (): Promise<boolean> => {
    safeLog('Handling unauthorized error, attempting to refresh token...');
    const existingRefreshToken = await AsyncStorage.getItem('refresh_token');

    if (!existingRefreshToken) {
      safeLog('No refresh token found.');
      await logout();
      return false;
    }

    try {
      const { access: newAccessToken } = await refreshTokenApiCall(existingRefreshToken);
      await AsyncStorage.setItem('access_token', newAccessToken);
      safeLog('Token refreshed successfully.');
      return true;
    } catch (error) {
      safeError('Failed to refresh token:', error);
      await logout();
      return false;
    }
  };

  const refreshUserProfile = async () => {
    safeLog('Refreshing user profile');
    const accessToken = await AsyncStorage.getItem('access_token');
    // FIX: Removed dependency on `isAuthenticated` which can be stale.
    // The presence of an access token is the only check needed.
    if (accessToken) {
      try {
        const userProfile = await getMyProfileApiCall(accessToken);
        setUser(userProfile);
      } catch (error) {
        safeError('Failed to refresh user profile', error);
        // Potentially handle token refresh here or log out
        await handleUnauthorized();
      }
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    handleUnauthorized,
    refreshUserProfile,
    tokenExpiryTime: 0,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};