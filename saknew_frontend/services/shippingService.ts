import apiClient from './apiClient';

export interface ShippingVerificationResponse {
  detail: string;
  product_name: string;
  amount_credited: number;
}

export const verifyProductShipping = async (deliveryCode: string): Promise<ShippingVerificationResponse> => {
  const response = await apiClient.post('/sales/shipping/verify/', {
    delivery_code: deliveryCode
  });
  return response.data;
};