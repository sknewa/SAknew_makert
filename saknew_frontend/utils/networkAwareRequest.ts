import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import axios, { AxiosResponse } from 'axios';

/**
 * Makes a network-aware API request with automatic retry
 */
export const networkAwareRequest = async<T>(
  requestFn: () => Promise<T>,
  options = { showAlert: true, maxRetries: 2 }
): Promise<T> => {
  const { showAlert, maxRetries } = options;
  let retries = 0;
  
  const executeRequest = async (): Promise<T> => {
    try {
      // Check network state first
      const networkState = await NetInfo.fetch();
      
      if (!networkState.isConnected) {
        if (showAlert) {
          Alert.alert(
            'No Internet Connection',
            'Please check your internet connection and try again.'
          );
        }
        throw new Error('No internet connection');
      }
      
      // Execute the request
      return await requestFn();
      
    } catch (error: any) {
      // Handle network errors
      if (axios.isAxiosError(error) && !error.response) {
        retries++;
        
        if (retries < maxRetries) {
          // Wait before retrying
          const delay = Math.min(1000 * 2 ** retries, 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeRequest();
        }
        
        if (showAlert) {
          Alert.alert(
            'Connection Error',
            'Unable to connect to the server. Please try again later.'
          );
        }
      }
      
      throw error;
    }
  };
  
  return executeRequest();
};