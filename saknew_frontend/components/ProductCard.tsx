import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Product } from '../services/shop.types';
import { Ionicons } from '@expo/vector-icons';
import { getFullImageUrl } from '../utils/imageHelper';
import { MainNavigationProp } from '../navigation/types';
import shopService from '../services/shopService';
import { addCartItem } from '../services/salesService';

const colors = {
  primary: '#28A745',
  accent: '#FFC107',
  background: '#F8F9FA',
  card: '#FFFFFF',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  error: '#DC3545',
  border: '#DEE2E6',
  white: '#FFFFFF',
  dangerAction: '#DC3545',
  successText: '#28A745',
  warningAction: '#FFC107',
  infoAction: '#17a2b8',
  shadowColor: '#000',
};

const screenWidth = Dimensions.get('window').width;
const productCardWidth = (screenWidth - 48) / 2;

interface ProductCardProps {
  product: Product;
  isShopOwner?: boolean;
  navigation?: MainNavigationProp;
  onCartUpdated?: () => void;
  onPress?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  isShopOwner, 
  navigation, 
  onCartUpdated, 
  onPress 
}) => {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  
  if (!product) return null;
  
  const allImages = [
    ...(product.main_image_url ? [{ uri: getFullImageUrl(product.main_image_url) || '' }] : []),
    ...((product.images || []).map(img => ({ uri: getFullImageUrl(img.image) || '' })))
  ].filter(img => img.uri);

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
              onCartUpdated?.();
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
                key={`image-${product.id}-${index}`}
                source={{ uri: img.uri }}
                style={styles.productImage}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ))}
          </ScrollView>
        ) : allImages.length === 1 ? (
          <Image
            source={{ uri: allImages[0].uri }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {allImages.length > 1 && (
          <View style={styles.paginationDots}>
            {allImages.map((_, index) => (
              <View
                key={`dot-${product.id}-${index}`}
                style={[styles.paginationDot, currentImageIndex === index && styles.activeDot]}
              />
            ))}
          </View>
        )}
        
        <View style={[
          styles.stockBadge, 
          product.stock === 0 ? styles.outOfStockBadge : 
          product.stock <= 5 ? styles.lowStockBadge : 
          styles.inStockBadge
        ]}>
          <Text style={styles.stockBadgeText}>
            {product.stock === 0 ? 'Out' : 
             product.stock <= 5 ? 'Low' : 
             'Stock'}
          </Text>
        </View>
        
        {product.promotion && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{product.promotion.discount_percentage}% OFF</Text>
          </View>
        )}
      </View>
      
      <View style={styles.productDetails}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.shopName} numberOfLines={1}>{product.shop_name}</Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>R{product.display_price}</Text>
          {product.promotion && product.price !== product.display_price && (
            <Text style={styles.originalPrice}>R{product.price}</Text>
          )}
        </View>
        
        {isShopOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                navigation?.navigate('EditProduct', { productId: product.id });
              }}
            >
              <Ionicons name="pencil-outline" size={14} color={colors.white} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteProduct();
              }}
            >
              <Ionicons name="trash-outline" size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addToCartButton, product.stock <= 0 && styles.disabledButton]}
            onPress={handleAddToCart}
            disabled={addingToCart || product.stock <= 0}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="cart-outline" size={16} color={colors.white} />
                <Text style={styles.addToCartText}>
                  {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    width: productCardWidth,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    backgroundColor: colors.background,
  },
  imageScroller: {
    width: '100%',
    height: '100%',
  },
  productImage: {
    width: productCardWidth,
    height: 160,
    backgroundColor: colors.background,
  },
  placeholderContainer: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  placeholderText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 8,
    width: '100%',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 2,
  },
  activeDot: {
    backgroundColor: colors.white,
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inStockBadge: { backgroundColor: colors.successText },
  lowStockBadge: { backgroundColor: colors.warningAction },
  outOfStockBadge: { backgroundColor: colors.error },
  stockBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  productDetails: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 18,
  },
  shopName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  ownerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.infoAction,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 4,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.dangerAction,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginLeft: 4,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: colors.textSecondary,
  },
  addToCartText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default ProductCard;
