// saknew_frontend/services/salesService.ts
import apiClient from './apiClient'; // Assuming apiClient is configured with the base URL
import { safeLog } from '../utils/secureLogger';
import { Product } from './shop.types'; // Import Product interface from shop.types

// Extended Product interface with shop information for orders
export interface ProductWithShop extends Product {
  shop: number;
  shop_name: string;
  shop_slug: string;
}

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
  product: ProductWithShop;
  quantity: number;
  price: string; // Price at time of order
  subtotal: string;
  delivered?: boolean;
  delivered_at?: string;
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
  cancellation_reason?: string;
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
    safeLog('🔧 [salesService.getMyCart] START - Making GET request to /api/carts/my_cart/');
    const response = await apiClient.get('/api/carts/my_cart/');
    safeLog('✅ [salesService.getMyCart] Response received');
    safeLog('✅ [salesService.getMyCart] Cart items count:', response.data?.items?.length || 0);
    safeLog('✅ [salesService.getMyCart] Cart total:', response.data?.total);
    safeLog('✅ [salesService.getMyCart] END - Returning cart data');
    return response.data;
  } catch (error: any) {
    safeLog('❌ [salesService.getMyCart] ERROR:', error.response?.data || error.message);
    console.error('Error fetching cart:', error.response?.data || error.message);
    throw error;
  }
};

const addCartItem = async (productId: number, quantity: number = 1, size?: string): Promise<Cart> => {
  try {
    const payload: { product_id: number; quantity: number; size?: string } = { product_id: productId, quantity };
    if (size) {
      payload.size = size;
    }
    const response = await apiClient.post('/api/carts/add/', payload);
    return response.data.cart; // Backend returns {"detail": ..., "cart": CartData}
  } catch (error: any) {
    console.error('Error adding item to cart:', error.response?.data || error.message);
    // Check if authentication error
    if (error.response?.data?.detail === 'Authentication credentials were not provided.') {
      const authError = new Error('You have to login to add products to cart');
      (authError as any).response = error.response;
      throw authError;
    }
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
    console.error('Error updating cart item quantity:', error.response?.data || error.message);
    throw error;
  }
};

const removeCartItem = async (productId: number): Promise<Cart> => {
  try {
    safeLog('🔧 [salesService.removeCartItem] START - Called with productId:', productId);
    safeLog('🔧 [salesService.removeCartItem] Product ID type:', typeof productId);
    safeLog('🔧 [salesService.removeCartItem] Payload:', JSON.stringify({ product_id: productId }));
    safeLog('🔧 [salesService.removeCartItem] Making POST request to /api/carts/remove/');
    
    const response = await apiClient.post('/api/carts/remove/', { product_id: productId });
    
    safeLog('✅ [salesService.removeCartItem] Response received');
    safeLog('✅ [salesService.removeCartItem] Response status:', response.status);
    safeLog('✅ [salesService.removeCartItem] Response data:', JSON.stringify(response.data, null, 2));
    safeLog('✅ [salesService.removeCartItem] Cart from response:', response.data.cart);
    safeLog('✅ [salesService.removeCartItem] END - Returning cart');
    
    return response.data.cart; // Backend returns {"detail": ..., "cart": CartData}
  } catch (error: any) {
    safeLog('❌ [salesService.removeCartItem] ERROR occurred');
    safeLog('❌ [salesService.removeCartItem] Error object:', error);
    safeLog('❌ [salesService.removeCartItem] Error message:', error?.message);
    safeLog('❌ [salesService.removeCartItem] Error response:', error.response);
    safeLog('❌ [salesService.removeCartItem] Error response status:', error.response?.status);
    safeLog('❌ [salesService.removeCartItem] Error response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error removing item from cart:', error.response?.data || error.message);
    throw error;
  }
};

const clearCart = async (): Promise<Cart> => {
  try {
    safeLog('🔧 [salesService.clearCart] START - Making POST request to /api/carts/clear/');
    const response = await apiClient.post('/api/carts/clear/');
    safeLog('✅ [salesService.clearCart] Response received:', JSON.stringify(response.data, null, 2));
    safeLog('✅ [salesService.clearCart] END - Returning cart');
    return response.data.cart; // Backend returns {"detail": ..., "cart": CartData}
  } catch (error: any) {
    safeLog('❌ [salesService.clearCart] ERROR:', error.response?.data || error.message);
    console.error('Error clearing cart:', error.response?.data || error.message);
    throw error;
  }
};

// --- API Functions for Orders ---

const createOrderFromCart = async (shippingAddress: ShippingAddress): Promise<Order> => {
  try {
    const response = await apiClient.post('/api/orders/create-from-cart/', { shipping_address: shippingAddress });
    return response.data;
  } catch (error: any) {
    console.error('Error creating order from cart:', error.response?.data || error.message);
    throw error;
  }
};

const getOrderById = async (orderId: string): Promise<Order> => {
  try {
    const response = await apiClient.get(`/api/orders/${orderId}/`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching order ${orderId}:`, error.response?.data || error.message);
    throw error;
  }
};

const getMyOrders = async (): Promise<Order[]> => {
  try {
    const response = await apiClient.get('/api/orders/'); // Assumes backend filters by user automatically
    return response.data.results; // Assuming pagination, so results array
  } catch (error: any) {
    console.error('Error fetching my orders:', error.response?.data || error.message);
    throw error;
  }
};

const updateOrderStatus = async (orderId: string, actionType: string, verificationCodeOrReason?: string | { code?: string; item_id?: number; cancellation_reason?: string }): Promise<{ detail: string; order: Order; delivery_verification_code?: string; delivery_code?: string }> => {
  try {
    const payload: { action_type: string; verification_code?: string; cancellation_reason?: string; item_id?: number; code?: string } = { action_type: actionType };
    
    if (verificationCodeOrReason) {
      if (typeof verificationCodeOrReason === 'string') {
        if (actionType === 'cancel_order') {
          payload.cancellation_reason = verificationCodeOrReason;
        } else {
          payload.verification_code = verificationCodeOrReason;
        }
      } else {
        // Handle object payload for per-item operations
        if (verificationCodeOrReason.code) payload.verification_code = verificationCodeOrReason.code;
        if (verificationCodeOrReason.cancellation_reason) payload.cancellation_reason = verificationCodeOrReason.cancellation_reason;
        if (verificationCodeOrReason.item_id) payload.item_id = verificationCodeOrReason.item_id;
      }
    }
    
    const response = await apiClient.patch(`/api/orders/${orderId}/status-update/`, payload);
    return response.data; // Backend returns {"detail": ..., "order": OrderData, "delivery_verification_code"?: ...}
  } catch (error: any) {
    console.error(`Error updating order ${orderId} status (${actionType}):`, error.response?.data || error.message);
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
    console.error(`Error verifying delivery code for order ${orderId}:`, error.response?.data || error.message);
    throw error;
  }
};

// --- API Functions for Payments ---

const processPayment = async (orderId: string, paymentMethod: 'wallet' | 'stripe'): Promise<{ detail: string; order_id: string; verification_code?: string }> => {
  try {
    const response = await apiClient.post('/api/payments/', { order_id: orderId, payment_method: paymentMethod });
    return response.data;
  } catch (error: any) {
    console.error('Error processing payment:', error.response?.data || error.message);
    throw error;
  }
};

const verifyPayment = async (orderId: string, verificationCode: string): Promise<{ detail: string; order_id: string }> => {
  try {
    const response = await apiClient.post('/api/payments/verify/', { order_id: orderId, verification_code: verificationCode });
    return response.data;
  } catch (error: any) {
    console.error('Error verifying payment:', error.response?.data || error.message);
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
    console.error('Error creating review:', error.response?.data || error.message);
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
    console.error(`Error updating review ${reviewId}:`, error.response?.data || error.message);
    throw error;
  }
};

const deleteReview = async (reviewId: number): Promise<void> => {
  try {
    await apiClient.delete(`/api/reviews/${reviewId}/`);
  } catch (error: any) {
    console.error(`Error deleting review ${reviewId}:`, error.response?.data || error.message);
    throw error;
  }
};

const getReviewsByProduct = async (productId: number): Promise<Review[]> => {
  try {
    const response = await apiClient.get(`/api/reviews/?product_id=${productId}`);
    return response.data.results || []; // Assuming pagination, so results array
  } catch (error: any) {
    console.error(`Error fetching reviews for product ${productId}:`, error.response?.data || error.message);
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