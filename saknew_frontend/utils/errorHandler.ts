import axios, { AxiosError } from 'axios';

/**
 * Formats API error messages from various response formats
 * @param error The error object from an API call
 * @returns A user-friendly error message
 */
export const formatApiError = (error: unknown): string => {
  // Default error message
  let errorMessage = 'An unexpected error occurred. Please try again.';

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Handle network errors
    if (!axiosError.response) {
      return 'Network error. Please check your internet connection.';
    }

    const { status, data } = axiosError.response;

    // Handle different status codes
    switch (status) {
      case 400:
        errorMessage = formatErrorData(data) || 'Invalid request. Please check your input.';
        break;
      case 401:
        errorMessage = 'Authentication required. Please log in again.';
        break;
      case 403:
        errorMessage = 'You do not have permission to perform this action.';
        break;
      case 404:
        errorMessage = 'The requested resource was not found.';
        break;
      case 422:
        errorMessage = formatErrorData(data) || 'Validation error. Please check your input.';
        break;
      case 429:
        errorMessage = 'Too many requests. Please try again later.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorMessage = 'Server error. Please try again later.';
        break;
      default:
        errorMessage = formatErrorData(data) || `Error: ${status}`;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return errorMessage;
};

/**
 * Formats error data from various API response formats
 * @param data The error data from the API response
 * @returns A formatted error message
 */
const formatErrorData = (data: any): string | null => {
  if (!data) return null;

  // Handle Django REST Framework error format
  if (typeof data === 'object') {
    // Handle DRF non_field_errors
    if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
      return data.non_field_errors.join(' ');
    }
    
    // Handle DRF detail field
    if (data.detail) {
      return data.detail;
    }
    
    // Handle DRF field errors
    const fieldErrors = [];
    for (const [field, errors] of Object.entries(data)) {
      if (Array.isArray(errors)) {
        fieldErrors.push(`${field}: ${errors.join(' ')}`);
      } else if (typeof errors === 'string') {
        fieldErrors.push(`${field}: ${errors}`);
      }
    }
    
    if (fieldErrors.length > 0) {
      return fieldErrors.join(', ');
    }
  }
  
  // Handle string error
  if (typeof data === 'string') {
    return data;
  }
  
  return null;
};

/**
 * Logs errors to console and potentially to a monitoring service
 * @param error The error object
 * @param context Additional context about where the error occurred
 */
export const logError = (error: unknown, context: string): void => {
  console.error(`Error in ${context}:`, error);
  
  // Here you could add integration with error monitoring services like Sentry
  // if (Sentry) {
  //   Sentry.captureException(error, { extra: { context } });
  // }
};