// saknew_frontend/services/shop.types.ts

// Assuming User and UserProfile types are defined elsewhere (e.g., in your AuthContext or a global types file).
// For consistency, I'll define a minimal User type here for Shop related data,
// but you should replace it with your actual User/UserProfile types if they exist globally.
export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  // If you have a nested profile in your UserSerializer, include it here:
  // profile?: {
  //   email_verified: boolean;
  //   is_seller: boolean;
  //   shop_slug?: string | null;
  // };
}

export interface UserProfile {
  email_verified: boolean;
  is_seller: boolean;
  shop_slug: string | null; // shop_slug is a string or null
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_category: number | null; // ID of parent category
  parent_category_name: string | null; // Name of parent category
  is_active: boolean;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
}

export interface Shop {
  id: number;
  user: User; // Nested User object
  name: string;
  slug: string;
  description: string | null;
  latitude: string | null; // DecimalField from Django often comes as string in JSON
  longitude: string | null; // DecimalField from Django often comes as string in JSON
  is_active: boolean;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
  products_count: number; // From SerializerMethodField
  // Contact & Address fields
  country?: string | null;
  province?: string | null;
  town?: string | null;
  phone_number?: string | null;
  email_contact?: string | null;
  // REMOVED: website_url?: string | null;
  // NEW: Social links
  social_links?: Record<string, string> | null; // A dictionary of social media platform (string) to URL (string)
  // Optional images
  banner_image?: string | null;
  logo?: string | null;
}

export interface ProductImage {
  id: number;
  image: string; // URL to the image
  is_main: boolean;
  uploaded_at: string; // ISO 8601 datetime string
}

export interface Promotion {
  id: number;
  discount_percentage: number;
  start_date: string; // ISO 8601 datetime string
  end_date: string; // ISO 8601 datetime string
  is_active: boolean; // From SerializerMethodField
}

export interface Product {
  id: number;
  shop: number; // Shop ID
  shop_name: string; // From SerializerMethodField
  name: string;
  description: string;
  price: string; // DecimalField often comes as string
  category: number | null; // Category ID
  category_name: string | null; // From SerializerMethodField
  category_slug: string | null; // From SerializerMethodField
  stock: number;
  is_active: boolean;
  slug: string;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
  view_count: number;
  images: ProductImage[]; // Nested ProductImage objects
  main_image_url: string | null; // From SerializerMethodField
  promotion: Promotion | null; // Nested Promotion object, or null if no active promotion
  display_price: string; // From SerializerMethodField (formatted price string)
  discount_percentage_value: number | null; // From SerializerMethodField
  user: import("../types").SimpleUser | null; // Product owner's simplified user object, can be null
}

// Interfaces for API request bodies (e.g., for creating/updating)
export interface CreateShopData {
  name: string;
  description?: string;
  country?: string;
  province?: string;
  town?: string;
  latitude?: string;
  longitude?: string;
  phone_number?: string;
  email_contact?: string;
  // REMOVED: website_url?: string;
  social_links?: Record<string, string>; // Dictionary of social links
}

export interface UpdateShopData {
  name?: string;
  description?: string;
  country?: string;
  province?: string;
  town?: string;
  latitude?: string;
  longitude?: string;
  is_active?: boolean;
  phone_number?: string;
  email_contact?: string;
  // REMOVED: website_url?: string;
  social_links?: Record<string, string>; // Dictionary of social links
}

export interface CreateProductData {
  name: string;
  description: string;
  price: string; // Send as string
  category?: number | null; // Category ID
  stock: number;
  is_active?: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: string;
  category?: number | null;
  stock?: number;
  is_active?: boolean;
}

export interface AddProductImageData {
  image: string; // Base64 or URI for file upload
  is_main?: boolean;
}

export interface CreatePromotionData {
  discount_percentage: number;
  start_date: string; // ISO 8601 datetime string
  end_date: string; // ISO 8601 datetime string
  name?: string;
}

export interface UpdatePromotionData {
  discount_percentage?: number;
  start_date?: string;
  end_date?: string;
  name?: string;
}
