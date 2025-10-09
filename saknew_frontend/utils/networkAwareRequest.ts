import { Alert } from 'react-native';

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
      // Network connectivity will be handled by the request itself
      
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