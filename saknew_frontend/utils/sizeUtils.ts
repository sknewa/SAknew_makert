// Clothing categories that require size selection (exact names from load_categories)
const CLOTHING_CATEGORIES = new Set([
  // Men's
  "Men's Clothing",
  "Men's T-Shirts", "Men's Shirts", "Men's Jeans", "Men's Pants", "Men's Shorts",
  "Men's Jackets", "Men's Hoodies", "Men's Suits", "Men's Underwear",
  "Men's Activewear", "Men's Swimwear",
  // Women's
  "Women's Fashion",
  "Women's T-Shirts", "Women's Blouses", "Women's Dresses", "Women's Jeans",
  "Women's Pants", "Women's Leggings", "Women's Skirts", "Women's Jackets",
  "Women's Hoodies", "Women's Sweaters", "Women's Activewear", "Women's Swimwear",
  "Women's Lingerie",
  // Kids
  "Kids' Clothing",
  "Baby Clothing (0-2 yrs)", "Toddler Clothing (2-4 yrs)",
  "Girls' T-Shirts & Tops", "Girls' Dresses & Skirts", "Girls' Pants & Jeans",
  "Boys' T-Shirts & Tops", "Boys' Pants & Jeans",
  "Kids' Jackets & Coats", "Kids' Activewear", "Kids' Sleepwear",
  // Sports apparel
  "Sports Apparel",
  // Handmade textiles
  "Handmade Textiles",
]);

const SHOE_CATEGORIES = new Set([
  "Shoes",
  "Men's Sneakers", "Men's Formal Shoes", "Men's Boots", "Men's Sandals",
  "Women's Sneakers", "Women's Heels", "Women's Flats", "Women's Boots", "Women's Sandals",
  "Kids' Shoes",
]);

export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
export const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];

export type SizeType = 'clothing' | 'shoes' | null;

export function getSizeType(categoryName?: string | null): SizeType {
  if (!categoryName) return null;
  if (CLOTHING_CATEGORIES.has(categoryName)) return 'clothing';
  if (SHOE_CATEGORIES.has(categoryName)) return 'shoes';
  return null;
}

export function getSizesForCategory(categoryName?: string | null): string[] {
  const type = getSizeType(categoryName);
  if (type === 'clothing') return CLOTHING_SIZES;
  if (type === 'shoes') return SHOE_SIZES;
  return [];
}

export function requiresSize(categoryName?: string | null): boolean {
  return getSizeType(categoryName) !== null;
}
