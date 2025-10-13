// saknew_frontend/utils/imageHelper.ts

import { API_BASE_URL } from '../config';

/**
 * Ensures an image URL is properly formatted with the correct base URL
 * @param imageUrl The image URL from the API
 * @returns A properly formatted image URL
 */
export const getFullImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) {
    return null;
  }

  // If it's already a Cloudinary URL, return as is
  if (imageUrl.startsWith('https://res.cloudinary.com/')) {
    return imageUrl;
  }

  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // For relative paths, construct with API base URL
  const cleanPath = imageUrl.replace(/^\/+/, '');
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${baseUrl}/${cleanPath}`;
};