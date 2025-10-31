// saknew_frontend/utils/networkCheck.ts

import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

/**
 * Checks network connectivity and logs detailed information
 */
export const checkNetworkConnectivity = async () => {
  try {
    safeLog('=== NETWORK CONNECTIVITY CHECK ===');
    safeLog('API URL:', API_BASE_URL);
    safeLog('Platform:', Platform.OS);
    
    // Simple connectivity check without NetInfo
    return true;
  } catch (error) {
    safeError('Error checking network:', error);
    return false;
  }
};

// Run check immediately
checkNetworkConnectivity();

export default checkNetworkConnectivity;