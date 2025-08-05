// Simple API connectivity test
import { API_BASE_URL } from '../config';
import publicApiClient from '../services/publicApiClient';

export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    console.log('Testing API connectivity to:', API_BASE_URL);
    
    // Test basic connectivity
    const response = await publicApiClient.get('/api/products/', { timeout: 5000 });
    console.log('API Test - Status:', response.status);
    console.log('API Test - Response type:', typeof response.data);
    
    if (response.status === 200) {
      console.log('✅ API connectivity test passed');
      return true;
    } else {
      console.log('⚠️ API returned non-200 status:', response.status);
      return false;
    }
  } catch (error: any) {
    console.log('❌ API connectivity test failed');
    console.log('Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    return false;
  }
};