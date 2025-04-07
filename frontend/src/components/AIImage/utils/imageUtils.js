// Image utility functions
import { RESOLUTIONS } from '../config/resolutions';

// Helper function to format image URLs properly
export const formatImageUrl = (url) => {
  if (!url) {
    console.warn('Empty URL passed to formatImageUrl');
    return '';
  }
  
  // Debug: log the input URL
  console.log('Formatting image URL, input:', url);
  
  // If URL is already absolute, return it as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('URL is already absolute, returning as is:', url);
    return url;
  }
  
  // First, strip any double slashes (except http://)
  url = url.replace(/([^:])\/\//g, '$1/');
  
  // Handle various URL patterns
  let formattedUrl;
  
  // Case 1: URL contains 'media/'
  if (url.includes('media/')) {
    // Extract just the media path
    const mediaPart = url.includes('/media/') 
      ? url.split('/media/')[1] 
      : url.split('media/')[1];
      
    formattedUrl = `/media/${mediaPart}`;
  } 
  // Case 2: URL starts with '/'
  else if (url.startsWith('/')) {
    formattedUrl = url;
  } 
  // Case 3: Any other relative URL
  else {
    formattedUrl = `/${url}`;
  }
  
  // Add the base URL
  const fullUrl = window.location.origin + formattedUrl;
  
  // Debug: log the output URL
  console.log('Formatting complete, output:', fullUrl);
  
  return fullUrl;
};

// Helper function to get width from resolution string
export const getWidthFromResolution = (resolution) => {
  // Find the resolution in our definitions
  for (const model in RESOLUTIONS) {
    const found = RESOLUTIONS[model].find(res => res.value === resolution);
    if (found) return found.width;
  }
  return 1024; // Default
};

// Helper function to get height from resolution string
export const getHeightFromResolution = (resolution) => {
  // Find the resolution in our definitions
  for (const model in RESOLUTIONS) {
    const found = RESOLUTIONS[model].find(res => res.value === resolution);
    if (found) return found.height;
  }
  return 1024; // Default
};

// Helper function to safely parse JSON
export const safeParseJSON = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return fallback;
  }
}; 