import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Product } from '../services/shop.types';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { getFullImageUrl } from '../utils/imageHelper';
import { MainNavigationProp } from '../navigation/types';
import shopService from '../services/shopService';
import { addCartItem } from '../services/salesService';
import { colors, spacing } from '../styles/globalStyles';
import * as Location from 'expo-location';

const screenWidth = Dimensions.get('window').width;
const productCardWidth = (screenWidth - (spacing.md * 4)) / 3 + 3;

interface ProductCardProps {
  product: Product;
  isShopOwner?: boolean;
  navigation?: MainNavigationProp;
  onCartUpdated?: () => void;
  onPress?: (product: Product) => void;
  onProductDeleted?: () => void;
  shopLatitude?: string | null;
  shopLongitude?: string | null;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  isShopOwner, 
  navigation, 
  onCartUpdated, 
  onPress,
  onProductDeleted,
  shopLatitude,
  shopLongitude
}) => {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [distance, setDistance] = useState<string | null>(null);
  
  useEffect(() => {
    const calculateDistance = async () => {
      console.log('📍 [ProductCard] Distance calculation START for product:', product.id);
      console.log('📍 [ProductCard] shopLatitude:', shopLatitude);
      console.log('📍 [ProductCard] shopLongitude:', shopLongitude);
      
      if (!shopLatitude || !shopLongitude) {
        console.log('❌ [ProductCard] No shop coordinates provided');
        return;
      }
      
      try {
        console.log('📍 [ProductCard] Requesting location permission...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('📍 [ProductCard] Permission status:', status);
        
        if (status !== 'granted') {
          console.log('❌ [ProductCard] Location permission not granted');
          return;
        }
        
        console.log('📍 [ProductCard] Getting current position...');
        const location = await Location.getCurrentPositionAsync({});
        console.log('📍 [ProductCard] User location:', location.coords.latitude, location.coords.longitude);
        
        const shopLat = parseFloat(shopLatitude);
        const shopLon = parseFloat(shopLongitude);
        console.log('📍 [ProductCard] Shop coordinates:', shopLat, shopLon);
        
        const R = 6371;
        const dLat = (shopLat - location.coords.latitude) * Math.PI / 180;
        const dLon = (shopLon - location.coords.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(location.coords.latitude * Math.PI / 180) * Math.cos(shopLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        
        const distanceText = d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
        console.log('✅ [ProductCard] Distance calculated:', distanceText);
        setDistance(distanceText);
      } catch (error) {
        console.log('❌ [ProductCard] Distance calculation error:', error);
      }
    };
    
    calculateDistance();
  }, [shopLatitude, shopLongitude, product.id]);
  
  console.log('🎴 ProductCard - Rendering product:', product.id, product.name);
  console.log('🎴 ProductCard - Has promotion:', !!product.promotion);
  if (product.promotion) {
    console.log('🎴 ProductCard - Promotion details:', {
      id: product.promotion.id,
      discount: product.promotion.discount_percentage,
      start: product.promotion.start_date,
      end: product.promotion.end_date
    });
  }
  console.log('🎴 ProductCard - Prices:', {
    price: product.price,
    display_price: product.display_price
  });
  
  if (!product) return null;
  
  const allImages = [
    ...(product.main_image_url ? [{ uri: getFullImageUrl(product.main_image_url) || '', id: 'main' }] : []),
    ...((product.images || []).map((img, idx) => ({ uri: getFullImageUrl(img.image) || '', id: `gallery-${idx}` })))
  ].filter(img => img.uri)
   .filter((img, index, self) => self.findIndex(i => i.uri === img.uri) === index);







  const handleAddToCart = async (e: any) => {
    e.stopPropagation();
    if (product.stock <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    setAddingToCart(true);
    try {
      await addCartItem(product.id);
      Alert.alert('Success', `Added "${product.name}" to cart!`);
      onCartUpdated?.();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleDeleteProduct = async () => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await shopService.deleteProduct(product.id);
              Alert.alert('Success', 'Product deleted successfully');
              onProductDeleted?.();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress(product);
    } else if (navigation) {
      if (isShopOwner) {
        navigation.navigate('ProductManagement', { productId: product.id });
      } else {
        navigation.navigate('ProductDetail', { productId: product.id });
      }
    }
  };

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {allImages.length > 1 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroller}
            onScroll={(event) => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const newIndex = Math.round(contentOffsetX / (productCardWidth - 10));
              setCurrentImageIndex(newIndex);
            }}
            scrollEventThrottle={16}
          >
            {allImages.map((img, index) => (
                <Image
                  key={`${product.id}-${img.id}-${index}`}
                  source={{ uri: img.uri }}
                  style={styles.productImage}
                  resizeMode="cover"
                  onError={() => {
                    setImageError(true);
                  }}
                />
            ))}
          </ScrollView>
        ) : allImages.length === 1 ? (
          <Image
            source={{ uri: allImages[0].uri }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => {
              setImageError(true);
            }}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        
        {/* Show placeholder when image fails to load */}
        {imageError && allImages.length > 0 && (
          <View style={[styles.placeholderContainer, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
            <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.placeholderText}>Image Unavailable</Text>
          </View>
        )}

        {allImages.length > 1 && (
          <View style={styles.paginationDots}>
            {allImages.map((_, index) => (
              <View
                key={`${product.id}-dot-${index}`}
                style={[styles.paginationDot, currentImageIndex === index && styles.activeDot]}
              />
            ))}
          </View>
        )}
        
        <View style={styles.stockBadge}>
          <Text style={[
            styles.stockBadgeText,
            product.stock === 0 ? styles.outOfStockText : 
            product.stock <= 5 ? styles.lowStockText : 
            styles.inStockText
          ]}>
            {product.stock === 0 ? 'Out' : 
             product.stock <= 5 ? 'Low' : 
             'Stock'}
          </Text>
        </View>
        
        {product.promotion && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>
              {product.promotion.discount_percentage}% OFF
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.productDetails}>
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            const shopSlug = product.shop_name.toLowerCase().replace(/\s+/g, '-');
            navigation?.navigate('PublicShop', { shopSlug });
          }}
        >
          <Text style={styles.shopName} numberOfLines={1}>{product.shop_name}</Text>
        </TouchableOpacity>
        <View style={styles.infoRow}>
          {distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location-outline" size={10} color={colors.textSecondary} />
              <Text style={styles.distanceText}>{distance} away</Text>
            </View>
          )}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FFD700" />
            <Text style={styles.ratingText}>{(product as any).average_rating ? (product as any).average_rating.toFixed(1) : '0.0'}</Text>
          </View>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.productPrice}>R{product.display_price}</Text>
          {product.promotion && product.price !== product.display_price && (
            <Text style={styles.originalPrice}>R{product.price}</Text>
          )}
        </View>
        {!isShopOwner && (
          <TouchableOpacity
            style={[styles.addToCartIcon, product.stock <= 0 && styles.disabledIcon]}
            onPress={handleAddToCart}
            disabled={addingToCart || product.stock <= 0}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : product.stock <= 0 ? (
              <Ionicons name="close-circle" size={17} color="#999" />
            ) : (
              <FontAwesome5 name="cart-plus" size={18} color="#10B981" light />
            )}
          </TouchableOpacity>
        )}
        
        {isShopOwner && (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                navigation?.navigate('EditProduct', { productId: product.id });
              }}
            >
              <Ionicons name="create-outline" size={16} color="#3B82F6" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteProduct();
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#FF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    width: productCardWidth,
    backgroundColor: '#fff',
    borderRadius: 0,
    marginBottom: 8,
    marginHorizontal: spacing.xs,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: '#F8F8F8',
  },
  imageScroller: {
    width: '100%',
    height: '100%',
  },
  productImage: {
    width: productCardWidth,
    height: 140,
    backgroundColor: '#F8F8F8',
  },
  placeholderContainer: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  placeholderText: {
    fontSize: 10,
    color: '#BDBDBD',
    marginTop: 4,
    fontWeight: '400',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 4,
    width: '100%',
  },
  paginationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginHorizontal: 2,
  },
  activeDot: {
    backgroundColor: '#000',
    width: 4,
    height: 4,
  },
  stockBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stockBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  inStockText: { 
    color: '#4CAF50',
  },
  lowStockText: { 
    color: '#FF9800',
  },
  outOfStockText: { 
    color: '#F44336',
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: '#FF4444',
    fontSize: 8,
    fontWeight: '900',
  },
  productDetails: {
    padding: 6,
    paddingTop: 8,
  },
  productName: {
    fontSize: 11,
    fontWeight: '400',
    color: '#222',
    marginBottom: 4,
    lineHeight: 15,
  },
  shopName: {
    fontSize: 11,
    color: '#000',
    marginBottom: 4,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 10,
    color: '#8B4513',
    marginLeft: 2,
    fontWeight: '600',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 10,
    color: '#999',
    marginLeft: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  originalPrice: {
    fontSize: 12,
    color: '#FF4444',
    textDecorationLine: 'line-through',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  addToCartIcon: {
    padding: 4,
    alignSelf: 'flex-end',
  },
  disabledIcon: {
    opacity: 0.5,
  },
});

export default ProductCard;
