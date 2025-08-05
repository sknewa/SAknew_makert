// saknew_frontend/utils/networkCheck.ts
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';

/**
 * Checks network connectivity and logs detailed information
 */
export const checkNetworkConnectivity = async () => {
  try {
    // Get network state
    const state = await NetInfo.fetch();
    
    console.log('=== NETWORK CONNECTIVITY CHECK ===');
    console.log('Is connected?', state.isConnected);
    console.log('Connection type:', state.type);
    console.log('Is internet reachable?', state.isInternetReachable);
    console.log('API URL:', API_BASE_URL);
    console.log('Platform:', Platform.OS);
    
    if (state.type === 'wifi' && state.details) {
      console.log('WiFi SSID:', state.details.ssid);
      console.log('WiFi IP address:', state.details.ipAddress);
    }
    
    return state.isConnected;
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
};

// Run check immediately
checkNetworkConnectivity();

export default checkNetworkConnectivity;