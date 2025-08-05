// saknew_frontend/utils/imageHelper.ts

import { API_BASE_URL } from '../config';

/**
 * Ensures an image URL is properly formatted with the correct base URL
 * @param imageUrl The image URL from the API
 * @returns A properly formatted image URL
 */
export const getFullImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) return null;

  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Remove any leading slashes from imageUrl
  let cleanPath = imageUrl.replace(/^\/+/, '');

  // Ensure API_BASE_URL ends with a slash
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;

  // Use the correct Django media path
  return `${baseUrl}media/${cleanPath}`;
};