// saknew_frontend/screens/ShopOwner/AddProductScreen.tsx

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
import { useNavigation, CommonActions } from '@react-navigation/native'; // Import CommonActions
import { MainNavigationProp } from '../../navigation/types';
import shopService from '../../services/shopService';
import BackButton from '../../components/BackButton';
// No need for AddProductImageData or Product from shop.types here as we are creating, not specifically handling existing product types for images

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
  shadowColor: '#000', // Define a consistent shadow color
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
  // No 'id' here as these are new images being added
}

const AddProductScreen: React.FC = () => {
  const { user, isAuthenticated = false, refreshUserProfile } = useAuth();
  const navigation = useNavigation<MainNavigationProp>();



  // Product form states - initialized for a new product
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [isProductActive, setIsProductActive] = useState(true); // New products are active by default

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
  const [loading, setLoading] = useState(false); // Overall loading for product submission
  const [imagePickerLoading, setImagePickerLoading] = useState(false); // Loading for image picker
  const [categoriesLoading, setCategoriesLoading] = useState(true); // Loading specifically for categories
  const authReady = isAuthenticated;

  // Input focus states
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isStockFocused, setIsStockFocused] = useState(false);

  // Fetch categories on component mount
  useEffect(() => {
    
    // Fetch categories when user is ready and is a seller
    if (authReady && user?.profile?.is_seller) {
      const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
          const response = await apiClient.get<Category[]>('/api/categories/');
          
          if (response.status === 200) {
            const fetchedCategories: Category[] = response.data || [];
            setAllCategories(fetchedCategories);
            // Initialize with root categories (parent_category is null)
            const rootCategories = fetchedCategories.filter(cat => cat.parent_category === null);
            setCurrentDisplayCategories(rootCategories);
          } else {
            setErrorMessage('Failed to load categories. Please try again.');
          }
        } catch (error: any) {
          setErrorMessage('Failed to load categories. Network error or server issue.');
        } finally {
          setCategoriesLoading(false);
        }
      };
      fetchCategories();
    }
  }, [authReady, user]); // Fetch when auth and user are ready

  // Clear messages after a delay
  useEffect(() => {
    let errorTimer: NodeJS.Timeout;
    let successTimer: NodeJS.Timeout;

    if (errorMessage) {
      errorTimer = setTimeout(() => setErrorMessage(''), 5000); // Clear error after 5 seconds
    }
    if (successMessage) {
      successTimer = setTimeout(() => setSuccessMessage(''), 5000); // Clear success after 5 seconds
    }

    return () => {
      clearTimeout(errorTimer);
      clearTimeout(successTimer);
    };
  }, [errorMessage, successMessage]);

  // Category Selection Logic
  const handleCategoryPress = useCallback((category: Category) => {
    const children = allCategories.filter(cat => cat.parent_category === category.id);

    if (children.length > 0) {
      // If there are children, navigate deeper
      setCategoryBreadcrumbs(prev => [...prev, category]);
      setCurrentDisplayCategories(children);
      setSelectedLeafCategory(null); // Clear leaf selection when navigating deeper
    } else {
      // If no children, this is a leaf category
      setSelectedLeafCategory(category);
      // Ensure breadcrumbs reflect the full path to the selected leaf category
      const path: Category[] = [];
      let current: Category | undefined = category;
      while (current) {
        path.unshift(current); // Add to the beginning to maintain correct order
        current = allCategories.find(cat => cat.id === current?.parent_category);
      }
      setCategoryBreadcrumbs(path);
    }
  }, [allCategories]);

  const navigateUpCategory = useCallback(() => {
    setSelectedLeafCategory(null); // Clear leaf selection when navigating up
    setCategoryBreadcrumbs(prev => {
      const newBreadcrumbs = [...prev];
      newBreadcrumbs.pop(); // Remove the last item (current level)

      if (newBreadcrumbs.length === 0) {
        // If no breadcrumbs left, go back to root categories
        setCurrentDisplayCategories(allCategories.filter(cat => cat.parent_category === null));
      } else {
        // Go to children of the new last breadcrumb (parent of current level)
        const newParent = newBreadcrumbs[newBreadcrumbs.length - 1];
        setCurrentDisplayCategories(allCategories.filter(cat => cat.parent_category === newParent.id));
      }
      return newBreadcrumbs;
    });
  }, [allCategories]);

  const handleClearFinalSelection = useCallback(() => {
    setSelectedLeafCategory(null);
  }, []);

  // Image Handling Functions
  const pickImages = useCallback(async () => {
    setImagePickerLoading(true); // Show image picker loading
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant media library access to select images for your product.'
        );
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.5,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return; // User cancelled or no assets selected
      }

      setSelectedImages(prevImages => {
        const newImages: SelectedImage[] = result.assets.map(asset => ({
          uri: asset.uri,
          isMain: false, // Default new images to not main
        }));

        const updatedImages = [...prevImages, ...newImages];
        // If no main image exists, set the first image as main
        if (updatedImages.length > 0 && !updatedImages.some(img => img.isMain)) {
          updatedImages[0].isMain = true;
        }
        return updatedImages;
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to open image library. Please try again.');
    } finally {
      setImagePickerLoading(false); // Hide image picker loading
    }
  }, []);

  const removeImage = useCallback((uriToRemove: string) => {
    setSelectedImages(prevImages => {
      const updatedImages = prevImages.filter(img => img.uri !== uriToRemove);
      // If the removed image was main, and there are other images, set the first as main
      if (prevImages.find(img => img.uri === uriToRemove)?.isMain && updatedImages.length > 0) {
        updatedImages[0].isMain = true;
      }
      return updatedImages;
    });
  }, []);

  const setMainImage = useCallback((uriToSetMain: string) => {
    setSelectedImages(prevImages => {
      return prevImages.map(img => ({
        ...img,
        isMain: img.uri === uriToSetMain, // Set this image as main, others as not main
      }));
    });
  }, []);

  // Helper to create image data for upload
  const createImageData = useCallback(async (uri: string, isMain: boolean) => {
    console.log('🖼️ Creating image data for upload:', { uri, isMain });
    const filename = `image_${Date.now()}.jpg`;
    const type = 'image/jpeg';
    
    // Fetch the actual blob data from the URI
    console.log('🖼️ Fetching blob from URI...');
    const response = await fetch(uri);
    const blob = await response.blob();
    console.log('🖼️ Blob fetched:', { size: blob.size, type: blob.type });
    
    return {
      image: {
        uri: uri,
        name: filename,
        type: type,
        blob: blob, // Include the actual blob data
      },
      is_main: isMain,
    };
  }, []);

  // Product Submission Logic
  const handleAddProduct = useCallback(async () => {
    console.log('🚀 ADD PRODUCT - Function called!');
    console.log('🚀 Product Name:', productName);
    console.log('🚀 Selected Images:', selectedImages.length);
    
    setErrorMessage('');
    setSuccessMessage('');
    Keyboard.dismiss(); // Hide keyboard

    // Client-side validation
    if (!productName.trim()) {
      setErrorMessage('Product Name is required.');
      return;
    }
    if (!productDescription.trim()) {
      setErrorMessage('Product Description is required.');
      return;
    }
    const priceValue = parseFloat(productPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      setErrorMessage('Please enter a valid positive price (e.g., 150.00).');
      return;
    }
    const stockValue = parseInt(productStock, 10); // Specify radix for parseInt
    if (isNaN(stockValue) || stockValue < 0) {
      setErrorMessage('Please enter a valid non-negative stock quantity (e.g., 100).');
      return;
    }
    if (selectedImages.length === 0) {
      setErrorMessage('Please select at least one image for the product.');
      return;
    }
    if (!selectedImages.some(img => img.isMain)) {
      setErrorMessage('One image must be set as the main image.');
      return;
    }
    if (selectedLeafCategory === null) {
      setErrorMessage('Please select a product category.');
      return;
    }

    setLoading(true); // Start overall loading

    const productData = {
      name: productName.trim(),
      description: productDescription.trim(),
      price: priceValue.toFixed(2), // Ensure 2 decimal places for price
      stock: stockValue,
      category: selectedLeafCategory.id,
      is_active: isProductActive,
    };

    let productId = null;
    try {
      // Step 1: Create the product
      const productResponse = await shopService.createProduct(productData);
      
      if (productResponse.id) {
        productId = productResponse.id;
        setSuccessMessage('Product created successfully. Uploading images...');
        setImageUploadLoading(true); // Indicate image upload is starting
      } else {
        setErrorMessage('Product creation failed: No ID returned from server.');
        return; // Exit if product ID is not returned
      }
    } catch (error: any) {
      let apiErrorMessage = 'Failed to add product. Please check your input.';
      if (error.response?.data) {
        // Attempt to parse validation errors from Django
        apiErrorMessage = Object.values(error.response.data)
          .flat()
          .map(msg => String(msg))
          .join('\n');
      } else if (error.message) {
        apiErrorMessage = `Network Error: ${error.message}`;
      }
      setErrorMessage(apiErrorMessage);
      return; // Exit on product creation error
    } finally {
      setLoading(false); // End overall loading for product creation part
    }

    // Step 2: Upload images if product was created successfully
    if (productId) {
      console.log('📤 Starting image upload for product:', productId);
      console.log('📤 Total images to upload:', selectedImages.length);
      let allImagesUploadedSuccessfully = true;
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        console.log(`📤 Uploading image ${i + 1}/${selectedImages.length}:`, { uri: img.uri, isMain: img.isMain });
        
        try {
          const imageData = await createImageData(img.uri, img.isMain);
          console.log('📤 Image data created, calling addProductImage...');
          const uploadResult = await shopService.addProductImage(productId, imageData);
          console.log(`✅ Image ${i + 1} uploaded successfully:`, uploadResult);
        } catch (imageUploadError: any) {
          console.error(`❌ Image ${i + 1} upload failed:`, imageUploadError);
          console.error('❌ Error response:', imageUploadError.response?.data);
          console.error('❌ Error status:', imageUploadError.response?.status);
          allImagesUploadedSuccessfully = false;
          
          // Get specific error message
          let errorMsg = 'Unknown error';
          if (imageUploadError.response?.data) {
            if (typeof imageUploadError.response.data === 'string') {
              errorMsg = imageUploadError.response.data;
            } else if (imageUploadError.response.data.detail) {
              errorMsg = imageUploadError.response.data.detail;
            } else if (imageUploadError.response.data.error) {
              errorMsg = imageUploadError.response.data.error;
            } else {
              errorMsg = JSON.stringify(imageUploadError.response.data);
            }
          } else if (imageUploadError.message) {
            errorMsg = imageUploadError.message;
          }
          console.error('❌ Parsed error message:', errorMsg);
          
          setErrorMessage(prev => prev + `\nImage ${i + 1} upload failed: ${errorMsg}`);
        }
      }
      console.log('📤 Image upload complete. All successful:', allImagesUploadedSuccessfully);

      setImageUploadLoading(false); // End image upload loading
      setLoading(false); // Ensure overall loading is false

      if (allImagesUploadedSuccessfully) {
        setSuccessMessage('Product and all images added successfully!');
        // Clear form fields after successful submission
        resetFormFields();
        // Immediately redirect to MyShopScreen
        await refreshUserProfile(); // Refresh user profile (e.g., if seller shop status changed)
        navigation.dispatch(
          CommonActions.navigate({
            name: 'MainTabs',
            params: {
              screen: 'ShopTab',
              params: {
                screen: 'MyShop',
              },
            },
          })
        );
      } else {
        // If some images failed, show a different message
        setErrorMessage(prev => prev || 'Product created, but some images failed to upload. You can add them later by editing the product.');
      }
    }
  }, [
    productName,
    productDescription,
    productPrice,
    productStock,
    isProductActive,
    selectedImages,
    selectedLeafCategory,
    allCategories, // Added as dependency for resetFormFields logic
    createImageData,
    navigation,
    refreshUserProfile,
  ]);

  // Helper function to reset form to initial state
  const resetFormFields = useCallback(() => {
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setProductStock('');
    setIsProductActive(true);
    setSelectedLeafCategory(null);
    setCategoryBreadcrumbs([]);
    // Reset current display categories to root categories
    setCurrentDisplayCategories(allCategories.filter(cat => cat.parent_category === null));
    setSelectedImages([]);
  }, [allCategories]); // `allCategories` is needed here to properly reset `currentDisplayCategories`

  const overallLoading = loading || imageUploadLoading || categoriesLoading || imagePickerLoading;

  // Render loading state for initial auth check
  if (!authReady && user === undefined) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContainer}>
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
        <View style={styles.centeredContainer}>
          <Ionicons name="lock-closed-outline" size={60} color={colors.errorText} style={styles.lockIcon} />
          <Text style={styles.title}>Access Denied</Text>
          <Text style={styles.subtitle}>
            You must be an authenticated seller to add products.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.container}>
          <Text style={styles.title}>Add New Product</Text>
          <Text style={styles.subtitle}>Fill in the details to add a new product to your shop.</Text>

          {/* Message Boxes */}
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

                {/* Categories - This ScrollView allows horizontal scrolling */}
                <ScrollView
                  horizontal={false} // Set to false for vertical scrolling
                  showsVerticalScrollIndicator={true} // Show vertical scroll indicator
                  contentContainerStyle={styles.categoryButtonsContent} // Apply flexWrap and flexDirection here
                  style={styles.categoryButtonsScrollView} // Apply maxHeight here
                >
                  {currentDisplayCategories.length > 0 ? (
                    currentDisplayCategories.map((category: Category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryButton,
                          selectedLeafCategory?.id === category.id && styles.selectedCategoryButton,
                          // No need to highlight breadcrumb categories in the list of current display categories
                          // categoryBreadcrumbs.some(pathCat => pathCat.id === category.id) && styles.selectedCategoryButton,
                        ]}
                        onPress={() => handleCategoryPress(category)}
                        activeOpacity={0.7}
                        disabled={overallLoading}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            selectedLeafCategory?.id === category.id && styles.selectedCategoryButtonText,
                            // No need to highlight breadcrumb categories in the list of current display categories
                            // categoryBreadcrumbs.some(pathCat => pathCat.id === category.id) && styles.selectedCategoryButtonText,
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
                    Final Selection: <Text style={styles.finalSelectionTextBold}>{selectedLeafCategory.name}</Text>
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
              {imagePickerLoading ? ( // Use image picker loading state
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={24} color={colors.buttonText} />
                  <Text style={styles.imagePickerButtonText}>Select Images</Text>
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

            {imageUploadLoading && ( // Show image upload indicator during image upload specifically
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
                thumbColor={Platform.OS === 'android' ? colors.primary : colors.card} // Android needs different thumbColor
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
            onPress={handleAddProduct}
            disabled={overallLoading}
            activeOpacity={0.7}
          >
            {overallLoading ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={styles.buttonText}>Add Product</Text>
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
  centeredContainer: {
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
    padding: 0, // Reset default padding from TextInput
  },
  textAreaContainer: {
    height: 120,
    alignItems: 'flex-start', // Ensure text starts at the top
    paddingTop: 15,
    paddingBottom: 15,
  },
  textAreaField: {
    height: '100%',
    textAlignVertical: 'top', // For Android to start text at top
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
    fontSize: 11,
    color: colors.textPrimary,
    flex: 1, // Allow text to take up available space
    fontWeight: '600',
  },
  clearSelectionButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: '#FADBD8',
    borderRadius: 20,
  },
  categoryButtonsScrollView: {
    maxHeight: 300, // Increase height to allow more vertical scrolling and full view
    minHeight: 100, // Ensure minimum height for scroll area
    paddingBottom: 10, // Add padding to prevent last items from being cut off
  },
  // IMPORTANT: These styles are applied to contentContainerStyle, not style
  categoryButtonsContent: {
    flexDirection: 'row', // Arrange children in a row
    flexWrap: 'wrap',     // Allow children to wrap to the next line
    justifyContent: 'flex-start',
    paddingVertical: 5,
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
    fontSize: 11,
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: colors.buttonText,
    fontSize: 11,
    fontWeight: 'bold',
  },
  noCategoriesText: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    padding: 10,
    flex: 1,
  },
  finalSelectionText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    textAlign: 'center',
  },
  finalSelectionTextBold: {
    fontWeight: 'bold', // Ensure this part is bold
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
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
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
    shadowColor: colors.shadowColor, // Use defined shadow color
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  mainImageButton: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  mainImageButtonActive: {
    backgroundColor: colors.primary,
  },
  mainImageButtonText: {
    color: colors.buttonText,
    fontSize: 10,
    fontWeight: 'bold',
  },
  imageUploadIndicator: {
    marginTop: 10,
  },
  warningText: {
    fontSize: 14,
    color: colors.errorText,
    textAlign: 'center',
    marginTop: 10,
  },
  warningTextProminent: {
    fontWeight: 'bold',
    padding: 5,
    backgroundColor: '#FADBD8',
    borderRadius: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
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
    marginLeft: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonBg,
    borderRadius: 10,
    paddingVertical: 15,
    marginTop: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.7,
  },
  buttonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddProductScreen;
