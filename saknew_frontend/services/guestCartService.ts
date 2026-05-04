import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_CART_KEY = 'guest_cart';

export interface GuestCartItem {
  product: any;
  quantity: number;
  size?: string;
}

export const getGuestCart = async (): Promise<GuestCartItem[]> => {
  try {
    const data = await AsyncStorage.getItem(GUEST_CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addToGuestCart = async (product: any, quantity: number = 1, size?: string): Promise<GuestCartItem[]> => {
  const cart = await getGuestCart();
  const existingIndex = cart.findIndex(
    (item) => item.product.id === product.id && item.size === size
  );
  if (existingIndex >= 0) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({ product, quantity, size });
  }
  await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
  return cart;
};

export const updateGuestCartItem = async (productId: number, quantity: number, size?: string): Promise<GuestCartItem[]> => {
  const cart = await getGuestCart();
  const index = cart.findIndex((item) => item.product.id === productId && item.size === size);
  if (index >= 0) {
    if (quantity <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = quantity;
    }
  }
  await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
  return cart;
};

export const removeFromGuestCart = async (productId: number, size?: string): Promise<GuestCartItem[]> => {
  const cart = await getGuestCart();
  const filtered = cart.filter((item) => !(item.product.id === productId && item.size === size));
  await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(filtered));
  return filtered;
};

export const clearGuestCart = async (): Promise<void> => {
  await AsyncStorage.removeItem(GUEST_CART_KEY);
};

export const getGuestCartTotal = (cart: GuestCartItem[]): number => {
  return cart.reduce((sum, item) => {
    const price = parseFloat(item.product.display_price || item.product.price || '0');
    return sum + price * item.quantity;
  }, 0);
};

export const getGuestCartCount = (cart: GuestCartItem[]): number => {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
};
