// saknew_frontend/screens/Product/ProductDetailScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import colors from '../../theme/colors';
import typography from '../../theme/typography';
import * as Location from 'expo-location';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { getFullImageUrl } from '../../utils/imageHelper';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import shopService from '../../services/shopService';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext.minimal';
import { getReviewsByProduct, Review, addCartItem } from '../../services/salesService';
import BackButton from '../../components/BackButton';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

const screenWidth = Dimensions.get('window').width;

// Define your stack param list for navigation
type RootStackParamList = {
  EditProduct: { productId: number };
  AddPromotion: { productId: number };
  // Add other routes as needed
};

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'EditProduct'>>();
  const { user, isAuthenticated } = useAuth();

  const { productId } = route.params as { productId?: number };

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [distance, setDistance] = useState<string | null>(null);
  const [shopData, setShopData] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeModalVisible, setSizeModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{title: string; message: string; onConfirm?: () => void}>({title: '', message: ''});
  
  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertConfig({title, message, onConfirm});
    setAlertVisible(true);
  };
  
  const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  
  safeLog('Category Name:', product?.category_name);
  safeLog('Category Name (lowercase):', product?.category_name?.toLowerCase());
  
  const isFashionProduct = product?.category_name?.toLowerCase().includes('fashion') || 
                          product?.category_name?.toLowerCase().includes('apparel') ||
                          product?.category_name?.toLowerCase().includes('clothing') ||
                          product?.category_name?.toLowerCase().includes('dress') ||
                          product?.category_name?.toLowerCase().includes('shirt') ||
                          product?.category_name?.toLowerCase().includes('pants') ||
                          product?.category_name?.toLowerCase().includes('shoes') ||
                          product?.category_name?.toLowerCase().includes('jacket') ||
                          product?.category_name?.toLowerCase().includes('wear');

  // Determine if the logged-in user is the owner of this product
  const isOwner = isAuthenticated && product?.user?.id === user?.id;

  const fetchProductDetails = useCallback(async () => {
    if (!productId) {
      setError('Product ID is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedProduct = await shopService.getProductById(productId);
      setProduct(fetchedProduct);
      
      // Fetch shop data for location
      try {
        const shop = await shopService.getShopBySlug(fetchedProduct.shop_name.toLowerCase().replace(/\s+/g, '-'));
        setShopData(shop);
      } catch (err) {
        safeLog('Could not fetch shop data');
      }
      
      // Fetch reviews for this product
      setReviewsLoading(true);
      try {
        const productReviews = await getReviewsByProduct(productId);
        setReviews(productReviews);
      } catch (reviewErr: any) {
        safeError(`Error fetching reviews for product ${productId}:`, reviewErr.response?.data || reviewErr.message);
        // Don't set error state for reviews - we'll just show empty state
      } finally {
        setReviewsLoading(false);
      }
    } catch (err: any) {
      safeError(`Error fetching product details for ID ${productId}:`, err.response?.data || err.message);
      setError('Failed to load product details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      fetchProductDetails();
    }, [fetchProductDetails])
  );
  
  useEffect(() => {
    const calculateDistance = async () => {
      if (!shopData?.latitude || !shopData?.longitude) return;
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        
        const location = await Location.getCurrentPositionAsync({});
        const shopLat = parseFloat(shopData.latitude);
        const shopLon = parseFloat(shopData.longitude);
        
        const R = 6371;
        const dLat = (shopLat - location.coords.latitude) * Math.PI / 180;
        const dLon = (shopLon - location.coords.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(location.coords.latitude * Math.PI / 180) * Math.cos(shopLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        
        setDistance(d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`);
      } catch (error) {
        safeLog('Distance calculation error:', error);
      }
    };
    
    calculateDistance();
  }, [shopData]);

  // Handle add to cart
  const handleAddToCart = async (skipSizeCheck: boolean = false) => {
    safeLog('=== ADD TO CART DEBUG START ===');
    safeLog('Product:', product);
    safeLog('Product ID:', product?.id);
    safeLog('Product Category:', product?.category_name);
    safeLog('Is Owner:', isOwner);
    safeLog('Is Fashion Product:', isFashionProduct);
    safeLog('Selected Size:', selectedSize);
    safeLog('Skip Size Check:', skipSizeCheck);
    
    if (product) {
      // Check if user is the owner of the product
      if (isOwner) {
        safeLog('User is owner - cannot add to cart');
        showAlert('Cannot Add to Cart', 'Sellers cannot buy their own product.');
        return;
      }
      
      // Show size modal for fashion products (only if not skipping check)
      if (!skipSizeCheck && isFashionProduct && !selectedSize) {
        safeLog('Fashion product - showing size modal');
        setSizeModalVisible(true);
        return;
      }
      
      try {
        // Show loading indicator
        safeLog('Setting addingToCart to true');
        setAddingToCart(true);
        
        // Call API to add item to cart
        safeLog('Calling addCartItem API with product ID:', product.id, 'Size:', selectedSize);
        const response = await addCartItem(product.id, 1, selectedSize || undefined);
        safeLog('API Response:', response);
        
        // Show success message
        safeLog('Item added successfully');
        showAlert('Success', `Added "${product.name}" to your cart!`);
        setSelectedSize(null); // Reset size selection
      } catch (err: any) {
        // Show error message
        safeError('Error adding to cart:', err);
        safeError('Error response:', err.response);
        safeError('Error response data:', err.response?.data);
        safeError('Error message:', err.message);
        showAlert('Error', err.response?.data?.detail || 'Failed to add item to cart. Please try again.');
      } finally {
        safeLog('Setting addingToCart to false');
        setAddingToCart(false);
        safeLog('=== ADD TO CART DEBUG END ===');
      }
    } else {
      safeLog('No product available');
    }
  };

  // Handle edit product
  const handleEditProduct = () => {
    if (product) {
      navigation.navigate('EditProduct', { productId: product.id });
    }
  };

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (product) {
      setAlertConfig({
        title: 'Delete Product',
        message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
        onConfirm: async () => {
          try {
            setLoading(true);
            await shopService.deleteProduct(product.id);
            showAlert('Success', 'Product deleted successfully!', () => navigation.goBack());
          } catch (err: any) {
            showAlert('Error', err.response?.data?.detail || 'Failed to delete product.');
          } finally {
            setLoading(false);
          }
        }
      });
      setAlertVisible(true);
    }
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons 
          key={i} 
          name={i <= rating ? "star" : "star-outline"} 
          size={14} 
          color={colors.starColor} 
          style={{marginRight: 1}}
        />
      );
    }
    return <View style={{flexDirection: 'row'}}>{stars}</View>;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.infoContainer}>
          <Ionicons name="warning-outline" size={60} color={colors.errorText} />
          <Text style={styles.title}>Error</Text>
          <Text style={styles.messageText}>{error || 'Product not found.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProductDetails}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroller}
            onScroll={(event) => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const newIndex = Math.round(contentOffsetX / screenWidth);
              if (newIndex !== currentImageIndex) {
                setCurrentImageIndex(newIndex);
              }
            }}
            scrollEventThrottle={16}
          >
            {/* Main Image */}
            {!imageError && product?.main_image_url ? (
              <Image
                key={`product-${product.id}-main-image`}
                source={getFullImageUrl(product.main_image_url) ? { uri: getFullImageUrl(product.main_image_url) as string } : undefined}
                style={styles.productImage}
                onError={() => setImageError(true)}
                accessibilityLabel={product?.name || 'Product image'}
              />
            ) : (
              <View key={`product-${product.id}-placeholder`} style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={80} color="#999999" />
                <Text style={{color:'#999', marginTop:8}}>Image not available</Text>
              </View>
            )}
            
            {/* Show placeholder overlay when main image fails to load */}
            {imageError && product?.main_image_url && (
              <View style={[styles.placeholderImage, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(248, 248, 248, 0.9)' }]}>
                <Ionicons name="image-outline" size={80} color="#999999" />
                <Text style={{color:'#999', marginTop:8}}>Image unavailable</Text>
              </View>
            )}
            {/* Additional Images */}
            {product?.images && product.images.length > 0 && product.images.map((image, index) => (
              <Image
                key={`product-${product.id}-gallery-${index}`}
                source={getFullImageUrl(image.image) ? { uri: getFullImageUrl(image.image) as string } : undefined}
                style={styles.productImage}
                onError={() => safeLog(`Additional image ${index} failed to load`)}
                accessibilityLabel={product?.name ? `${product.name} image ${index+1}` : `Product image ${index+1}`}
              />
            ))}
          </ScrollView>
          
          {/* Pagination Dots */}
          {product.images && product.images.length > 0 && (
            <View style={styles.paginationDots}>
              <View key={`pagination-dot-main-${product.id}`} style={[styles.paginationDot, currentImageIndex === 0 ? styles.activeDot : null]} />
              {product.images.map((image, index) => (
                <View 
                  key={`pagination-dot-${product.id}-${index}`} 
                  style={[styles.paginationDot, currentImageIndex === index + 1 ? styles.activeDot : null]} 
                />
              ))}
            </View>
          )}
          
          {/* Stock Badge */}
          <View style={[
            styles.stockBadge, 
            product.stock === 0 ? styles.outOfStockBadge : 
            product.stock <= 5 ? styles.lowStockBadge : 
            styles.inStockBadge
          ]}>
            <Text style={styles.stockBadgeText}>
              {product.stock === 0 ? 'Out of Stock' : 
               product.stock <= 5 ? 'Low Stock' : 
               'In Stock'}
            </Text>
          </View>
          
          {/* Discount Badge */}
          {product.promotion && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>{product.promotion.discount_percentage}% OFF</Text>
            </View>
          )}
        </View>

        {/* Product Info Card */}
        <View style={styles.productInfoCard}>
          {/* Header Section */}
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{product?.name || 'Unnamed Product'}</Text>
            <Text style={styles.productShop}>by {product?.shop_name || 'Unknown Shop'}</Text>
            {distance && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.distanceText}>{distance} away</Text>
              </View>
            )}
            <Text style={styles.productCategory}>Category: {product?.category_name || 'Uncategorized'}</Text>
          </View>
          
          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceContainer}>
              <Text style={styles.productPrice}>R{product?.display_price ?? '--'}</Text>
              {product?.promotion && product?.price !== product?.display_price && (
                <Text style={styles.originalPrice}>R{product?.price}</Text>
              )}
            </View>
            <View style={styles.stockInfo}>
              <Ionicons name="cube-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.stockText}>{typeof product?.stock === 'number' ? product.stock : '--'} in stock</Text>
            </View>
          </View>
          
          {/* Description Section */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.productDescription}>{product?.description || 'No description provided.'}</Text>
          </View>
          
          {/* Action Buttons */}
          {isOwner ? (
            <View style={styles.ownerActions}>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={handleEditProduct}>
                  <Ionicons name="pencil-outline" size={18} color={colors.buttonText} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteProduct}>
                  <Ionicons name="trash-outline" size={18} color={colors.buttonText} />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
                {/* Management Links for Owners */}
                <TouchableOpacity style={[styles.actionButton, styles.promotionButton]} onPress={() => navigation.navigate('AddPromotion', { productId: product?.id })}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.buttonText} />
                  <Text style={styles.actionButtonText}>Add Promotion</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.ownerNotice}>
                <Ionicons name="information-circle" size={16} color={colors.warningAction} />
                <Text style={styles.ownerNoticeText}>You cannot purchase your own product</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.addToCartButton, (!product || product.stock <= 0 || addingToCart) && styles.disabledButton]} 
              onPress={() => handleAddToCart(false)}
              disabled={!product || product.stock <= 0 || addingToCart}
              accessibilityLabel={product?.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <>
                  <Ionicons name="cart-outline" size={20} color={colors.buttonText} />
                  <Text style={styles.addToCartText}>
                    {product?.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {/* Reviews Section */}
        <View style={styles.reviewsCard}>
          <Text style={styles.sectionTitle}>Customer Reviews</Text>
          
          {reviewsLoading ? (
            <View style={styles.reviewsLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.reviewsLoadingText}>Loading reviews...</Text>
            </View>
          ) : reviews.length > 0 ? (
            <>
              <View style={styles.reviewsSummary}>
                <View style={styles.averageRating}>
                  <Text style={styles.ratingNumber}>
                    {reviews.length > 0 ? ((reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length) || 0).toFixed(1) : '0.0'}
                  </Text>
                  <View style={styles.starsContainer}>
                    {renderStars(reviews.length > 0 ? Math.round(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) : 0)}
                  </View>
                  <Text style={styles.reviewCount}>{reviews.length} reviews</Text>
                </View>
              </View>
              
              <View style={styles.reviewsList}>
                {reviews.map(review => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>{review.user.username}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.reviewRating}>
                      {renderStars(review.rating)}
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet. Be the first to review this product!</Text>
          )}
        </View>
      </ScrollView>
      
      {/* Size Selection Modal */}
      <Modal
        visible={sizeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSizeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Size</Text>
            <Text style={styles.modalSubtitle}>Please choose your size</Text>
            
            <View style={styles.modalSizeOptions}>
              {CLOTHING_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.modalSizeButton,
                    selectedSize === size && styles.modalSizeButtonSelected
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <Text style={[
                    styles.modalSizeButtonText,
                    selectedSize === size && styles.modalSizeButtonTextSelected
                  ]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setSizeModalVisible(false);
                  setSelectedSize(null);
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  !selectedSize && styles.modalButtonDisabled
                ]}
                onPress={() => {
                  if (selectedSize) {
                    setSizeModalVisible(false);
                    handleAddToCart(true);
                  }
                }}
                disabled={!selectedSize}
              >
                <Text style={styles.modalConfirmButtonText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Custom Alert Modal */}
      <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContent}>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            
            <View style={styles.alertButtons}>
              {alertConfig.onConfirm ? (
                <>
                  <TouchableOpacity
                    style={[styles.alertButton, styles.alertCancelButton]}
                    onPress={() => setAlertVisible(false)}
                  >
                    <Text style={styles.alertCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.alertButton, styles.alertConfirmButton]}
                    onPress={() => {
                      setAlertVisible(false);
                      alertConfig.onConfirm?.();
                    }}
                  >
                    <Text style={styles.alertConfirmButtonText}>OK</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.alertButton, styles.alertConfirmButton, {flex: 1}]}
                  onPress={() => setAlertVisible(false)}
                >
                  <Text style={styles.alertConfirmButtonText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 10,
  },
  scrollViewContent: {
    paddingTop: 15,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.card,
    borderRadius: 20,
    margin: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: typography.fontSizeHeader,
    fontWeight: 'bold' as 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    fontSize: typography.fontSizeL,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: typography.fontFamily,
    fontWeight: '500' as '500',
  },
  messageText: {
    fontSize: typography.fontSizeL,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 15,
    lineHeight: 24,
    fontFamily: typography.fontFamily,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: typography.fontSizeL,
    fontWeight: (typography.fontWeightMedium as 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 'ultralight' | 'thin' | 'light' | 'medium' | 'semibold' | 'extrabold' | 'black' | undefined),
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily,
  },
  
  // Image Section
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: '#F8F8F8',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    marginTop: 10,
  },
  imageScroller: {
    width: '100%',
    height: '100%',
  },
  productImage: {
    width: screenWidth,
    height: 300,
    backgroundColor: '#F8F8F8',
  } as any,
  placeholderImage: {
    width: screenWidth,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 10,
    width: '100%',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    margin: 2,
  },
  activeDot: {
    backgroundColor: colors.card,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inStockBadge: {
    backgroundColor: 'rgba(39, 174, 96, 0.9)',
  },
  lowStockBadge: {
    backgroundColor: 'rgba(241, 196, 15, 0.9)',
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
  },
  stockBadgeText: {
    color: colors.buttonText,
    fontSize: 10,
    fontWeight: 'bold',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  discountBadgeText: {
    color: colors.buttonText,
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Product Info Card
  productInfoCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 15,
    margin: 10,
    marginTop: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  productHeader: {
    marginBottom: 18,
  },
  productName: {
    fontSize: typography.fontSizeXL,
    fontWeight: 'bold' as 'bold',
    color: colors.textPrimary,
    marginBottom: 6,
    fontFamily: typography.fontFamily,
  },
  productShop: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    marginBottom: 3,
    fontFamily: typography.fontFamily,
  },
  productCategory: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontFamily: typography.fontFamily,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  distanceText: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    marginLeft: 4,
    fontFamily: typography.fontFamily,
  },
  
  // Price Section
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(189, 195, 199, 0.3)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  productPrice: {
    fontSize: typography.fontSizeXXL,
    fontWeight: 'bold' as 'bold',
    color: colors.primary,
    marginRight: 8,
    fontFamily: typography.fontFamily,
  },
  originalPrice: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    opacity: 0.7,
    fontFamily: typography.fontFamily,
    fontWeight: '500' as '500',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  stockText: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    marginLeft: 5,
    fontWeight: '500' as '500',
    fontFamily: typography.fontFamily,
  },
  
  // Description Section
  descriptionSection: {
    marginBottom: 25,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: typography.fontSizeL,
    fontWeight: 'bold' as 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    fontFamily: typography.fontFamily,
  },
  productDescription: {
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    lineHeight: 20,
    fontFamily: typography.fontFamily,
  },
  
  // Action Buttons
  ownerActions: {
    marginTop: 15,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    color: colors.buttonText,
    fontSize: typography.fontSizeM,
    fontWeight: '500' as '500',
    marginLeft: 4,
    fontFamily: typography.fontFamily,
  },
  editButton: {
    backgroundColor: colors.infoAction,
  },
  deleteButton: {
    backgroundColor: colors.dangerAction,
  },
  ownerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 249, 230, 0.7)',
    padding: 12,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  ownerNoticeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeS,
    marginLeft: 6,
    fontStyle: 'italic',
    fontFamily: typography.fontFamily,
  },
  promotionButton: {
    backgroundColor: colors.successAction,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: 'rgba(160, 160, 160, 0.8)',
  },
  addToCartText: {
    color: colors.buttonText,
    fontSize: typography.fontSizeM,
    fontWeight: '500' as '500',
    marginLeft: 8,
    fontFamily: typography.fontFamily,
  },
  
  // Reviews Section
  reviewsCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 15,
    margin: 10,
    marginTop: 5,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  reviewsSummary: {
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(189, 195, 199, 0.3)',
  },
  averageRating: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: typography.fontSizeTitle,
    fontWeight: 'bold' as 'bold',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  reviewCount: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: typography.fontFamily,
  },
  reviewsList: {
    marginTop: 10,
  },
  reviewItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(189, 195, 199, 0.2)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: typography.fontSizeM,
    fontWeight: 'bold' as 'bold',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  reviewDate: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    opacity: 0.8,
    fontFamily: typography.fontFamily,
  },
  reviewRating: {
    marginBottom: 8,
  },
  reviewComment: {
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    lineHeight: 18,
    fontFamily: typography.fontFamily,
  },
  noReviewsText: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12,
    lineHeight: 16,
    fontFamily: typography.fontFamily,
  },
  reviewsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  reviewsLoadingText: {
    fontSize: typography.fontSizeS,
    color: colors.textSecondary,
    marginTop: 8,
    fontFamily: typography.fontFamily,
  },
  
  // Size Selection Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: typography.fontSizeXL,
    fontWeight: 'bold' as 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  modalSubtitle: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  modalSizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  modalSizeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSizeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalSizeButtonText: {
    fontSize: typography.fontSizeL,
    color: colors.textPrimary,
    fontWeight: '600' as '600',
    fontFamily: typography.fontFamily,
  },
  modalSizeButtonTextSelected: {
    color: colors.buttonText,
    fontWeight: 'bold' as 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#E0E0E0',
  },
  modalCancelButtonText: {
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    fontWeight: '600' as '600',
    fontFamily: typography.fontFamily,
  },
  modalConfirmButton: {
    backgroundColor: colors.primary,
  },
  modalConfirmButtonText: {
    fontSize: typography.fontSizeM,
    color: colors.buttonText,
    fontWeight: 'bold' as 'bold',
    fontFamily: typography.fontFamily,
  },
  modalButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  
  // Custom Alert Modal
  alertModalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 350,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  alertTitle: {
    fontSize: typography.fontSizeL,
    fontWeight: 'bold' as 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  alertMessage: {
    fontSize: typography.fontSizeM,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: typography.fontFamily,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  alertButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertCancelButton: {
    backgroundColor: '#E0E0E0',
  },
  alertCancelButtonText: {
    fontSize: typography.fontSizeM,
    color: colors.textPrimary,
    fontWeight: '600' as '600',
    fontFamily: typography.fontFamily,
  },
  alertConfirmButton: {
    backgroundColor: colors.primary,
  },
  alertConfirmButtonText: {
    fontSize: typography.fontSizeM,
    color: colors.buttonText,
    fontWeight: 'bold' as 'bold',
    fontFamily: typography.fontFamily,
  },
});

export default ProductDetailScreen;