// Form validation utility functions

/**
 * Validates an email address
 * @param email Email address to validate
 * @returns True if valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates a password meets minimum requirements
 * @param password Password to validate
 * @returns True if valid, false otherwise
 */
export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Validates that two passwords match using time-safe comparison
 * @param password First password
 * @param confirmPassword Second password to compare
 * @returns True if matching, false otherwise
 */
export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
  // Use time-safe comparison to prevent timing attacks
  if (password.length !== confirmPassword.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < password.length; i++) {
    result |= password.charCodeAt(i) ^ confirmPassword.charCodeAt(i);
  }
  
  return result === 0;
};

/**
 * Validates a phone number
 * @param phone Phone number to validate
 * @returns True if valid, false otherwise
 */
export const isValidPhone = (phone: string): boolean => {
  // Basic phone validation - adjust for your specific requirements
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

/**
 * Validates a required field is not empty
 * @param value Field value to check
 * @returns True if not empty, false otherwise
 */
export const isNotEmpty = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Validates a number is within a range
 * @param value Number to validate
 * @param min Minimum allowed value
 * @param max Maximum allowed value
 * @returns True if within range, false otherwise
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validates a URL
 * @param url URL to validate
 * @returns True if valid, false otherwise
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Get validation error message for a field
 * @param fieldName Name of the field
 * @param validationType Type of validation that failed
 * @returns Error message string
 */
export const getValidationErrorMessage = (
  fieldName: string,
  validationType: 'required' | 'email' | 'password' | 'match' | 'phone' | 'range' | 'url'
): string => {
  switch (validationType) {
    case 'required':
      return `${fieldName} is required`;
    case 'email':
      return `Please enter a valid email address`;
    case 'password':
      return `Password must be at least 8 characters with uppercase, lowercase, and number`;
    case 'match':
      return `Passwords do not match`;
    case 'phone':
      return `Please enter a valid phone number`;
    case 'range':
      return `${fieldName} is out of valid range`;
    case 'url':
      return `Please enter a valid URL`;
    default:
      return `Invalid ${fieldName}`;
  }
};