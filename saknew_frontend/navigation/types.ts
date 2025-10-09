import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// This file centralizes navigation types for type-safety and autocompletion.

/**
 * Defines the parameters for each screen in the main stack navigator.
 * The keys are the route names, and the values are the route params.
 * `undefined` means the route has no params.
 */
export type MainStackParamList = {
  // Screens inferred from your project structure and error message
  BottomTabs: undefined;
  ProductDetail: { productId: number }; // It's best practice to pass only an ID
  CategoryProducts: { categoryName: string; categorySlug: string };
  Cart: undefined;
  Shipping: undefined;
  Payment: undefined;
  MyOrders: undefined;
  WalletDashboard: undefined;
  AddFundsScreen: undefined;
  ProductManagement: undefined;
  AuthStack: undefined; // Likely a nested navigator

  // Screens that were causing the TypeScript error in HomeScreen.tsx
  StatusViewer: { userStatus: any }; // TODO: Replace 'any' with a specific type for userStatus
  CreateStatus: undefined;
};

// This is the navigation prop type for components inside the MainStack.
// It's the type you are importing as `MainNavigationProp` in HomeScreen.
export type MainNavigationProp = StackNavigationProp<MainStackParamList>;

// Example types for individual screen props (navigation + route)
export type CategoryProductsScreenProps = {
  route: RouteProp<MainStackParamList, 'CategoryProducts'>;
  navigation: MainNavigationProp;
};

// --- Authentication Stack Types ---

/**
 * Defines the parameters for each screen in the authentication stack navigator.
 * This stack typically includes screens like Login, Register, and ActivateAccount.
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined; // Assuming a registration screen exists
  ActivateAccount: { userEmail?: string }; // `userEmail` is optional
  EmailVerification: { userEmail?: string }; // Screen for verifying email
  PasswordResetRequest: undefined; // Screen to request a password reset
  PasswordResetConfirm: { uid?: string; token?: string }; // Screen to confirm password reset with UID and Token
};

// This is the navigation prop type for components inside the AuthStack.
export type AuthNavigationProp = StackNavigationProp<AuthStackParamList>;