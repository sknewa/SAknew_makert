import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { getImageUrl } from './imageUtils';

// Cache configuration
const CACHE_FOLDER = `${FileSystem.cacheDirectory}images/`;
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Cache state
let isCacheInitialized = false;
const urlToPath: Record<string, string> = {};

// Initialize cache directory
export const initializeCache = async (): Promise<void> => {
  if (Platform.OS === 'web' || isCacheInitialized) {
    return;
  }
  
  try {
    const cacheFolder = await FileSystem.getInfoAsync(CACHE_FOLDER);
    
    if (!cacheFolder.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }
    
    isCacheInitialized = true;
    console.log('Image cache initialized');
    
    // Clean old cache entries in the background
    cleanCache().catch(err => console.error('Cache cleaning error:', err));
  } catch (error) {
    console.error('Failed to initialize image cache:', error);
  }
};

// Get cached image URI
export const getCachedImageUri = async (url: string | null): Promise<string> => {
  if (!url) {
    return 'https://via.placeholder.com/300x300?text=No+Image';
  }
  
  // Web platform doesn't support file caching
  if (Platform.OS === 'web' || !isCacheInitialized) {
    return getImageUrl(url);
  }
  
  const fullUrl = getImageUrl(url);
  
  // Check if image is already cached
  if (urlToPath[fullUrl]) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(urlToPath[fullUrl]);
      if (fileInfo.exists) {
        return urlToPath[fullUrl];
      }
    } catch (error) {
      console.error('Error checking cached file:', error);
    }
  }
  
  // Cache the image
  try {
    const filename = fullUrl.split('/').pop() || Date.now().toString();
    const path = `${CACHE_FOLDER}${filename}`;
    
    await FileSystem.downloadAsync(fullUrl, path);
    urlToPath[fullUrl] = path;
    
    return path;
  } catch (error) {
    console.error('Error caching image:', error);
    return fullUrl; // Fallback to original URL
  }
};

// Clean old cache entries
const cleanCache = async (): Promise<void> => {
  try {
    const now = Date.now();
    const cacheContents = await FileSystem.readDirectoryAsync(CACHE_FOLDER);
    
    let totalSize = 0;
    const fileStats = await Promise.all(
      cacheContents.map(async filename => {
        const path = `${CACHE_FOLDER}${filename}`;
        const info = await FileSystem.getInfoAsync(path, { size: true });
        return { path, info, filename };
      })
    );
    
    // Sort by modification time (oldest first)
    fileStats.sort((a, b) => {
      return (a.info.modificationTime || 0) - (b.info.modificationTime || 0);
    });
    
    // Remove expired and excess files
    for (const file of fileStats) {
      const age = now - (file.info.modificationTime || 0) * 1000;
      totalSize += file.info.size || 0;
      
      if (age > CACHE_EXPIRY || totalSize > MAX_CACHE_SIZE) {
        await FileSystem.deleteAsync(file.path);
        
        // Remove from urlToPath mapping
        Object.keys(urlToPath).forEach(url => {
          if (urlToPath[url] === file.path) {
            delete urlToPath[url];
          }
        });
      }
    }
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
};

// Initialize cache on import
initializeCache();