// saknew_frontend/services/shopService.ts
import apiClient from './apiClient';
import publicApiClient from './publicApiClient';
import { safeLog } from '../utils/secureLogger';
import {
  Product,
  Shop,
  Category,
  ProductImage,
  Promotion,
  CreateShopData,
  UpdateShopData,
  CreateProductData,
  UpdateProductData,
  AddProductImageData,
  CreatePromotionData,
  UpdatePromotionData,
} from './shop.types'; // Corrected import path for types

// Interface for paginated responses (common in DRF)
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Interface for shop statistics
interface ShopStatistics {
  total_categories: number;
  total_sales: string;
  total_orders: number;
  top_selling_products: any[];
}

const ShopService = {
  // --- Shop API Calls ---

  /**
   * Fetches a list of all active shops.
   * @param page Optional page number for pagination.
   * @param pageSize Optional number of items per page.
   * @returns Promise resolving with a paginated list of Shop objects.
   */
  async getShops(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Shop>> {
    try {
      console.log('Fetching all shops');
      // This is likely a public endpoint, so publicApiClient is appropriate here.
      const response = await publicApiClient.get<PaginatedResponse<Shop>>(`/api/shops/?page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching shops', error.response?.status);
      throw error;
    }
  },

  /**
   * Fetches a single shop by its slug.
   * @param slug The slug of the shop to fetch.
   * @returns Promise<Shop> The shop object.
   */
  async getShopBySlug(slug: string): Promise<Shop> {
    try {
      const sanitizedSlug = encodeURIComponent(slug);
      console.log('Fetching shop by slug');
      const response = await publicApiClient.get<Shop>(`/api/shops/${sanitizedSlug}/`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching shop', error.response?.status);
      throw error;
    }
  },

  /**
   * Fetches the authenticated user's shop.
   * @returns Promise<Shop> The user's shop object.
   */
  async getMyShop(): Promise<Shop> {
    try {
      console.log('🏪 SHOP SERVICE - Fetching my shop from /api/shops/my_shop/');
      const response = await apiClient.get<Shop>('/api/shops/my_shop/');
      console.log('🏪 SHOP SERVICE - My shop response:', response.data);
      
      // Check if response contains error (token expired)
      if (response.data && typeof response.data === 'object' && 'code' in response.data) {
        console.error('🏪 SHOP SERVICE - Error in response data:', response.data);
        throw new Error('Authentication failed');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('🏪 SHOP SERVICE - Error fetching my shop:', error.response?.status, error.response?.data);
      throw error;
    }
  },

  /**
   * Fetches products for a specific shop by its slug.
   * @param shopSlug The slug of the shop whose products to fetch.
   * @returns Promise<Product[]> An array of product objects.
   */
  async getShopProducts(shopSlug: string): Promise<Product[]> {
    try {
      if (!shopSlug) {
        throw new Error('Shop slug is required');
      }
      const sanitizedShopSlug = encodeURIComponent(shopSlug);
      console.log('Fetching shop products');
      const response = await publicApiClient.get<Product[]>(`/api/shops/${sanitizedShopSlug}/products/`);

      if (response.data && response.data.length > 0) {
        console.log('Products fetched successfully');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error fetching shop products', error.response?.status);
      throw error;
    }
  },

  /**
   * Fetches products for a specific shop by category.
   * @param shopSlug The slug of the shop.
   * @param categorySlug The slug of the category.
   * @returns Promise<Product[]> An array of product objects.
   */
  async getShopProductsByCategory(shopSlug: string, categorySlug: string): Promise<Product[]> {
    try {
      console.log(`ShopService: Fetching products for shop ${shopSlug} in category ${categorySlug}...`);
      const response = await apiClient.get<Product[]>(`/api/shops/${shopSlug}/categories/${categorySlug}/products/`);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Error fetching products for shop ${shopSlug} in category ${categorySlug}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Fetches orders for a specific shop by its slug.
   * @param shopSlug The slug of the shop whose orders to fetch.
   * @param page Optional page number for pagination.
   * @param pageSize Optional number of items per page.
   * @returns Promise<PaginatedResponse<Order>> A paginated response of order objects.
   */
  async getShopOrders(shopSlug: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<any>> {
    try {
      console.log(`ShopService: Fetching orders for shop: ${shopSlug}...`);
      const response = await apiClient.get<PaginatedResponse<any>>(`/api/shops/${shopSlug}/orders/?page=${page}&page_size=${pageSize}`);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Error fetching orders for shop ${shopSlug}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Fetches statistics for a specific shop by its slug.
   * @param shopSlug The slug of the shop whose statistics to fetch.
   * @returns Promise<ShopStatistics> The shop statistics.
   */
  async getShopStatistics(shopSlug: string): Promise<ShopStatistics> {
    try {
      console.log(`ShopService: Fetching statistics for shop: ${shopSlug}...`);
      const response = await apiClient.get<ShopStatistics>(`/api/shops/${shopSlug}/statistics/`);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Error fetching statistics for shop ${shopSlug}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Creates a new shop.
   * @param shopData Data for the new shop (name, description, etc.).
   * @returns Promise<Shop> The newly created shop object.
   */
  async createShop(shopData: CreateShopData): Promise<Shop> {
    try {
      console.log('🏪 SHOP SERVICE - Creating new shop with data:', shopData);
      console.log('🏪 SHOP SERVICE - Making POST request to /api/shops/');
      
      const response = await apiClient.post<Shop>('/api/shops/', shopData);
      
      console.log('🏪 SHOP SERVICE - Response status:', response.status);
      console.log('🏪 SHOP SERVICE - Response data:', response.data);
      console.log('🏪 SHOP SERVICE - Shop created successfully:', response.data.name);
      
      return response.data;
    } catch (error: any) {
      console.error('🏪 SHOP SERVICE - Error creating shop:', error);
      console.error('🏪 SHOP SERVICE - Error response:', error.response?.data);
      console.error('🏪 SHOP SERVICE - Error status:', error.response?.status);
      console.error('🏪 SHOP SERVICE - Error config:', error.config?.url);
      throw error;
    }
  },

  /**
   * Updates an existing shop.
   * @param shopSlug The slug of the shop to update.
   * @param data The updated shop data.
   * @returns Promise resolving with the updated Shop object.
   */
  async updateShop(shopSlug: string, data: UpdateShopData): Promise<Shop> {
    try {
      console.log(`ShopService: Updating shop ${shopSlug}...`);
      const response = await apiClient.patch<Shop>(`/api/shops/${shopSlug}/`, data);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Failed to update shop ${shopSlug}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Deletes a shop.
   * @param shopSlug The slug of the shop to delete.
   * @returns Promise resolving upon successful deletion.
   */
  async deleteShop(shopSlug: string): Promise<void> {
    try {
      console.log(`ShopService: Deleting shop ${shopSlug}...`);
      await apiClient.delete(`/api/shops/${shopSlug}/`);
    } catch (error: any) {
      console.error(`ShopService: Failed to delete shop ${shopSlug}:`, error.response?.data || error.message);
      throw error;
    }
  },


  // --- Category API Calls ---

  /**
   * Fetches a list of all product categories.
   * @returns Promise<PaginatedResponse<Category>> A paginated response of category objects.
   */
  async getCategories(): Promise<PaginatedResponse<Category>> {
    try {
      console.log('ShopService: Fetching all categories...');
      // Use publicApiClient for this public endpoint
      // Backend CategoryViewSet has pagination_class = None, so this will return all categories directly
      // However, keeping PaginatedResponse for consistency with other endpoints if pagination is ever added.
      const response = await publicApiClient.get<PaginatedResponse<Category>>('/api/categories/');
      return response.data;
    } catch (error: any) {
      console.error('ShopService: Error fetching categories:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Fetches products belonging to a specific category by its slug.
   * @param categorySlug The slug of the category whose products to fetch.
   * @returns Promise<Product[]> An array of product objects (not paginated for this action).
   */
  async getCategoryProducts(categorySlug: string): Promise<Product[]> {
    try {
      console.log(`ShopService: Fetching products for category: ${categorySlug}...`);
      const response = await publicApiClient.get<Product[]>(`/api/categories/${categorySlug}/products/`);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Error fetching products for category ${categorySlug}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // --- Product API Calls ---

  /**
   * Fetches a single product by its ID.
   * @param productId The ID of the product to fetch.
   * @returns Promise<Product> The product object.
   */
  async getProductById(productId: number): Promise<Product> {
    try {
      console.log(`ShopService: Fetching product by ID: ${productId}...`);
      const response = await publicApiClient.get<Product>(`/api/products/${productId}/`);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Error fetching product ${productId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Fetches a list of recommended products.
   * @param page Optional page number for pagination (default: 1)
   * @param pageSize Optional number of items per page (default: 10)
   * @returns Promise<PaginatedResponse<Product>> A paginated response of recommended product objects.
   */
  async getRecommendedProducts(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Product>> {
    try {
      console.log(`ShopService: Fetching all products (page ${page})...`);
      // Use publicApiClient for this public endpoint
      const response = await publicApiClient.get<PaginatedResponse<Product>>(`/api/products/?page=${page}&page_size=${pageSize}`);
      console.log('Products fetched successfully', `Count: ${response.data.count}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching products', error.response?.status || 'Network error');
      // Return empty results instead of throwing
      return { count: 0, next: null, previous: null, results: [] };
    }
  },

  /**
   * Searches for products based on a query. Can optionally include user's location for proximity.
   * @param query The search query string.
   * @param userLat Optional: User's latitude for location-based search.
   * @param userLon Optional: User's longitude for location-based search.
   * @param page Optional page number for pagination.
   * @param pageSize Optional number of items per page.
   * @returns Promise<PaginatedResponse<Product>> A paginated response of matching product objects.
   */
  async searchProducts(query: string, userLat?: number, userLon?: number, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Product>> {
    try {
      const sanitizedQuery = query;
      console.log('Searching products');
      let url = `/api/products/search/?q=${encodeURIComponent(sanitizedQuery)}&page=${page}&page_size=${pageSize}`;
      if (userLat !== undefined && userLon !== undefined) {
        url += `&user_lat=${userLat}&user_lon=${userLon}`;
      }
      const response = await publicApiClient.get<PaginatedResponse<Product>>(url);
      return response.data;
    } catch (error: any) {
      console.error('Error searching products', error.response?.status);
      throw error;
    }
  },

  /**
   * Creates a new product for the authenticated user's shop.
   * @param data The data for the new product.
   * @returns Promise resolving with the created Product object.
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      console.log('🏭 ShopService: Creating new product...');
      console.log('🏭 ShopService: Product data:', data);
      const response = await apiClient.post<Product>('/api/products/', data);
      console.log('✅ ShopService: Product created successfully:', { id: response.data.id, name: response.data.name });
      return response.data;
    } catch (error: any) {
      console.error('❌ ShopService: Failed to create product:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Updates an existing product.
   * @param productId The ID of the product to update.
   * @param data The updated product data.
   * @returns Promise resolving with the updated Product object.
   */
  async updateProduct(productId: number, data: UpdateProductData): Promise<Product> {
    try {
      console.log(`ShopService: Updating product ${productId}...`);
      const response = await apiClient.patch<Product>(`/api/products/${productId}/`, data);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Failed to update product ${productId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Deletes a product.
   * @param productId The ID of the product to delete.
   * @returns Promise resolving upon successful deletion.
   */
  async deleteProduct(productId: number): Promise<void> {
    try {
      console.log(`ShopService: Deleting product ${productId}...`);
      await apiClient.delete(`/api/products/${productId}/`);
    } catch (error: any) {
      console.error(`ShopService: Failed to delete product ${productId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Adds an image to a product.
   * @param productId The ID of the product.
   * @param data Image data with file and is_main flag.
   * @returns Promise resolving with the created ProductImage object.
   */
  async addProductImage(productId: number, data: AddProductImageData): Promise<ProductImage> {
    try {
      console.log(`📤 ShopService: Adding image to product ${productId}...`);
      console.log('📤 ShopService: Image data received:', { 
        hasBlob: !!(data.image as any).blob,
        uri: (data.image as any).uri,
        name: (data.image as any).name,
        type: (data.image as any).type,
        isMain: data.is_main
      });
      
      const formData = new FormData();
      
      // Handle blob data properly for React Native
      const imageData = data.image as any;
      if (imageData.blob) {
        console.log('📤 ShopService: Using blob data for upload');
        console.log('📤 ShopService: Blob details:', { size: imageData.blob.size, type: imageData.blob.type });
        // Use blob if available (React Native with fetch)
        formData.append('image', imageData.blob, imageData.name);
      } else {
        console.log('📤 ShopService: Using direct image data for upload');
        // Fallback to direct image data
        formData.append('image', imageData);
      }
      
      formData.append('is_main', (data.is_main ?? false).toString());
      console.log('📤 ShopService: FormData prepared, making POST request...');
      
      const response = await apiClient.post<ProductImage>(
        `/api/products/${productId}/add-image/`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      console.log('✅ ShopService: Image uploaded successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ ShopService: Failed to add image to product ${productId}:`, error.response?.data || error.message);
      console.error('❌ ShopService: Error status:', error.response?.status);
      console.error('❌ ShopService: Error headers:', error.response?.headers);
      throw error;
    }
  },

  /**
   * Deletes a product image.
   * @param productId The ID of the product.
   * @param imageId The ID of the image to delete.
   * @returns Promise resolving upon successful deletion.
   */
  async deleteProductImage(productId: number, imageId: number): Promise<void> {
    try {
      console.log(`ShopService: Deleting image ${imageId} for product ${productId}...`);
      await apiClient.delete(`/api/products/${productId}/delete-image/${imageId}/`);
    } catch (error: any) {
      console.error(`ShopService: Failed to delete image ${imageId} for product ${productId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Sets a product image as the main image.
   * @param productId The ID of the product.
   * @param imageId The ID of the image to set as main.
   * @returns Promise resolving with the updated ProductImage object.
   */
  async setMainProductImage(productId: number, imageId: number): Promise<ProductImage> {
    try {
      console.log(`ShopService: Setting main image ${imageId} for product ${productId}...`);
      const response = await apiClient.post<ProductImage>(`/api/products/${productId}/set-main-image/${imageId}/`);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Failed to set main image ${imageId} for product ${productId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Adds a promotion to a product.
   * @param productId The ID of the product.
   * @param data Promotion data.
   * @returns Promise resolving with the created Promotion object.
   */
  async addProductPromotion(productId: number, data: CreatePromotionData): Promise<Promotion> {
    try {
      console.log(`ShopService: Adding promotion to product ${productId}...`);
      const response = await apiClient.post<Promotion>(`/api/products/${productId}/add-promotion/`, data);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Failed to add promotion to product ${productId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Edits an existing promotion for a product.
   * @param productId The ID of the product.
   * @param promotionId The ID of the promotion to edit.
   * @param data Updated promotion data.
   * @returns Promise resolving with the updated Promotion object.
   */
  async editProductPromotion(productId: number, promotionId: number, data: UpdatePromotionData): Promise<Promotion> {
    try {
      console.log(`ShopService: Editing promotion ${promotionId} for product ${productId}...`);
      const response = await apiClient.patch<Promotion>(`/api/products/${productId}/edit-promotion/${promotionId}/`, data);
      return response.data;
    } catch (error: any) {
      console.error(`ShopService: Failed to edit promotion ${promotionId} for product ${productId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Deletes a promotion from a product.
   * @param productId The ID of the product.
   * @param promotionId The ID of the promotion to delete.
   * @returns Promise resolving upon successful deletion.
   */
  async deleteProductPromotion(productId: number, promotionId: number): Promise<void> {
    try {
      console.log(`ShopService: Deleting promotion ${promotionId} for product ${productId}...`);
      await apiClient.delete(`/api/products/${productId}/delete-promotion/${promotionId}/`);
    } catch (error: any) {
      console.error(`ShopService: Failed to delete promotion ${promotionId} for product ${productId}:`, error.response?.data || error.message);
      throw error;
    }
  },
};

export default ShopService;
