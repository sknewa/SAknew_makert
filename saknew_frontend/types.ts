// saknew_frontend/types.ts

/**
 * Interface for a simplified User Profile, typically nested within a User object.
 */
export interface UserProfile {
  email_verified: boolean;
  is_seller: boolean;
  shop_slug: string | null;
}

/**
 * Interface for a full User object, as returned by authentication endpoints.
 */
export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  profile: UserProfile | null; // User profile data, can be null if not set
}

/**
 * Interface for a simplified User object, used when only basic user info is needed.
 */
export interface SimpleUser {
  id: number;
  username: string;
  email: string;
  phone_number?: string; // Optional phone number
  profile_picture_url?: string; // Optional profile picture URL
}

/**
 * Interface for a Shop entity.
 */
export interface Shop {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  latitude: number | null; // Changed to number | null for coordinates
  longitude: number | null; // Changed to number | null for coordinates
  is_active: boolean;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
  products_count: number; // Total number of products associated with the shop
  user: SimpleUser; // Shop owner's simplified user object

  // --- Shop Statistics (added for MyShopScreen header and StatsScreen) ---
  total_orders?: number; // Optional: Total number of orders received by this shop
  available_products_count?: number; // Optional: Number of products currently in stock
  out_of_stock_products_count?: number; // Optional: Number of products with 0 stock
  shop_rating?: number; // Optional: Average rating of the shop (e.g., 4.5)
  total_reviews?: number; // Optional: Total number of reviews received
  total_sales_value?: string; // Optional: Total sales value (e.g., "R 25,500.75") - used in MyShopScreen
  pending_orders?: number; // Optional: Number of orders with 'pending' status (added for StatsScreen)
  total_categories?: number; // Optional: Total number of product categories in the shop (added for StatsScreen)
  total_sales_revenue?: string; // Optional: Total sales revenue (e.g., "35678.90") - used in StatsScreen for calculation
}

/**
 * Interface for a Product Category.
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_category: number | null; // ID of parent category, can be null for top-level categories
  parent_category_name: string | null; // Name of parent category, can be null
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for a Product Image.
 */
export interface ProductImage {
  id: number;
  image: string; // Absolute URL to the image file
  is_main: boolean;
  uploaded_at: string; // ISO 8601 datetime string
}

/**
 * Interface for a Product Promotion.
 */
export interface Promotion {
  id: number;
  name?: string; // Optional name for the promotion
  discount_percentage: number;
  start_date: string; // ISO 8601 datetime string
  end_date: string; // ISO 8601 datetime string
  is_active: boolean;
}

/**
 * Interface for a Product entity.
 */
export interface Product {
  id: number;
  shop: number; // ID of the shop this product belongs to
  shop_name: string; // Name of the shop
  name: string;
  description: string;
  price: string; // Original price (string to handle decimal precision from backend)
  category: number | null; // ID of the category, can be null
  category_name: string | null; // Name of the category, can be null
  category_slug: string | null; // Slug of the category (can be null for compatibility)
  stock: number;
  is_active: boolean;
  slug: string;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
  view_count: number;
  images: ProductImage[]; // Array of associated product images, guaranteed by conversion logic.
  main_image_url: string | null; // Derived field: URL to the main product image
  promotion: Promotion | null; // Nested active promotion, can be null if no active promotion
  display_price: string; // Calculated discounted price (string for precision)
  discount_percentage_value: number | null; // Calculated discount percentage, can be null
  user: SimpleUser | null; // Product owner's simplified user object, can be null
}

/**
 * Enum or type for Order Status values.
 */
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

/**
 * Interface for an Order Item (line item within an order).
 */
export interface OrderItem {
  id: number;
  product: Product; // Full product details or a simplified version
  quantity: number;
  price_at_purchase: string; // Price of the product at the time of purchase
  total_price: string; // Quantity * price_at_purchase
}

/**
 * Enum or type for Payment Status values.
 */
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/**
 * Interface for an Order.
 */
export interface Order {
  id: number;
  user: SimpleUser; // The customer who placed the order
  shop: Shop; // The shop the order was placed with
  total_price: string;
  order_status: OrderStatus;
  order_date: string; // ISO 8601 datetime string
  shipping_address: string;
  payment_method: string;
  items: OrderItem[]; // Array of order items
  payment_status?: PaymentStatus; // Payment status
  delivery_verified?: boolean; // Whether delivery has been verified
  delivery_verification_code?: string; // Code for delivery verification
}

/**
 * Interface for a Top Selling Product item, as aggregated for stats.
 */
export interface TopSellingProduct {
  product__id: number;
  product__name: string;
  product__main_image_url: string | null; // URL to product image
  total_quantity_sold: number;
  total_revenue: string; // Revenue for this product
}


/**
 * Generic interface for paginated API responses.
 * @template T The type of the items in the 'results' array.
 */
export interface PaginatedResponse<T> {
  count: number; // Total number of items across all pages
  next: string | null; // URL for the next page, or null if no next page
  previous: string | null; // URL for the previous page, or null if no previous page
  results: T[]; // Array of items for the current page
}
