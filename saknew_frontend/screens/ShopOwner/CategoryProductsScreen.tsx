// saknew_frontend/screens/ShopOwner/CategoryProductsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';
import shopService from '../../services/shopService';
import { Product } from '../../types';
import { Ionicons } from '@expo/vector-icons';

// Define common colors (copy from MyShopScreen for consistency)
const colors = {
  background: '#F0F2F5',      // Light gray background
  textPrimary: '#2C3E50',     // Dark text for headings and main content
  textSecondary: '#7F8C8D',   // Muted gray for descriptions and secondary text
  card: '#FFFFFF',            // White for cards and containers
  border: '#BDC3C7',          // Light gray for borders
  primary: '#27AE60',         // Green for primary actions and highlights
  primaryLight: '#2ECC71',    // Lighter green for accents
  buttonBg: '#27AE60',        // Green for button backgrounds
  buttonText: '#FFFFFF',      // White text for buttons
  inputBorder: '#DCDCDC',     // Light gray for input borders
  inputFocusBorder: '#27AE60', // Green for input focus
  errorText: '#E74C3C',       // Red for error messages
  successText: '#2ECC71',     // Green for success messages
  shadowColor: '#000',        // Black for shadows (with opacity)
  infoAction: '#17A2B8',      // Info blue for edit shop
  dangerAction: '#DC3545',    // Red for delete shop
  shareAction: '#6f42c1',     // Purple for share shop
  warningAction: '#ffc107',   // Yellow for edit product
};

const screenWidth = Dimensions.get('window').width;
const productCardWidth = (screenWidth - 56) / 2; // Same calculation as MyShopScreen

const CategoryProductsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth(); // Get user to determine if seller for edit/add to cart buttons

  // Extract categorySlug and categoryName from route params
  const { categorySlug, categoryName } = route.params as { categorySlug: string; categoryName: string };

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoryProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.profile?.shop_slug) {
        setError('Shop not found for the current user.');
        setLoading(false);
        return;
      }

      if (categorySlug === 'out-of-stock' || categorySlug === 'in-stock' || categorySlug === 'all') {
        const allProducts = await shopService.getShopProducts(user.profile.shop_slug);
        const productArray = Array.isArray(allProducts) ? allProducts : (allProducts as any).results || [];
        
        if (categorySlug === 'out-of-stock') {
          setProducts(productArray.filter(p => p.stock === 0));
        } else if (categorySlug === 'in-stock') {
          setProducts(productArray.filter(p => p.stock > 0));
        } else {
          setProducts(productArray);
        }
      } else {
        const allShopProducts = await shopService.getShopProductsByCategory(user.profile.shop_slug, categorySlug);
        setProducts(allShopProducts);
      }
    } catch (err: any) {
      console.error(`Error fetching products for category ${categoryName}:`, err.response?.data || err.message);
      setError(`Failed to load products for ${categoryName}. Please try again.`);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user, categorySlug, categoryName]);

  useFocusEffect(
    useCallback(() => {
      fetchCategoryProducts();
    }, [fetchCategoryProducts])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>Loading {categoryName} products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.infoContainer}>
          <Ionicons name="warning-outline" size={60} color={colors.errorText} />
          <Text style={styles.title}>Error Loading Products</Text>
          <Text style={styles.messageText}>{error}</Text>
          <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={fetchCategoryProducts}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>{categoryName}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.container}>
          {products.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="cube-outline" size={70} color={colors.textSecondary} />
              <Text style={styles.title}>No Products Found</Text>
              <Text style={styles.messageText}>There are no products in this category yet.</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {products.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => navigation.navigate('ProductManagement' as never, { productId: product.id } as never)}
                  activeOpacity={0.7}
                >
                  {/* Changed to consistently use product.main_image_url */}
                  <Image
                    source={{ uri: product.main_image_url || 'https://via.placeholder.co/200/DEE2E6/6C757D?text=No+Image' }}
                    style={styles.productImage}
                    onError={(e) => console.log(`Image Load Error for ${product.name} (ID: ${product.id}):`, e.nativeEvent.error)}
                  />
                  <View style={styles.productDetails}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productDescription} numberOfLines={2}>{product.description}</Text>
                    <View style={styles.productMeta}>
                      <Text style={styles.productStock}>Stock: <Text style={{fontWeight: 'bold', color: colors.primary}}>{product.stock}</Text></Text>
                    </View>
                    <View style={styles.productMeta}>
                      <Text style={styles.productPrice}>R {product.display_price}
                        {product.promotion && (
                          <Text style={styles.promotionTag}> {product.promotion.discount_percentage}% OFF</Text>
                        )}
                      </Text>
                    </View>
                    {user?.profile?.is_seller && product.user && user?.id === product.user.id && ( // Check if current user is owner of product
                      <View style={styles.productActionsRow}>
                        <TouchableOpacity style={[styles.productActionButton, styles.buttonWarning]} onPress={() => navigation.navigate('EditProduct' as never, { productId: product.id } as never)}>
                          <Text style={styles.productActionButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.productActionButton, styles.buttonSuccess]} onPress={() => Alert.alert('Add to Cart', `Added ${product.name} to cart!`)}>
                          <Text style={styles.productActionButtonText}>Add to Cart</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
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
    borderRadius: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 5,
    margin: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  messageText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.buttonBg,
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    marginTop: 15,
    marginHorizontal: 5,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonWarning: { backgroundColor: colors.warningAction },
  buttonSuccess: { backgroundColor: colors.successText },
  screenTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Align items to the start
    marginHorizontal: -2, // Compensate for productCard marginHorizontal
  },
  productCard: {
    width: productCardWidth,
    marginHorizontal: 2, // Smallest margin
    backgroundColor: colors.card,
    borderRadius: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  productDetails: {
    padding: 4,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
    height: 32, // Fixed height for 2 lines of text
    lineHeight: 16,
    overflow: 'hidden',
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  productStock: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 2,
  },
  promotionTag: {
    backgroundColor: colors.dangerAction,
    color: colors.buttonText,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
    overflow: 'hidden',
  },
  productActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  productActionButton: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  productActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.buttonText,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 5,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default CategoryProductsScreen;
