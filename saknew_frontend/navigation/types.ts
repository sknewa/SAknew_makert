// saknew_frontend/navigation/types.ts

import { NavigatorScreenParams } from '@react-navigation/native';
import { ShopOwnerStackParamList } from './ShopOwnerNavigator'; // Import ShopOwnerStackParamList

// Define the parameter list for the Auth Stack
export type AuthStackParamList = {
  Login: undefined; // Login screen takes no parameters - ENSURE THIS IS 'undefined'
  Register: undefined; // Register screen takes no parameters
  ForgotPassword: undefined; // ForgotPassword screen takes no parameters
  EmailVerification: { userEmail?: string }; // EmailVerification can optionally take userEmail
  ActivateAccount: { userEmail?: string }; // ActivateAccount can optionally take userEmail
  PasswordResetConfirm: { uid?: string; token?: string }; // PasswordResetConfirm can optionally take uid and token
  PasswordResetRequest: undefined; // Added to ensure ForgotPassword navigation works
};

// Define the parameter list for the Main Stack (which includes Bottom Tabs)
export type MainStackParamList = {
  BottomTabs: NavigatorScreenParams<BottomTabParamList>;
  ProductDetail: { productId: number; productName?: string };
  ShopDetail: { shopSlug: string };
  SearchResults: { query: string };
  CategoryProductsScreen: { shopSlug: string; categorySlug: string; categoryName: string };
  CreateShop: undefined;
  AddProduct: undefined;
  EditShop: { shopSlug: string };
  EditProduct: { productId: number };
  ProductManagement: { productId: number };
  Shipping: undefined;
};

// Define the parameter list for the Bottom Tab Navigator
export type BottomTabParamList = {
  Home: undefined;
  Cart: undefined;
  Orders: undefined;
  Wallet: undefined;
  Shipping: undefined;
  'My Shop': NavigatorScreenParams<ShopOwnerStackParamList>;
};

// Define the Root Stack Param List for the entire application
// This combines AuthStack and MainStack
export type RootStackParamList = {
  
  MainStack: NavigatorScreenParams<MainStackParamList>; // MainStack is a nested navigator
  Home: undefined;
  ProductDetail: { productId: number };
  Cart: undefined;
  Shipping: undefined;
  Payment: { orderId: string };
  MyOrders: undefined;
  WalletDashboard: undefined;
  AddFundsScreen: undefined;
  AuthStack: { screen: string };
  BottomTabs: { screen: string };
};

// Define the type for the navigation prop in components within the AuthStack
// This allows you to navigate to any screen in AuthStack
export type AuthNavigationProp = import('@react-navigation/native').CompositeNavigationProp<
  import('@react-navigation/native-stack').NativeStackNavigationProp<AuthStackParamList, 'Login'>,
  import('@react-navigation/native').NavigationProp<RootStackParamList>
>;

// Define the type for the navigation prop in components within the MainStack (or BottomTabs)
// This allows you to navigate to any screen in MainStack and also to AuthStack (e.g., logout)
export type MainNavigationProp = {
  navigate: (screen: keyof RootStackParamList | keyof MainStackParamList, params?: any) => void;
  goBack: () => void;
  push: (screen: string, params?: any) => void;
  replace: (screen: string, params?: any) => void;
};



// Define the type for the navigation prop in components within the BottomTabNavigator
// This allows you to navigate within the tabs and also to screens in MainStack
export type BottomTabNavigationProp = import('@react-navigation/native').CompositeNavigationProp<
  import('@react-navigation/bottom-tabs').BottomTabNavigationProp<BottomTabParamList, 'Home'>,
  import('@react-navigation/native').NavigationProp<MainStackParamList>
>;
