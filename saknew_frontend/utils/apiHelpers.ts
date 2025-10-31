import { networkAwareRequest } from './networkAwareRequest';
import apiClient from '../services/apiClient';
import { Alert } from 'react-native';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

/**
 * Example of a network-aware API function
 */
export const fetchDataSafely = async<T>(url: string): Promise<T | null> => {
  try {
    const response = await networkAwareRequest(
      () => apiClient.get<T>(url),
      { showAlert: true, maxRetries: 2 }
    );
    
    return response.data;
  } catch (error: any) {
    safeError(`Error fetching data from ${url}:`, error);
    
    // Show user-friendly error message
    Alert.alert(
      'Error',
      'Something went wrong while loading data. Please try again later.'
    );
    
    return null;
  }
};

/**
 * Example of a network-aware API function with custom error handling
 */
export const submitDataSafely = async<T>(
  url: string, 
  data: any, 
  onSuccess?: (data: T) => void,
  onError?: (error: any) => void
): Promise<boolean> => {
  try {
    const response = await networkAwareRequest(
      () => apiClient.post<T>(url, data),
      { showAlert: false, maxRetries: 1 }
    );
    
    if (onSuccess) {
      onSuccess(response.data);
    }
    
    return true;
  } catch (error: any) {
    safeError(`Error submitting data to ${url}:`, error);
    
    if (onError) {
      onError(error);
    } else {
      // Default error handling
      Alert.alert(
        'Error',
        'Something went wrong while submitting data. Please try again.'
      );
    }
    
    return false;
  }
};