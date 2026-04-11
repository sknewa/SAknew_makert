import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { safeLog, safeError } from '../utils/securityUtils';

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

const apiFetch = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${response.status}`);
  }
  return response.json();
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (accessToken: string): Promise<User> =>
    apiFetch('api/accounts/me/', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

  useEffect(() => {
    const checkAuthState = async () => {
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
      const { access, refresh } = await apiFetch('api/accounts/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
      const profile = await fetchProfile(access);
      setUser(profile);
      setIsAuthenticated(true);
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleUnauthorized = async (): Promise<boolean> => {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (!refreshToken) { await logout(); return false; }
    try {
      const { access } = await apiFetch('api/auth/jwt/refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken }),
      });
      await AsyncStorage.setItem('access_token', access);
      return true;
    } catch {
      await logout();
      return false;
    }
  };

  const refreshUserProfile = async () => {
    const accessToken = await AsyncStorage.getItem('access_token');
    if (!accessToken) return;
    try {
      const profile = await fetchProfile(accessToken);
      setUser(profile);
    } catch {
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
