// saknew_frontend/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

// Import AuthContext
import { useAuth } from '../context/AuthContext.minimal';

// Import Navigators and Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen'; // Ensure this file is named RegisterScreen.tsx
import EmailVerificationScreen from '../screens/Auth/EmailVerificationScreen';
import PasswordResetRequestScreen from '../screens/Auth/PasswordResetRequestScreen';
import PasswordResetConfirmScreen from '../screens/Auth/PasswordResetConfirmScreen';
import ActivateAccountScreen from '../screens/Auth/ActivateAccountScreen'; // Ensure this file exists!

// Corrected import path for ProductDetailScreen
import ProductDetailScreen from '../screens/Product/ProductDetailScreen';
import ProductManagementScreen from '../screens/ShopOwner/ProductManagementScreen';
import EditProductScreen from '../screens/ShopOwner/EditProductScreen';
import AddPromotionScreen from '../screens/ShopOwner/AddPromotionScreen';
import MainTabNavigator from './MainTabNavigator'; // Main Tab Navigator
import ShippingScreen from '../screens/Sales/ShippingScreen';
import PaymentScreen from '../screens/Sales/PaymentScreen';
import OrderSuccessScreen from '../screens/Sales/OrderSuccessScreen';
import AddFundsScreen from '../screens/Wallet/AddFundsScreen';
import OrderDetailScreen from '../screens/ShopOwner/OrderDetailScreen';
import PurchaseDetailScreen from '../screens/Sales/PurchaseDetailScreen';
import StatusViewerScreen from '../screens/Status/StatusViewerScreen';
import CreateStatusScreen from '../screens/Status/CreateStatusScreen';
import StatusListScreen from '../screens/Status/StatusListScreen';
import PublicShopScreen from '../screens/Shop/PublicShopScreen';
import CategoryProductsScreen from '../screens/CategoryProductsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import HowItWorksScreen from '../screens/HowItWorksScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['https://saknew-makert.netlify.app', 'http://localhost:8081'],
  config: {
    screens: {
      MainTabs: '',
      Login: 'login',
      Register: 'register',
      PasswordResetRequest: 'password-reset',
      PasswordResetConfirm: 'password-reset-confirm/:uid/:token',
      EmailVerification: 'verify-email',
      ActivateAccount: 'activate/:uid/:token',
      PublicShop: 'PublicShop/:shopSlug',
    },
  },
};

const AppNavigator = () => {
  // Use the authentication state from AuthContext
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading application...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Authenticated screens (User is logged in)
          <Stack.Group>
            {/* MainTabs now handles all primary authenticated navigation, including Shop */}
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            {/* ProductDetail, ProductManagement, EditProduct, AddPromotion are outside MainTabs as they can be navigated to from anywhere */}
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="ProductManagement" component={ProductManagementScreen} />
            <Stack.Screen name="EditProduct" component={EditProductScreen} />
            <Stack.Screen name="AddPromotion" component={AddPromotionScreen} />
            {/* Register payment, order success, and wallet add funds screens */}
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
            <Stack.Screen name="AddFundsScreen" component={AddFundsScreen} />
            <Stack.Screen name="WalletDashboard" component={AddFundsScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="Shipping" component={ShippingScreen} />
            <Stack.Screen name="PurchaseDetail" component={PurchaseDetailScreen} />
            <Stack.Screen name="StatusViewer" component={StatusViewerScreen} />
            <Stack.Screen name="CreateStatus" component={CreateStatusScreen} />
            <Stack.Screen name="StatusList" component={StatusListScreen} />
            <Stack.Screen name="PublicShop" component={PublicShopScreen} />
            <Stack.Screen name="CategoryProducts" component={CategoryProductsScreen} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
          </Stack.Group>
        ) : (
          // Unauthenticated screens (User is NOT logged in)
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="PasswordResetRequest" component={PasswordResetRequestScreen} />
            <Stack.Screen name="PasswordResetConfirm" component={PasswordResetConfirmScreen} />
            <Stack.Screen name="ActivateAccount" component={ActivateAccountScreen} />
            <Stack.Screen name="PublicShop" component={PublicShopScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="CategoryProducts" component={CategoryProductsScreen} />
            <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
          </Stack.Group>
        )}
        </Stack.Navigator>
      </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333333',
  },
});

export default AppNavigator;
