import apiClient from './apiClient';

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
  console.log('Calling wallet API: /api/wallet/wallets/my-wallet/');
  const response = await apiClient.get('/api/wallet/wallets/my-wallet/');
  console.log('Wallet API response:', response.data);
  return response.data;
};

export const getMyTransactions = async (): Promise<Transaction[]> => {
  console.log('🔍 TRANSACTIONS: Making API call to /api/wallet/wallets/transactions/');
  console.log('🔍 TRANSACTIONS: API Base URL:', apiClient.defaults.baseURL);
  try {
    const response = await apiClient.get('/api/wallet/wallets/transactions/');
    console.log('🔍 TRANSACTIONS: Response status:', response.status);
    console.log('🔍 TRANSACTIONS: Response data type:', typeof response.data);
    console.log('🔍 TRANSACTIONS: Response data:', JSON.stringify(response.data, null, 2));
    
    // Handle paginated response
    if (response.data?.results && Array.isArray(response.data.results)) {
      console.log('🔍 TRANSACTIONS: Paginated response, count:', response.data.results.length);
      return response.data.results;
    }
    
    // Handle direct array response
    if (Array.isArray(response.data)) {
      console.log('🔍 TRANSACTIONS: Direct array response, count:', response.data.length);
      return response.data;
    }
    
    console.warn('🔍 TRANSACTIONS: Unexpected response format, returning empty array');
    console.warn('🔍 TRANSACTIONS: Response keys:', Object.keys(response.data || {}));
    return [];
  } catch (error: any) {
    console.error('🔍 TRANSACTIONS ERROR:', error.message);
    console.error('🔍 TRANSACTIONS: Error status:', error?.response?.status);
    console.error('🔍 TRANSACTIONS: Error data:', error?.response?.data);
    console.error('🔍 TRANSACTIONS: Full error:', error);
    throw error;
  }
};


// Add funds to wallet
export const addFunds = async (amount: number): Promise<any> => {
  console.log('Calling deposit API with amount:', amount);
  const response = await apiClient.post('/api/wallet/deposit/', { amount });
  console.log('Deposit API response:', response.data);
  return response.data;
};

// Force refresh wallet (clears any cache)
export const refreshWallet = async (): Promise<Wallet> => {
  console.log('Force refreshing wallet data');
  const response = await apiClient.get('/api/wallet/wallets/my-wallet/', {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  console.log('Force refresh wallet response:', response.data);
  return response.data;
};
