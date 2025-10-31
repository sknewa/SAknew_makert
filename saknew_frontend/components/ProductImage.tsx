import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { getCachedImageUri } from '../utils/imageCache';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

interface ProductImageProps {
  imageUrl: string | null;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const ProductImage: React.FC<ProductImageProps> = ({ 
  imageUrl, 
  style, 
  resizeMode = 'cover' 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Load cached image
  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      try {
        const uri = await getCachedImageUri(imageUrl);
        if (isMounted) {
          setImageUri(uri);
        }
      } catch (err) {
        safeError('Failed to load cached image:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    
    loadImage();
    
    return () => { isMounted = false; };
  }, [imageUrl]);

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#3498DB" />
        </View>
      )}
      
      {imageUri && (
        <Image
          source={{ 
            uri: imageUri,
            cache: 'force-cache' // Force caching for better performance
          }}
        style={[
          styles.image, 
          { opacity: loading || error ? 0 : 1 }
        ]}
        resizeMode={resizeMode}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          safeLog('Image failed to load:', imageUrl);
          setError(true);
          setLoading(false);
        }}
      />)}
      
      {error && (
        <View style={styles.placeholderContainer}>
          <View style={styles.placeholderIconContainer}>
            <Text style={styles.placeholderIcon}>📷</Text>
          </View>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E0E6ED',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  placeholderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E6ED',
  },
  placeholderIconContainer: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 36,
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: 'bold' as 'bold',
    opacity: 0.7,
  },
});

export default ProductImage;