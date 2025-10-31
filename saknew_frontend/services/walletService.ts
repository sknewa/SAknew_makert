import apiClient from './apiClient';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

export interface Wallet {
  id: number;
  user: number;
  balance: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  wallet: number;
  transaction_type: string;
  amount: string;
  status: string;
  description: string;
  reference_id: string;
  created_at: string;
  updated_at: string;
}

export const getMyWallet = async (): Promise<Wallet> => {
  safeLog('Calling wallet API: /api/wallet/wallets/my-wallet/');
  const response = await apiClient.get('/api/wallet/wallets/my-wallet/');
  safeLog('Wallet API response:', response.data);
  return response.data;
};

export const getMyTransactions = async (): Promise<Transaction[]> => {
  safeLog('🔍 TRANSACTIONS: Making API call to /api/wallet/wallets/transactions/');
  safeLog('🔍 TRANSACTIONS: API Base URL:', apiClient.defaults.baseURL);
  try {
    const response = await apiClient.get('/api/wallet/wallets/transactions/');
    safeLog('🔍 TRANSACTIONS: Response status:', response.status);
    safeLog('🔍 TRANSACTIONS: Response data type:', typeof response.data);
    safeLog('🔍 TRANSACTIONS: Response data:', JSON.stringify(response.data, null, 2));
    
    // Handle paginated response
    if (response.data?.results && Array.isArray(response.data.results)) {
      safeLog('🔍 TRANSACTIONS: Paginated response, count:', response.data.results.length);
      return response.data.results;
    }
    
    // Handle direct array response
    if (Array.isArray(response.data)) {
      safeLog('🔍 TRANSACTIONS: Direct array response, count:', response.data.length);
      return response.data;
    }
    
    safeWarn('🔍 TRANSACTIONS: Unexpected response format, returning empty array');
    safeWarn('🔍 TRANSACTIONS: Response keys:', Object.keys(response.data || {}));
    return [];
  } catch (error: any) {
    safeError('🔍 TRANSACTIONS ERROR:', error.message);
    safeError('🔍 TRANSACTIONS: Error status:', error?.response?.status);
    safeError('🔍 TRANSACTIONS: Error data:', error?.response?.data);
    safeError('🔍 TRANSACTIONS: Full error:', error);
    throw error;
  }
};


// Add funds to wallet
export const addFunds = async (amount: number): Promise<any> => {
  safeLog('Calling deposit API with amount:', amount);
  const response = await apiClient.post('/api/wallet/deposit/', { amount });
  safeLog('Deposit API response:', response.data);
  return response.data;
};

// Force refresh wallet (clears any cache)
export const refreshWallet = async (): Promise<Wallet> => {
  safeLog('Force refreshing wallet data');
  const response = await apiClient.get('/api/wallet/wallets/my-wallet/', {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  safeLog('Force refresh wallet response:', response.data);
  return response.data;
};
