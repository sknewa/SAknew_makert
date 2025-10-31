// saknew_frontend/services/apiClient.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { handleError } from '../utils/errorManager';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';


// We'll need a way to trigger a logout from here.
// Instead of importing AuthContext directly (which can cause circular dependencies),
// we can use a callback mechanism.
let onUnauthorizedCallback: (() => void) | null = null;
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Sets a callback function to be executed when an unauthorized (401) error
 * occurs and token refresh fails, signaling a need for user logout.
 * This prevents circular dependencies with AuthContext.
 * @param callback The function to call for logout.
 */
export const setOnUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Create an Axios instance with secure configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  withCredentials: false,
  maxRedirects: 0, // Disable redirects for security
  validateStatus: (status) => status >= 200 && status < 300,
});

// Force log the actual URL being used
safeLog('ACTUAL API URL BEING USED:', API_BASE_URL);

// Test the main API health check endpoint
axios.get(`${API_BASE_URL}api/health-check/`, { 
  timeout: 5000,
  maxRedirects: 0,
  validateStatus: (status) => status >= 200 && status < 300,
})
  .then(response => {
    safeLog(`✅ API health check accessible:`, response.status);
  })
  .catch(error => {
    safeLog(`❌ API health check NOT accessible:`, error.message);
  });

// --- CONFIRMATION LOG: Log the base URL when the client is initialized ---
safeLog('API Client: Initializing with baseURL:', API_BASE_URL);

// Request interceptor to add the JWT token to headers
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      // Log the request details for debugging (optional, can be verbose)
      // safeLog(`API Client: Sending ${config.method?.toUpperCase()} request to ${config.url}`);
    } catch (error) {
      safeError('API Client: Error getting access token from storage:', error);
      // Don't block the request if token retrieval fails, let the response interceptor handle 401.
    }
    return config;
  },
  (error) => {
    safeError('API Client: Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and error messages
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshResponse = await axios.post(`${API_BASE_URL}api/auth/jwt/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = refreshResponse.data?.access;
        if (!newAccessToken) {
          throw new Error('No access token received from server');
        }

        await AsyncStorage.setItem('access_token', newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        isRefreshing = false;
        return apiClient(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        isRefreshing = false;
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
        return Promise.reject(error);
      }
    }

    // For any other error (or 401s that have already been retried), handle with error manager
    handleError(error, {
      title: 'API Error',
      showAlert: false, // Don't show alert here, let the component handle it
      onAuth: () => {
        // If it's an auth error that wasn't handled by the refresh logic,
        // trigger the unauthorized callback
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }
    });
    
    return Promise.reject(error);
  }
);

export default apiClient;