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

export interface CardDepositRequest {
  amount: number;
  card_number: string;
  card_expiry: string;
  card_cvv: string;
  card_holder: string;
}

export interface CardDepositResponse {
  success: boolean;
  message: string;
  transaction_id?: number;
  amount_added?: string;
  new_balance?: string;
  error?: string;
}

export const getMyWallet = async (): Promise<Wallet> => {
  safeLog('Calling wallet API: /api/wallet/wallets/my-wallet/');
  const response = await apiClient.get('/api/wallet/wallets/my-wallet/');
  safeLog('Wallet API response:', response.data);
  return response.data;
};

export const getQuickWallet = async (): Promise<{balance: string; user_email: string; recent_transactions: Transaction[]}> => {
  safeLog('Calling quick wallet API: /api/wallet/quick-wallet/');
  const response = await apiClient.get('/api/wallet/quick-wallet/');
  safeLog('Quick wallet API response:', response.data);
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

// MAIN: Card payment deposit (money goes to your business account)
export const depositWithCard = async (cardData: CardDepositRequest): Promise<CardDepositResponse> => {
  safeLog('💳 CARD DEPOSIT: Processing card payment for R' + cardData.amount);
  try {
    const response = await apiClient.post('/api/wallet/card-deposit/', cardData);
    safeLog('💳 CARD DEPOSIT: Success response:', response.data);
    return response.data;
  } catch (error: any) {
    safeError('💳 CARD DEPOSIT ERROR:', error.message);
    safeError('💳 CARD DEPOSIT: Error response:', error?.response?.data);
    
    // Return error in expected format
    return {
      success: false,
      error: error?.response?.data?.error || 'payment_failed',
      message: error?.response?.data?.message || 'Payment failed. Please try again.'
    };
  }
};

// Alternative: PayFast redirect payment
export const depositWithPayFast = async (amount: number): Promise<{payment_url: string; payment_id: string}> => {
  safeLog('💰 PAYFAST DEPOSIT: Creating payment for R' + amount);
  const response = await apiClient.post('/api/wallet/payfast-deposit/', { amount });
  safeLog('💰 PAYFAST DEPOSIT: Response received:', response.data);
  return response.data;
};

// Legacy: Simple bank transfer deposit
export const requestDeposit = async (amount: number, bankReference?: string) => {
  safeLog('🏦 BANK DEPOSIT: Requesting deposit for R' + amount);
  const response = await apiClient.post('/api/wallet/simple-deposit/', { 
    amount,
    bank_reference: bankReference || ''
  });
  safeLog('🏦 BANK DEPOSIT: Response received:', response.data);
  return response.data;
};

// Legacy PayFast deposit (keep for backward compatibility)
export const addFunds = async (amount: number): Promise<any> => {
  safeLog('💰 WALLET API: Initiating PayFast deposit for R' + amount);
  const response = await apiClient.post('/api/wallet/deposit/', { amount });
  safeLog('💰 WALLET API: Response received:', response.data);
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

// Utility: Format card number for display
export const formatCardNumber = (cardNumber: string): string => {
  return cardNumber.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
};

// Utility: Validate card number (basic Luhn algorithm)
export const validateCardNumber = (cardNumber: string): boolean => {
  const num = cardNumber.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(num)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

// Utility: Validate expiry date
export const validateExpiryDate = (expiry: string): boolean => {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  
  const [month, year] = expiry.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }
  
  return true;
};
