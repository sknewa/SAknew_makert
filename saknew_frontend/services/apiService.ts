// saknew_frontend/services/apiService.ts
// This file exports all service modules for easier imports and better organization

import shopService from './shopService';
import authService from './authService';
import * as salesServiceExports from './salesService';
import * as walletServiceExports from './walletService';

// Create consolidated service objects from named exports
const salesService = {
  // Cart operations
  getMyCart: salesServiceExports.getMyCart,
  addCartItem: salesServiceExports.addCartItem,
  updateCartItemQuantity: salesServiceExports.updateCartItemQuantity,
  removeCartItem: salesServiceExports.removeCartItem,
  clearCart: salesServiceExports.clearCart,
  
  // Order operations
  createOrderFromCart: salesServiceExports.createOrderFromCart,
  getOrderById: salesServiceExports.getOrderById,
  getMyOrders: salesServiceExports.getMyOrders,
  updateOrderStatus: salesServiceExports.updateOrderStatus,
  
  // Payment operations
  processPayment: salesServiceExports.processPayment,
  
  // Review operations
  createReview: salesServiceExports.createReview,
  updateReview: salesServiceExports.updateReview,
  deleteReview: salesServiceExports.deleteReview,
  getReviewsByProduct: salesServiceExports.getReviewsByProduct,
};

const walletService = {
  getMyWallet: walletServiceExports.getMyWallet,
  getMyTransactions: walletServiceExports.getMyTransactions,
  addFunds: walletServiceExports.addFunds,
};

// Export individual services for specific imports
export {
  shopService,
  authService,
  salesService,
  walletService
};

// Export all functions directly for backward compatibility
export const {
  // Cart functions
  getMyCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  
  // Order functions
  createOrderFromCart,
  getOrderById,
  getMyOrders,
  updateOrderStatus,
  
  // Payment functions
  processPayment,
  
  // Review functions
  createReview,
  updateReview,
  deleteReview,
  getReviewsByProduct,
} = salesService;

export const {
  getMyWallet,
  getMyTransactions,
  addFunds,
} = walletService;

// Default export for convenience
export default {
  shop: shopService,
  auth: authService,
  sales: salesService,
  wallet: walletService,
};
