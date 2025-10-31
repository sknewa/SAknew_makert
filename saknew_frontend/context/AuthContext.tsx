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
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';
// Temporarily disable imports to isolate PlatformConstants error
// import AuthService from '../services/authService';
// import { setOnUnauthorizedCallback } from '../services/apiClient';
// import { User } from '../types';
// import { refreshTokenIfNeeded, getTokenRemainingTime } from '../utils/tokenManager';

// Temporary mock types
interface User {
  id: number;
  profile?: { is_seller?: boolean };
}

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

  // Temporary mock function
  const refreshUserProfile = useCallback(async () => {
    safeLog('AuthContext: Mock refreshUserProfile called.');
    setUser({ id: 1 });
    setIsAuthenticated(false); // Keep false for now
  }, []); // Empty dependency array means this function is stable and won't re-create unnecessarily

  // Temporary mock function
  const loadUser = useCallback(async () => {
    safeLog('AuthContext: Mock loadUser called.');
    setLoading(true);
    setTimeout(() => {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }, 1000);
  }, []); // Dependency on refreshUserProfile ensures loadUser is updated if refreshUserProfile changes

  // Initial load of user data
  useEffect(() => {
    loadUser();
  }, [loadUser]); // Dependency on loadUser ensures it runs once and re-runs if loadUser itself changes (due to its dependencies)

  // Log state changes for debugging
  useEffect(() => {
    safeLog('AuthContext: >>> User or isAuthenticated state changed <<<');
    safeLog('AuthContext: Current user:', user);
    safeLog('AuthContext: Current isAuthenticated:', isAuthenticated);
    safeLog('AuthContext: Current user.profile?.is_seller:', user?.profile?.is_seller);
  }, [user, isAuthenticated]); // Log whenever user or isAuthenticated state changes


  const login = useCallback(async (email: string, password: string) => {
    safeLog(`AuthContext: Mock login for: ${email}`);
    setLoading(false);
  }, []); // Dependency on refreshUserProfile

  const logout = useCallback(async () => {
    safeLog('AuthContext: Mock logout');
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
  }, []); // No dependencies, as it doesn't rely on external state/props

  // Temporarily disabled
  // React.useEffect(() => {
  //   setOnUnauthorizedCallback(() => {
  //     safeLog('AuthContext: Unauthorized callback triggered, logging out user');
  //     logout();
  //   });
  // }, [logout]);

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
