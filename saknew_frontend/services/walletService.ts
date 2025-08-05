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
  const response = await apiClient.get('/api/wallet/wallets/my-wallet/');
  return response.data;
};

export const getMyTransactions = async (): Promise<Transaction[]> => {
  const response = await apiClient.get('/api/wallet/wallets/transactions/');
  return response.data;
};


// Add funds to wallet
export const addFunds = async (amount: number): Promise<any> => {
  const response = await apiClient.post('/api/wallet/deposit/', { amount });
  return response.data;
};
