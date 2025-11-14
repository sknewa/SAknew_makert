import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Alert, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Product } from '../services/shop.types';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { getFullImageUrl } from '../utils/imageHelper';
import { MainNavigationProp } from '../navigation/types';
import shopService from '../services/shopService';
import { addCartItem } from '../services/salesService';
import { colors, spacing } from '../styles/globalStyles';
import * as Location from 'expo-location';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

const screenWidth = Dimensions.get('window').width;
const productCardWidth = (screenWidth - 8) / 3;

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeModalVisible, setSizeModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{title: string; message: string; onConfirm?: () => void}>({title: '', message: ''});
  
  const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const isFashionProduct = product?.category_name?.toLowerCase().includes('fashion') || 
                          product?.category_name?.toLowerCase().includes('apparel') ||
                          product?.category_name?.toLowerCase().includes('clothing') ||
                          product?.category_name?.toLowerCase().includes('dress') ||
                          product?.category_name?.toLowerCase().includes('shirt') ||
                          product?.category_name?.toLowerCase().includes('pants') ||
                          product?.category_name?.toLowerCase().includes('shoes') ||
                          product?.category_name?.toLowerCase().includes('jacket') ||
                          product?.category_name?.toLowerCase().includes('wear');
  
  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertConfig({title, message, onConfirm});
    setAlertVisible(true);
  };
  
  useEffect(() => {
    const calculateDistance = async () => {
      if (!shopLatitude || !shopLongitude) return;
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        
        const location = await Location.getCurrentPositionAsync({});
        const shopLat = parseFloat(shopLatitude);
        const shopLon = parseFloat(shopLongitude);
        
        const R = 6371;
        const dLat = (shopLat - location.coords.latitude) * Math.PI / 180;
        const dLon = (shopLon - location.coords.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(location.coords.latitude * Math.PI / 180) * Math.cos(shopLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        
        const distanceText = d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
        setDistance(distanceText);
      } catch (error) {
        // Silent fail
      }
    };
    
    calculateDistance();
  }, [shopLatitude, shopLongitude, product.id]);
  
  if (!product) return null;
  
  const allImages = [
    ...(product.main_image_url ? [{ uri: getFullImageUrl(product.main_image_url) || '', id: 'main' }] : []),
    ...((product.images || []).map((img, idx) => ({ uri: getFullImageUrl(img.image) || '', id: `gallery-${idx}` })))
  ].filter(img => img.uri)
   .filter((img, index, self) => self.findIndex(i => i.uri === img.uri) === index);







  const handleAddToCart = async (e: any, skipSizeCheck: boolean = false) => {
    e.stopPropagation();
    if (product.stock <= 0) {
      showAlert('Out of Stock', 'This product is currently out of stock.');
      return;
    }
    
    if (!skipSizeCheck && isFashionProduct && !selectedSize) {
      setSizeModalVisible(true);
      return;
    }

    setAddingToCart(true);
    try {
      await addCartItem(product.id, 1, selectedSize || undefined);
      showAlert('Success', `Added "${product.name}" to cart!`);
      setSelectedSize(null);
      onCartUpdated?.();
    } catch (err: any) {
      showAlert('Error', err?.response?.data?.detail || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleDeleteProduct = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    try {
      await shopService.deleteProduct(product.id);
      if (onProductDeleted) {
        onProductDeleted();
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to delete product');
    }
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
    <>
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
          <Text style={styles.stockBadgeText}>
            {product.stock === 0 ? 'Out' : product.stock <= 5 ? 'Low' : 'Stock'}
          </Text>
        </View>
        
        {!isShopOwner && (
          <View style={styles.shopNameBadge}>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                const shopSlug = product.shop_name.toLowerCase().replace(/[''\s]/g, '-').replace(/-+/g, '-');
                navigation?.navigate('PublicShop', { shopSlug });
              }}
            >
              <Text style={styles.shopNameTop} numberOfLines={1}>{product.shop_name}</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {product.promotion && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>
              {product.promotion.discount_percentage}% OFF
            </Text>
          </View>
        )}
        
        <View style={styles.bottomInfo}>
          {distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location-outline" size={8} color="#FFFFFF" />
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          )}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={8} color="#FFD700" />
            <Text style={styles.ratingText}>{(product as any).average_rating ? (product as any).average_rating.toFixed(1) : '0.0'}</Text>
          </View>
        </View>
        
      </View>
      
      {!isShopOwner && (
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>R{product.display_price}</Text>
            {product.promotion && product.price !== product.display_price && (
              <Text style={styles.originalPrice}>R{product.price}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addToCartIcon, product.stock <= 0 && styles.disabledIcon]}
            onPress={handleAddToCart}
            disabled={addingToCart || product.stock <= 0}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : product.stock <= 0 ? (
              <Ionicons name="close-circle" size={14} color="#999" />
            ) : (
              <FontAwesome5 name="cart-plus" size={14} color="#10B981" light />
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {isShopOwner && (
        <View style={styles.productDetails}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
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
              onPress={handleDeleteProduct}
              onPressIn={(e) => e.stopPropagation()}
              onPressOut={(e) => e.stopPropagation()}
            >
              <Ionicons name="trash-outline" size={16} color="#FF4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

    </TouchableOpacity>

    <Modal
      visible={showDeleteModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Delete Product</Text>
          <Text style={styles.modalMessage}>
            Are you sure you want to delete "{product.name}"? This action cannot be undone.
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowDeleteModal(false)}>
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonDelete]} onPress={confirmDelete}>
              <Text style={styles.modalButtonTextDelete}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    
    <Modal
      visible={sizeModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setSizeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sizeModalContent}>
          <Text style={styles.modalTitle}>Select Size</Text>
          <Text style={styles.sizeModalSubtitle}>Please choose your size</Text>
          
          <View style={styles.sizeOptions}>
            {CLOTHING_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeButton,
                  selectedSize === size && styles.sizeButtonSelected
                ]}
                onPress={() => setSelectedSize(size)}
              >
                <Text style={[
                  styles.sizeButtonText,
                  selectedSize === size && styles.sizeButtonTextSelected
                ]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => {
                setSizeModalVisible(false);
                setSelectedSize(null);
              }}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalButtonConfirm,
                !selectedSize && styles.modalButtonDisabled
              ]}
              onPress={(e) => {
                if (selectedSize) {
                  setSizeModalVisible(false);
                  handleAddToCart(e, true);
                }
              }}
              disabled={!selectedSize}
            >
              <Text style={styles.modalButtonTextConfirm}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    
    <Modal
      visible={alertVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setAlertVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.alertModalContent}>
          <Text style={styles.modalTitle}>{alertConfig.title}</Text>
          <Text style={styles.modalMessage}>{alertConfig.message}</Text>
          
          <View style={styles.alertButtons}>
            {alertConfig.onConfirm ? (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setAlertVisible(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={() => {
                    setAlertVisible(false);
                    alertConfig.onConfirm?.();
                  }}
                >
                  <Text style={styles.modalButtonTextConfirm}>OK</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, {flex: 1}]}
                onPress={() => setAlertVisible(false)}
              >
                <Text style={styles.modalButtonTextConfirm}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  productCard: {
    width: productCardWidth,
    backgroundColor: '#fff',
    borderRadius: 0,
    marginBottom: 2,
    marginHorizontal: 1,
    overflow: 'visible',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: productCardWidth * 1.1,
    backgroundColor: '#F8F8F8',
  },
  imageScroller: {
    width: '100%',
    height: '100%',
  },
  productImage: {
    width: productCardWidth,
    height: '100%',
    backgroundColor: '#F8F8F8',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  placeholderText: {
    fontSize: 11.5,
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
  },
  stockBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  discountBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  shopNameBadge: {
    position: 'absolute',
    top: 4,
    left: '50%',
    transform: [{ translateX: -50 }],
  },
  shopNameTop: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: '#fff',
  },
  productDetails: {
    padding: 4,
    backgroundColor: '#fff',
  },
  productName: {
    fontSize: 12.5,
    fontWeight: '400',
    color: '#222',
    marginBottom: 4,
    lineHeight: 16.5,
  },

  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  distanceText: {
    fontSize: 11,
    color: '#FFFFFF',
    marginLeft: 2,
    fontWeight: '600',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  ratingText: {
    fontSize: 11,
    color: '#FFFFFF',
    marginLeft: 2,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productPrice: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#10B981',
  },
  originalPrice: {
    fontSize: 10.5,
    color: '#FF0000',
    textDecorationLine: 'line-through',
    fontWeight: '700',
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
    padding: 2,
    backgroundColor: 'transparent',
  },
  disabledIcon: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#E5E7EB',
  },
  modalButtonDelete: {
    backgroundColor: '#FF4444',
  },
  modalButtonTextCancel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
  modalButtonTextDelete: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  sizeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    width: '85%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sizeModalSubtitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sizeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(222, 226, 230, 0.5)',
    backgroundColor: '#fff',
    minWidth: 42,
    alignItems: 'center',
  },
  sizeButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  sizeButtonText: {
    fontSize: 12,
    color: '#222',
    fontWeight: '600',
  },
  sizeButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  modalButtonConfirm: {
    backgroundColor: '#10B981',
  },
  modalButtonTextConfirm: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  alertModalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default ProductCard;
