// saknew_frontend/services/salesService.ts
import apiClient from './apiClient'; // Assuming apiClient is configured with the base URL
import { SecurityUtils } from '../utils/securityUtils';
import { Product } from './shop.types'; // Import Product interface from shop.types

// --- Interfaces for Data Types (matching Django Serializers) ---

// Cart and CartItem Interfaces
export interface CartItem {
  id: number;
  product: Product; // Nested Product details
  product_id: number; // For sending product ID in requests
  quantity: number;
  line_total: string; // DecimalField from Django
}

export interface Cart {
  id: number;
  user: number; // User ID
  items: CartItem[];
  total: string; // DecimalField from Django
  created_at: string;
  updated_at: string;
}

// Order and OrderItem Interfaces
export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  price: string; // Price at time of order
  subtotal: string;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  id?: number; // Optional for creation, present for read
  user?: number; // Optional for creation, present for read
  full_name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  phone_number: string;
  is_default?: boolean; // Optional
  created_at?: string;
  updated_at?: string;
}

export interface TrackingInfo {
  id: number;
  status: string;
  tracking_number: string;
  carrier: string | null;
  estimated_delivery: string | null;
  last_updated: string;
}

export interface Order {
  id: string; // UUIDField from Django
  user: { // Nested User details
    id: number;
    username: string;
    email: string;
    // Add other user fields as needed from UserSerializer
  };
  order_date: string;
  total_price: string;
  shipping_address: ShippingAddress;
  payment_status: string;
  delivery_verification_code: string | null;
  delivery_verified: boolean;
  delivery_verified_at: string | null;
  order_status: string;
  order_status_display: string; // Human-readable status
  tracking_info: TrackingInfo | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

// Payment Interface
export interface Payment {
  id: number;
  order: Order; // Nested order details
  payment_date: string;
  amount: string;
  payment_method: string;
  transaction_id: string;
  created_at: string;
  updated_at: string;
}

// Review Interface
export interface Review {
  id: number;
  user: { // Nested User details
    id: number;
    username: string;
    email: string;
  };
  product: Product; // Nested Product details
  order: string; // Order UUID
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

// --- API Functions for Cart ---

const getMyCart = async (): Promise<Cart> => {
  try {
    const response = await apiClient.get('/api/carts/my_cart/');
    return response.data;
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error fetching cart:', error.response?.data || error.message);
    throw error;
  }
};

const addCartItem = async (productId: number, quantity: number = 1): Promise<Cart> => {
  try {
    const response = await apiClient.post('/api/carts/add/', { product_id: productId, quantity });
    return response.data.cart; // Backend returns {"detail": ..., "cart": CartData}
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error adding item to cart:', error.response?.data || error.message);
    throw error;
  }
};

const updateCartItemQuantity = async (productId: number, quantity: number): Promise<{
  detail: string;
  new_quantity: number;
  line_total: number; // Backend returns float for this
  new_cart_total: number; // Backend returns float for this
}> => {
  try {
    const response = await apiClient.patch('/api/carts/update-quantity/', { product_id: productId, quantity });
    return response.data;
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error updating cart item quantity:', error.response?.data || error.message);
    throw error;
  }
};

const removeCartItem = async (productId: number): Promise<Cart> => {
  try {
    const response = await apiClient.post('/api/carts/remove/', { product_id: productId });
    return response.data.cart; // Backend returns {"detail": ..., "cart": CartData}
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error removing item from cart:', error.response?.data || error.message);
    throw error;
  }
};

const clearCart = async (): Promise<Cart> => {
  try {
    const response = await apiClient.post('/api/carts/clear/');
    return response.data.cart; // Backend returns {"detail": ..., "cart": CartData}
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error clearing cart:', error.response?.data || error.message);
    throw error;
  }
};

// --- API Functions for Orders ---

const createOrderFromCart = async (shippingAddress: ShippingAddress): Promise<Order> => {
  try {
    const response = await apiClient.post('/api/orders/create-from-cart/', { shipping_address: shippingAddress });
    return response.data;
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error creating order from cart:', error.response?.data || error.message);
    throw error;
  }
};

const getOrderById = async (orderId: string): Promise<Order> => {
  try {
    const response = await apiClient.get(`/api/orders/${orderId}/`);
    return response.data;
  } catch (error: any) {
    SecurityUtils.safeLog('error', `Error fetching order ${SecurityUtils.sanitizeForLogging(orderId)}:`, error.response?.data || error.message);
    throw error;
  }
};

const getMyOrders = async (): Promise<Order[]> => {
  try {
    const response = await apiClient.get('/api/orders/'); // Assumes backend filters by user automatically
    return response.data.results; // Assuming pagination, so results array
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error fetching my orders:', error.response?.data || error.message);
    throw error;
  }
};

const updateOrderStatus = async (orderId: string, actionType: string, verificationCodeOrReason?: string): Promise<Order> => {
  try {
    const payload: { action_type: string; verification_code?: string; cancellation_reason?: string } = { action_type: actionType };
    if (verificationCodeOrReason) {
      if (actionType === 'cancel_order') {
        payload.cancellation_reason = verificationCodeOrReason;
      } else {
        payload.verification_code = verificationCodeOrReason;
      }
    }
    const response = await apiClient.patch(`/api/orders/${orderId}/status-update/`, payload);
    return response.data.order; // Backend returns {"detail": ..., "order": OrderData}
  } catch (error: any) {
    SecurityUtils.safeLog('error', `Error updating order ${SecurityUtils.sanitizeForLogging(orderId)} status (${SecurityUtils.sanitizeForLogging(actionType)}):`, error.response?.data || error.message);
    throw error;
  }
};

const verifyDeliveryCode = async (orderId: string, verificationCode: string): Promise<{ detail: string; order: Order }> => {
  try {
    const response = await apiClient.patch(`/api/orders/${orderId}/status-update/`, {
      action_type: 'verify_delivery_code',
      verification_code: verificationCode
    });
    return response.data;
  } catch (error: any) {
    SecurityUtils.safeLog('error', `Error verifying delivery code for order ${SecurityUtils.sanitizeForLogging(orderId)}:`, error.response?.data || error.message);
    throw error;
  }
};

// --- API Functions for Payments ---

const processPayment = async (orderId: string, paymentMethod: 'wallet' | 'stripe'): Promise<{ detail: string; order_id: string; verification_code?: string }> => {
  try {
    const response = await apiClient.post('/api/payments/', { order_id: orderId, payment_method: paymentMethod });
    return response.data;
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error processing payment:', error.response?.data || error.message);
    throw error;
  }
};

const verifyPayment = async (orderId: string, verificationCode: string): Promise<{ detail: string; order_id: string }> => {
  try {
    const response = await apiClient.post('/api/payments/verify/', { order_id: orderId, verification_code: verificationCode });
    return response.data;
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error verifying payment:', error.response?.data || error.message);
    throw error;
  }
};

// --- API Functions for Reviews ---

interface CreateReviewData {
  order_id: string;
  product_id: number;
  rating: number;
  comment?: string;
}

const createReview = async (reviewData: CreateReviewData): Promise<Review> => {
  try {
    const response = await apiClient.post('/api/reviews/', reviewData);
    return response.data;
  } catch (error: any) {
    SecurityUtils.safeLog('error', 'Error creating review:', error.response?.data || error.message);
    throw error;
  }
};

interface UpdateReviewData {
  rating?: number;
  comment?: string;
}

const updateReview = async (reviewId: number, reviewData: UpdateReviewData): Promise<Review> => {
  try {
    const response = await apiClient.patch(`/api/reviews/${reviewId}/`, reviewData);
    return response.data;
  } catch (error: any) {
    SecurityUtils.safeLog('error', `Error updating review ${SecurityUtils.sanitizeForLogging(reviewId)}:`, error.response?.data || error.message);
    throw error;
  }
};

const deleteReview = async (reviewId: number): Promise<void> => {
  try {
    await apiClient.delete(`/api/reviews/${reviewId}/`);
  } catch (error: any) {
    SecurityUtils.safeLog('error', `Error deleting review ${SecurityUtils.sanitizeForLogging(reviewId)}:`, error.response?.data || error.message);
    throw error;
  }
};

const getReviewsByProduct = async (productId: number): Promise<Review[]> => {
  try {
    const response = await apiClient.get(`/api/reviews/?product_id=${productId}`);
    return response.data.results || []; // Assuming pagination, so results array
  } catch (error: any) {
    SecurityUtils.safeLog('error', `Error fetching reviews for product ${SecurityUtils.sanitizeForLogging(productId)}:`, error.response?.data || error.message);
    throw error;
  }
};

// Export all functions
export {
  getMyCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  createOrderFromCart,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  verifyDeliveryCode,
  processPayment,
  verifyPayment,
  createReview,
  updateReview,
  deleteReview,
  getReviewsByProduct,
};