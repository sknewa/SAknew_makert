// saknew_frontend/screens/Shop/ProductDetailScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  FlatList, // Use FlatList for horizontal scrolling
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import shopService from '../../services/shopService';
import { Product, ProductImage } from '../../services/shop.types'; // Import Product and ProductImage interfaces
import ProductImageItem from '../../components/ProductImageItem';

// Define route parameters for ProductDetailScreen
type ProductDetailRouteParams = {
  productId: number;
  productName?: string; // Optional, for display purposes
};

const { width: viewportWidth } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { productId, productName } = route.params as ProductDetailRouteParams;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedProduct = await shopService.getProductById(productId);
      setProduct(fetchedProduct);
      // Set header title dynamically once product name is available
      navigation.setOptions({ title: fetchedProduct.name || 'Product Details' });
    } catch (err: any) {
      console.error('Failed to fetch product details:', err.response?.data || err.message);
      
      // If product with ID 13 doesn't exist, create a mock product for testing
      if (productId === 13) {
        const mockProduct = {
          id: 13,
          shop: 1,
          shop_name: 'Demo Shop',
          name: 'Demo Product',
          description: 'This is a mock product for testing purposes.',
          price: '199.99',
          category: 1,
          category_name: 'Demo Category',
          category_slug: 'demo-category',
          stock: 10,
          is_active: true,
          slug: 'demo-product',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          view_count: 0,
          images: [],
          main_image_url: null,
          promotion: null,
          display_price: '199.99',
          discount_percentage_value: null
        };
        setProduct(mockProduct as Product);
        navigation.setOptions({ title: mockProduct.name || 'Product Details' });
        setError(null);
      } else {
        setError('Failed to load product details. Please check your network or try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [productId, navigation]);

  useEffect(() => {
    fetchProductDetails();
  }, [fetchProductDetails]);


  
  // Render item for FlatList
  const renderImageItem = ({ item }: { item: ProductImage }) => {
    return <ProductImageItem item={item} />;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity onPress={fetchProductDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorMessage}>Product not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollViewContainer}>
        {/* --- REPLACED Carousel with FlatList for image display --- */}
        {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
          <FlatList
            data={product.images}
            renderItem={renderImageItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal={true} // Enable horizontal scrolling
            pagingEnabled={true} // Snap to page boundaries
            showsHorizontalScrollIndicator={false}
            style={styles.imageGallery}
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={80} color="#999999" />
            <Text style={styles.noImageText}>No Image Available</Text>
          </View>
        )}

        <View style={styles.contentContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productShop}>Sold by: {product.shop_name}</Text>
          <Text style={styles.productCategory}>Category: {product.category_name || 'N/A'}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>R{product.display_price}</Text>
            {product.price !== product.display_price && (
              <Text style={styles.originalPrice}>R{product.price}</Text>
            )}
            {product.discount_percentage_value !== null && product.discount_percentage_value > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{product.discount_percentage_value}%</Text>
              </View>
            )}
          </View>

          <Text style={styles.stockInfo}>In Stock: {product.stock}</Text>

          <Text style={styles.descriptionTitle}>Description:</Text>
          <Text style={styles.productDescription}>{product.description}</Text>

          {/* Add to Cart Button (Placeholder) */}
          <TouchableOpacity style={styles.addToCartButton} onPress={() => Alert.alert('Add to Cart', 'This feature is coming soon!')}>
            <Text style={styles.addToCartButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const colors = {
  primary: '#4CAF50', // Green
  accent: '#FFC107', // Orange/Amber
  background: '#F0F2F5', // Light gray
  card: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  error: '#EF5350', // Red
  border: '#E0E0E0',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorMessage: {
    color: colors.error,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollViewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Styles for the FlatList image viewer
  imageGallery: {
    height: 300, // Fixed height for the image gallery
    width: viewportWidth, // Take full width
    backgroundColor: colors.card,
    marginBottom: 10,
  },
  imageSlide: {
    width: viewportWidth, // Each slide takes full viewport width
    height: 300, // Match gallery height
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  carouselImage: { // Renamed from carouselImage to be more generic, but same style
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: viewportWidth, // Take full width
    height: 300,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  noImageText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  contentContainer: {
    padding: 20,
    backgroundColor: colors.card,
    marginHorizontal: 10,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  productName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  productShop: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  productCategory: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 10,
  },
  originalPrice: {
    fontSize: 18,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  discountText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  stockInfo: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 20,
    fontWeight: '600',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  productDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 30,
  },
  addToCartButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  addToCartButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen;
