import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
// import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface NetworkContextType {
  isConnected: boolean | null;
  isServerReachable: boolean | null;
  checkConnection: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isServerReachable, setIsServerReachable] = useState<boolean | null>(null);

  const checkConnection = async () => {
    try {
      // Simple server reachability check
      await axios.get(`${API_BASE_URL}`, { timeout: 5000 });
      setIsConnected(true);
      setIsServerReachable(true);
    } catch (error) {
      setIsConnected(false);
      setIsServerReachable(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Periodic network check instead of NetInfo
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected, isServerReachable, checkConnection }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};