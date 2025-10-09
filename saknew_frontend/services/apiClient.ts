// saknew_frontend/services/apiClient.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { handleError } from '../utils/errorManager';


// We'll need a way to trigger a logout from here.
// Instead of importing AuthContext directly (which can cause circular dependencies),
// we can use a callback mechanism.
let onUnauthorizedCallback: (() => void) | null = null;

/**
 * Sets a callback function to be executed when an unauthorized (401) error
 * occurs and token refresh fails, signaling a need for user logout.
 * This prevents circular dependencies with AuthContext.
 * @param callback The function to call for logout.
 */
export const setOnUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Create an Axios instance with more reliable configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
  withCredentials: false, // Don't send cookies
  maxRedirects: 5, // Allow redirects
  validateStatus: (status) => status >= 200 && status < 300, // Only accept 2xx status codes
});

// Force log the actual URL being used
console.log('ACTUAL API URL BEING USED:', API_BASE_URL);

// Test the main API health check endpoint
axios.get(`${API_BASE_URL}/api/health-check/`, { timeout: 5000 })
  .then(response => {
    console.log(`✅ API health check accessible:`, response.status);
  })
  .catch(error => {
    console.log(`❌ API health check NOT accessible:`, error.message);
  });

// --- CONFIRMATION LOG: Log the base URL when the client is initialized ---
console.log('API Client: Initializing with baseURL:', API_BASE_URL);

// Request interceptor to add the JWT token to headers
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      // Log the request details for debugging (optional, can be verbose)
      // console.log(`API Client: Sending ${config.method?.toUpperCase()} request to ${config.url}`);
    } catch (error) {
      console.error('API Client: Error getting access token from storage:', error);
      // Don't block the request if token retrieval fails, let the response interceptor handle 401.
    }
    return config;
  },
  (error) => {
    console.error('API Client: Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and error messages
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error has a response and it's a 401 Unauthorized status
    // Also, prevent infinite loops for 401 errors by checking a custom '_retry' flag
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark this request as retried
      console.warn('API Client: Access token expired or invalid. Attempting to refresh token...');

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          // Attempt to refresh the token using a direct axios call (not apiClient).
          // This is critical to prevent the refresh request itself from getting caught
          // in this interceptor, which could lead to an infinite loop.
          const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/jwt/refresh/`, {
            refresh: refreshToken,
          });

          // Check if access token exists before storing it
          let newAccessToken;
          if (refreshResponse.data && refreshResponse.data.access) {
            newAccessToken = refreshResponse.data.access;
            await AsyncStorage.setItem('access_token', newAccessToken); // Update stored access token
          } else {
            console.error('API Client: No access token in refresh response');
            throw new Error('No access token received from server');
          }

          // Update the original request's header with the new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          // Re-send the original request with the new token
          console.log('API Client: Token refreshed successfully. Retrying original request...');
          return apiClient(originalRequest);
        } else {
          console.log('API Client: No refresh token available. User needs to log in.');
          // No refresh token, so the user must re-authenticate.
          if (onUnauthorizedCallback) {
            onUnauthorizedCallback(); // Trigger global logout
          }
          return Promise.reject(error); // Reject the original request
        }
      } catch (refreshError: any) {
        console.error('API Client: Token refresh failed:', refreshError.response?.data || refreshError.message);
        // If refresh fails, clear all tokens and force re-authentication (logout)
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback(); // Trigger global logout
        }
        return Promise.reject(error); // Reject the original request
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