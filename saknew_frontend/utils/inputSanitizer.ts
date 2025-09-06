// utils/inputSanitizer.ts
/**
 * Input sanitization utilities to prevent injection attacks
 */

/**
 * Sanitizes string input to prevent XSS attacks
 */
export const sanitizeString = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validates and sanitizes email input
 */
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  // Basic email sanitization - remove dangerous characters
  return email
    .toLowerCase()
    .replace(/[<>'"]/g, '')
    .trim();
};

/**
 * Sanitizes numeric input
 */
export const sanitizeNumber = (input: any): number | null => {
  const num = Number(input);
  return isNaN(num) ? null : num;
};

/**
 * Sanitizes object for API requests to prevent NoSQL injection
 */
export const sanitizeObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip potentially dangerous keys
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Time-safe string comparison to prevent timing attacks
 */
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

export default {
  sanitizeString,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeObject,
  timingSafeEqual
};