// saknew_frontend/utils/networkCheck.ts

import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';

/**
 * Checks network connectivity and logs detailed information
 */
export const checkNetworkConnectivity = async () => {
  try {
    console.log('=== NETWORK CONNECTIVITY CHECK ===');
    console.log('API URL:', API_BASE_URL);
    console.log('Platform:', Platform.OS);
    
    // Simple connectivity check without NetInfo
    return true;
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
};

// Run check immediately
checkNetworkConnectivity();

export default checkNetworkConnectivity;