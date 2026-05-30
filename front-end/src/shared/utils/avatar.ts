import { API_URL } from '../constants/api';

/**
 * Normalizes an avatar URL.
 * If the URL is external (starts with http), it's returned as is.
 * If it's internal (relative path), it's prefixed with the API_URL.
 * If no URL is provided, returns null.
 */
export const getAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('file://')) return url; // Handle local picker files
  
  // Ensure relative path starts with /
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_URL}${path}`;
};
