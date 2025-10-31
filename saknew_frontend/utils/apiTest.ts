// Simple API connectivity test
import { API_BASE_URL } from '../config';
import publicApiClient from '../services/publicApiClient';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    safeLog('Testing API connectivity to:', API_BASE_URL);
    
    // Test basic connectivity
    const response = await publicApiClient.get('/api/products/', { timeout: 5000 });
    safeLog('API Test - Status:', response.status);
    safeLog('API Test - Response type:', typeof response.data);
    
    if (response.status === 200) {
      safeLog('✅ API connectivity test passed');
      return true;
    } else {
      safeLog('⚠️ API returned non-200 status:', response.status);
      return false;
    }
  } catch (error: any) {
    safeLog('❌ API connectivity test failed');
    safeLog('Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    return false;
  }
};