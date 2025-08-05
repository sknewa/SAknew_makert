// saknew_frontend/navigation/ShopOwnerNavigator.tsx
import React from 'react';
// Corrected import: Use NativeStackNavigationProp from native-stack
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native'; // Import RouteProp
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Import Shop Owner Screens
import MyShopScreen from '../screens/ShopOwner/MyShopScreen';
import AddProductScreen from '../screens/ShopOwner/AddProductScreen';
import EditProductScreen from '../screens/ShopOwner/EditProductScreen';
import EditShopScreen from '../screens/ShopOwner/EditShopScreen';
import ShopStatisticsScreen from '../screens/ShopOwner/ShopStatisticsScreen';
import SellerOrdersScreen from '../screens/ShopOwner/SellerOrdersScreen';
import CategoryProductsScreen from '../screens/ShopOwner/CategoryProductsScreen';
import AddPromotionScreen from '../screens/ShopOwner/AddPromotionScreen';

// --------------------------------------------------------------------------
// 1. Define ShopOwnerStackParamList for Type Safety (EXPORTED)
// --------------------------------------------------------------------------
export type ShopOwnerStackParamList = {
  MyShop: undefined;
  AddProduct: undefined;
  EditProduct: { productId: number };
  EditShop: { shopSlug: string };
  ShopStatistics: { shopSlug: string };
  SellerOrders: undefined;
  CategoryProductsScreen: { shopSlug: string; categorySlug: string; categoryName: string };
  AddPromotion: { productId: number };
};

// --------------------------------------------------------------------------
// 2. Define Navigation Prop Type for ShopOwnerStack
// --------------------------------------------------------------------------
type ShopOwnerNavigationProp = NativeStackNavigationProp<ShopOwnerStackParamList>;

// --------------------------------------------------------------------------
// 3. Define Route Prop Type for CategoryProductsScreen
// --------------------------------------------------------------------------
type CategoryProductsScreenRouteProp = RouteProp<ShopOwnerStackParamList, 'CategoryProductsScreen'>;

// --------------------------------------------------------------------------
// 4. Define Common Colors (Recommended: Move this to a separate constants/theme file)
// --------------------------------------------------------------------------
const colors = {
  primary: '#4CAF50',
  topNavBg: '#34495E',
  textPrimary: '#333333',
  textSecondary: '#666666',
  white: '#FFFFFF',
  background: '#F0F2F5',
  card: '#FFFFFF',
  border: '#E0E0E0',
  navLinkText: '#FFFFFF',
  navLinkActiveBg: 'rgba(255, 255, 255, 0.15)',
  footerBg: '#453b3b',
  footerText: 'rgb(155, 153, 153)',
  footerLink: '#eee',
};

const ShopOwnerStack = createNativeStackNavigator<ShopOwnerStackParamList>();

/**
 * Custom Header Component for the ShopOwnerNavigator.
 * This component displays a title and dynamic navigation links
 * based on the user's authentication and seller status.
 */
const ShopOwnerCustomHeader = () => {
  const { user, isAuthenticated } = useAuth();
  const navigation = useNavigation<ShopOwnerNavigationProp>();

  React.useEffect(() => {
    StatusBar.setBarStyle('light-content', true);

    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
      StatusBar.setBackgroundColor(colors.topNavBg);
    }

    return () => {
      StatusBar.setBarStyle('default', true);
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(true);
        StatusBar.setBackgroundColor('transparent');
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.headerSafeArea}>
      <View style={styles.headerContainer}>
        {/* Logo/Home Button - Navigates back to MyShop within this stack */}
        <TouchableOpacity
          onPress={() => navigation.navigate('MyShop')}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: 'https://placehold.co/35x35/4CAF50/FFFFFF?text=SAKNEW' }}
            style={styles.logoImage}
            onError={(e) => console.log('Logo load error:', e.nativeEvent.error)}
          />
        </TouchableOpacity>

        <View style={styles.navlinks}>
          {isAuthenticated ? (
            <>
              <TouchableOpacity
                style={styles.navLinkButton}
                onPress={() => navigation.navigate('AddProduct')}
                activeOpacity={0.7}
              >
                <View style={styles.navLinkContent}>
                  <Ionicons name="add-circle-outline" size={22} color={colors.navLinkText} />
                  <Text style={styles.navLinkText}>Add</Text>
                </View>
              </TouchableOpacity>

              {/* FIXED: Explicitly narrow 'user' and 'user.profile' types and ensure shop_slug is not null.
                  This helps TypeScript understand the type is 'string' within this block. */}
              {user && user.profile && user.profile.is_seller ? (
                <>
                  <TouchableOpacity
                    style={styles.navLinkButton}
                    onPress={() => navigation.navigate('ShopStatistics', { shopSlug: user.profile?.shop_slug || undefined })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.navLinkContent}>
                      <Ionicons name="stats-chart-outline" size={22} color={colors.navLinkText} />
                      <Text style={styles.navLinkText}>Stats</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.navLinkButton}
                    onPress={() => navigation.navigate('SellerOrders')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.navLinkContent}>
                      <Ionicons name="receipt-outline" size={22} color={colors.navLinkText} />
                      <Text style={styles.navLinkText}>Orders</Text>
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.navLinkText}>Not a Seller</Text>
              )}
            </>
          ) : (
            <Text style={styles.navLinkText}>Not Authenticated</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// CustomFooter component remains the same, as it's an exported utility component.
export const CustomFooter = () => {
  return (
    <View style={footerStyles.footerInfo}>
      <View style={footerStyles.footerContent}>
        <View style={footerStyles.footerMenu}>
          <TouchableOpacity style={footerStyles.footerMenuItem}>
            <Text style={footerStyles.footerMenuLink}>Make a query</Text>
          </TouchableOpacity>
        </View>

        <View style={footerStyles.footerBottom}>
          <Text style={footerStyles.footerBottomText}>Designed By - <Text style={footerStyles.footerBottomLink}>SAknew.ptyltd</Text></Text>
        </View>

        <View style={footerStyles.socials}>
          <TouchableOpacity style={footerStyles.socialsLink}>
            <Text style={footerStyles.socialsLinkText}>FB</Text>
          </TouchableOpacity>
          <TouchableOpacity style={footerStyles.socialsLink}>
            <Text style={footerStyles.socialsLinkText}>TW</Text>
          </TouchableOpacity>
          <TouchableOpacity style={footerStyles.socialsLink}>
            <Text style={footerStyles.socialsLinkText}>EM</Text>
          </TouchableOpacity>
          <TouchableOpacity style={footerStyles.socialsLink}>
            <Text style={footerStyles.socialsLinkText}>LI</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

/**
 * ShopOwnerNavigator defines the stack navigation for shop owner specific screens.
 * It uses a custom header for a consistent look across all screens in this stack.
 */
const ShopOwnerNavigator = () => {
  return (
    <ShopOwnerStack.Navigator
      screenOptions={{
        header: () => <ShopOwnerCustomHeader />,
        headerShown: true,
      }}
    >
      <ShopOwnerStack.Screen name="MyShop" component={MyShopScreen} />
      <ShopOwnerStack.Screen name="AddProduct" component={AddProductScreen} />
      <ShopOwnerStack.Screen name="EditProduct" component={EditProductScreen} />
      <ShopOwnerStack.Screen name="AddPromotion" component={AddPromotionScreen} />
      <ShopOwnerStack.Screen name="EditShop" component={EditShopScreen} />
      <ShopOwnerStack.Screen name="ShopStatistics" component={ShopStatisticsScreen} />
      <ShopOwnerStack.Screen name="SellerOrders" component={SellerOrdersScreen} />
      <ShopOwnerStack.Screen
        name="CategoryProductsScreen"
        component={CategoryProductsScreen}
        options={({ route }: { route: CategoryProductsScreenRouteProp }) => ({
          title: route.params?.categoryName ? `${route.params.categoryName} Products` : 'Category Products',
        })}
      />
    </ShopOwnerStack.Navigator>
  );
};

const styles = StyleSheet.create({
  headerSafeArea: {
    backgroundColor: colors.topNavBg,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0) + 5,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: colors.topNavBg,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  logoImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    resizeMode: 'contain',
  },
  navlinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    marginLeft: 5,
  },
  navLinkButton: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    marginHorizontal: 1,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  navLinkContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLinkText: {
    color: colors.navLinkText,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif',
    textAlign: 'center',
    letterSpacing: 0.1,
    marginTop: 1,
  },
});

const footerStyles = StyleSheet.create({
  footerInfo: {
    marginTop: 0,
    backgroundColor: colors.footerBg,
    maxHeight: 'auto',
    paddingVertical: 20,
  },
  footerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    textAlign: 'center',
  },
  footerMenu: {
    margin: 0,
    padding: 0,
    marginBottom: 20,
  },
  footerMenuItem: {
    paddingRight: 10,
    display: 'flex',
  },
  footerMenuLink: {
    color: colors.footerLink,
    paddingVertical: 6,
    paddingHorizontal: 15,
    textDecorationLine: 'none',
    borderRadius: 50,
    fontSize: 14,
  },
  socials: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  socialsLink: {
    marginHorizontal: 10,
    padding: 8,
    borderRadius: 999,
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  socialsLinkText: {
    color: colors.footerLink,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerBottom: {
    width: '97%',
    padding: 5,
    alignItems: 'center',
    marginTop: 5,
  },
  footerBottomText: {
    textAlign: 'center',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'capitalize',
    color: colors.footerLink,
  },
  footerBottomLink: {
    color: colors.footerLink,
    fontSize: 12,
    textDecorationLine: 'none',
  },
});

export default ShopOwnerNavigator;