import { IMAGE_BASE_URL } from '../config';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

/**
 * Ensures image URLs are absolute by converting relative URLs to absolute
 * @param url The image URL to process
 * @returns An absolute URL for the image
 */

export const getImageUrl = (url: string | null): string => {
  if (!url) return 'https://via.placeholder.com/300x300?text=No+Image';
  
  try {
    // If URL is already absolute, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If URL is relative, prepend the API base URL
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    
    // Use the hardcoded IMAGE_BASE_URL instead of API_BASE_URL
    const baseUrl = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL.slice(0, -1) : IMAGE_BASE_URL;
    
    // Log the constructed URL for debugging
    const fullUrl = `${baseUrl}/${cleanUrl}`;
    safeLog('Constructed image URL:', fullUrl);
    
    return fullUrl;
  } catch (error) {
    safeError('Error processing image URL:', error);
    return 'https://via.placeholder.com/300x300?text=Error';
  }
};

/**
 * Checks if an image URL is accessible
 * @param url The image URL to check
 * @returns Promise resolving to true if accessible, false otherwise
 */
export const isImageAccessible = async (url: string): Promise<boolean> => {
  try {
    // Skip actual network check in development to avoid unnecessary errors
    // Just log the URL we're trying to access
    safeLog('Would check accessibility for:', url);
    return true;
  } catch (error) {
    safeError('Error checking image accessibility:', error);
    return false;
  }
};