// saknew_frontend/screens/ShopOwner/EditProductScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
  Image,
  Keyboard,
} from 'react-native';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext.minimal';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MainNavigationProp } from '../../navigation/types';
import shopService from '../../services/shopService';
import { AddProductImageData, Product } from '../../services/shop.types';
import BackButton from '../../components/BackButton';
import { safeLog, safeError, safeWarn } from '../../utils/securityUtils';

// Define common colors
const colors = {
  background: '#F0F2F5',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  card: '#FFFFFF',
  border: '#BDC3C7',
  primary: '#27AE60',
  primaryLight: '#2ECC71',
  buttonBg: '#27AE60',
  buttonText: '#FFFFFF',
  inputBorder: '#DCDCDC',
  inputFocusBorder: '#27AE60',
  errorText: '#E74C3C',
  successText: '#2ECC71',
  shadowColor: '#000',
};

// Define a type for your Category data, matching your Django CategorySerializer
interface Category {
  id: number;
  name: string;
  slug: string;
  parent_category: number | null;
  parent_category_name: string | null;
}

// Define a type for selected images
interface SelectedImage {
  uri: string;
  isMain: boolean;
  id?: number; // For existing images
}

const EditProductScreen: React.FC = () => {
  const { user, isAuthenticated = false, refreshUserProfile } = useAuth();
  const navigation = useNavigation<MainNavigationProp>();
  const route = useRoute();
  const { productId } = route.params as { productId: number };

  // Product form states
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [isProductActive, setIsProductActive] = useState(true);

  // Category selection states
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [currentDisplayCategories, setCurrentDisplayCategories] = useState<Category[]>([]);
  const [selectedLeafCategory, setSelectedLeafCategory] = useState<Category | null>(null);
  const [categoryBreadcrumbs, setCategoryBreadcrumbs] = useState<Category[]>([]);

  // Image states
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  // UI states
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(true);
  const authReady = isAuthenticated;

  // Input focus states
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isStockFocused, setIsStockFocused] = useState(false);

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) return;
      
      setProductLoading(true);
      try {
        const product = await shopService.getProductById(productId);
        
        // Set form values
        setProductName(product.name);
        setProductDescription(product.description);
        setProductPrice(product.price.toString());
        setProductStock(product.stock.toString());
        setIsProductActive(product.is_active);
        
        // Handle category
        if (product.category) {
          // We'll set the category when categories are loaded
          const categoryId = typeof product.category === 'number' ? product.category : product.category.id;
          
          // Load images
          const existingImages: SelectedImage[] = [];
          
          // Add main image if it exists
          if (product.main_image_url) {
            existingImages.push({
              uri: product.main_image_url,
              isMain: true,
              id: product.main_image_id
            });
          }
          
          // Add additional images
          if (product.images && product.images.length > 0) {
            product.images.forEach(img => {
              existingImages.push({
                uri: img.image,
                isMain: false,
                id: img.id
              });
            });
          }
          
          setSelectedImages(existingImages);
        }
      } catch (error: any) {
        setErrorMessage('Failed to load product data. Please try again.');
      } finally {
        setProductLoading(false);
      }
    };
    
    fetchProductData();
  }, [productId]);

  // Fetch categories on component mount
  useEffect(() => {
    if (authReady && user?.profile?.is_seller) {
      const fetchCategories = async () => {
        try {
          const response = await apiClient.get('/api/categories/');
          if (response.status === 200) {
            const fetchedCategories: Category[] = response.data || [];
            setAllCategories(fetchedCategories);
            const roots = fetchedCategories.filter(cat => cat.parent_category === null);
            setCurrentDisplayCategories(roots);
            
            // If we have a product loaded, set its category
            if (!productLoading && productId) {
              const product = await shopService.getProductById(productId);
              if (product.category) {
                const categoryId = typeof product.category === 'number' ? product.category : product.category.id;
                const category = fetchedCategories.find(cat => cat.id === categoryId);
                
                if (category) {
                  setSelectedLeafCategory(category);
                  
                  // Build breadcrumbs
                  const breadcrumbs: Category[] = [];
                  let currentCat: Category | undefined = category;
                  
                  while (currentCat) {
                    breadcrumbs.unshift(currentCat);
                    const parentId = currentCat.parent_category;
                    currentCat = parentId ? fetchedCategories.find(cat => cat.id === parentId) : undefined;
                  }
                  
                  setCategoryBreadcrumbs(breadcrumbs);
                  
                  // Set current display categories to siblings of the selected category
                  if (category.parent_category) {
                    const siblings = fetchedCategories.filter(cat => cat.parent_category === category.parent_category);
                    setCurrentDisplayCategories(siblings);
                  }
                }
              }
            }
          } else {
            setErrorMessage('Failed to load categories.');
          }
        } catch (error: any) {
          setErrorMessage('Failed to load categories. Network error or endpoint not found.');
        } finally {
          setCategoriesLoading(false);
        }
      };
      fetchCategories();
    }
  }, [authReady, isAuthenticated, user, productLoading, productId]);

  // Category Selection Logic
  const handleCategoryPress = useCallback((category: Category) => {
    const children = allCategories.filter(cat => cat.parent_category === category.id);

    if (children.length > 0) {
      setCategoryBreadcrumbs(prev => [...prev, category]);
      setCurrentDisplayCategories(children);
      setSelectedLeafCategory(null);
    } else {
      setSelectedLeafCategory(category);
      if (categoryBreadcrumbs.length === 0 || categoryBreadcrumbs[categoryBreadcrumbs.length - 1].id !== category.id) {
        setCategoryBreadcrumbs(prev => {
          const path: Category[] = [];
          let current: Category | undefined = category;
          while (current) {
            path.unshift(current);
            current = allCategories.find(cat => cat.id === current?.parent_category);
          }
          return path;
        });
      }
    }
  }, [allCategories, categoryBreadcrumbs]);

  const navigateUpCategory = useCallback(() => {
    if (categoryBreadcrumbs.length > 0) {
      const newBreadcrumbs = [...categoryBreadcrumbs];
      newBreadcrumbs.pop();

      setCategoryBreadcrumbs(newBreadcrumbs);
      setSelectedLeafCategory(null);

      if (newBreadcrumbs.length === 0) {
        setCurrentDisplayCategories(allCategories.filter(cat => cat.parent_category === null));
      } else {
        const newParent = newBreadcrumbs[newBreadcrumbs.length - 1];
        setCurrentDisplayCategories(allCategories.filter(cat => cat.parent_category === newParent.id));
      }
    }
  }, [allCategories, categoryBreadcrumbs]);

  const handleClearFinalSelection = useCallback(() => {
    setSelectedLeafCategory(null);
  }, []);

  // Image Handling Functions
  const pickImages = useCallback(async () => {
    setLoading(true);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant media library access to select images for your product.',
          [{ text: 'OK' }]
        );
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.5,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const newImages: SelectedImage[] = result.assets.map(asset => ({
        uri: asset.uri,
        isMain: false,
      }));

      setSelectedImages(prevImages => {
        const updatedImages = [...prevImages, ...newImages];
        if (updatedImages.length > 0 && !updatedImages.some(img => img.isMain)) {
          updatedImages[0].isMain = true;
        }
        return updatedImages;
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to open image library. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeImage = useCallback(async (uriToRemove: string) => {
    const imageToRemove = selectedImages.find(img => img.uri === uriToRemove);
    
    // If it's an existing image (has ID), delete from server
    if (imageToRemove?.id) {
      Alert.alert(
        'Delete Image',
        'Are you sure you want to delete this image? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await shopService.deleteProductImage(productId, imageToRemove.id!);
                setSelectedImages(prevImages => {
                  const updatedImages = prevImages.filter(img => img.uri !== uriToRemove);
                  if (imageToRemove.isMain && updatedImages.length > 0) {
                    updatedImages[0].isMain = true;
                  }
                  return updatedImages;
                });
              } catch (error: any) {
                Alert.alert('Error', 'Failed to delete image. Please try again.');
              }
            }
          }
        ]
      );
    } else {
      // For new images, just remove from local state
      setSelectedImages(prevImages => {
        const updatedImages = prevImages.filter(img => img.uri !== uriToRemove);
        if (imageToRemove?.isMain && updatedImages.length > 0) {
          updatedImages[0].isMain = true;
        }
        return updatedImages;
      });
    }
  }, [selectedImages, productId]);

  const setMainImage = useCallback((uriToSetMain: string) => {
    setSelectedImages(prevImages => {
      return prevImages.map(img => ({
        ...img,
        isMain: img.uri === uriToSetMain,
      }));
    });
  }, []);

  // Create image data for upload
  const createImageData = (uri: string, isMain: boolean) => {
    const filename = `image_${Date.now()}.jpg`;
    const type = 'image/jpeg';

    const fetchImageBlob = async () => {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type || type });
        return file;
      } catch (error) {
        safeError('Error fetching blob:', error);
        throw error;
      }
    };

    return {
      image: fetchImageBlob(),
      is_main: isMain,
    };
  };

  // Product Update and Image Upload
  const handleUpdateProduct = useCallback(async () => {
    setErrorMessage('');
    setSuccessMessage('');
    Keyboard.dismiss();
    setLoading(true);

    // Client-side validation
    if (!productName.trim()) {
      setErrorMessage('Product Name is required.');
      setLoading(false);
      return;
    }
    if (!productDescription.trim()) {
      setErrorMessage('Product Description is required.');
      setLoading(false);
      return;
    }
    const priceValue = parseFloat(productPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      setErrorMessage('Please enter a valid positive price (e.g., 150.00).');
      setLoading(false);
      return;
    }
    const stockValue = parseInt(productStock);
    if (isNaN(stockValue) || stockValue < 0) {
      setErrorMessage('Please enter a valid non-negative stock quantity (e.g., 100).');
      setLoading(false);
      return;
    }
    if (selectedImages.length === 0) {
      setErrorMessage('Please select at least one image for the product.');
      setLoading(false);
      return;
    }
    if (!selectedImages.some(img => img.isMain)) {
      setErrorMessage('One image must be set as the main image.');
      setLoading(false);
      return;
    }
    if (!selectedLeafCategory) {
      setErrorMessage('Please select a product category.');
      setLoading(false);
      return;
    }

    const productData = {
      name: productName.trim(),
      description: productDescription.trim(),
      price: priceValue.toFixed(2),
      stock: stockValue,
      category: selectedLeafCategory.id,
      is_active: isProductActive,
    };

    try {
      // Step 1: Update the product
      await shopService.updateProduct(productId, productData);
      setSuccessMessage('Product updated successfully. Processing images...');
      setImageUploadLoading(true);
      
      // Step 2: Handle images
      // First, identify new images that need to be uploaded
      const newImages = selectedImages.filter(img => !img.id);
      
      // Upload new images
      for (const img of newImages) {
        try {
          const imageData = createImageData(img.uri, img.isMain);
          
          // Wait for the blob if it's a promise
          if (imageData.image instanceof Promise) {
            imageData.image = await imageData.image;
          }
          
          await shopService.addProductImage(productId, imageData);
        } catch (imageUploadError: any) {
          setErrorMessage('An error occurred during image upload for one or more images.');
        }
      }
      
      // Update main image status for existing images
      const existingImages = selectedImages.filter(img => img.id);
      for (const img of existingImages) {
        if (img.id) {
          try {
            await apiClient.patch(`/api/product-images/${img.id}/`, {
              is_main: img.isMain
            });
          } catch (error: any) {
            // Error updating image
          }
        }
      }
      
      setSuccessMessage('Product updated successfully!');
      
      // Navigate back
      navigation.goBack();
      
    } catch (error: any) {
      let apiErrorMessage = 'Failed to update product. Please check your input.';
      if (error.response?.data) {
        apiErrorMessage = Object.values(error.response.data)
          .flat()
          .map(msg => String(msg))
          .join('\\n');
      } else if (error.message) {
        apiErrorMessage = error.message;
      }
      setErrorMessage(apiErrorMessage);
    } finally {
      setImageUploadLoading(false);
      setLoading(false);
    }
  }, [
    productId, productName, productDescription, productPrice, productStock,
    isProductActive, selectedImages, selectedLeafCategory,
    navigation
  ]);

  const overallLoading = loading || imageUploadLoading || categoriesLoading || productLoading;

  // Render loading state for initial auth check
  if (!authReady && user === undefined) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>Checking authentication status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render access denied state if not authenticated or not a seller
  if (!isAuthenticated || !user?.profile?.is_seller) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.accessDeniedContainer}>
          <Ionicons name="lock-closed-outline" size={60} color={colors.errorText} style={styles.lockIcon} />
          <Text style={styles.title}>Access Denied</Text>
          <Text style={styles.subtitle}>
            You must be an authenticated seller to edit products.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render loading state while fetching product data
  if (productLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.subtitle}>Loading product data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.container}>
          <Text style={styles.title}>Edit Product</Text>
          <Text style={styles.subtitle}>Update your product details below.</Text>
          
          {errorMessage ? (
            <View style={styles.messageBoxError}>
              <Ionicons name="close-circle" size={20} color={colors.errorText} />
              <Text style={styles.messageTextError}>{errorMessage}</Text>
            </View>
          ) : null}
          
          {successMessage ? (
            <View style={styles.messageBoxSuccess}>
              <Ionicons name="checkmark-circle" size={20} color={colors.successText} />
              <Text style={styles.messageTextSuccess}>{successMessage}</Text>
            </View>
          ) : null}
          
          {/* Product Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Name:</Text>
            <View style={[styles.inputContainer, isNameFocused && styles.inputFocused]}>
              <TextInput
                style={styles.inputField}
                placeholder="e.g., Organic Honey 500g"
                placeholderTextColor={colors.textSecondary}
                value={productName}
                onChangeText={setProductName}
                editable={!overallLoading}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
              />
            </View>
          </View>
          
          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description:</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer, isDescriptionFocused && styles.inputFocused]}>
              <TextInput
                style={[styles.inputField, styles.textAreaField]}
                placeholder="Provide a detailed description of your product, its features, and benefits."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={5}
                value={productDescription}
                onChangeText={setProductDescription}
                editable={!overallLoading}
                onFocus={() => setIsDescriptionFocused(true)}
                onBlur={() => setIsDescriptionFocused(false)}
              />
            </View>
          </View>
          
          {/* Price (ZAR) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Price (ZAR):</Text>
            <View style={[styles.inputContainer, isPriceFocused && styles.inputFocused]}>
              <TextInput
                style={styles.inputField}
                placeholder="e.g., 150.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={productPrice}
                onChangeText={setProductPrice}
                editable={!overallLoading}
                onFocus={() => setIsPriceFocused(true)}
                onBlur={() => setIsPriceFocused(false)}
              />
            </View>
          </View>
          
          {/* Stock Quantity */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Stock Quantity:</Text>
            <View style={[styles.inputContainer, isStockFocused && styles.inputFocused]}>
              <TextInput
                style={styles.inputField}
                placeholder="e.g., 100"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={productStock}
                onChangeText={setProductStock}
                editable={!overallLoading}
                onFocus={() => setIsStockFocused(true)}
                onBlur={() => setIsStockFocused(false)}
              />
            </View>
          </View>
          
          {/* Category Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Category:</Text>
            {categoriesLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.categoryLoadingIndicator} />
            ) : (
              <View style={styles.categorySelectionContainer}>
                {/* Breadcrumbs */}
                {categoryBreadcrumbs.length > 0 && (
                  <View style={styles.categoryPathContainer}>
                    <TouchableOpacity onPress={navigateUpCategory} style={styles.backButton} disabled={overallLoading}>
                      <Ionicons name="arrow-back-outline" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.categoryPathText}>
                      {categoryBreadcrumbs.map(cat => cat.name).join(' > ')}
                    </Text>
                    {/* Clear final selection button */}
                    {selectedLeafCategory !== null && (
                      <TouchableOpacity onPress={handleClearFinalSelection} style={styles.clearSelectionButton} disabled={overallLoading}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.errorText} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                {/* Categories */}
                <ScrollView horizontal={false} showsVerticalScrollIndicator={true} contentContainerStyle={styles.categoryButtonsScrollView}>
                  {currentDisplayCategories.length > 0 ? (
                    currentDisplayCategories.map((category: Category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryButton,
                          selectedLeafCategory?.id === category.id && styles.selectedCategoryButton,
                          categoryBreadcrumbs.some(pathCat => pathCat.id === category.id) && styles.selectedCategoryButton,
                        ]}
                        onPress={() => handleCategoryPress(category)}
                        activeOpacity={0.7}
                        disabled={overallLoading}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            selectedLeafCategory?.id === category.id && styles.selectedCategoryButtonText,
                            categoryBreadcrumbs.some(pathCat => pathCat.id === category.id) && styles.selectedCategoryButtonText,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noCategoriesText}>No subcategories found for this path.</Text>
                  )}
                </ScrollView>
                
                {/* Display final selected category */}
                {selectedLeafCategory !== null && (
                  <Text style={styles.finalSelectionText}>
                    Final Selection: {selectedLeafCategory.name}
                  </Text>
                )}
              </View>
            )}
          </View>
          
          {/* Image Upload Section */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Images:</Text>
            <TouchableOpacity
              style={[styles.imagePickerButton, overallLoading && styles.buttonDisabled]}
              onPress={pickImages}
              disabled={overallLoading}
              activeOpacity={0.7}
            >
              {overallLoading ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={24} color={colors.buttonText} />
                  <Text style={styles.imagePickerButtonText}>Add More Images</Text>
                </>
              )}
            </TouchableOpacity>
            
            {selectedImages.length === 0 ? (
              <Text style={styles.imageCountText}>No images selected yet.</Text>
            ) : (
              <Text style={styles.imageCountText}>Selected {selectedImages.length} image(s).</Text>
            )}
            
            {selectedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.imagePreviewContainer}>
                {selectedImages.map((img, index) => (
                  <View key={img.uri} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(img.uri)}
                      disabled={overallLoading}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.errorText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.mainImageButton,
                        img.isMain && styles.mainImageButtonActive,
                      ]}
                      onPress={() => setMainImage(img.uri)}
                      disabled={overallLoading}
                    >
                      <Text style={styles.mainImageButtonText}>
                        {img.isMain ? 'Main' : 'Set Main'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            {imageUploadLoading && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.imageUploadIndicator} />
            )}
            
            {selectedImages.length > 0 && !selectedImages.some(img => img.isMain) && (
              <Text style={[styles.warningText, styles.warningTextProminent]}>
                Please select one image as main.
              </Text>
            )}
          </View>
          
          {/* Is Active */}
          <View style={styles.formGroup}>
            <View style={styles.switchContainer}>
              <Text style={styles.label}>Is Active (Visible to Customers):</Text>
              <Switch
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={isProductActive ? colors.primary : colors.textSecondary}
                ios_backgroundColor={colors.border}
                onValueChange={setIsProductActive}
                value={isProductActive}
                disabled={overallLoading}
              />
            </View>
            <Text style={styles.helpText}>Uncheck to temporarily hide this product from your shop.</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.button, overallLoading && styles.buttonDisabled]}
            onPress={handleUpdateProduct}
            disabled={overallLoading}
            activeOpacity={0.7}
          >
            {overallLoading ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={styles.buttonText}>Update Product</Text>
            )}
          </TouchableOpacity>
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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  lockIcon: {
    marginBottom: 20,
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
  },
  messageBoxError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FADBD8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.errorText,
  },
  messageTextError: {
    color: colors.errorText,
    fontSize: 14,
    marginLeft: 8,
    flexShrink: 1,
  },
  messageBoxSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4EFDF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.successText,
  },
  messageTextSuccess: {
    color: colors.successText,
    fontSize: 14,
    marginLeft: 8,
    flexShrink: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputFocused: {
    borderColor: colors.inputFocusBorder,
    shadowOpacity: 0.2,
    elevation: 4,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
  },
  textAreaContainer: {
    height: 120,
    alignItems: 'flex-start',
    paddingTop: 15,
    paddingBottom: 15,
  },
  textAreaField: {
    height: '100%',
    textAlignVertical: 'top',
  },
  categorySelectionContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryPathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
    backgroundColor: colors.background,
    borderRadius: 20,
  },
  categoryPathText: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '600',
  },
  clearSelectionButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: '#FADBD8',
    borderRadius: 20,
  },
  categoryButtonsScrollView: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingVertical: 5,
    maxHeight: 200,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    margin: 4,
    backgroundColor: colors.card,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedCategoryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  categoryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: colors.buttonText,
    fontWeight: 'bold',
  },
  noCategoriesText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
    flex: 1,
  },
  finalSelectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    textAlign: 'center',
  },
  categoryLoadingIndicator: {
    marginVertical: 10,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonBg,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  imagePickerButtonText: {
    color: colors.buttonText,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  imageCountText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
  },
  imagePreviewWrapper: {
    marginHorizontal: 5,
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 2,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  mainImageButton: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  mainImageButtonActive: {
    backgroundColor: colors.primary,
  },
  mainImageButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  imageUploadIndicator: {
    marginTop: 10,
    marginBottom: 10,
  },
  warningText: {
    color: colors.errorText,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
  },
  warningTextProminent: {
    fontWeight: 'bold',
    fontSize: 15,
    backgroundColor: '#FADBD8',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.errorText,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.buttonBg,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#A9D9B9',
    opacity: 0.7,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EditProductScreen;