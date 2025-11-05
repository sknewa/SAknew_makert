import apiClient from './apiClient';

export interface PayFastPaymentData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  email_address: string;
  amount: string;
  item_name: string;
  signature: string;
  m_payment_id: string;
}

export interface PayFastInitiateResponse {
  payment_data: PayFastPaymentData;
  payment_url: string;
  transaction_id: number;
}

export const initiatePayFastPayment = async (amount: number): Promise<PayFastInitiateResponse> => {
  const response = await apiClient.post('/api/wallet/payfast-initiate/', { amount });
  return response.data;
};
