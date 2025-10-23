import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Image, Alert, Dimensions } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import shopService from '../../services/shopService';
import { getReviewsByProduct, Review } from '../../services/salesService';
import { useAuth } from '../../context/AuthContext.minimal';
import { getFullImageUrl } from '../../utils/imageHelper';
import colors from '../../theme/colors';
import typography from '../../theme/typography';
import { Product } from '../../types';

const screenWidth = Dimensions.get('window').width;

type RouteParams = { productId: number };

const ProductManagementScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const { productId } = route.params as RouteParams;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const fetchProductDetails = useCallback(async () => {
    console.log('🔍 ProductManagement - Fetching product details for ID:', productId);
    setLoading(true);
    setError(null);
    try {
      const fetchedProduct = await shopService.getProductById(productId);
      console.log('✅ ProductManagement - Product fetched:', {
        id: fetchedProduct.id,
        name: fetchedProduct.name,
        hasPromotion: !!fetchedProduct.promotion,
        promotion: fetchedProduct.promotion,
        price: fetchedProduct.price,
        display_price: fetchedProduct.display_price
      });
      setProduct(fetchedProduct);
      setReviewsLoading(true);
      try {
        const productReviews = await getReviewsByProduct(productId);
        setReviews(productReviews);
      } catch (reviewErr) {
        // Ignore review errors
      } finally {
        setReviewsLoading(false);
      }
    } catch (err) {
      setError('Failed to load product details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ProductManagement - Screen focused, fetching product details');
      fetchProductDetails();
    }, [fetchProductDetails])
  );

  const handleEditProduct = () => {
    if (product) {
      navigation.navigate('EditProduct', { productId: product.id });
    }
  };

  const handleDeleteProduct = () => {
    if (product) {
      Alert.alert(
        'Delete Product',
        `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await shopService.deleteProduct(product.id);
              Alert.alert('Deleted', 'Product deleted successfully.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete product.');
            }
          } }
        ]
      );
    }
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
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
            <TouchableOpacity style={[styles.retryButton, { marginRight: 10 }]} onPress={fetchProductDetails}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: '#000', borderWidth: 1, borderColor: '#000' }]} onPress={() => navigation.goBack()}>
              <Text style={[styles.buttonText, { color: '#fff' }]}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
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
                source={getFullImageUrl(product.main_image_url) ? { uri: getFullImageUrl(product.main_image_url) as string } : undefined}
                style={StyleSheet.flatten([styles.productImage])}
                onError={() => setImageError(true)}
                accessibilityLabel={product?.name || 'Product image'}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={80} color="#999999" />
                <Text style={{color:'#999', marginTop:8}}>No image available</Text>
              </View>
            )}
            {/* Additional Images */}
            {product?.images && product.images.length > 0 && product.images.map((image, index) => (
              <Image
                key={`additional-image-${image.id || index}`}
                source={getFullImageUrl(image.image) ? { uri: getFullImageUrl(image.image) as string } : undefined}
                style={StyleSheet.flatten([styles.productImage])}
                onError={() => {}}
                accessibilityLabel={product?.name ? `${product.name} image ${index+1}` : `Product image ${index+1}`}
              />
            ))}
          </ScrollView>
          {/* Pagination Dots */}
          {product.images && product.images.length > 0 && (
            <View style={styles.paginationDots}>
              <View key={`pagination-dot-${product.id}-main`} style={[styles.paginationDot, currentImageIndex === 0 ? styles.activeDot : null]} />
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
          {/* Owner Actions */}
          <View style={[styles.ownerActions, { marginTop: 0, marginBottom: 10 }]}> 
            <View style={[styles.actionButtonsRow, { justifyContent: 'flex-start', marginBottom: 8 }]}> 
              <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={handleEditProduct}>
                <Ionicons name="create-outline" size={16} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteProduct}>
                <Ionicons name="trash-outline" size={16} color="#FF4444" />
              </TouchableOpacity>
            </View>
            {product.promotion ? (
              <TouchableOpacity
                style={[styles.actionButton, { minWidth: 160, minHeight: 44, marginTop: 0, backgroundColor: colors.dangerAction, borderWidth: 2, borderColor: colors.dangerAction }]}
                onPress={() => {
                  Alert.alert(
                    'Remove Promotion',
                    `Remove ${product.promotion.discount_percentage}% discount?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Remove', 
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await shopService.deleteProductPromotion(product.id, product.promotion.id);
                            Alert.alert('Success', 'Promotion removed successfully');
                            fetchProductDetails();
                          } catch (err: any) {
                            Alert.alert('Error', 'Failed to remove promotion');
                          }
                        }
                      }
                    ]
                  );
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle" size={22} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={[styles.actionButtonText, { fontWeight: 'bold', fontSize: 16 }]}>Remove Promotion</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.promotionButton, { minWidth: 160, minHeight: 44, marginTop: 0, borderWidth: 2, borderColor: colors.warningAction, shadowColor: colors.warningAction, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }]}
                onPress={() => navigation.navigate('AddPromotion', { productId: product?.id })}
                activeOpacity={0.85}
              >
                <Ionicons name="pricetag" size={22} color={colors.warningAction} style={{ marginRight: 8 }} />
                <Text style={[styles.actionButtonText, { color: colors.warningAction, fontWeight: 'bold', fontSize: 16 }]}>Add Promotion</Text>
              </TouchableOpacity>
            )}
          </View>
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
                    {reviews.length > 0 ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : '0.0'}
                  </Text>
                  <View style={styles.starsContainer}>
                    {/* Render stars */}
                    {[1,2,3,4,5].map(i => (
                      <Ionicons key={i} name={i <= Math.round(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) ? "star" : "star-outline"} size={14} color={colors.accent} style={{marginRight: 1}} />
                    ))}
                  </View>
                  <Text style={styles.reviewCount}>{reviews.length} reviews</Text>
                </View>
              </View>
              <View style={styles.reviewsList}>
                {reviews.map(review => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewerName}>{review.user.username}</Text>
                      <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.reviewRating}>
                      {[1,2,3,4,5].map(i => (
                        <Ionicons key={i} name={i <= review.rating ? "star" : "star-outline"} size={14} color={colors.accent} style={{marginRight: 1}} />
                      ))}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    padding: 4,
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
    fontWeight: 'bold',
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
    fontWeight: '500',
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
    color: colors.white,
    fontSize: typography.fontSizeL,
    fontWeight: '500',
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily,
  },
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
    resizeMode: 'contain',
    backgroundColor: '#F8F8F8',
  },
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
    color: colors.white,
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
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    fontWeight: '500',
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
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },
  descriptionSection: {
    marginBottom: 25,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: typography.fontSizeL,
    fontWeight: 'bold',
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
  ownerActions: {
    marginTop: 15,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: typography.fontSizeM,
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: typography.fontFamily,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  promotionButton: {
    backgroundColor: colors.white,
    borderColor: colors.warningAction,
    borderWidth: 2,
    shadowColor: colors.warningAction,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 160,
  },
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
});

export default ProductManagementScreen;
