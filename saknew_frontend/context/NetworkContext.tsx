import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
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
    // Check network connectivity
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected);
    
    // Check if server is reachable
    if (state.isConnected) {
      try {
        await axios.get(`${API_BASE_URL}`, { timeout: 5000 });
        setIsServerReachable(true);
      } catch (error) {
        setIsServerReachable(false);
      }
    } else {
      setIsServerReachable(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        checkConnection();
      } else {
        setIsServerReachable(false);
      }
    });
    
    return () => unsubscribe();
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