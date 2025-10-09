import { useEffect, useState } from 'react';
// import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface NetworkStatus {
  isConnected: boolean | null;
  isServerReachable: boolean | null;
  checkConnection: () => Promise<void>;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isServerReachable, setIsServerReachable] = useState<boolean | null>(null);

  // Use AbortController for cancellable requests
  const checkServerReachability = async () => {
    const controller = new AbortController();
    
    try {
      await axios.get(`${API_BASE_URL}`, { 
        timeout: 5000,
        signal: controller.signal
      });
      setIsServerReachable(true);
    } catch (error) {
      // Only update state if not aborted
      if (!axios.isCancel(error)) {
        setIsServerReachable(false);
      }
    }
    
    return controller; // Return controller for cleanup
  };

  const checkConnection = async () => {
    try {
      await axios.get(`${API_BASE_URL}`, { timeout: 5000 });
      setIsConnected(true);
      setIsServerReachable(true);
    } catch (error) {
      setIsConnected(false);
      setIsServerReachable(false);
    }
  };

  useEffect(() => {
    let controller: AbortController | null = null;
    let isMounted = true;
    checkConnection();
    
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isServerReachable,
    checkConnection
  };
};

export default useNetworkStatus;