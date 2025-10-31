import { Alert } from 'react-native';
import axios from 'axios';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

// Error categories
export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  SERVER = 'server',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

// Error interface
export interface AppError {
  message: string;
  category: ErrorCategory;
  originalError?: any;
  code?: string | number;
}

// Categorize errors
export const categorizeError = (error: any): AppError => {
  // Network errors
  if (!error.response && axios.isAxiosError(error)) {
    return {
      message: 'Unable to connect to the server. Please check your internet connection.',
      category: ErrorCategory.NETWORK,
      originalError: error
    };
  }
  
  // Authentication errors
  if (error.response?.status === 401) {
    return {
      message: 'Your session has expired. Please log in again.',
      category: ErrorCategory.AUTH,
      originalError: error,
      code: 401
    };
  }
  
  // Validation errors
  if (error.response?.status === 400) {
    let message = 'Please check your input and try again.';
    
    // Extract validation messages if available
    if (typeof error.response.data === 'object') {
      const validationMessages = Object.values(error.response.data)
        .flat()
        .filter(Boolean)
        .map(msg => String(msg))
        .join('. ');
      
      if (validationMessages) {
        message = validationMessages;
      }
    }
    
    return {
      message,
      category: ErrorCategory.VALIDATION,
      originalError: error,
      code: 400
    };
  }
  
  // Server errors
  if (error.response?.status >= 500) {
    return {
      message: 'The server encountered an error. Please try again later.',
      category: ErrorCategory.SERVER,
      originalError: error,
      code: error.response.status
    };
  }
  
  // Default case
  return {
    message: error.message || 'An unexpected error occurred.',
    category: ErrorCategory.UNKNOWN,
    originalError: error
  };
};

// Display error to user
export const displayError = (error: any, title = 'Error') => {
  const appError = categorizeError(error);
  
  Alert.alert(
    title,
    appError.message,
    [{ text: 'OK' }]
  );
  
  // Log error for debugging
  safeError(`[${appError.category.toUpperCase()}] ${appError.message}`, appError.originalError);
  
  return appError;
};

// Handle error with custom callbacks
export const handleError = (
  error: any,
  options: {
    title?: string;
    onNetwork?: () => void;
    onAuth?: () => void;
    onServer?: () => void;
    onValidation?: () => void;
    onUnknown?: () => void;
    showAlert?: boolean;
  } = {}
) => {
  const appError = categorizeError(error);
  const { 
    title = 'Error',
    onNetwork,
    onAuth,
    onServer,
    onValidation,
    onUnknown,
    showAlert = true
  } = options;
  
  // Log error
  safeError(`[${appError.category.toUpperCase()}] ${appError.message}`, appError.originalError);
  
  // Show alert if enabled
  if (showAlert) {
    Alert.alert(title, appError.message, [{ text: 'OK' }]);
  }
  
  // Call appropriate callback
  switch (appError.category) {
    case ErrorCategory.NETWORK:
      onNetwork?.();
      break;
    case ErrorCategory.AUTH:
      onAuth?.();
      break;
    case ErrorCategory.SERVER:
      onServer?.();
      break;
    case ErrorCategory.VALIDATION:
      onValidation?.();
      break;
    case ErrorCategory.UNKNOWN:
      onUnknown?.();
      break;
  }
  
  return appError;
};