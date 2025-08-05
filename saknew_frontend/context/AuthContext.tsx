// saknew_frontend/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/authService';
import { setOnUnauthorizedCallback } from '../services/apiClient';
import { User } from '../types';
import { refreshTokenIfNeeded, getTokenRemainingTime } from '../utils/tokenManager';

// Define the shape of the AuthContext
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean; // Indicates if authentication state is currently being loaded/re-verified
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  tokenExpiryTime: number; // Time in seconds until token expires
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component props
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true); // Initial loading state for auth check
  const [tokenExpiryTime, setTokenExpiryTime] = useState<number>(0);

  // Function to fetch and set user profile
  const refreshUserProfile = useCallback(async () => {
    console.log('AuthContext: refreshUserProfile called.');
    try {
      const profileData = await AuthService.getUserProfile();
      console.log('AuthContext: Data received from getUserProfile():', profileData);
      
      // Check if the response is an error object (token expired)
      if (profileData && profileData.code === 'token_not_valid') {
        console.error('AuthContext: Token not valid:', profileData.detail);
        setUser(null);
        setIsAuthenticated(false);
        await AuthService.logout();
        return;
      }
      
      // Verify we have a valid user profile with expected fields
      if (!profileData || !profileData.id) {
        console.error('AuthContext: Invalid user profile data received');
        setUser(null);
        setIsAuthenticated(false);
        await AuthService.logout();
        return;
      }
      
      setUser(profileData);
      setIsAuthenticated(true);
      console.log('AuthContext: User profile refreshed. isAuthenticated set to TRUE.');
    } catch (error) {
      console.error('AuthContext: Failed to refresh user profile:', error);
      setUser(null);
      setIsAuthenticated(false);
      // If profile fetch fails, it might mean the token is invalid, so clear it
      await AuthService.logout();
    }
  }, []); // Empty dependency array means this function is stable and won't re-create unnecessarily

  // Load user data on app start or when auth state changes
  const loadUser = useCallback(async () => {
    console.log('AuthContext: loadUser called (initial app load or refresh).');
    setLoading(true); // Start loading when attempting to load user
    try {
      // Safely get tokens with error handling
      let accessToken = null;
      let refreshToken = null;
      
      try {
        accessToken = await AsyncStorage.getItem('access_token');
        refreshToken = await AsyncStorage.getItem('refresh_token');
      } catch (storageError) {
        console.error('AuthContext: Error accessing AsyncStorage:', storageError);
        // Continue with null tokens
      }

      if (accessToken) {
        // Check if token is expiring soon and refresh if needed
        const tokenRefreshed = await refreshTokenIfNeeded();
        
        if (tokenRefreshed) {
          console.log('AuthContext: Token refreshed proactively or still valid.');
        }
        
        console.log('AuthContext: Access token found. Attempting to refresh user profile.');
        try {
          await refreshUserProfile(); // Use the memoized refreshUserProfile
          
          // Update token expiry time
          const remainingTime = await getTokenRemainingTime();
          setTokenExpiryTime(remainingTime);
        } catch (profileError) {
          console.error('AuthContext: Error refreshing profile with access token:', profileError);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else if (refreshToken) {
        console.log('AuthContext: No access token, but refresh token found. Attempting to refresh token.');
        try {
          const newAccessToken = await AuthService.refreshToken();
          if (newAccessToken) {
            await refreshUserProfile(); // Use the memoized refreshUserProfile
            
            // Update token expiry time
            const remainingTime = await getTokenRemainingTime();
            setTokenExpiryTime(remainingTime);
          } else {
            console.log('AuthContext: Failed to refresh token. User not authenticated.');
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (refreshError) {
          console.error('AuthContext: Error refreshing token:', refreshError);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        console.log('AuthContext: No tokens found. User not authenticated.');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('AuthContext: Error in loadUser:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false); // End loading regardless of success or failure
    }
  }, [refreshUserProfile]); // Dependency on refreshUserProfile ensures loadUser is updated if refreshUserProfile changes

  // Initial load of user data
  useEffect(() => {
    loadUser();
  }, [loadUser]); // Dependency on loadUser ensures it runs once and re-runs if loadUser itself changes (due to its dependencies)

  // Log state changes for debugging
  useEffect(() => {
    console.log('AuthContext: >>> User or isAuthenticated state changed <<<');
    console.log('AuthContext: Current user:', user);
    console.log('AuthContext: Current isAuthenticated:', isAuthenticated);
    console.log('AuthContext: Current user.profile?.is_seller:', user?.profile?.is_seller);
  }, [user, isAuthenticated]); // Log whenever user or isAuthenticated state changes


  const login = useCallback(async (email: string, password: string) => {
    console.log(`AuthContext: Login attempt for email: ${email}`);
    setLoading(true);
    try {
      // Get the response data directly to check for tokens
      const loginResponse = await AuthService.login(email, password);
      
      // Verify we have the expected data before proceeding
      if (!loginResponse || !loginResponse.access || !loginResponse.refresh) {
        console.error('AuthContext: Invalid login response data');
        throw new Error('Invalid login response data');
      }
      
      await refreshUserProfile(); // Fetch user profile immediately after successful login
      console.log('AuthContext: Login function completed.');
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      // Clear any partial auth state
      setUser(null);
      setIsAuthenticated(false);
      throw error; // Re-throw to be caught by UI components (e.g., LoginScreen)
    } finally {
      setLoading(false);
    }
  }, [refreshUserProfile]); // Dependency on refreshUserProfile

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
      console.log('AuthContext: Logout function completed.');
    } catch (error) {
      console.error('AuthContext: Logout function failed:', error);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies, as it doesn't rely on external state/props

  // Set up the unauthorized callback for apiClient
  React.useEffect(() => {
    setOnUnauthorizedCallback(() => {
      console.log('AuthContext: Unauthorized callback triggered, logging out user');
      logout();
    });
  }, [logout]);

  // Set up token refresh interval
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null;
    
    if (isAuthenticated && tokenExpiryTime > 0) {
      // Check token every minute
      refreshInterval = setInterval(async () => {
        await refreshTokenIfNeeded();
        const remainingTime = await getTokenRemainingTime();
        setTokenExpiryTime(remainingTime);
      }, 60000); // Check every minute
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated, tokenExpiryTime]);

  // The context value provided to consumers
  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    refreshUserProfile,
    tokenExpiryTime,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error indicates that useAuth was called outside of an AuthProvider.
    // Ensure your App.tsx or root component is wrapped with <AuthProvider>.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
