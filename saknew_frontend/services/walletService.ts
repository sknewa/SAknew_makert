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
  console.log('🔍 DEBUG: getMyTransactions - Making API call');
  try {
    const response = await apiClient.get('/api/wallet/wallets/transactions/');
    console.log('🔍 DEBUG: Response status:', response.status);
    console.log('🔍 DEBUG: Response data:', JSON.stringify(response.data, null, 2));
    
    // Handle paginated response
    if (response.data?.results && Array.isArray(response.data.results)) {
      console.log('🔍 DEBUG: Returning paginated results, count:', response.data.results.length);
      return response.data.results;
    }
    
    // Handle direct array response
    if (Array.isArray(response.data)) {
      console.log('🔍 DEBUG: Returning direct array, count:', response.data.length);
      return response.data;
    }
    
    console.log('🔍 DEBUG: No transactions found, returning empty array');
    return [];
  } catch (error: any) {
    console.error('🔍 DEBUG: getMyTransactions error:', error);
    console.error('🔍 DEBUG: Error response:', error?.response?.data);
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
