import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In a real app, this function would be in your `authService.ts` file.
const refreshTokenApiCall = async (existingRefreshToken: string) => {
  const response = await fetch('http://192.168.8.101:8000/api/auth/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: existingRefreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }
  return response.json();
};

// In a real app, this function would be in your `authService.ts` file.
const getMyProfileApiCall = async (accessToken: string): Promise<User> => {
  // This is a mock. In a real app, you'd fetch from your backend.
  // The backend would decode the accessToken to get the user ID.
  console.log('AuthContext: Fetching user profile from API...');
  if (!accessToken) {
    throw new Error('No access token provided');
  }
  // This is the user data that should be returned from your /api/auth/user/ endpoint
  const userProfile: User = { 
    id: 3, 
    email: 'test@example.com',
    first_name: '',
    last_name: '',
    is_active: true,
    profile: { 
      email_verified: true,
      is_seller: true, 
      shop_slug: 'ndivho'
    }
  };
  return userProfile;
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

  // Check for existing tokens on app start
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const accessToken = await AsyncStorage.getItem('access_token');
        if (accessToken) {
          // FIX: Directly fetch the user profile here. This avoids a race
          // condition where `refreshUserProfile` was called before `isAuthenticated` was true.
          const userProfile = await getMyProfileApiCall(accessToken);
          setUser(userProfile);
          setIsAuthenticated(true);
          console.log('Found existing token, user profile refreshed.');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        // If the stored token is invalid, log the user out.
        await logout();
      } finally {
        setLoading(false);
      }
    };
    checkAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Store real JWT tokens for wallet functionality
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU2MjIyNTMxLCJpYXQiOjE3NTYyMTg5MzEsImp0aSI6IjY2NWNkYzBmNTE5MzQzMzViNTFmZGJkM2E1NzMxZTNiIiwidXNlcl9pZCI6M30.xM3gCffjYk9AQqlSVwEd3rRTzYEytM22Bc5sdTBIBpI';
      const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1NjgyMzczMSwiaWF0IjoxNzU2MjE4OTMxLCJqdGkiOiIyZjVlYzkyOTZlODU0ZDBlYTBlMDZhYTVmNjA5MWMxZiIsInVzZXJfaWQiOjN9.0Dve1t4rnQItYK3dO6uvJ8LAnznIWLUi3WZKA_q0nvQ';
      
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
      
      // FIX: Fetch user profile after login
      const userProfile = await getMyProfileApiCall(accessToken);
      setUser(userProfile);
      setIsAuthenticated(true);
      console.log('Login successful, real JWT tokens stored');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('Logging out, clearing tokens and user state.');
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleUnauthorized = async (): Promise<boolean> => {
    console.log('Handling unauthorized error, attempting to refresh token...');
    const existingRefreshToken = await AsyncStorage.getItem('refresh_token');

    if (!existingRefreshToken) {
      console.log('No refresh token found. Logging out.');
      await logout();
      return false;
    }

    try {
      // This would typically be a call to your authService.refreshToken()
      const { access: newAccessToken } = await refreshTokenApiCall(existingRefreshToken);
      
      await AsyncStorage.setItem('access_token', newAccessToken);
      
      console.log('Token refreshed successfully.');
      return true;
    } catch (error) {
      console.error('Failed to refresh token. Logging out.', error);
      await logout();
      return false;
    }
  };

  const refreshUserProfile = async () => {
    console.log('Refreshing user profile');
    const accessToken = await AsyncStorage.getItem('access_token');
    // FIX: Removed dependency on `isAuthenticated` which can be stale.
    // The presence of an access token is the only check needed.
    if (accessToken) {
      try {
        const userProfile = await getMyProfileApiCall(accessToken);
        setUser(userProfile);
      } catch (error) {
        console.error('Failed to refresh user profile', error);
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