import apiClient from './apiClient';

export interface DeliveryVerificationResponse {
  detail: string;
  product_name: string;
  amount_credited: number;
  order_completed: boolean;
}

export const verifyProductDelivery = async (deliveryCode: string): Promise<DeliveryVerificationResponse> => {
  const response = await apiClient.post('/sales/delivery/verify/', {
    delivery_code: deliveryCode
  });
  return response.data;
};